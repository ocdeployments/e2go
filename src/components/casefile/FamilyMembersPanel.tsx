'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GOLD, CREAM, GREEN, INNER } from '@/components/casefile/tokens';
import type { FamilyMemberCaseUI } from '@/app/api/dashboard/case-profile/route';

interface FamilyMemberUI {
  id: string;
  member_type: 'co_investor' | 'spouse' | 'child';
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  passport_number: string | null;
  role: string | null;
  sort_order: number;
}

type MemberFormState = {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  passport_number: string;
  role: string;
};

const EMPTY_MEMBER_FORM: MemberFormState = {
  first_name: '', middle_name: '', last_name: '', gender: '', date_of_birth: '', nationality: '', passport_number: '', role: '',
};

const GENDER_LABEL: Record<string, string> = { male: 'Male', female: 'Female', non_binary: 'Non-binary', prefer_not_to_say: 'Not disclosed' };
const ROLE_LABEL: Record<string, string> = { '50/50': '50/50 equal', majority: 'Majority investor', minority: 'Minority investor', silent: 'Silent partner' };

interface FamilyMembersPanelProps {
  isPartnership: boolean;
  hasSpouse: boolean;
  hasChildren: boolean;
  familyMembersCaseData: FamilyMemberCaseUI[];
  onMembersChanged?: () => void;
}

export default function FamilyMembersPanel({ isPartnership, hasSpouse, hasChildren, familyMembersCaseData, onMembersChanged }: FamilyMembersPanelProps) {
  const [members, setMembers] = useState<FamilyMemberUI[]>([]);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [expandedMemberDocs, setExpandedMemberDocs] = useState<Set<string>>(new Set());
  const [addingMemberType, setAddingMemberType] = useState<FamilyMemberUI['member_type'] | null>(null);
  const [memberForm, setMemberForm] = useState<MemberFormState>(EMPTY_MEMBER_FORM);
  const [memberSaving, setMemberSaving] = useState(false);

  useEffect(() => {
    fetch('/api/profile/family-members')
      .then((r) => r.json())
      .then((json: { members?: FamilyMemberUI[] }) => setMembers(json.members ?? []))
      .catch(() => setMembers([]));
  }, []);

  const coInvestors = members.filter((m) => m.member_type === 'co_investor');
  const spouseList = members.filter((m) => m.member_type === 'spouse');
  const childList = members.filter((m) => m.member_type === 'child');

  function openEditMember(m: FamilyMemberUI) {
    setEditingMemberId(m.id);
    setAddingMemberType(null);
    setMemberForm({
      first_name: m.first_name ?? '', middle_name: m.middle_name ?? '', last_name: m.last_name ?? '',
      gender: m.gender ?? '', date_of_birth: m.date_of_birth ?? '', nationality: m.nationality ?? '',
      passport_number: m.passport_number ?? '', role: m.role ?? '',
    });
  }

  function openAddMember(type: FamilyMemberUI['member_type']) {
    setAddingMemberType(type);
    setEditingMemberId(null);
    setMemberForm(EMPTY_MEMBER_FORM);
  }

  function cancelMemberForm() {
    setEditingMemberId(null);
    setAddingMemberType(null);
    setMemberForm(EMPTY_MEMBER_FORM);
  }

  async function handleSaveMember() {
    const isEdit = editingMemberId !== null;
    const memberType = isEdit ? members.find((m) => m.id === editingMemberId)?.member_type : addingMemberType;
    if (!memberType) return;
    setMemberSaving(true);
    try {
      const url = isEdit ? `/api/profile/family-members/${editingMemberId}` : '/api/profile/family-members';
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit
        ? { first_name: memberForm.first_name || null, middle_name: memberForm.middle_name || null, last_name: memberForm.last_name || null, gender: memberForm.gender || null, date_of_birth: memberForm.date_of_birth || null, nationality: memberForm.nationality || null, passport_number: memberForm.passport_number || null, role: memberForm.role || null }
        : { member_type: memberType, first_name: memberForm.first_name || null, middle_name: memberForm.middle_name || null, last_name: memberForm.last_name || null, gender: memberForm.gender || null, date_of_birth: memberForm.date_of_birth || null, nationality: memberForm.nationality || null, passport_number: memberForm.passport_number || null, role: memberForm.role || null, sort_order: members.filter((m) => m.member_type === memberType).length };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const json = await res.json() as { member: FamilyMemberUI };
        setMembers((ms) => (isEdit ? ms.map((m) => (m.id === editingMemberId ? json.member : m)) : [...ms, json.member]));
        setEditingMemberId(null);
        setAddingMemberType(null);
        setMemberForm(EMPTY_MEMBER_FORM);
        onMembersChanged?.();
      }
    } catch { /* noop */ }
    setMemberSaving(false);
  }

  async function handleDeleteMember(id: string) {
    await fetch(`/api/profile/family-members/${id}`, { method: 'DELETE' });
    setMembers((ms) => ms.filter((m) => m.id !== id));
    if (editingMemberId === id) { setEditingMemberId(null); setMemberForm(EMPTY_MEMBER_FORM); }
    onMembersChanged?.();
  }

  function toggleShowDocs(id: string) {
    setExpandedMemberDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function MemberFormBlock({ memberType }: { memberType: FamilyMemberUI['member_type'] }) {
    const genderOptions = [{ v: '', label: '—' }, { v: 'male', label: 'Male' }, { v: 'female', label: 'Female' }, { v: 'non_binary', label: 'Non-binary' }, { v: 'prefer_not_to_say', label: 'Prefer not to say' }];
    const roleOptions = memberType === 'co_investor'
      ? [{ v: '', label: '—' }, { v: '50/50', label: '50/50 equal' }, { v: 'majority', label: 'Majority investor' }, { v: 'minority', label: 'Minority investor' }, { v: 'silent', label: 'Silent partner' }]
      : [];
    return (
      <div style={{ padding: '14px', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.2)', marginTop: '8px' }}>
        <div style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px' }}>
          {editingMemberId ? 'Edit' : 'Add'} {memberType === 'co_investor' ? 'Co-Investor' : memberType === 'spouse' ? 'Spouse / Partner' : 'Child'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          {([['First Name', 'first_name'], ['Middle Name', 'middle_name'], ['Last Name', 'last_name']] as [string, keyof MemberFormState][]).map(([label, key]) => (
            <div key={key}>
              <div style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", marginBottom: '3px' }}>{label}</div>
              <input type="text" value={memberForm[key]} onChange={(e) => setMemberForm((f) => ({ ...f, [key]: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', color: CREAM, padding: '6px 8px', fontSize: '11px', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", marginBottom: '3px' }}>Date of Birth</div>
            <input type="date" value={memberForm.date_of_birth} onChange={(e) => setMemberForm((f) => ({ ...f, date_of_birth: e.target.value }))}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', color: CREAM, padding: '6px 8px', fontSize: '11px', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
          </div>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", marginBottom: '3px' }}>Gender</div>
            <select value={memberForm.gender} onChange={(e) => setMemberForm((f) => ({ ...f, gender: e.target.value }))}
              style={{ width: '100%', background: '#111007', border: '1px solid rgba(201,168,76,0.2)', color: CREAM, padding: '6px 8px', fontSize: '11px', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}>
              {genderOptions.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", marginBottom: '3px' }}>Nationality</div>
            <input type="text" value={memberForm.nationality} onChange={(e) => setMemberForm((f) => ({ ...f, nationality: e.target.value }))}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', color: CREAM, padding: '6px 8px', fontSize: '11px', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", marginBottom: '3px' }}>Passport Number</div>
            <input type="text" value={memberForm.passport_number} onChange={(e) => setMemberForm((f) => ({ ...f, passport_number: e.target.value }))}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', color: CREAM, padding: '6px 8px', fontSize: '11px', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {memberType === 'co_investor' && roleOptions.length > 0 && (
            <div>
              <div style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", marginBottom: '3px' }}>Investment Role</div>
              <select value={memberForm.role} onChange={(e) => setMemberForm((f) => ({ ...f, role: e.target.value }))}
                style={{ width: '100%', background: '#111007', border: '1px solid rgba(201,168,76,0.2)', color: CREAM, padding: '6px 8px', fontSize: '11px', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}>
                {roleOptions.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSaveMember} disabled={memberSaving} style={{ padding: '7px 16px', background: GOLD, color: '#0a0a0a', fontSize: '10px', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', cursor: memberSaving ? 'default' : 'pointer', opacity: memberSaving ? 0.6 : 1 }}>
            {memberSaving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={cancelMemberForm} style={{ padding: '7px 12px', background: 'transparent', color: 'rgba(245,240,232,0.35)', fontSize: '10px', fontFamily: "'DM Sans', sans-serif", border: '1px solid rgba(245,240,232,0.1)', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  function MemberCard({ m }: { m: FamilyMemberUI }) {
    const nameStr = [m.first_name, m.middle_name, m.last_name].filter(Boolean).join(' ') || '—';
    const dobStr = m.date_of_birth ? new Date(m.date_of_birth + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
    const isEditing = editingMemberId === m.id;
    const caseData = familyMembersCaseData.find((fm) => fm.id === m.id);
    const showDocs = expandedMemberDocs.has(m.id);

    return (
      <div style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '9px 0', borderBottom: `1px solid ${INNER}` }}>
          <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: GREEN, border: `1.5px solid ${GREEN}`, flexShrink: 0, marginTop: '5px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', fontFamily: "'DM Sans', sans-serif", color: CREAM, fontWeight: 500 }}>{nameStr}</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '3px' }}>
              {dobStr && <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.38)', fontFamily: "'DM Sans', sans-serif" }}>DOB: {dobStr}</span>}
              {m.gender && <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.38)', fontFamily: "'DM Sans', sans-serif" }}>{GENDER_LABEL[m.gender] ?? m.gender}</span>}
              {m.nationality && <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.38)', fontFamily: "'DM Sans', sans-serif" }}>{m.nationality}</span>}
              {m.role && m.member_type === 'co_investor' && <span style={{ fontSize: '10px', color: GOLD, fontFamily: "'DM Sans', sans-serif" }}>{ROLE_LABEL[m.role] ?? m.role}</span>}
            </div>
            {caseData && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '9px', letterSpacing: '0.04em', color: caseData.answeredCount >= caseData.totalExpectedCount ? GREEN : 'rgba(201,168,76,0.65)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                  {caseData.answeredCount}/{caseData.totalExpectedCount} fields
                </span>
                {caseData.documents.length > 0 && (
                  <button
                    onClick={() => toggleShowDocs(m.id)}
                    style={{ fontSize: '9px', color: 'rgba(245,240,232,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", padding: 0, textDecoration: 'underline' }}
                  >
                    {caseData.documents.length} document{caseData.documents.length !== 1 ? 's' : ''} {showDocs ? '▲' : '▼'}
                  </button>
                )}
              </div>
            )}
            {caseData && showDocs && (
              <div style={{ marginTop: '8px', marginBottom: '4px' }}>
                {caseData.documents.map((doc) => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: `1px solid ${INNER}`, marginBottom: '4px' }}>
                    <div style={{ fontSize: '10.5px', fontFamily: "'DM Sans', sans-serif", color: CREAM, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.fileName}
                    </div>
                    <div style={{ fontSize: '8px', letterSpacing: '0.06em', textTransform: 'uppercase', color: doc.extractionStatus === 'complete' ? GREEN : 'rgba(245,240,232,0.4)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, flexShrink: 0 }}>
                      {doc.extractionStatus}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(m.member_type === 'spouse' || m.member_type === 'child') && (
              <Link
                href={`/apply/dependent/${m.id}`}
                style={{ display: 'inline-block', marginTop: '6px', fontSize: '9px', color: GOLD, fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline' }}
              >
                Complete {m.first_name || 'their'} DS-160 details →
              </Link>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button onClick={() => openEditMember(m)} style={{ fontSize: '9px', color: 'rgba(201,168,76,0.6)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", padding: '2px 6px' }}>Edit</button>
            <button onClick={() => handleDeleteMember(m.id)} style={{ fontSize: '9px', color: 'rgba(248,113,113,0.5)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", padding: '2px 6px' }}>Remove</button>
          </div>
        </div>
        {isEditing && <MemberFormBlock memberType={m.member_type} />}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.38)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: '4px', paddingBottom: '4px', borderBottom: `1px solid ${INNER}` }}>
        Family Members & Co-Applicants
      </div>

      {(isPartnership || coInvestors.length > 0) && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.28)', fontFamily: "'DM Sans', sans-serif", marginBottom: '6px', marginTop: '8px' }}>
            CO-INVESTOR{coInvestors.length > 1 ? 'S' : ''} · Partnership
          </div>
          {coInvestors.map((m) => <MemberCard key={m.id} m={m} />)}
          {addingMemberType === 'co_investor' && <MemberFormBlock memberType="co_investor" />}
          {addingMemberType !== 'co_investor' && (
            <button onClick={() => openAddMember('co_investor')} style={{ marginTop: '6px', fontSize: '9px', color: 'rgba(201,168,76,0.55)', background: 'transparent', border: '1px dashed rgba(201,168,76,0.2)', padding: '5px 12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              + Add Co-Investor
            </button>
          )}
        </div>
      )}

      {(hasSpouse || spouseList.length > 0) && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.28)', fontFamily: "'DM Sans', sans-serif", marginBottom: '6px', marginTop: '8px' }}>
            SPOUSE / PARTNER · Derivative E-2
          </div>
          {spouseList.map((m) => <MemberCard key={m.id} m={m} />)}
          {addingMemberType === 'spouse' && <MemberFormBlock memberType="spouse" />}
          {spouseList.length === 0 && addingMemberType !== 'spouse' && (
            <button onClick={() => openAddMember('spouse')} style={{ marginTop: '6px', fontSize: '9px', color: 'rgba(201,168,76,0.55)', background: 'transparent', border: '1px dashed rgba(201,168,76,0.2)', padding: '5px 12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              + Add Spouse
            </button>
          )}
        </div>
      )}

      {(hasChildren || childList.length > 0) && (
        <div style={{ marginBottom: '4px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.28)', fontFamily: "'DM Sans', sans-serif", marginBottom: '6px', marginTop: '8px' }}>
            CHILDREN · Derivative E-2
          </div>
          {childList.map((m) => <MemberCard key={m.id} m={m} />)}
          {addingMemberType === 'child' && <MemberFormBlock memberType="child" />}
          {addingMemberType !== 'child' && (
            <button onClick={() => openAddMember('child')} style={{ marginTop: '6px', fontSize: '9px', color: 'rgba(201,168,76,0.55)', background: 'transparent', border: '1px dashed rgba(201,168,76,0.2)', padding: '5px 12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              + Add Child
            </button>
          )}
        </div>
      )}

      {!isPartnership && !hasSpouse && !hasChildren && members.length === 0 && (
        <div style={{ padding: '10px 0' }}>
          <div style={{ fontSize: '11px', fontFamily: "'DM Sans', sans-serif", color: 'rgba(245,240,232,0.22)', fontStyle: 'italic', marginBottom: '10px' }}>
            No family members or partners added — add them below if applicable.
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['co_investor', 'spouse', 'child'] as FamilyMemberUI['member_type'][]).map((type) => (
              addingMemberType !== type && (
                <button key={type} onClick={() => openAddMember(type)} style={{ fontSize: '9px', color: 'rgba(201,168,76,0.55)', background: 'transparent', border: '1px dashed rgba(201,168,76,0.2)', padding: '5px 12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  + Add {type === 'co_investor' ? 'Co-Investor' : type === 'spouse' ? 'Spouse' : 'Child'}
                </button>
              )
            ))}
          </div>
          {addingMemberType && <MemberFormBlock memberType={addingMemberType} />}
        </div>
      )}
    </div>
  );
}
