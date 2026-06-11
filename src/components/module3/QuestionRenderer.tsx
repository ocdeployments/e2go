'use client';

import { useState } from 'react';

interface QuestionOption {
  value: string;
  label: string;
  helperText?: string;
}

interface WarningTrigger {
  value: string;
  message: string;
}

interface QuestionConfig {
  key: string;
  type: 'single' | 'multi' | 'text' | 'number' | 'date';
  question: string;
  tooltip: string;
  options?: QuestionOption[];
  required: boolean;
  sensitivity?: 'high' | 'medium' | 'low';
  privacy_category?: 'red' | 'amber' | 'green' | 'required';
  skip_advisory?: string;
  warningTriggers?: WarningTrigger[];
}

interface QuestionRendererProps {
  question: QuestionConfig;
  value: string | string[] | number | null;
  onChange: (value: string | string[] | number | null) => void;
  onSkip?: () => void;
  disabled: boolean;
}

export default function QuestionRenderer({
  question,
  value,
  onChange,
  onSkip,
  disabled,
}: QuestionRendererProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const activeWarning = question.warningTriggers?.find(
    (wt) => wt.value === value
  );

  const privacyCategory = question.privacy_category || 'green';
  const isRequired = privacyCategory === 'required';
  const showSkip = !isRequired && privacyCategory !== 'green';

  const handleSkip = () => {
    if (privacyCategory === 'red') {
      setShowSkipModal(true);
    } else {
      confirmSkip();
    }
  };

  const confirmSkip = () => {
    setShowSkipModal(false);
    setIsSkipped(true);
    onChange(null);
    if (onSkip) {
      onSkip();
    }
  };

  const renderSingle = () => (
    <div className="space-y-3">
      {question.options?.map((option) => (
        <label
          key={option.value}
          className={`flex items-start gap-3 p-5 border rounded-xl cursor-pointer transition-all ${
            value === option.value
              ? ''
              : 'hover:opacity-80'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            borderColor: value === option.value ? "var(--teal)" : "var(--glass-border)",
            background: value === option.value ? "var(--teal-dim)" : "var(--glass-bg)",
          }}
        >
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
              value === option.value
                ? ''
                : ''
            }`}
            style={{
              borderColor: value === option.value ? "var(--teal)" : "var(--glass-border)",
            }}
          >
            {value === option.value && (
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--teal)" }} />
            )}
          </div>
          <div className="flex-1">
            <span className="block text-sm font-medium" style={{ fontWeight: 500, fontSize: '14px', color: "var(--white)" }}>
              {option.label}
            </span>
            {option.helperText && (
              <span className="block text-xs mt-1" style={{ fontSize: '14px', color: "var(--white-dim)" }}>
                {option.helperText}
              </span>
            )}
          </div>
        </label>
      ))}
    </div>
  );

  const renderMulti = () => {
    const currentValues = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-3">
        {question.options?.map((option) => (
          <label
            key={option.value}
            className={`flex items-start gap-3 p-5 border rounded-xl cursor-pointer transition-all ${
              currentValues.includes(option.value)
                ? ''
                : 'hover:opacity-80'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
              borderColor: currentValues.includes(option.value) ? "var(--teal)" : "var(--glass-border)",
              background: currentValues.includes(option.value) ? "var(--teal-dim)" : "var(--glass-bg)",
            }}
          >
            <input
              type="checkbox"
              value={option.value}
              checked={currentValues.includes(option.value)}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...currentValues, option.value]);
                } else {
                  onChange(currentValues.filter((v) => v !== option.value));
                }
              }}
              disabled={disabled}
              className="mt-1 w-5 h-5 rounded flex-shrink-0"
              style={{ accentColor: "var(--teal)" }}
            />
            <div>
              <span className="block text-sm font-medium" style={{ fontWeight: 500, fontSize: '14px', color: "var(--white)" }}>
                {option.label}
              </span>
              {option.helperText && (
                <span className="block text-xs mt-1" style={{ fontSize: '14px', color: "var(--white-dim)" }}>
                  {option.helperText}
                </span>
              )}
            </div>
          </label>
        ))}
      </div>
    );
  };

  const renderText = () => (
    <div>
      <textarea
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={4}
        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#C9A84C] focus:ring-offset-2 disabled:opacity-50"
        style={{
          borderColor: "var(--glass-border)",
          background: "var(--glass-bg)",
          color: "var(--white)",
        }}
        placeholder="Enter your response..."
      />
      <div className="text-xs mt-1 text-right" style={{ fontSize: '14px', color: "var(--white-dim)" }}>
        {typeof value === 'string' ? value.length : 0} characters
      </div>
    </div>
  );

  const renderNumber = () => (
    <input
      type="number"
      value={value as number ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      disabled={disabled}
      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#C9A84C] focus:ring-offset-2 disabled:opacity-50"
      style={{
        borderColor: "var(--glass-border)",
        background: "var(--glass-bg)",
        color: "var(--white)",
      }}
      placeholder="Enter amount"
    />
  );

  const renderDate = () => {
    const dateValue = value as string || '';
    const [month, day, year] = dateValue ? dateValue.split('/') : ['', '', ''];

    return (
      <div className="flex gap-2">
        <select
          value={month}
          onChange={(e) => onChange(`${e.target.value}/${day}/${year}`)}
          disabled={disabled}
          className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#C9A84C] focus:ring-offset-2 disabled:opacity-50"
          style={{
            borderColor: "var(--glass-border)",
            background: "var(--glass-bg)",
            color: "var(--white)",
          }}
        >
          <option value="">Month</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
              {new Date(2000, i).toLocaleString('en', { month: 'long' })}
            </option>
          ))}
        </select>
        <select
          value={day}
          onChange={(e) => onChange(`${month}/${e.target.value}/${year}`)}
          disabled={disabled}
          className="w-20 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#C9A84C] focus:ring-offset-2 disabled:opacity-50"
          style={{
            borderColor: "var(--glass-border)",
            background: "var(--glass-bg)",
            color: "var(--white)",
          }}
        >
          <option value="">Day</option>
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
              {i + 1}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => onChange(`${month}/${day}/${e.target.value}`)}
          disabled={disabled}
          className="w-28 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#C9A84C] focus:ring-offset-2 disabled:opacity-50"
          style={{
            borderColor: "var(--glass-border)",
            background: "var(--glass-bg)",
            color: "var(--white)",
          }}
        >
          <option value="">Year</option>
          {Array.from({ length: 100 }, (_, i) => (
            <option key={1926 + i} value={String(1926 + i)}>
              {1926 + i}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Question header with tooltip */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold font-playfair" style={{ fontSize: '18px', fontWeight: 600, color: "var(--white)" }}>
          {question.question}
          {question.required && <span className="text-red-400 ml-1">*</span>}
        </h3>
        <button
          type="button"
          onClick={() => setShowTooltip(!showTooltip)}
          className="p-1 flex-shrink-0 hover:opacity-70"
          style={{ color: "var(--white-dim)" }}
          aria-label="More information"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Tooltip content */}
      {showTooltip && (
        <div className="p-3 border rounded-lg text-sm" style={{ fontSize: '14px', borderColor: "var(--glass-border)", background: "var(--glass-bg)", color: "var(--white-dim)" }}>
          {question.tooltip}
        </div>
      )}

      {/* Input based on type */}
      {question.type === 'single' && renderSingle()}
      {question.type === 'multi' && renderMulti()}
      {question.type === 'text' && renderText()}
      {question.type === 'number' && renderNumber()}
      {question.type === 'date' && renderDate()}

      {/* Skip link for sensitive fields - based on privacy category */}
      {showSkip && !isSkipped && (
        <div className="text-center pt-2">
          {privacyCategory === 'red' && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm font-medium hover:opacity-70"
              style={{ fontSize: '14px', color: "#f87171" }}
            >
              Not comfortable sharing this here?{' '}
              <span className="underline">Skip for now</span>
            </button>
          )}
          {privacyCategory === 'amber' && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm hover:opacity-70"
              style={{ fontSize: '14px', color: "#fbbf24" }}
            >
              Not comfortable sharing this here?{' '}
              <span className="underline">Skip for now — I will fill this in myself</span>
            </button>
          )}
        </div>
      )}

      {/* Required field note */}
      {isRequired && (
        <div className="text-center pt-2">
          <p className="text-xs" style={{ fontSize: '12px', color: "var(--white-dim)" }}>
            We need this to generate your documents — it does not go further than your application package.
          </p>
        </div>
      )}

      {/* AMBER inline note after skip */}
      {isSkipped && privacyCategory === 'amber' && question.skip_advisory && (
        <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }}>
          No problem. {question.skip_advisory}
        </div>
      )}

      {/* GREEN simple skip - no advisory */}
      {isSkipped && privacyCategory === 'green' && (
        <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}>
          No problem. You can complete this later.
        </div>
      )}

      {/* Skipped indicator default */}
      {isSkipped && !privacyCategory && (
        <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }}>
          No problem — we will leave a space in your document that you can fill in yourself before submitting.
        </div>
      )}

      {/* Warning card - amber, never alarm */}
      {activeWarning && (
        <div className="p-4 rounded-xl flex gap-3" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}>
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" style={{ color: "#fbbf24" }}>
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-sm" style={{ fontSize: '14px', color: "var(--white-dim)" }}>
            {activeWarning.message}
          </div>
        </div>
      )}

      {/* RED privacy modal */}
      {showSkipModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-xl max-w-md w-full p-6 shadow-xl" style={{ background: "var(--navy)", border: "1px solid var(--glass-border)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.2)" }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" style={{ color: "#f87171" }}>
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold font-playfair" style={{ color: "var(--white)" }}>Heads up — this affects your documents</h3>
            </div>
            <p className="mb-6" style={{ fontSize: '14px', lineHeight: '24px', color: "var(--white-dim)" }}>
              {question.skip_advisory || 'Skipping this field will leave a placeholder in your documents that you need to fill in before submitting.'}
            </p>
            <p className="text-xs mb-6" style={{ color: "var(--white-dim)" }}>
              You can add it later from your dashboard. Your documents will show a placeholder until you do.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSkipModal(false)}
                className="flex-1 px-4 py-3 border rounded-lg transition-colors font-medium"
                style={{ borderColor: "var(--glass-border)", color: "var(--white-dim)" }}
              >
                I will add it
              </button>
              <button
                type="button"
                onClick={confirmSkip}
                className="flex-1 px-4 py-3 rounded-lg transition-colors font-medium"
                style={{ background: "#dc2626", color: "#fff" }}
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}