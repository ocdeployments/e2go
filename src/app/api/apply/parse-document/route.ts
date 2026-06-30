import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { extractTextFromBuffer } from '@/lib/text-extraction';
import { callLLM } from '@/lib/llm-client';
import type { UploadFileType } from '@/types/document-upload';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// Field schema per document type — what to extract → which answer keys to populate
const DOC_TYPE_SCHEMAS: Record<string, { prompt: string; fields: Record<string, string> }> = {
  resume: {
    prompt: `You are extracting data from a resume/CV to pre-fill an E-2 visa application.
Extract the following fields as a JSON object. Return null for any field not found.
Be concise — extract the raw value, not a full sentence.`,
    fields: {
      'M3-Q-00': 'most_recent_job_title_or_business_type (e.g. "Franchise Owner - Subway" or "Regional Sales Manager")',
      'M3-Q-02A': 'primary_field_of_study (e.g. "Business Administration", "Computer Science")',
      'M3-Q-02B': 'highest_degree_name (e.g. "Bachelor of Commerce", "MBA")',
      'M3-Q-02C': 'institution_name_and_city (e.g. "University of Toronto, Toronto ON")',
      'M3-Q-02D': 'year_degree_completed (4-digit year as string, e.g. "2008")',
      'M3-Q-05': 'total_years_professional_experience (number as string, e.g. "14")',
      'M3-Q-06': 'primary_industry_experience (one of: retail, food-service, healthcare, technology, finance, real-estate, construction, manufacturing, education, hospitality, customer-service, other)',
      'M3-A-01': 'full_legal_name',
      'M3-A-03': 'phone_number',
    },
  },
  fdd: {
    prompt: `You are extracting data from a Franchise Disclosure Document (FDD) to pre-fill an E-2 visa application.
Extract the following fields. Return null for any field not found.`,
    fields: {
      'M3-Q-00': 'franchise_brand_name (e.g. "Anytime Fitness", "Subway")',
      'M3-E-01': 'franchise_legal_entity_name (from FDD cover or Item 1)',
      'M3-F-02': 'total_initial_investment_midpoint_usd (numeric only, use midpoint of Item 7 range, e.g. "185000")',
      'M3-F-03': 'franchise_fee_usd (Item 5 initial franchise fee, numeric only)',
      'M3-B-01': 'franchisor_business_description (1-2 sentences from Item 1)',
    },
  },
  investment_records: {
    prompt: `You are extracting data from bank statements or investment records to pre-fill an E-2 visa application.
Extract only what is clearly stated. Return null for anything ambiguous.`,
    fields: {
      'M3-F-02': 'total_funds_available_or_invested_usd (numeric only, e.g. "250000")',
      'M3-F-03': 'primary_source_of_funds (e.g. "personal savings", "RRSP withdrawal", "property sale", "gift from family")',
      'M3-F-04': 'approximate_net_worth_usd (numeric only if clearly stated)',
    },
  },
  business_plan: {
    prompt: `You are extracting data from a business plan to pre-fill an E-2 visa application.
Extract only clearly stated facts. Return null for anything not found.`,
    fields: {
      'M3-E-01': 'business_entity_name',
      'M3-B-01': 'business_description (2-3 sentence summary)',
      'M3-B-02': 'target_location_city_and_state',
      'M3-B-03': 'planned_number_of_us_employees (numeric as string)',
      'M3-F-02': 'total_investment_amount_usd (numeric only)',
      'M3-I-01': 'projected_revenue_year_1_usd (numeric only)',
    },
  },
  financial_statement: {
    prompt: `You are extracting data from a personal financial statement or net worth statement.
Extract only clearly stated values. Return null for anything not found.`,
    fields: {
      'M3-F-04': 'total_net_worth_usd (numeric only)',
      'M3-F-02': 'liquid_assets_usd (cash + investments, numeric only)',
      'M3-T-01': 'primary_property_description (e.g. "Primary residence — Toronto, ON, estimated value $850,000")',
    },
  },
  territory_analysis: {
    prompt: `You are extracting data from a territory or market analysis report.
Extract only clearly stated facts.`,
    fields: {
      'M3-B-02': 'target_territory_location (city, state/province)',
      'QMA-ZIP': 'primary_zip_code (5-digit US zip)',
      'QMA-STATE': 'us_state (2-letter code, e.g. "TX")',
      'QMA-BUSINESS-TYPE': 'business_category (e.g. "food service", "retail", "fitness")',
    },
  },
};

// Human-readable labels for the review UI
const FIELD_LABELS: Record<string, string> = {
  'M3-Q-00': 'Franchise / Business type',
  'M3-Q-02A': 'Field of study',
  'M3-Q-02B': 'Degree or certification name',
  'M3-Q-02C': 'Institution name & city',
  'M3-Q-02D': 'Year completed',
  'M3-Q-05': 'Years of professional experience',
  'M3-Q-06': 'Industry / skills',
  'M3-A-01': 'Full legal name',
  'M3-A-03': 'Phone number',
  'M3-E-01': 'Business / entity name',
  'M3-F-02': 'Total investment amount (USD)',
  'M3-F-03': 'Source of funds / franchise fee',
  'M3-F-04': 'Net worth (USD)',
  'M3-B-01': 'Business description',
  'M3-B-02': 'Target location',
  'M3-B-03': 'Planned US employees',
  'M3-T-01': 'Primary property',
  'M3-I-01': 'Projected revenue Year 1',
  'QMA-ZIP': 'Target ZIP code',
  'QMA-STATE': 'Target US state',
  'QMA-BUSINESS-TYPE': 'Business category',
};

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
}

export interface ParseDocumentResponse {
  docId:  string;
  fields: ExtractedField[];
  docType: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file    = formData.get('file')    as File | null;
    const docType = formData.get('docType') as string | null;
    const appId   = formData.get('applicationId') as string | null;

    if (!file)    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!docType) return NextResponse.json({ error: 'No document type provided' }, { status: 400 });
    if (!DOC_TYPE_SCHEMAS[docType]) {
      return NextResponse.json({ error: `Unknown document type: ${docType}` }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large (max 20MB)` }, { status: 400 });
    }

    // Validate application ownership if provided
    if (appId) {
      const { data: app } = await supabase
        .from('applications')
        .select('id')
        .eq('id', appId)
        .eq('user_id', user.id)
        .single();
      if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Store upload record
    const { data: docRecord, error: insertErr } = await supabase
      .from('uploaded_documents')
      .insert({
        user_id:           user.id,
        application_id:    appId || null,
        file_path:         '',
        file_name:         file.name,
        doc_type:          docType,
        extraction_status: 'processing',
      })
      .select('id')
      .single();

    if (insertErr || !docRecord) {
      return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 });
    }

    // Build extraction prompt
    const schema = DOC_TYPE_SCHEMAS[docType];
    const fieldLines = Object.entries(schema.fields)
      .map(([key, desc]) => `  "${key}": ${desc}`)
      .join(',\n');
    const extractionPrompt = `${schema.prompt}

Return ONLY a valid JSON object with these exact keys (null for any not found):
{
${fieldLines}
}`;

    // Extract raw text from the file (proper PDF/DOCX parsing, not a binary-as-text guess)
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);
    const lowerName   = file.name.toLowerCase();

    let documentText: string;
    try {
      if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
        const result = await extractTextFromBuffer(buffer, 'pdf' as UploadFileType, file.name);
        if (result.isScanned) {
          await supabase
            .from('uploaded_documents')
            .update({ extraction_status: 'failed' })
            .eq('id', docRecord.id);
          return NextResponse.json(
            { error: 'This appears to be a scanned PDF — no extractable text. Try a different document.' },
            { status: 422 }
          );
        }
        documentText = result.text;
      } else if (lowerName.endsWith('.docx')) {
        const result = await extractTextFromBuffer(buffer, 'docx' as UploadFileType, file.name);
        documentText = result.text;
      } else {
        // .txt — genuinely plain text, safe to decode directly
        documentText = buffer.toString('utf-8').slice(0, 30000);
      }
    } catch (extractErr) {
      await supabase
        .from('uploaded_documents')
        .update({ extraction_status: 'failed' })
        .eq('id', docRecord.id);
      console.error('[parse-document] Text extraction error:', extractErr);
      return NextResponse.json({ error: 'Could not read this document — please try a different file' }, { status: 422 });
    }

    const rawText = await callLLM({
      task: 'extract',
      route: '/api/apply/parse-document',
      userId: user.id,
      max_tokens: 800,
      messages: [
        { role: 'system', content: 'You are a precise document data extractor. Reply only with valid JSON.' },
        { role: 'user', content: `Here is the document content:\n\n${documentText}\n\n${extractionPrompt}` },
      ],
    });

    if (!rawText) {
      await supabase
        .from('uploaded_documents')
        .update({ extraction_status: 'failed' })
        .eq('id', docRecord.id);
      console.error('[parse-document] LLM error: all providers failed');
      return NextResponse.json({ error: 'Extraction failed — please try again' }, { status: 502 });
    }

    // Parse JSON from response (strip markdown fences if present)
    let extracted: Record<string, string | null> = {};
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      extracted = {};
    }

    // Build field list (only non-null values)
    const fields: ExtractedField[] = Object.entries(extracted)
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
      .map(([key, value]) => ({
        key,
        label: FIELD_LABELS[key] ?? key,
        value: String(value).trim(),
      }));

    // Update upload record with results
    await supabase
      .from('uploaded_documents')
      .update({
        extraction_status: 'complete',
        extracted_json:    extracted,
        fields_total:      fields.length,
      })
      .eq('id', docRecord.id);

    return NextResponse.json({
      docId:   docRecord.id,
      fields,
      docType,
    } satisfies ParseDocumentResponse);

  } catch (err) {
    console.error('[parse-document]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
