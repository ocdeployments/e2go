import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  validateFileBatch,
  getFileTypeFromExtension,
} from '@/lib/document-validation';
import {
  type ApplicationDocument,
  MAX_FILES_PER_SESSION,
  ACCEPTED_MIME_TYPES,
} from '@/types/document-upload';

// POST /api/documents — Upload one or more files
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Upload each file to Supabase Storage and create DB record
    const uploaded: ApplicationDocument[] = [];

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      const fileType = getFileTypeFromExtension(file.name);

      if (!fileType) {
        continue;
      }

      const timestamp = Date.now();
      const storagePath = `${user.id}/${applicationId}/${timestamp}_${file.name}`;

      // Upload to Supabase Storage
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('application-documents')
        .upload(storagePath, buffer, {
          contentType: file.type || ACCEPTED_MIME_TYPES[0],
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return NextResponse.json(
          { error: `Failed to upload ${file.name}: ${uploadError.message}` },
          { status: 500 }
        );
      }

      // Create database record
      const { data: docRecord, error: dbError } = await supabase
        .from('application_documents')
        .insert({
          application_id: applicationId,
          user_id: user.id,
          original_filename: file.name,
          file_type: fileType,
          file_size_bytes: file.size,
          user_selected_document_type: documentTypes[file.name] || 'unknown',
          storage_path: storagePath,
          extraction_status: 'pending',
        })
        .select()
        .single();

      if (dbError) {
        console.error('DB insert error:', dbError);
        // Clean up uploaded file
        await supabase.storage
          .from('application-documents')
          .remove([storagePath]);
        return NextResponse.json(
          { error: `Failed to record ${file.name}` },
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
    console.error('Upload error:', error);
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
      .select('*')
      .eq('application_id', applicationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('List error:', error);
    return NextResponse.json({ error: 'List failed' }, { status: 500 });
  }
}
