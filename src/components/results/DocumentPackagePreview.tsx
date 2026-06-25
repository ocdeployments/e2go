'use client';

interface DocData {
  country: string;
  investment_range: string;
  application_type: string;
  answers: Record<string, string | string[]>;
  outcome: string;
}

interface DocumentPackagePreviewProps {
  data: DocData;
  isLoggedIn: boolean;
  consulateName: string;
}

const DOC_LIST = [
  'Cover Letter',
  'Business Plan',
  'Source of Funds Statement',
  'Personal Financial Statement',
  'Investment Evidence Summary',
  'Qualifications Narrative',
  'Organizational Chart',
  'Employment Creation Plan',
  'Business Registration Summary',
  'Franchise Agreement Summary',
  'Market Analysis',
  'Non-Immigrant Intent Statement',
  "Spouse's Declaration",
  'Compliance Calendar',
  'Table of Contents',
];

function deriveDocMeta(data: DocData, consulateName: string) {
  const bizType = (data.answers?.['Q0-08a'] as string) || '';
  const isFranchise = /franchise/i.test(bizType);
  const isAcquisition = /acquisition|existing independent/i.test(bizType);
  const isRestaurant = /restaurant|food/i.test(bizType);
  const isTech = /tech|software|saas/i.test(bizType);
  const isRetail = /retail/i.test(bizType);

  let bizLabel = 'Service Business';
  let jobsMin = 3; let jobsMax = 5;
  if (isFranchise) { bizLabel = 'Franchised Business'; jobsMin = 5; jobsMax = 8; }
  else if (isAcquisition) { bizLabel = 'Business Acquisition'; jobsMin = 4; jobsMax = 7; }
  else if (isRestaurant) { bizLabel = 'Food & Beverage Business'; jobsMin = 6; jobsMax = 12; }
  else if (isRetail) { bizLabel = 'Retail Business'; jobsMin = 4; jobsMax = 8; }
  else if (isTech) { bizLabel = 'Technology Business'; jobsMin = 2; jobsMax = 5; }

  const appType =
    data.application_type === 'partnership' || data.application_type === 'spousal_partnership'
      ? 'Partnership — Two Principal Investors'
      : 'Solo Investor';

  const submissionDate = new Date();
  submissionDate.setMonth(submissionDate.getMonth() + 2);
  const dateStr = submissionDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return {
    bizLabel,
    jobsMin,
    jobsMax,
    country: data.country || 'Treaty Country',
    investment: data.investment_range || 'Capital investment',
    appType,
    dateStr,
    consulateName,
  };
}

export default function DocumentPackagePreview({ data, isLoggedIn, consulateName }: DocumentPackagePreviewProps) {
  const isProceed = data.outcome === 'PROCEED' || data.outcome === 'PROCEED_RISK';
  if (!isProceed) return null;

  const doc = deriveDocMeta(data, consulateName);

  return (
    <div style={{ padding: '48px 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.55)', marginBottom: '6px', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
        Your documents are already in progress
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '24px', fontWeight: 300, color: '#f5f0e8', marginBottom: '6px' }}>
        Your E-2 Business Plan — draft stage
      </div>
      <div style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', lineHeight: 1.6, marginBottom: '28px' }}>
        This is what your case file contains the moment you start. Personalized to your profile, formatted for {doc.consulateName}.
      </div>

      {/* Paper document */}
      <div style={{ position: 'relative' }}>
        <div style={{
          background: '#FEFEFE',
          boxShadow: '0 6px 32px rgba(0,0,0,0.55), 0 1px 6px rgba(0,0,0,0.35)',
          padding: '32px 36px 0',
          maxHeight: '360px',
          overflow: 'hidden',
          fontFamily: 'Georgia, Times, "Times New Roman", serif',
          position: 'relative',
        }}>
          {/* DRAFT watermark */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 2 }}>
            <div style={{ fontSize: '110px', fontWeight: 700, color: 'rgba(201,168,76,0.05)', transform: 'rotate(-22deg)', fontFamily: 'Georgia, serif', userSelect: 'none', lineHeight: 1, letterSpacing: '0.04em' }}>DRAFT</div>
          </div>

          {/* Gold rule */}
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #C9A84C 0%, rgba(201,168,76,0.15) 100%)', marginBottom: '22px' }} />

          {/* Document header */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '8.5px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#777', marginBottom: '5px', fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 600 }}>
              E-2 Treaty Investor Application
            </div>
            <div style={{ fontSize: '26px', fontWeight: 400, color: '#111', lineHeight: 1.1, marginBottom: '18px', fontFamily: 'Georgia, serif' }}>
              Business Plan
            </div>
            <div style={{ height: '1px', background: '#D0CCC4', marginBottom: '14px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '42% 58%', gap: '4px 0', fontSize: '10.5px' }}>
              {[
                ['Applicant nationality', `${doc.country} National`],
                ['Prepared for', `${doc.consulateName}, U.S. Mission`],
                ['Investment capital', doc.investment],
                ['Application type', doc.appType],
                ['Document date', doc.dateStr],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'contents' }}>
                  <div style={{ color: '#888', fontFamily: "'DM Sans', sans-serif", fontSize: '10px', letterSpacing: '0.02em', paddingBottom: '4px' }}>{label}</div>
                  <div style={{ color: '#1A1A1A', fontFamily: "'DM Sans', sans-serif", fontSize: '10.5px', paddingBottom: '4px' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: '1px', background: '#D0CCC4', marginBottom: '18px' }} />

          {/* Executive Summary */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#111', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: 'Georgia, serif' }}>
              Section 1 — Executive Summary
            </div>
            <p style={{ fontSize: '12px', color: '#1F1F1F', lineHeight: 1.8, margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>
              The applicant proposes to establish and actively manage a {doc.bizLabel.toLowerCase()} in the United States of America, representing a committed capital investment of {doc.investment}. The enterprise will create a minimum of {doc.jobsMin}–{doc.jobsMax} full-time U.S. positions within 18 months of operations commencement, satisfying the non-marginality standard under E-2 treaty investor provisions of INA § 101(a)(15)(E)(ii).
            </p>
            <p style={{ fontSize: '12px', color: '#1F1F1F', lineHeight: 1.8, margin: '0', fontFamily: 'Georgia, serif' }}>
              The applicant, a national of {doc.country}, maintains an unambiguous non-immigrant intent and holds demonstrable ties to their country of nationality, including financial assets, professional obligations, and family relationships that constitute compelling reasons to return upon E-2 visa expiration. This application is submitted in accordance with the relevant bilateral treaty of commerce and navigation between the United States and {doc.country}, and complies fully with the requirements set forth in 9 FAM 402.9.
            </p>
          </div>

          {/* Section 2 heading (partially visible) */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#111', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: 'Georgia, serif' }}>
              Section 2 — Business Model &amp; Operations
            </div>
            <p style={{ fontSize: '12px', color: '#1F1F1F', lineHeight: 1.8, margin: '0', fontFamily: 'Georgia, serif' }}>
              The business will operate within the {doc.bizLabel === 'Franchised Business' ? 'franchise model under a recognized U.S. brand, providing the applicant with a proven operational system,' : 'established framework of the target market,'} generating revenue through...
            </p>
          </div>
        </div>

        {/* Fade overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '160px', background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,10,0.65) 55%, #0a0a0a 100%)', zIndex: 3, pointerEvents: 'none' }} />

        {/* Unlock CTA overlay */}
        <div style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 4, gap: '8px' }}>
          {!isLoggedIn && (
            <div style={{ fontSize: '11px', color: 'rgba(245,240,232,0.7)', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.04em' }}>
              Complete your purchase to build and export this document
            </div>
          )}
        </div>
      </div>

      {/* 15-doc list */}
      <div style={{ marginTop: '20px', padding: '14px 16px', background: 'rgba(201,168,76,0.03)', border: '1px solid rgba(201,168,76,0.12)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)', marginBottom: '8px', fontFamily: "'DM Sans', sans-serif" }}>
          Your complete package — {DOC_LIST.length} documents
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(245,240,232,0.62)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, flexWrap: 'wrap' }}>
          {DOC_LIST.map((doc, i) => (
            <span key={doc}>
              <span style={{ color: i === 1 ? '#C9A84C' : 'rgba(245,240,232,0.62)' }}>{doc}</span>
              {i < DOC_LIST.length - 1 && <span style={{ color: 'rgba(201,168,76,0.25)', margin: '0 5px' }}>·</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
