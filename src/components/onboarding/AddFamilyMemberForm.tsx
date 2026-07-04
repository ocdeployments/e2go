'use client';

import { useState } from 'react';

export interface NewFamilyMemberInput {
  member_type: 'co_investor' | 'spouse' | 'child';
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  passport_number: string | null;
  role: string | null;
}

interface AddFamilyMemberFormProps {
  defaultType: 'co_investor' | 'spouse' | 'child';
  initialFirstName?: string;
  initialLastName?: string;
  onCancel: () => void;
  onSubmit: (input: NewFamilyMemberInput) => Promise<void>;
}

const CO_INVESTOR_ROLES = [
  { value: '50/50', label: '50/50 partner' },
  { value: 'majority', label: 'Majority owner' },
  { value: 'minority', label: 'Minority owner' },
  { value: 'silent', label: 'Silent partner' },
];

export default function AddFamilyMemberForm({ defaultType, initialFirstName = '', initialLastName = '', onCancel, onSubmit }: AddFamilyMemberFormProps) {
  const [memberType, setMemberType] = useState<'co_investor' | 'spouse' | 'child'>(defaultType);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [role, setRole] = useState('50/50');
  const [saving, setSaving] = useState(false);

  const isValid = firstName.trim().length > 0 && lastName.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        member_type: memberType,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dob || null,
        nationality: nationality.trim() || null,
        passport_number: passportNumber.trim() || null,
        role: memberType === 'co_investor' ? role : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.04)] p-6 md:p-8 mt-4">
      <div className="mb-6">
        <label className="block text-[11px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-3">
          Relationship
        </label>
        <div className="flex gap-3">
          {(['co_investor', 'spouse', 'child'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMemberType(type)}
              className={`px-4 py-2 text-[13px] border transition-colors capitalize ${
                memberType === type
                  ? 'border-[#C9A84C] bg-[rgba(201,168,76,0.1)] text-[#f5f0e8]'
                  : 'border-[rgba(201,168,76,0.2)] text-[#f5f0e8]/60 hover:border-[rgba(201,168,76,0.4)]'
              }`}
            >
              {type === 'co_investor' ? 'Co-investor' : type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-2">First name *</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full p-3 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[14px] outline-none focus:border-[#C9A84C] transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-2">Last name *</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full p-3 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[14px] outline-none focus:border-[#C9A84C] transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-2">Date of birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full p-3 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[14px] outline-none focus:border-[#C9A84C] transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-2">Nationality</label>
          <input
            type="text"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className="w-full p-3 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[14px] outline-none focus:border-[#C9A84C] transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-2">Passport number</label>
          <input
            type="text"
            value={passportNumber}
            onChange={(e) => setPassportNumber(e.target.value)}
            className="w-full p-3 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[14px] outline-none focus:border-[#C9A84C] transition-colors"
          />
        </div>
        {memberType === 'co_investor' && (
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-2">Ownership role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-3 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[14px] outline-none focus:border-[#C9A84C] transition-colors"
            >
              {CO_INVESTOR_ROLES.map((r) => (
                <option key={r.value} value={r.value} className="bg-[#0a0a0a]">{r.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-[#f5f0e8]/60 hover:text-[#f5f0e8] text-[13px] tracking-wide transition-colors">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || saving}
          className={`px-6 py-2.5 text-[13px] font-medium uppercase tracking-[0.1em] transition-all duration-200 ${
            isValid && !saving
              ? 'bg-[#C9A84C] text-[#0a0a0a] hover:bg-[#D4BC6A]'
              : 'bg-[rgba(201,168,76,0.2)] text-[#f5f0e8]/20 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving…' : 'Add person'}
        </button>
      </div>
    </div>
  );
}
