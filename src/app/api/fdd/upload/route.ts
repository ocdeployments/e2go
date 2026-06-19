import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { sanitizeFilename, validateMagicBytes } from '@/lib/document-validation';
import type { FddUploadIntake } from '@/types/fdd';

const MAX_FDD_SIZE = 50 * 1024 * 1024; // 50MB — FDDs can be large

// POST /api/fdd/upload
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FDD_SIZE) {
      return NextResponse.json(
        { error: `File exceeds 50MB limit (${Math.round(file.size / 1024 / 1024)}MB)` },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'FDDs must be uploaded as PDF files' }, { status: 400 });
    }

    // Parse intake fields
    const intake: FddUploadIntake = {
      transaction_type: (formData.get('transaction_type') as FddUploadIntake['transaction_type']) || 'new_unit',
      target_city: (formData.get('target_city') as string) || '',
      target_state: (formData.get('target_state') as string) || '',
      target_zip: (formData.get('target_zip') as string) || '',
      investor_liquid_capital: formData.get('investor_liquid_capital')
        ? parseInt(formData.get('investor_liquid_capital') as string, 10)
        : undefined,
      investor_net_worth: formData.get('investor_net_worth')
        ? parseInt(formData.get('investor_net_worth') as string, 10)
        : undefined,
      application_id: (formData.get('application_id') as string) || undefined,
    };

    // Validate application ownership if linked
    if (intake.application_id) {
      const { data: app } = await supabase
        .from('applications')
        .select('id')
        .eq('id', intake.application_id)
        .eq('user_id', user.id)
        .single();

      if (!app) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }
    }

    // Read and validate file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateMagicBytes(buffer, 'pdf')) {
      return NextResponse.json(
        { error: 'File content does not match PDF format. Upload the original PDF file.' },
        { status: 400 }
      );
    }

    const safeFilename = sanitizeFilename(file.name);
    const timestamp = Date.now();
    const storagePath = `${user.id}/fdd/${timestamp}_${safeFilename}`;

    const serviceClient = createServiceClient();

    const { error: uploadError } = await serviceClient.storage
      .from('application-documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('[fdd/upload] Storage error:', uploadError);
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }

    // Create fdd_analyses record
    const { data: record, error: dbError } = await supabase
      .from('fdd_analyses')
      .insert({
        user_id: user.id,
        application_id: intake.application_id || null,
        storage_path: storagePath,
        original_filename: safeFilename,
        file_size_bytes: file.size,
        transaction_type: intake.transaction_type,
        target_city: intake.target_city || null,
        target_state: intake.target_state || null,
        target_zip: intake.target_zip || null,
        investor_liquid_capital: intake.investor_liquid_capital || null,
        investor_net_worth: intake.investor_net_worth || null,
        extraction_status: 'pending',
        extraction_progress: 0,
      })
      .select('id')
      .single();

    if (dbError || !record) {
      console.error('[fdd/upload] DB error:', dbError);
      await serviceClient.storage.from('application-documents').remove([storagePath]);
      return NextResponse.json({ error: 'Failed to create analysis record' }, { status: 500 });
    }

    return NextResponse.json({
      fdd_id: record.id,
      filename: safeFilename,
      storage_path: storagePath,
    });
  } catch (error) {
    console.error('[fdd/upload] Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
