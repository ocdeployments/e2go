import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { captureApiError } from '@/lib/capture-error';
import { checkRateLimit } from '@/lib/rate-limit';
import { isKillSwitchEnabled } from '@/lib/kill-switch';
import { extractTextFromBuffer } from '@/lib/text-extraction';
import { callLLM } from '@/lib/llm-client';
import {
  validateFileBatch,
  getFileTypeFromExtension,
  validateMagicBytes,
  sanitizeFilename,
} from '@/lib/document-validation';
import {
  type ApplicationDocument,
  type UploadFileType,
  MAX_FILES_PER_SESSION,
  ACCEPTED_MIME_TYPES,
} from '@/types/document-upload';

// Identity documents are never stored as files on this path. Their data is
// captured field-only through the intake parser (/api/apply/parse-document),
// which processes the file in memory and discards it. Storing a passport or
// birth-certificate scan in the document bucket is a deliberate policy no.
const IDENTITY_DOC_TYPES = new Set([
  'passport',
  'birth_certificate',
  'marriage_certificate',
  'drivers_license',
  'national_id',
  'government_id',
]);

const IDENTITY_REJECTION_MESSAGE =
  'Identity documents (passport, birth certificate, marriage certificate) are not stored. ' +
  'Upload them through the intake screen instead — we read the details and immediately discard the file.';

// Content-based backstop for the client-declared-type check above (G-4): a
// mislabeled or relabeled identity-document scan would otherwise sail through
// as, say, a "bank statement" and be stored as a raw file — the exact thing
// this route exists to prevent. Reuses the same LLM-classification pattern as
// detectDocumentType() in /api/apply/parse-document and classifyDocument() in
// document-extraction-engine.ts. Text-extractable PDFs/DOCX only — a scanned
// (image-only) PDF has no text to classify and passes through unchecked, same
// blind spot every other content check in this codebase already has.
async function detectIdentityDocumentContent(
  text: string,
  userId: string
): Promise<boolean> {
  const validTypes = [...IDENTITY_DOC_TYPES, 'none'].join(' | ');
  const result = await callLLM({
    task:       'extract',
    route:      '/api/documents',
    userId,
    max_tokens: 20,
    messages: [
      {
        role: 'system',
        content:
          'You are a document classifier for an immigration platform. Reply with ONLY one of the provided strings — nothing else.',
      },
      {
        role: 'user',
        content:
          `Does this document's content look like a government-issued identity document (a passport, birth certificate, marriage certificate, driver's license, national ID, or other government ID)? ` +
          `Reply with ONLY one of: ${validTypes}\n\n${text.slice(0, 2000)}`,
      },
    ],
  });

  const detected = (result ?? 'none').trim().toLowerCase().replace(/[^a-z_]/g, '');
  return IDENTITY_DOC_TYPES.has(detected);
}

// POST /api/documents — Upload one or more files
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    // Service role client for Storage operations — bypasses RLS which blocks
    // anon-key uploads. Auth + DB queries still use the cookie-based anon client
    // so user-level RLS and auth checks remain enforced.
    const serviceClient = createServiceClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await checkRateLimit(user.id, 'parse-doc');
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many document uploads. Please wait before uploading more.' },
        { status: 429, headers: { 'Retry-After': String(rl.reset) } }
      );
    }

    const formData = await request.formData();
    const applicationId = formData.get('applicationId') as string;

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Missing applicationId' },
        { status: 400 }
      );
    }

    // Verify application belongs to user
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !app) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Collect files and their user-selected types
    const files: File[] = [];
    const documentTypes: Record<string, string> = {};

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value);
        const typeKey = `type_${key.replace('file_', '')}`;
        const selectedType = formData.get(typeKey) as string;
        if (selectedType) {
          documentTypes[value.name] = selectedType;
        }
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Reject identity documents — their scans are never stored on this path.
    const identityDoc = Object.entries(documentTypes).find(([, t]) =>
      IDENTITY_DOC_TYPES.has(t)
    );
    if (identityDoc) {
      return NextResponse.json(
        { error: IDENTITY_REJECTION_MESSAGE },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES_PER_SESSION) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_SESSION} files per session` },
        { status: 400 }
      );
    }

    // Validate all files
    const { valid, errors } = validateFileBatch(files);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'File validation failed', details: errors },
        { status: 400 }
      );
    }

    // Check existing document count for this application
    const { count: existingCount } = await supabase
      .from('application_documents')
      .select('id', { count: 'exact', head: true })
      .eq('application_id', applicationId);

    if ((existingCount || 0) + valid.length > MAX_FILES_PER_SESSION) {
      return NextResponse.json(
        {
          error: `Adding ${valid.length} files would exceed the ${MAX_FILES_PER_SESSION} file limit. You have ${existingCount} existing files.`,
        },
        { status: 400 }
      );
    }

    // AI features (including the identity-content backstop below) may be
    // disabled; uploads still proceed on the client-declared-type check alone.
    const contentCheckEnabled = !(await isKillSwitchEnabled());

    // Upload each file to Supabase Storage and create DB record
    const uploaded: ApplicationDocument[] = [];

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      const fileType = getFileTypeFromExtension(file.name);

      if (!fileType) {
        continue;
      }

      // Read buffer before building the storage path so we can validate content
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (!validateMagicBytes(buffer, fileType)) {
        return NextResponse.json(
          { error: `${file.name}: file content does not match its declared type. Please upload the original file without renaming.` },
          { status: 400 }
        );
      }

      // Content-based identity-document backstop (G-4) — catches a
      // mislabeled/relabeled scan the client-declared-type check above can't.
      // Fails open on extraction/LLM errors so an outage never blocks a
      // legitimate financial-document upload; errors are captured for
      // visibility instead.
      if (contentCheckEnabled && (fileType === 'pdf' || fileType === 'docx')) {
        try {
          const extraction = await extractTextFromBuffer(buffer, fileType as UploadFileType, file.name);
          if (!extraction.isScanned && extraction.text.trim()) {
            const isIdentityDoc = await detectIdentityDocumentContent(extraction.text, user.id);
            if (isIdentityDoc) {
              return NextResponse.json({ error: IDENTITY_REJECTION_MESSAGE }, { status: 400 });
            }
          }
        } catch (contentCheckErr) {
          captureApiError(contentCheckErr, {
            route: 'documents', stage: 'identity-content-check', userId: user.id, applicationId, fileName: file.name,
          });
        }
      }

      const safeFilename = sanitizeFilename(file.name);
      const timestamp = Date.now();
      const storagePath = `${user.id}/${applicationId}/${timestamp}_${safeFilename}`;

      const { error: uploadError } = await serviceClient.storage
        .from('application-documents')
        .upload(storagePath, buffer, {
          contentType: file.type || ACCEPTED_MIME_TYPES[0],
          upsert: false,
        });

      if (uploadError) {
        captureApiError(uploadError, { route: 'documents', stage: 'storage-upload', userId: user.id, applicationId, fileName: safeFilename });
        return NextResponse.json(
          { error: `Failed to upload ${safeFilename}: ${uploadError.message}` },
          { status: 500 }
        );
      }

      // Create database record
      const { data: docRecord, error: dbError } = await supabase
        .from('application_documents')
        .insert({
          application_id: applicationId,
          user_id: user.id,
          original_filename: safeFilename,
          file_type: fileType,
          file_size_bytes: file.size,
          user_selected_document_type: documentTypes[file.name] || 'unknown',
          storage_path: storagePath,
          extraction_status: 'pending',
        })
        .select()
        .single();

      if (dbError) {
        captureApiError(dbError, { route: 'documents', stage: 'db-insert', userId: user.id, applicationId, fileName: safeFilename });
        // Clean up uploaded file
        await serviceClient.storage
          .from('application-documents')
          .remove([storagePath]);
        return NextResponse.json(
          { error: `Failed to record ${safeFilename}` },
          { status: 500 }
        );
      }

      uploaded.push(docRecord);
    }

    return NextResponse.json({
      documents: uploaded.map(doc => ({
        id: doc.id,
        filename: doc.original_filename,
        storagePath: doc.storage_path,
        fileType: doc.file_type,
        fileSize: doc.file_size_bytes,
        userSelectedType: doc.user_selected_document_type,
      })),
    });
  } catch (error) {
    captureApiError(error, { route: 'documents', stage: 'upload' });
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

// GET /api/documents?applicationId=xxx — List documents for an application
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Missing applicationId parameter' },
        { status: 400 }
      );
    }

    const { data: documents, error } = await supabase
      .from('application_documents')
      .select('id, application_id, user_id, original_filename, file_type, file_size_bytes, storage_path, user_selected_document_type, extraction_status, extraction_error, detected_document_type, detection_confidence, detection_reasoning, fields_extracted, document_summary, extracted_at, created_at, updated_at')
      .eq('application_id', applicationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      captureApiError(error, { route: 'documents', stage: 'query', userId: user.id, applicationId });
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    return NextResponse.json({ documents });
  } catch (error) {
    captureApiError(error, { route: 'documents', stage: 'list' });
    return NextResponse.json({ error: 'List failed' }, { status: 500 });
  }
}
