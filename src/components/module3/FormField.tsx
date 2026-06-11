'use client';

import { useState, useEffect, useCallback } from 'react';
import { FormFieldProps } from '@/types/module3';

const PRIVACY_COLORS = {
  red: '#EF4444',
  amber: '#F59E0B',
  green: '#10B981',
  required: '#C9A84C',
};

export default function FormField({
  field,
  value,
  onChange,
  onSkip,
  disabled = false,
}: FormFieldProps) {
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const privacyCategory = field.privacy_category || 'green';
  const isRequired = privacyCategory === 'required';
  const showSkip = !isRequired && privacyCategory !== 'green';

  useEffect(() => {
    if (value) {
      if (field.type === 'multi_select' && Array.isArray(value)) {
        setSelectedOptions(value);
      } else if (typeof value === 'string') {
        setInputValue(value);
      }
    } else {
      setInputValue('');
      setSelectedOptions([]);
    }
  }, [value, field.type]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  }, [onChange]);

  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={inputValue}
            onChange={handleTextChange}
            placeholder={field.placeholder}
            disabled={disabled}
            className="w-full px-4 py-3 rounded-lg transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(201,168,76,0.2)',
              color: '#f5f0e8',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.border = '1px solid #C9A84C';
              e.target.style.outline = '2px solid #C9A84C';
              e.target.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.target.style.border = '1px solid rgba(201,168,76,0.2)';
              e.target.style.outline = 'none';
            }}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={inputValue}
            onChange={handleTextChange}
            placeholder={field.placeholder}
            disabled={disabled}
            rows={4}
            className="w-full px-4 py-3 rounded-lg transition-all duration-200 resize-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(201,168,76,0.2)',
              color: '#f5f0e8',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.border = '1px solid #C9A84C';
              e.target.style.outline = '2px solid #C9A84C';
              e.target.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.target.style.border = '1px solid rgba(201,168,76,0.2)';
              e.target.style.outline = 'none';
            }}
          />
        );

      case 'select':
        return (
          <select
            value={inputValue}
            onChange={handleSelectChange}
            disabled={disabled}
            className="w-full px-4 py-3 rounded-lg transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(201,168,76,0.2)',
              color: '#f5f0e8',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.border = '1px solid #C9A84C';
              e.target.style.outline = '2px solid #C9A84C';
              e.target.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.target.style.border = '1px solid rgba(201,168,76,0.2)';
              e.target.style.outline = 'none';
            }}
          >
            <option value="" style={{ color: '#f5f0e8' }}>Select...</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value} style={{ color: '#f5f0e8' }}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multi_select':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{
                  borderColor: selectedOptions.includes(option.value) ? '#C9A84C' : 'rgba(201,168,76,0.2)',
                  background: selectedOptions.includes(option.value) ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.04)',
                }}
              >
                <div
                  className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: selectedOptions.includes(option.value) ? '#C9A84C' : 'rgba(201,168,76,0.4)',
                    background: selectedOptions.includes(option.value) ? '#C9A84C' : 'transparent',
                  }}
                >
                  {selectedOptions.includes(option.value) && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#0a0a0a" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <div style={{ color: '#f5f0e8' }}>{option.label}</div>
                  {option.helperText && (
                    <div className="text-xs mt-1" style={{ color: 'rgba(245,240,232,0.5)' }}>{option.helperText}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={inputValue}
            onChange={handleTextChange}
            disabled={disabled}
            className="w-full px-4 py-3 rounded-lg transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(201,168,76,0.2)',
              color: '#f5f0e8',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.border = '1px solid #C9A84C';
              e.target.style.outline = '2px solid #C9A84C';
              e.target.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.target.style.border = '1px solid rgba(201,168,76,0.2)';
              e.target.style.outline = 'none';
            }}
          />
        );

      case 'date_range':
        return (
          <div className="flex gap-4">
            <input
              type="date"
              value={inputValue.split(' - ')[0] || ''}
              onChange={(e) => {
                const endDate = inputValue.split(' - ')[1] || '';
                onChange(`${e.target.value} - ${endDate}`);
              }}
              disabled={disabled}
              className="flex-1 px-4 py-3 rounded-lg transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: '#f5f0e8',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid #C9A84C';
                e.target.style.outline = '2px solid #C9A84C';
                e.target.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(201,168,76,0.2)';
                e.target.style.outline = 'none';
              }}
            />
            <input
              type="date"
              value={inputValue.split(' - ')[1] || ''}
              onChange={(e) => {
                const startDate = inputValue.split(' - ')[0] || '';
                onChange(`${startDate} - ${e.target.value}`);
              }}
              disabled={disabled}
              className="flex-1 px-4 py-3 rounded-lg transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: '#f5f0e8',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid #C9A84C';
                e.target.style.outline = '2px solid #C9A84C';
                e.target.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(201,168,76,0.2)';
                e.target.style.outline = 'none';
              }}
            />
          </div>
        );

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(245,240,232,0.5)' }}>$</span>
            <input
              type="number"
              value={inputValue}
              onChange={handleTextChange}
              placeholder="0.00"
              disabled={disabled}
              className="w-full pl-8 pr-4 py-3 rounded-lg transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: '#f5f0e8',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid #C9A84C';
                e.target.style.outline = '2px solid #C9A84C';
                e.target.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(201,168,76,0.2)';
                e.target.style.outline = 'none';
              }}
            />
          </div>
        );

      case 'percentage':
        return (
          <div className="relative">
            <input
              type="number"
              value={inputValue}
              onChange={handleTextChange}
              placeholder="0"
              disabled={disabled}
              className="w-full px-4 py-3 rounded-lg transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: '#f5f0e8',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid #C9A84C';
                e.target.style.outline = '2px solid #C9A84C';
                e.target.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(201,168,76,0.2)';
                e.target.style.outline = 'none';
              }}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(245,240,232,0.5)' }}>%</span>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={inputValue}
            onChange={handleTextChange}
            disabled={disabled}
            className="w-full px-4 py-3 rounded-lg transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(201,168,76,0.2)',
              color: '#f5f0e8',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.border = '1px solid #C9A84C';
              e.target.style.outline = '2px solid #C9A84C';
              e.target.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.target.style.border = '1px solid rgba(201,168,76,0.2)';
              e.target.style.outline = 'none';
            }}
          />
        );
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <label
          className="text-xs uppercase tracking-wider"
          style={{ color: 'rgba(245,240,232,0.6)' }}
        >
          {field.label}
          {isRequired && <span style={{ color: '#C9A84C' }}> *</span>}
        </label>
        <div
          className="w-2 h-2 rounded-full"
          title={`Privacy: ${privacyCategory}`}
          style={{ background: PRIVACY_COLORS[privacyCategory] }}
        />
        {showSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="ml-auto text-xs underline hover:no-underline"
            style={{ color: 'rgba(245,240,232,0.4)' }}
          >
            Skip
          </button>
        )}
      </div>
      {renderInput()}
      {field.helperText && (
        <p className="mt-2 text-xs" style={{ color: 'rgba(245,240,232,0.5)' }}>
          {field.helperText}
        </p>
      )}
    </div>
  );
}