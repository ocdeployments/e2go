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
  warningTriggers?: WarningTrigger[];
}

interface QuestionRendererProps {
  question: QuestionConfig;
  value: string | string[] | number | null;
  onChange: (value: string | string[] | number | null) => void;
  disabled: boolean;
}

export default function QuestionRenderer({
  question,
  value,
  onChange,
  disabled,
}: QuestionRendererProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const activeWarning = question.warningTriggers?.find(
    (wt) => wt.value === value
  );

  const renderSingle = () => (
    <div className="space-y-3">
      {question.options?.map((option) => (
        <label
          key={option.value}
          className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
            value === option.value
              ? 'border-[#004ac6] bg-[#e5eeff]'
              : 'border-[#c3c6d7] hover:border-[#004ac6]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="radio"
            name={question.key}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            disabled={disabled}
            className="mt-1 w-5 h-5 text-[#004ac6] border-[#c3c6d7] focus:ring-[#004ac6]"
          />
          <div>
            <span className="block text-sm font-medium text-[#0b1c30]">
              {option.label}
            </span>
            {option.helperText && (
              <span className="block text-xs text-[#737686] mt-1">
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
            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              currentValues.includes(option.value)
                ? 'border-[#004ac6] bg-[#e5eeff]'
                : 'border-[#c3c6d7] hover:border-[#004ac6]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              className="mt-1 w-5 h-5 text-[#004ac6] border-[#c3c6d7] rounded focus:ring-[#004ac6]"
            />
            <div>
              <span className="block text-sm font-medium text-[#0b1c30]">
                {option.label}
              </span>
              {option.helperText && (
                <span className="block text-xs text-[#737686] mt-1">
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
        className="w-full px-4 py-3 border border-[#c3c6d7] rounded-lg text-[#0b1c30] focus:outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6] disabled:opacity-50"
        placeholder="Enter your response..."
      />
      <div className="text-xs text-[#737686] mt-1 text-right">
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
      className="w-full px-4 py-3 border border-[#c3c6d7] rounded-lg text-[#0b1c30] focus:outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6] disabled:opacity-50"
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
          className="flex-1 px-4 py-3 border border-[#c3c6d7] rounded-lg text-[#0b1c30] focus:outline-none focus:border-[#004ac6] disabled:opacity-50"
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
          className="w-20 px-4 py-3 border border-[#c3c6d7] rounded-lg text-[#0b1c30] focus:outline-none focus:border-[#004ac6] disabled:opacity-50"
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
          className="w-28 px-4 py-3 border border-[#c3c6d7] rounded-lg text-[#0b1c30] focus:outline-none focus:border-[#004ac6] disabled:opacity-50"
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
      <div className="flex items-start gap-2">
        <h3 className="text-lg font-medium text-[#0b1c30] flex-1">
          {question.question}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </h3>
        <button
          type="button"
          onClick={() => setShowTooltip(!showTooltip)}
          className="text-[#737686] hover:text-[#004ac6] p-1"
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
        <div className="p-3 bg-[#f8f9ff] border border-[#c3c6d7] rounded-lg text-sm text-[#434655]">
          {question.tooltip}
        </div>
      )}

      {/* Input based on type */}
      {question.type === 'single' && renderSingle()}
      {question.type === 'multi' && renderMulti()}
      {question.type === 'text' && renderText()}
      {question.type === 'number' && renderNumber()}
      {question.type === 'date' && renderDate()}

      {/* Inline warning */}
      {activeWarning && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          {activeWarning.message}
        </div>
      )}
    </div>
  );
}
