'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { FddTransactionType, FddSSEEvent } from '@/types/fdd';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

const REGISTRATION_STATES = new Set([
  'CA','HI','IL','IN','MD','MI','MN','NY','ND','OR','RI','SD','VA','WA','WI',
]);

type Phase = 'intake' | 'uploading' | 'extracting' | 'done' | 'error';

interface ExtractionProgress {
  chunk: string;
  pct: number;
  message: string;
}

const CHUNK_LABELS: Record<string, string> = {
  items_1_7: 'Extracting franchisor info, fees & investment...',
  items_11_12: 'Extracting training program & territory...',
  item_17: 'Extracting renewal, termination & transfer terms...',
  items_19_21: 'Extracting financial performance & outlet data...',
  complete: 'Finalising extraction...',
};

export default function FddUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('intake');
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ExtractionProgress>({ chunk: '', pct: 0, message: '' });
  const [stalenessWarn, setStalenessWarn] = useState<string | null>(null);
  const [registrationWarn, setRegistrationWarn] = useState<string | null>(null);

  // Intake form state
  const [transactionType, setTransactionType] = useState<FddTransactionType>('new_unit');
  const [targetCity, setTargetCity] = useState('');
  const [targetState, setTargetState] = useState('');
  const [targetZip, setTargetZip] = useState('');

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('FDDs must be uploaded as PDF files.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('File exceeds 50MB limit.');
      return;
    }
    setErrorMsg('');
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  async function handleSubmit() {
    if (!selectedFile) { setErrorMsg('Please select your FDD PDF.'); return; }
    if (!targetState) { setErrorMsg('Please select your target state.'); return; }

    setPhase('uploading');
    setErrorMsg('');

    // Upload
    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('transaction_type', transactionType);
    fd.append('target_city', targetCity);
    fd.append('target_state', targetState);
    fd.append('target_zip', targetZip);

    let fddId: string;
    try {
      const res = await fetch('/api/fdd/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Upload failed');
      }
      const json = await res.json();
      fddId = json.fdd_id;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
      setPhase('error');
      return;
    }

    // Extract via SSE
    setPhase('extracting');
    setProgress({ chunk: '', pct: 0, message: 'Starting extraction...' });

    try {
      const res = await fetch('/api/fdd/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fdd_id: fddId }),
      });

      if (!res.body) throw new Error('No response stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent({ event: currentEvent, data } as FddSSEEvent, fddId);
              currentEvent = '';
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Extraction failed');
      setPhase('error');
    }
  }

  function handleSSEEvent(event: FddSSEEvent, fddId: string) {
    if (event.event === 'progress') {
      setProgress({
        chunk: event.data.chunk,
        pct: event.data.pct,
        message: CHUNK_LABELS[event.data.chunk] || 'Processing...',
      });
    } else if (event.event === 'staleness_check') {
      if (event.data.status !== 'current') {
        const months = event.data.age_months;
        const ageLabel = months !== null && months !== undefined ? `${months} months old` : 'of unknown age';
        setStalenessWarn(
          event.data.status === 'fail'
            ? `This FDD is ${ageLabel} — it may be superseded. Request the current year FDD before proceeding.`
            : `This FDD is ${ageLabel}. Confirm no material changes since issuance.`
        );
      }
    } else if (event.event === 'registration_check') {
      if (event.data.is_registration_state && event.data.status === 'fail') {
        setRegistrationWarn(
          `${targetState} is a franchise registration state and this franchisor does not appear to be registered there. This requires attorney review before any investment decision.`
        );
      }
    } else if (event.event === 'extraction_complete') {
      setPhase('done');
      setTimeout(() => router.push(`/fdd/review/${fddId}`), 1200);
    } else if (event.event === 'error') {
      setErrorMsg(event.data.message);
      setPhase('error');
    }
  }

  const isRegistrationState = REGISTRATION_STATES.has(targetState);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-10">
          <p className="text-[#C9A84C] text-sm tracking-widest uppercase mb-3">FDD Intelligence</p>
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-light text-white mb-4">
            Analyse Your Franchise Disclosure Document
          </h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Upload your FDD PDF. Our system extracts 50 structured data points across 12 mandatory
            Items, scores your franchise for E-2 visa compatibility, and generates questions to ask
            your franchisor.
          </p>
        </div>

        {(phase === 'intake' || phase === 'error') && (
          <div className="space-y-8">

            {/* Transaction type */}
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-widest mb-3">
                Transaction type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  ['new_unit', 'New unit', 'Buying a new franchise territory'],
                  ['resale', 'Resale', 'Buying an existing operating unit'],
                  ['multi_unit_development', 'Multi-unit', 'Development agreement for multiple locations'],
                ] as const).map(([val, label, desc]) => (
                  <button
                    key={val}
                    onClick={() => setTransactionType(val)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      transactionType === val
                        ? 'border-[#C9A84C] bg-[#C9A84C]/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="text-sm font-medium text-white mb-1">{label}</div>
                    <div className="text-xs text-white/40">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target location */}
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-widest mb-3">
                Target location
              </label>
              <div className="grid grid-cols-5 gap-3">
                <input
                  value={targetCity}
                  onChange={e => setTargetCity(e.target.value)}
                  placeholder="City"
                  className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#C9A84C]/50"
                />
                <select
                  value={targetState}
                  onChange={e => setTargetState(e.target.value)}
                  className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]/50"
                >
                  <option value="">State</option>
                  {US_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input
                  value={targetZip}
                  onChange={e => setTargetZip(e.target.value)}
                  placeholder="ZIP"
                  maxLength={5}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#C9A84C]/50"
                />
              </div>
              {isRegistrationState && targetState && (
                <p className="mt-2 text-xs text-amber-400/80">
                  {targetState} is a franchise registration state — we will check registration status during extraction.
                </p>
              )}
            </div>

            {/* File drop zone */}
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-widest mb-3">
                FDD PDF
              </label>
              <div
                className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-[#C9A84C] bg-[#C9A84C]/5'
                    : selectedFile
                    ? 'border-[#C9A84C]/40 bg-[#C9A84C]/5'
                    : 'border-white/10 hover:border-white/20'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
                />

                {selectedFile ? (
                  <div>
                    <div className="text-[#C9A84C] text-2xl mb-2">✓</div>
                    <p className="text-white font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-white/40 text-xs mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB — click to change
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-white/20 text-3xl mb-3">↑</div>
                    <p className="text-white/60 text-sm font-medium mb-1">Drop your FDD here</p>
                    <p className="text-white/30 text-xs">PDF only · up to 50MB</p>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!selectedFile || !targetState}
              className="w-full bg-[#C9A84C] text-[#0a0a0a] font-semibold py-4 rounded-xl text-sm tracking-wide hover:bg-[#d4b55a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Upload &amp; Begin Extraction
            </button>

            <p className="text-xs text-white/25 text-center leading-relaxed">
              This analysis does not constitute legal, financial, or franchise advice.
              Always engage a qualified franchise attorney and immigration attorney before signing.
            </p>
          </div>
        )}

        {/* Uploading */}
        {phase === 'uploading' && (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin mx-auto mb-6" />
            <p className="text-white/60 text-sm">Uploading your FDD...</p>
          </div>
        )}

        {/* Extracting */}
        {phase === 'extracting' && (
          <div className="py-8 space-y-8">
            <div>
              <div className="flex justify-between text-xs text-white/40 mb-2">
                <span>{progress.message || 'Initialising extraction...'}</span>
                <span>{progress.pct}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C9A84C] rounded-full transition-all duration-500"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {[
                { key: 'items_1_7', label: 'Franchisor, fees & investment' },
                { key: 'items_11_12', label: 'Training & territory' },
                { key: 'item_17', label: 'Renewal, termination & transfer' },
                { key: 'items_19_21', label: 'Financial performance & outlets' },
              ].map(({ key, label }) => {
                const chunks = ['items_1_7', 'items_11_12', 'item_17', 'items_19_21', 'complete'];
                const chunkIdx = chunks.indexOf(progress.chunk);
                const thisIdx = chunks.indexOf(key);
                const isDone = chunkIdx > thisIdx;
                const isActive = chunkIdx === thisIdx;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs transition-all ${
                      isDone ? 'bg-[#C9A84C] border-[#C9A84C] text-[#0a0a0a]'
                      : isActive ? 'border-[#C9A84C] text-[#C9A84C]'
                      : 'border-white/15 text-white/20'
                    }`}>
                      {isDone ? '✓' : '·'}
                    </div>
                    <span className={`text-sm ${isDone ? 'text-white/60' : isActive ? 'text-white' : 'text-white/25'}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Warnings surface during extraction */}
            {stalenessWarn && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-xs text-amber-400">
                ⚠ {stalenessWarn}
              </div>
            )}
            {registrationWarn && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-xs text-red-400">
                ⚠ {registrationWarn}
              </div>
            )}
          </div>
        )}

        {/* Done */}
        {phase === 'done' && (
          <div className="text-center py-16">
            <div className="text-[#C9A84C] text-4xl mb-4">✓</div>
            <p className="text-white font-medium mb-2">Extraction complete</p>
            <p className="text-white/40 text-sm">Redirecting to your results...</p>
          </div>
        )}
      </div>
    </main>
  );
}
