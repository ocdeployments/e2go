/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { BUSINESS_CATEGORIES } from '@/lib/business-categories';

const supabase = createBrowserSupabaseClient();

// ─── Treaty Countries ────────────────────────────────────────────────────────
const TREATY_COUNTRIES = [
  { value: 'canada', label: 'Canada' },
  { value: 'united_kingdom', label: 'United Kingdom' },
  { value: 'australia', label: 'Australia' },
  { value: 'japan', label: 'Japan' },
  { value: 'south_korea', label: 'South Korea' },
  { value: 'germany', label: 'Germany' },
  { value: 'france', label: 'France' },
  { value: 'italy', label: 'Italy' },
  { value: 'spain', label: 'Spain' },
  { value: 'netherlands', label: 'Netherlands' },
  { value: 'switzerland', label: 'Switzerland' },
  { value: 'sweden', label: 'Sweden' },
  { value: 'belgium', label: 'Belgium' },
  { value: 'norway', label: 'Norway' },
  { value: 'denmark', label: 'Denmark' },
  { value: 'finland', label: 'Finland' },
  { value: 'ireland', label: 'Ireland' },
  { value: 'austria', label: 'Austria' },
  { value: 'poland', label: 'Poland' },
  { value: 'czech_republic', label: 'Czech Republic' },
  { value: 'hungary', label: 'Hungary' },
  { value: 'romania', label: 'Romania' },
  { value: 'mexico', label: 'Mexico' },
  { value: 'colombia', label: 'Colombia' },
  { value: 'argentina', label: 'Argentina' },
  { value: 'chile', label: 'Chile' },
  { value: 'turkey', label: 'Turkey' },
  { value: 'israel', label: 'Israel' },
  { value: 'jordan', label: 'Jordan' },
  { value: 'thailand', label: 'Thailand' },
  { value: 'pakistan', label: 'Pakistan' },
  { value: 'other', label: 'Other E-2 treaty country' },
];

const BUSINESS_TYPES = [
  { value: 'new', label: 'New business — starting from scratch' },
  { value: 'franchise', label: 'Franchise — licensed brand or system' },
  { value: 'acquisition', label: 'Acquisition — buying an existing business' },
];

const TARGET_CONSULATES = [
  { value: 'toronto', label: 'Toronto, Canada' },
  { value: 'london', label: 'London, UK' },
  { value: 'manila', label: 'Manila, Philippines' },
  { value: 'seoul', label: 'Seoul, South Korea' },
  { value: 'mumbai', label: 'Mumbai, India' },
  { value: 'other', label: 'Other' },
];

interface PendingFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'cover_letter' | 'business_plan' | 'other';
  error?: string;
}

type Step = 'form' | 'processing' | 'confirm';

interface ExtractedFields {
  businessName: string | null;
  investmentAmount: number | null;
  applicantName: string | null;
  targetState: string | null;
  employeeCountYear1: number | null;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SimulatorQuickStart() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [authReady, setAuthReady] = useState(false);

  // ── About you ──────────────────────────────────────────────────────────────
  const [applicantName, setApplicantName] = useState('');
  const [treatyCountry, setTreatyCountry] = useState('');

  // ── Your business ──────────────────────────────────────────────────────────
  const [businessCategory, setBusinessCategory] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [jobsYear1, setJobsYear1] = useState('');

  // ── Interview location ─────────────────────────────────────────────────────
  const [targetConsulate, setTargetConsulate] = useState('toronto');

  // ── Upload ─────────────────────────────────────────────────────────────────
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processing state
  const [documents, setDocuments] = useState<{
    documentId: string;
    filename: string;
    status: 'waiting' | 'classified' | 'extracting' | 'complete' | 'failed';
    fieldsFound?: number;
    error?: string;
  }[]>([]);
  const [overallStatus, setOverallStatus] = useState<'processing' | 'complete' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStartedExtraction = useRef(false);

  // Confirm step state
  const [confirmedAppId, setConfirmedAppId] = useState<string | null>(null);
  const [extractedFields, setExtractedFields] = useState<ExtractedFields | null>(null);
  const [confirmEdits, setConfirmEdits] = useState<Partial<ExtractedFields>>({});
  const [confirming, setConfirming] = useState(false);

  // Returning user state — set when an existing application is found on load
  const [existingApplicationId, setExistingApplicationId] = useState<string | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login?next=/simulator/quick-start');
        return;
      }

      // Check for an existing simulator application to pre-populate fields
      const { data: apps } = await supabase
        .from('applications')
        .select('id, source, principal_name, business_category')
        .eq('user_id', authUser.id)
        .eq('source', 'simulator_standalone')
        .order('created_at', { ascending: false })
        .limit(1);

      if (apps && apps.length > 0) {
        const simApp = apps[0];
        setExistingApplicationId(simApp.id);
        setIsReturningUser(true);

        if (simApp.principal_name) setApplicantName(simApp.principal_name);
        if (simApp.business_category) setBusinessCategory(simApp.business_category);

        const { data: answers } = await supabase
          .from('answers')
          .select('question_key, answer_value')
          .eq('application_id', simApp.id)
          .in('question_key', ['Q0-10', 'Q0-TC', 'Q0-BT', 'QF-02', 'QI-03', 'Q0-CO']);

        if (answers) {
          const aMap: Record<string, string> = {};
          answers.forEach((a: { question_key: string; answer_value: string }) => {
            if (a.answer_value) aMap[a.question_key] = a.answer_value;
          });
          if (aMap['Q0-10']) setBusinessCategory(aMap['Q0-10']);
          if (aMap['Q0-TC']) setTreatyCountry(aMap['Q0-TC']);
          if (aMap['Q0-BT']) setBusinessType(aMap['Q0-BT']);
          if (aMap['QF-02']) setInvestmentAmount(aMap['QF-02']);
          if (aMap['QI-03']) setJobsYear1(aMap['QI-03']);
          if (aMap['Q0-CO']) setTargetConsulate(aMap['Q0-CO']);
        }
      }

      setAuthReady(true);
    }
    checkAuth();
  }, [router]);

  // ===========================================================================
  // FILE MANAGEMENT
  // ===========================================================================

  const addFiles = useCallback((fileList: FileList) => {
    const newFiles: PendingFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
        newFiles.push({
          id: `file-${Date.now()}-${i}`,
          file,
          name: file.name,
          size: file.size,
          type: 'other',
          error: 'Only PDF and DOCX files accepted',
        });
        continue;
      }
      let detectedType: PendingFile['type'] = 'other';
      const lower = file.name.toLowerCase();
      if (lower.includes('cover') || lower.includes('letter')) {
        detectedType = 'cover_letter';
      } else if (lower.includes('business') || lower.includes('plan')) {
        detectedType = 'business_plan';
      }
      newFiles.push({
        id: `file-${Date.now()}-${i}`,
        file,
        name: file.name,
        size: file.size,
        type: detectedType,
      });
    }
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const updateFileType = useCallback((id: string, type: PendingFile['type']) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, type } : f));
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  }, [addFiles]);

  // ===========================================================================
  // FORM VALIDATION
  // ===========================================================================

  const validFiles = files.filter(f => !f.error);
  const canSubmit =
    applicantName.trim().length > 0 &&
    treatyCountry.length > 0 &&
    businessCategory.length > 0 &&
    businessType.length > 0 &&
    investmentAmount.trim().length > 0 &&
    (validFiles.length > 0 || isReturningUser) &&
    !uploading;

  // ===========================================================================
  // FORM SUBMISSION
  // ===========================================================================

  const handleStart = async () => {
    if (!canSubmit) return;

    setUploading(true);
    setUploadError(null);

    try {
      // 1. Create or update application with all intake fields
      const appRes = await fetch('/api/simulator/quick-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessCategory,
          applicantName: applicantName.trim(),
          treatyCountry,
          businessType,
          investmentAmount: investmentAmount ? parseFloat(investmentAmount.replace(/[^0-9.]/g, '')) : undefined,
          jobsYear1: jobsYear1 ? parseInt(jobsYear1) : undefined,
          targetConsulate,
          existingApplicationId: existingApplicationId || undefined,
        }),
      });

      if (!appRes.ok) {
        const errData = await appRes.json();
        throw new Error(errData.error || 'Failed to create application');
      }

      const { applicationId: appId } = await appRes.json();

      // Returning users with no new documents skip directly to Prepare
      if (isReturningUser && validFiles.length === 0) {
        router.push(`/simulator/case-file?applicationId=${appId}`);
        return;
      }

      // 2. Upload documents
      const formData = new FormData();
      formData.append('applicationId', appId);
      validFiles.forEach((f, idx) => {
        formData.append(`file_${idx}`, f.file);
        formData.append(`type_${idx}`, f.type);
      });

      const uploadRes = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.error || 'Failed to upload documents');
      }

      const { documents: uploadedDocs } = await uploadRes.json();
      const docIds = uploadedDocs.map((d: { id: string }) => d.id);

      // 3. Move to processing step
      setDocuments(docIds.map((id: string) => ({
        documentId: id,
        filename: '...',
        status: 'waiting' as const,
      })));
      setStep('processing');

      // 4. Start extraction
      await startExtraction(appId, docIds);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  // ===========================================================================
  // CONFIRM STEP
  // ===========================================================================

  async function fetchExtractedFields(appId: string): Promise<ExtractedFields> {
    const [{ data: app }, { data: answers }] = await Promise.all([
      supabase
        .from('applications')
        .select('business_name, principal_name, target_state')
        .eq('id', appId)
        .single(),
      supabase
        .from('answers')
        .select('question_key, answer_value')
        .eq('application_id', appId)
        .in('question_key', ['QF-02', 'M3-F-02', 'QI-03', 'M3-I-03', 'QA-51', 'M3-A-51']),
    ]);

    const aMap = new Map<string, string>();
    answers?.forEach((a: { question_key: string; answer_value: string }) => aMap.set(a.question_key, a.answer_value));

    const rawAmount = aMap.get('QF-02') || aMap.get('M3-F-02') || null;
    const amount = rawAmount ? parseFloat(rawAmount.replace(/[^0-9.]/g, '')) || null : null;
    const rawEmployees = aMap.get('QI-03') || aMap.get('M3-I-03') || null;
    const employees = rawEmployees ? parseInt(rawEmployees) || null : null;

    return {
      businessName: app?.business_name || aMap.get('QA-51') || aMap.get('M3-A-51') || null,
      investmentAmount: amount,
      applicantName: app?.principal_name || null,
      targetState: app?.target_state || null,
      employeeCountYear1: employees,
    };
  }

  async function handleConfirm() {
    if (!confirmedAppId) return;
    setConfirming(true);

    if (confirmEdits.businessName) {
      await supabase
        .from('applications')
        .update({ business_name: confirmEdits.businessName })
        .eq('id', confirmedAppId);
    }
    if (confirmEdits.applicantName) {
      await supabase
        .from('applications')
        .update({ principal_name: confirmEdits.applicantName })
        .eq('id', confirmedAppId);
    }
    if (confirmEdits.targetState) {
      await supabase
        .from('applications')
        .update({ target_state: confirmEdits.targetState })
        .eq('id', confirmedAppId);
    }
    if (confirmEdits.investmentAmount !== undefined && confirmEdits.investmentAmount !== null) {
      await supabase.from('answers').upsert({
        application_id: confirmedAppId,
        question_key: 'QF-02',
        answer_value: String(confirmEdits.investmentAmount),
        answered_at: new Date().toISOString(),
      }, { onConflict: 'application_id,question_key,family_member_id' });
    }

    router.push(`/simulator/case-file?applicationId=${confirmedAppId}`);
  }

  // ===========================================================================
  // SSE EXTRACTION
  // ===========================================================================

  const startExtraction = useCallback(async (appId: string, docIds: string[]) => {
    if (hasStartedExtraction.current) return;
    hasStartedExtraction.current = true;

    try {
      const response = await fetch('/api/documents/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, documentIds: docIds }),
      });

      if (!response.ok) throw new Error('Failed to start extraction');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

        for (const message of messages) {
          if (!message.trim()) continue;
          const eventMatch = message.match(/^event: (.+)$/m);
          const dataMatch = message.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);

          switch (event) {
            case 'document_start':
              setDocuments(prev => prev.map(d =>
                d.documentId === data.documentId ? { ...d, filename: data.filename, status: 'waiting' } : d
              ));
              break;
            case 'document_classified':
              setDocuments(prev => prev.map(d =>
                d.documentId === data.documentId ? { ...d, status: 'classified' } : d
              ));
              break;
            case 'document_extracted':
              setDocuments(prev => prev.map(d =>
                d.documentId === data.documentId ? { ...d, status: 'extracting', fieldsFound: data.fieldsFound } : d
              ));
              break;
            case 'document_complete':
              setDocuments(prev => prev.map(d =>
                d.documentId === data.documentId ? { ...d, status: 'complete' } : d
              ));
              break;
            case 'document_error':
              setDocuments(prev => prev.map(d =>
                d.documentId === data.documentId ? { ...d, status: 'failed', error: data.message } : d
              ));
              break;
            case 'extraction_complete':
              setOverallStatus('complete');
              setTimeout(async () => {
                const fields = await fetchExtractedFields(appId);
                setExtractedFields(fields);
                setConfirmedAppId(appId);
                setStep('confirm');
              }, 800);
              break;
            case 'error':
              setOverallStatus('error');
              setErrorMessage(data.message);
              break;
          }
        }
      }
    } catch (err) {
      setOverallStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Extraction failed');
    }
  }, []);

  // ===========================================================================
  // RENDER GUARDS
  // ===========================================================================

  if (!authReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <div style={{ width: '28px', height: '28px', border: '2px solid #C9A84C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  // ===========================================================================
  // RENDER — FORM STEP
  // ===========================================================================

  if (step === 'form') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f5f0e8',
        fontFamily: "'DM Sans', sans-serif",
        padding: '48px 24px 80px',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ color: '#C9A84C', fontSize: '12px' }}>&#9670;</span>
              <span style={{ color: '#C9A84C', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, fontWeight: 500 }}>
                SIMULATOR QUICK START
              </span>
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '36px', fontWeight: 300, color: '#f5f0e8', lineHeight: 1.1, marginBottom: '12px' }}>
              Tell us about your case
            </h1>
            <p style={{ fontSize: '14px', fontWeight: 300, color: 'rgba(245,240,232,0.78)', lineHeight: 1.7 }}>
              The more context you give us, the more realistic and targeted your practice interview will be.
              This takes about two minutes.
            </p>
          </div>

          {isReturningUser && existingApplicationId && (
            <div style={{
              padding: '14px 18px',
              background: 'rgba(201,168,76,0.05)',
              border: '1px solid rgba(201,168,76,0.2)',
              marginBottom: '28px',
            }}>
              <p style={{ fontSize: '13px', color: 'rgba(201,168,76,0.85)', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                We found your existing case — fields are pre-filled from your last session. Update anything below or add more documents.
              </p>
              <a
                href={`/simulator/case-file?applicationId=${existingApplicationId}`}
                style={{ fontSize: '12px', color: '#C9A84C', textDecoration: 'underline' }}
              >
                Skip straight to your Prepare guide →
              </a>
            </div>
          )}

          {/* ── Section 1: About You ──────────────────────────────────────── */}
          <SectionHeading label="About you" />
          <FormCard>
            <FormField label="Your full name" required hint="As it appears on your application">
              <TextInput value={applicantName} onChange={setApplicantName} placeholder="e.g. Michael Chen" />
            </FormField>
            <FormField
              label="Treaty country"
              required
              hint="The country of which you are a citizen that has an E-2 treaty with the US"
            >
              <SelectInput
                value={treatyCountry}
                onChange={setTreatyCountry}
                placeholder="Select your country..."
                options={TREATY_COUNTRIES}
              />
            </FormField>
          </FormCard>

          {/* ── Section 2: Your Business ──────────────────────────────────── */}
          <SectionHeading label="Your business" />
          <FormCard>
            <FormField label="Business category" required>
              <SelectInput
                value={businessCategory}
                onChange={setBusinessCategory}
                placeholder="Select your business type..."
                options={BUSINESS_CATEGORIES}
              />
            </FormField>

            <FormField
              label="Business type"
              required
              hint="Starting fresh, buying a franchise, or acquiring an existing business?"
            >
              <SelectInput
                value={businessType}
                onChange={setBusinessType}
                placeholder="Select..."
                options={BUSINESS_TYPES}
              />
            </FormField>

            <FormField
              label="Total investment (USD)"
              required
              hint="Your committed investment amount — an estimate is fine"
            >
              <TextInput
                value={investmentAmount}
                onChange={setInvestmentAmount}
                placeholder="e.g. 150000"
                type="number"
              />
            </FormField>

            <FormField
              label="Jobs to create — Year 1"
              hint="How many employees (other than yourself) in the first year?"
            >
              <TextInput
                value={jobsYear1}
                onChange={setJobsYear1}
                placeholder="e.g. 3"
                type="number"
              />
            </FormField>
          </FormCard>

          {/* ── Section 3: Interview Location ─────────────────────────────── */}
          <SectionHeading label="Interview location" />
          <FormCard>
            <FormField label="Target consulate">
              <SelectInput
                value={targetConsulate}
                onChange={setTargetConsulate}
                placeholder=""
                options={TARGET_CONSULATES}
              />
            </FormField>
          </FormCard>

          {/* ── Section 4: Documents ──────────────────────────────────────── */}
          <SectionHeading label="Your documents" />
          <FormCard>
            <FormField label="Upload documents" required hint="Cover letter and/or business plan — PDF or DOCX">
              <DropZone
                isDragging={isDragging}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
              {files.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  {files.map((f) => (
                    <FileRow key={f.id} file={f} onUpdateType={updateFileType} onRemove={removeFile} />
                  ))}
                </div>
              )}
            </FormField>
          </FormCard>

          {/* Error */}
          {uploadError && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5',
              fontSize: '13px',
              marginBottom: '20px',
            }}>
              {uploadError}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleStart}
            disabled={!canSubmit}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: canSubmit ? '#C9A84C' : 'rgba(201,168,76,0.25)',
              color: '#0a0a0a',
              fontSize: '15px',
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              border: 'none',
              letterSpacing: '0.02em',
            }}
          >
            {uploading
              ? (isReturningUser ? 'Updating your case…' : 'Creating your case…')
              : isReturningUser && validFiles.length === 0
                ? 'Update & go to Prepare →'
                : isReturningUser
                  ? 'Update & process documents →'
                  : 'Upload & analyse documents →'}
          </button>

          <div style={{ marginTop: '16px', textAlign: 'center' as const }}>
            <a href="/simulator" style={{ color: 'rgba(201,168,76,0.6)', fontSize: '13px', textDecoration: 'underline' }}>
              ← Back to simulator
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // RENDER — PROCESSING STEP
  // ===========================================================================

  if (step === 'processing') {
    const completedCount = documents.filter(d => d.status === 'complete').length;
    const failedCount = documents.filter(d => d.status === 'failed').length;

    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f5f0e8',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{ maxWidth: '560px', width: '100%' }}>
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ color: '#C9A84C', fontSize: '12px' }}>&#9670;</span>
              <span style={{ color: '#C9A84C', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, fontWeight: 500 }}>
                READING DOCUMENTS
              </span>
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 300, color: '#f5f0e8', lineHeight: 1.1, marginBottom: '8px' }}>
              {overallStatus === 'complete' ? 'Extraction complete' : overallStatus === 'error' ? 'Something went wrong' : 'Reading your documents…'}
            </h1>
            {overallStatus === 'processing' && (
              <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.72)' }}>This takes about 30–60 seconds per document.</p>
            )}
            {overallStatus === 'complete' && (
              <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.72)' }}>
                {completedCount} document{completedCount !== 1 ? 's' : ''} processed. Redirecting…
              </p>
            )}
          </div>

          {errorMessage && (
            <div style={{ padding: '16px', border: '1px solid rgba(200,80,80,0.3)', color: 'rgba(200,120,120,0.9)', fontSize: '13px', marginBottom: '24px' }}>
              {errorMessage}
              <button
                onClick={() => router.push('/simulator')}
                style={{ display: 'block', marginTop: '12px', background: 'none', border: 'none', color: '#C9A84C', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.05em', cursor: 'pointer', padding: 0 }}
              >
                Return to simulator
              </button>
            </div>
          )}

          <div>
            {documents.map((doc) => (
              <div key={doc.documentId} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                border: `1px solid ${doc.status === 'failed' ? 'rgba(200,80,80,0.2)' : doc.status === 'complete' ? 'rgba(201,168,76,0.15)' : 'rgba(201,168,76,0.06)'}`,
                marginBottom: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '8px', height: '8px', flexShrink: 0, background: doc.status === 'complete' ? '#C9A84C' : doc.status === 'failed' ? 'rgba(200,80,80,0.7)' : doc.status === 'waiting' ? 'rgba(245,240,232,0.62)' : 'rgba(201,168,76,0.82)' }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13px', color: doc.status === 'failed' ? 'rgba(200,120,120,0.8)' : '#f5f0e8', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.filename}</p>
                    {doc.error && <p style={{ fontSize: '11px', color: 'rgba(200,120,120,0.6)', marginTop: '2px' }}>{doc.error}</p>}
                  </div>
                </div>
                <div style={{ flexShrink: 0, marginLeft: '12px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: doc.status === 'complete' ? 'rgba(201,168,76,0.6)' : doc.status === 'failed' ? 'rgba(200,120,120,0.6)' : 'rgba(245,240,232,0.65)' }}>
                    {doc.status === 'waiting' ? 'Waiting…' : doc.status === 'classified' ? 'Classifying…' : doc.status === 'extracting' ? 'Extracting…' : doc.status === 'complete' ? (doc.fieldsFound !== undefined ? `${doc.fieldsFound} fields` : 'Complete') : 'Failed'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {overallStatus === 'processing' && documents.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ height: '1px', width: '100%', background: 'rgba(201,168,76,0.1)' }}>
                <div style={{ height: '1px', width: `${((completedCount + failedCount) / documents.length) * 100}%`, background: '#C9A84C', transition: 'width 0.5s' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===========================================================================
  // RENDER — PROFILE STEP (replaces old "confirm" step)
  // ===========================================================================

  if (step === 'confirm') {
    // Merge Quick Start form values with document-extracted values.
    // Quick Start answers always take priority for fields the user explicitly typed.
    // Extraction adds new values (especially businessName, targetState) not in the form.
    const profileName = applicantName || extractedFields?.applicantName || '';
    const profileBusiness = (confirmEdits.businessName !== undefined
      ? confirmEdits.businessName
      : extractedFields?.businessName) ?? '';
    const rawInvestment = investmentAmount || (extractedFields?.investmentAmount != null
      ? String(Math.round(extractedFields.investmentAmount))
      : '');
    const rawJobs = jobsYear1 || (extractedFields?.employeeCountYear1 != null
      ? String(extractedFields.employeeCountYear1)
      : '');
    const profileTargetState = (confirmEdits.targetState !== undefined
      ? confirmEdits.targetState
      : extractedFields?.targetState) ?? '';

    const categoryLabel = BUSINESS_CATEGORIES.find(c => c.value === businessCategory)?.label ?? businessCategory;
    const typeLabel = BUSINESS_TYPES.find(t => t.value === businessType)?.label ?? businessType;
    const consulateLabel = TARGET_CONSULATES.find(c => c.value === targetConsulate)?.label ?? targetConsulate;
    const countryLabel = TREATY_COUNTRIES.find(c => c.value === treatyCountry)?.label ?? treatyCountry;

    const investmentDisplay = rawInvestment
      ? `$${Number(rawInvestment.replace(/[^0-9.]/g, '')).toLocaleString()}`
      : '';

    const docsExtracted = [
      extractedFields?.businessName,
      extractedFields?.targetState,
    ].filter(Boolean).length;

    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f5f0e8',
        fontFamily: "'DM Sans', sans-serif",
        padding: '48px 24px 80px',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ color: '#C9A84C', fontSize: '12px' }}>&#9670;</span>
              <span style={{ color: '#C9A84C', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, fontWeight: 500 }}>
                YOUR PROFILE
              </span>
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '36px', fontWeight: 300, color: '#f5f0e8', lineHeight: 1.1, marginBottom: '12px' }}>
              Let&apos;s build a profile
            </h1>
            <p style={{ fontSize: '14px', fontWeight: 300, color: 'rgba(245,240,232,0.76)', lineHeight: 1.7 }}>
              {docsExtracted > 0
                ? `Documents processed — ${docsExtracted} additional field${docsExtracted > 1 ? 's' : ''} found. Review your profile below.`
                : 'Your profile is ready. Review the details below before moving to interview preparation.'}
            </p>
          </div>

          {/* Section: About You */}
          <ProfileSection label="About You">
            <ProfileRow label="Full Name" value={profileName} />
            <ProfileRow label="Treaty Country" value={countryLabel} />
          </ProfileSection>

          {/* Section: Your Business */}
          <ProfileSection label="Your Business">
            <ProfileRow
              label="Business Name"
              value={profileBusiness}
              placeholder="Enter your business name"
              editable={!extractedFields?.businessName && !confirmEdits.businessName}
              onChange={(v) => setConfirmEdits(prev => ({ ...prev, businessName: v || null }))}
            />
            <ProfileRow label="Category" value={categoryLabel} />
            <ProfileRow label="Business Type" value={typeLabel} />
          </ProfileSection>

          {/* Section: Investment & Employment */}
          <ProfileSection label="Investment &amp; Employment">
            <ProfileRow label="Total Investment" value={investmentDisplay} />
            <ProfileRow label="Jobs to Create — Year 1" value={rawJobs} />
          </ProfileSection>

          {/* Section: Interview Location */}
          <ProfileSection label="Interview Location">
            <ProfileRow label="Target Consulate" value={consulateLabel} />
            <ProfileRow
              label="Target State"
              value={profileTargetState}
              placeholder="e.g. Texas"
              editable={!extractedFields?.targetState && !confirmEdits.targetState}
              onChange={(v) => setConfirmEdits(prev => ({ ...prev, targetState: v || null }))}
            />
          </ProfileSection>

          {/* CTA */}
          <button
            onClick={handleConfirm}
            disabled={confirming}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: confirming ? 'rgba(201,168,76,0.3)' : '#C9A84C',
              color: '#0a0a0a',
              fontSize: '15px',
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              cursor: confirming ? 'not-allowed' : 'pointer',
              border: 'none',
              marginTop: '32px',
              letterSpacing: '0.02em',
            }}
          >
            {confirming ? 'Preparing your case…' : 'Continue to Interview Preparation →'}
          </button>

          <div style={{ marginTop: '16px', textAlign: 'center' as const }}>
            <button
              onClick={() => confirmedAppId && router.push(`/simulator/case-file?applicationId=${confirmedAppId}`)}
              style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.68)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Skip to preparation guide
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// =============================================================================
// FORM SUB-COMPONENTS
// =============================================================================

function SectionHeading({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', marginTop: '32px' }}>
      <span style={{ color: '#C9A84C', fontSize: '10px' }}>&#9670;</span>
      <span style={{
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.14em',
        textTransform: 'uppercase' as const,
        color: 'rgba(201,168,76,0.7)',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {label}
      </span>
    </div>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(201,168,76,0.02)', border: '1px solid rgba(201,168,76,0.1)', padding: '24px 28px', marginBottom: '4px' }}>
      {children}
    </div>
  );
}

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(245,240,232,0.65)', marginBottom: hint ? '4px' : '8px', letterSpacing: '0.02em' }}>
        {label}
        {required && <span style={{ color: '#C9A84C', marginLeft: '4px' }}>*</span>}
      </label>
      {hint && (
        <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.68)', marginBottom: '8px', lineHeight: 1.4 }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.18)', color: '#f5f0e8', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' as const }}
    />
  );
}

function SelectInput({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: ReadonlyArray<{ value: string; label: string }> }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: '100%', padding: '11px 14px', background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(201,168,76,0.18)', color: value ? '#f5f0e8' : 'rgba(245,240,232,0.70)', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", appearance: 'none' as const, cursor: 'pointer', boxSizing: 'border-box' as const }}
    >
      {placeholder && (
        <option value="" style={{ background: '#0a0a0a', color: 'rgba(245,240,232,0.70)' }}>
          {placeholder}
        </option>
      )}
      {options.map(opt => (
        <option key={opt.value} value={opt.value} style={{ background: '#0a0a0a', color: '#f5f0e8' }}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function DropZone({ isDragging, onDragOver, onDragLeave, onDrop, onClick }: { isDragging: boolean; onDragOver: (e: React.DragEvent) => void; onDragLeave: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void; onClick: () => void }) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      style={{ padding: '28px 20px', border: `1px dashed ${isDragging ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, background: isDragging ? 'rgba(201,168,76,0.04)' : 'transparent', cursor: 'pointer', textAlign: 'center' as const, transition: 'border-color 0.15s, background 0.15s' }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px', display: 'block' }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.78)', marginBottom: '3px' }}>
        Drop files here or <span style={{ color: '#C9A84C' }}>browse</span>
      </p>
      <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.65)' }}>
        PDF or DOCX — cover letter and/or business plan
      </p>
    </div>
  );
}

function FileRow({ file, onUpdateType, onRemove }: { file: { id: string; name: string; error?: string; type: 'cover_letter' | 'business_plan' | 'other' }; onUpdateType: (id: string, type: 'cover_letter' | 'business_plan' | 'other') => void; onRemove: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', border: `1px solid ${file.error ? 'rgba(200,80,80,0.2)' : 'rgba(201,168,76,0.08)'}`, marginBottom: '6px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '12px', color: file.error ? 'rgba(200,120,120,0.8)' : '#f5f0e8', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</p>
        {file.error && <p style={{ fontSize: '11px', color: 'rgba(200,120,120,0.6)', marginTop: '2px' }}>{file.error}</p>}
      </div>
      {!file.error && (
        <select
          value={file.type}
          onChange={(e) => onUpdateType(file.id, e.target.value as 'cover_letter' | 'business_plan' | 'other')}
          style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)', color: 'rgba(245,240,232,0.6)', fontSize: '11px', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' }}
        >
          <option value="cover_letter" style={{ background: '#0a0a0a' }}>Cover letter</option>
          <option value="business_plan" style={{ background: '#0a0a0a' }}>Business plan</option>
          <option value="other" style={{ background: '#0a0a0a' }}>Other</option>
        </select>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(file.id); }}
        style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.68)', cursor: 'pointer', padding: '2px', fontSize: '16px', lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}

// =============================================================================
// PROFILE SUB-COMPONENTS (used in the Your Profile / confirm step)
// =============================================================================

function ProfileSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '6px' }}>
      <div style={{
        padding: '9px 20px',
        background: 'rgba(201,168,76,0.06)',
        borderTop: '1px solid rgba(201,168,76,0.15)',
        borderLeft: '1px solid rgba(201,168,76,0.15)',
        borderRight: '1px solid rgba(201,168,76,0.15)',
        borderBottom: 'none',
      }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase' as const,
          color: 'rgba(201,168,76,0.75)',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {label}
        </span>
      </div>
      <div style={{
        border: '1px solid rgba(201,168,76,0.12)',
        borderTop: 'none',
      }}>
        {children}
      </div>
    </div>
  );
}

interface ProfileRowProps {
  label: string;
  value: string;
  placeholder?: string;
  editable?: boolean;
  onChange?: (v: string) => void;
}

function ProfileRow({ label, value, placeholder, editable = false, onChange }: ProfileRowProps) {
  const hasValue = value && value.length > 0;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '13px 20px',
      borderBottom: '1px solid rgba(245,240,232,0.04)',
      gap: '20px',
      minHeight: '48px',
    }}>
      <span style={{
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.05em',
        color: 'rgba(245,240,232,0.70)',
        textTransform: 'uppercase' as const,
        width: '160px',
        flexShrink: 0,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {label}
      </span>
      {editable && !hasValue ? (
        <input
          type="text"
          placeholder={placeholder ?? '—'}
          onChange={(e) => onChange?.(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(201,168,76,0.2)',
            color: '#f5f0e8',
            fontSize: '14px',
            fontFamily: "'DM Sans', sans-serif",
            padding: '2px 0',
            outline: 'none',
          }}
        />
      ) : (
        <span style={{
          fontSize: '14px',
          color: hasValue ? '#f5f0e8' : 'rgba(245,240,232,0.62)',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {hasValue ? value : '—'}
        </span>
      )}
    </div>
  );
}
