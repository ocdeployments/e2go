'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { getConsulateData, getEmbassyFinderUrl } from '@/lib/consulate-data';
import { buildDocumentChecklist, type ChecklistSection, type CaseFlags } from '@/lib/document-checklist';
import type { ConsulateCountryData } from '@/lib/consulate-data';

// ---------------------------------------------------------------------------
// Styles (Obsidian Gold design system)
// ---------------------------------------------------------------------------
const gold = '#C9A84C';
const bg = '#0a0a0a';
const surface = 'rgba(201,168,76,0.04)';
const border = 'rgba(201,168,76,0.15)';
const text = '#f5f0e8';
const muted = 'rgba(245,240,232,0.5)';
const red = '#ef4444';

const S = {
  page: { background: bg, minHeight: '100vh', color: text, fontFamily: '"DM Sans", sans-serif', paddingBottom: 80 } as React.CSSProperties,
  container: { maxWidth: 860, margin: '0 auto', padding: '48px 24px' } as React.CSSProperties,
  eyebrow: { fontSize: 10, letterSpacing: '0.15em', color: gold, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase' as const },
  h1: { fontFamily: '"Cormorant Garamond", serif', fontSize: 38, fontWeight: 300, color: text, margin: '0 0 8px', lineHeight: 1.15 } as React.CSSProperties,
  subtitle: { fontSize: 14, color: muted, marginBottom: 48, lineHeight: 1.6 } as React.CSSProperties,
  sectionTitle: { fontFamily: '"Cormorant Garamond", serif', fontSize: 22, fontWeight: 400, color: text, margin: '48px 0 20px', borderBottom: `1px solid ${border}`, paddingBottom: 12 } as React.CSSProperties,
  card: { background: surface, border: `1px solid ${border}`, padding: '28px 32px', marginBottom: 24 } as React.CSSProperties,
  cardTitle: { fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: gold, textTransform: 'uppercase' as const, marginBottom: 16 },
  cardBody: { fontSize: 14, color: text, lineHeight: 1.7 } as React.CSSProperties,
  label: { fontSize: 11, letterSpacing: '0.1em', color: muted, textTransform: 'uppercase' as const },
  value: { fontSize: 15, color: text, marginTop: 4, lineHeight: 1.5 } as React.CSSProperties,
  fieldRow: { marginBottom: 20 } as React.CSSProperties,
  tag: (color: string) => ({ display: 'inline-block', fontSize: 9, letterSpacing: '0.1em', fontWeight: 700, padding: '3px 8px', border: `1px solid ${color}40`, color, marginRight: 8, verticalAlign: 'middle' } as React.CSSProperties),
  divider: { height: 1, background: border, margin: '8px 0 20px' } as React.CSSProperties,
  checkRow: { display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 0', borderBottom: `1px solid rgba(201,168,76,0.07)` } as React.CSSProperties,
  checkbox: (checked: boolean, critical: boolean) => ({
    width: 18, height: 18, flexShrink: 0, border: `1.5px solid ${checked ? gold : critical ? red + '80' : 'rgba(245,240,232,0.25)'}`,
    background: checked ? gold + '20' : 'transparent', cursor: 'pointer', marginTop: 2,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  } as React.CSSProperties),
  itemLabel: (checked: boolean) => ({ fontSize: 14, color: checked ? muted : text, textDecoration: checked ? 'line-through' : 'none', lineHeight: 1.4 } as React.CSSProperties),
  itemDetail: { fontSize: 12, color: muted, marginTop: 4, lineHeight: 1.55 } as React.CSSProperties,
  tabBadge: { display: 'inline-block', fontSize: 9, color: gold, border: `1px solid ${border}`, padding: '2px 6px', marginLeft: 8, verticalAlign: 'middle', letterSpacing: '0.08em' } as React.CSSProperties,
  tipRow: { display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 } as React.CSSProperties,
  tipNum: { width: 28, height: 28, flexShrink: 0, background: gold + '15', border: `1px solid ${gold}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: gold, fontWeight: 600, marginTop: 2 } as React.CSSProperties,
  tipText: { fontSize: 14, color: text, lineHeight: 1.65 } as React.CSSProperties,
  alertBand: (color: string) => ({ background: color + '10', border: `1px solid ${color}30`, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' } as React.CSSProperties),
  alertIcon: (color: string) => ({ fontSize: 16, color, flexShrink: 0, marginTop: 1 } as React.CSSProperties),
  alertText: { fontSize: 13, color: text, lineHeight: 1.6 } as React.CSSProperties,
  progressRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } as React.CSSProperties,
  progressBar: (_pct: number) => ({ height: 3, background: border, position: 'relative' as const, marginBottom: 32, overflow: 'hidden' }),
  progressFill: (pct: number) => ({ position: 'absolute' as const, left: 0, top: 0, height: '100%', width: `${pct}%`, background: gold, transition: 'width 0.3s ease' }),
};

// ---------------------------------------------------------------------------
// Day-of-interview tips (universal)
// ---------------------------------------------------------------------------
const DAY_OF_TIPS = [
  { num: 1, heading: 'Arrive 30 minutes early', body: 'Security queues can be longer than expected. You will clear a security checkpoint similar to an airport before entering the building. Being late — or rushed — creates anxiety that shows during the interview.' },
  { num: 2, heading: 'Leave all electronics in your vehicle', body: 'Cell phones, smartphones, tablets, smartwatches, and laptops are not permitted inside the consulate building. Security will ask you to power them down and store them. Plan for this in advance — do not bring what you cannot leave behind.' },
  { num: 3, heading: 'Dress professionally', body: 'Business professional attire. You are meeting a U.S. government official in a formal context. The officer forms an impression before you speak. Dress as you would for a board meeting, not a job interview at a startup.' },
  { num: 4, heading: 'Bring only what you need', body: 'Your physical binder, personal documents, and a slim bag or briefcase. Oversized bags may be turned away at security. Leave unnecessary items in your vehicle.' },
  { num: 5, heading: 'Children who are not applying should not accompany you', body: 'Only applicants are admitted into the consulate. If your spouse or children are applying for their own E-2 dependent visa, they attend their own separate appointment. Non-applying children should be cared for elsewhere on the interview day.' },
  { num: 6, heading: 'The interview is 5–10 minutes for well-prepared applicants', body: 'Officers have reviewed your package before you arrive at the window. They are looking to confirm what is in your file — not to catch you. A short interview is a good interview. If an officer spends more time, it typically means something in the package needs verbal clarification, not that you are in trouble.' },
  { num: 7, heading: 'You stand at a window — this is not a seated room interview', body: 'The E-2 interview takes place at a consulate window, similar to a bank teller window. You stand, the officer sits. Keep your answers concise and direct — this is not a conversation, it is a verification.' },
  { num: 8, heading: 'Have your key numbers memorised before you walk in', body: 'Total investment amount. Breakdown (franchise fee, build-out, equipment, working capital). Year 1 and Year 3 revenue projections. Number of employees. Break-even month. You should be able to state these without looking at a document.' },
  { num: 9, heading: '"Administrative processing" is not a denial', body: 'If the officer says they need additional time to review your case, this is called a 221(g) — administrative processing. It is common for E-2 applications. It means the case is under further review, not that you have been refused. Contact your attorney immediately if this occurs.' },
  { num: 10, heading: 'Social media — know what the officer will find', body: 'As of May 2026, Toronto and other high-volume consulates are conducting real-time social media searches during the interview. Before you go, Google your full name and know what appears. Remove or understand any posts that could be read as evidence of immigrant intent.' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function InterviewDayPage() {
  const [loading, setLoading] = useState(true);
  const [treatyCountry, setTreatyCountry] = useState<string | null>(null);
  const [consulateData, setConsulateData] = useState<ConsulateCountryData | null>(null);
  const [checklist, setChecklist] = useState<ChecklistSection[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [selectedPost, setSelectedPost] = useState<number>(0); // index into all posts

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Fetch the most recent application
      const { data: app } = await supabase
        .from('applications')
        .select('id, application_type, treaty_country, investment_sources, prior_visa_denial, operational_status, business_category, has_partner')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Fetch answers for spouse/children flags
      let hasSpouse = false;
      let childCount = 0;
      let isFranchise = false;
      const investmentSourceTypes: string[] = [];

      if (app) {
        const { data: answers } = await supabase
          .from('answers')
          .select('question_id, answer_text')
          .eq('application_id', app.id)
          .in('question_id', ['Q0-03', 'QA-15', 'QA-16', 'QF-NEW-05']);

        const answerMap = new Map<string, string>((answers || []).map((a: { question_id: string; answer_text: string }) => [a.question_id, a.answer_text] as [string, string]));
        const appType = app.application_type || '';
        hasSpouse = appType.includes('spouse') || appType.includes('couple') || appType.includes('famil');
        const childAnswer = answerMap.get('Q0-03') || '';
        childCount = childAnswer.match(/(\d+)\s*child/i)?.[1] ? parseInt(childAnswer.match(/(\d+)\s*child/i)![1]) : 0;
        isFranchise = (app.business_category || '').toLowerCase().includes('franchise') || !!(answerMap.get('QF-NEW-05'));

        // Parse investment sources
        if (app.investment_sources) {
          const sources = typeof app.investment_sources === 'string'
            ? JSON.parse(app.investment_sources)
            : app.investment_sources;
          if (Array.isArray(sources)) {
            sources.forEach((s: { sourceType?: string; source_type?: string }) => {
              const t = s.sourceType || s.source_type || '';
              if (t) investmentSourceTypes.push(t);
            });
          }
        }
      }

      const country = app?.treaty_country || null;
      setTreatyCountry(country);

      if (country) {
        const data = getConsulateData(country);
        setConsulateData(data);
      }

      let hasDocumentUploads = false;
      if (app) {
        const { count } = await supabase
          .from('application_documents')
          .select('id', { count: 'exact', head: true })
          .eq('application_id', app.id);
        hasDocumentUploads = (count ?? 0) > 0;
      }

      const flags: CaseFlags = {
        applicationType: app?.application_type || 'solo',
        hasSpouseApplying: hasSpouse,
        dependentChildCount: childCount,
        isFranchise,
        investmentSources: investmentSourceTypes,
        priorVisaDenial: app?.prior_visa_denial === true,
        operationalStatus: app?.operational_status || 'pre_start',
        businessCategory: app?.business_category || '',
        hasDocumentUploads,
        hasPartner: app?.has_partner === true || (app?.application_type || '').includes('partnership'),
      };

      setChecklist(buildDocumentChecklist(flags));
      setLoading(false);
    }
    load();
  }, []);

  const allPosts = consulateData
    ? [consulateData.primaryPost, ...(consulateData.additionalPosts || [])]
    : [];
  const displayPost = allPosts[selectedPost] ?? allPosts[0];

  const totalItems = checklist.flatMap(s => s.items).length;
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  function toggle(id: string) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  }

  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: muted, fontSize: 13, letterSpacing: '0.08em' }}>Loading your interview guide…</div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* Header */}
        <div style={S.eyebrow}>Interview Preparation</div>
        <h1 style={S.h1}>Your Interview Day Guide</h1>
        <p style={S.subtitle}>
          Everything you need for the day of your consulate interview —
          your consulate details, what to bring, what to expect, and a personalised document checklist.
        </p>

        {/* ----------------------------------------------------------------
            Consulate Information
        ---------------------------------------------------------------- */}
        <h2 style={S.sectionTitle}>Your Consulate</h2>

        {consulateData ? (
          <>
            {consulateData.countryNote && (
              <div style={S.alertBand(gold)}>
                <div style={S.alertIcon(gold)}>ⓘ</div>
                <div style={S.alertText}>{consulateData.countryNote}</div>
              </div>
            )}

            {/* Post selector (if multiple posts) */}
            {allPosts.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' as const }}>
                {allPosts.map((post, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPost(i)}
                    style={{
                      padding: '8px 16px', fontSize: 12, letterSpacing: '0.06em',
                      border: `1px solid ${i === selectedPost ? gold : border}`,
                      background: i === selectedPost ? gold + '15' : 'transparent',
                      color: i === selectedPost ? gold : muted,
                      cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
                    }}
                  >
                    {post.city}
                    {i === 0 && <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.6 }}>PRIMARY</span>}
                  </button>
                ))}
              </div>
            )}

            {displayPost && (
              <div style={S.card}>
                <div style={S.cardTitle}>{displayPost.name}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 40px' } as React.CSSProperties}>
                  <div style={S.fieldRow}>
                    <div style={S.label}>Address</div>
                    <div style={S.value}>{displayPost.address}</div>
                  </div>
                  {displayPost.phone && (
                    <div style={S.fieldRow}>
                      <div style={S.label}>Phone</div>
                      <div style={S.value}>{displayPost.phone}</div>
                    </div>
                  )}
                  {displayPost.logistics?.nearestTransit && (
                    <div style={S.fieldRow}>
                      <div style={S.label}>Nearest Transit</div>
                      <div style={S.value}>{displayPost.logistics.nearestTransit}</div>
                    </div>
                  )}
                  {displayPost.logistics?.parkingNote && (
                    <div style={S.fieldRow}>
                      <div style={S.label}>Parking</div>
                      <div style={S.value}>{displayPost.logistics.parkingNote}</div>
                    </div>
                  )}
                  {displayPost.waitTimeNote && (
                    <div style={S.fieldRow}>
                      <div style={S.label}>Typical Wait for Appointment</div>
                      <div style={S.value}>{displayPost.waitTimeNote}</div>
                    </div>
                  )}
                  {displayPost.appointmentSystem && (
                    <div style={S.fieldRow}>
                      <div style={S.label}>Appointment System</div>
                      <div style={S.value}>{displayPost.appointmentSystem}</div>
                    </div>
                  )}
                </div>

                {displayPost.e2Note && (
                  <>
                    <div style={S.divider} />
                    <div style={{ fontSize: 13, color: muted, lineHeight: 1.65 }}>{displayPost.e2Note}</div>
                  </>
                )}

                <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                  <a
                    href={displayPost.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: gold, border: `1px solid ${border}`, padding: '8px 16px', textDecoration: 'none', letterSpacing: '0.06em' }}
                  >
                    Official Consulate Website →
                  </a>
                  {displayPost.appointmentUrl && (
                    <a
                      href={displayPost.appointmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: muted, border: `1px solid ${border}`, padding: '8px 16px', textDecoration: 'none', letterSpacing: '0.06em' }}
                    >
                      Schedule Appointment →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Security notice */}
            {displayPost?.logistics?.electronicDevicesPolicy && (
              <div style={S.alertBand(red)}>
                <div style={S.alertIcon(red)}>⚠</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: red, marginBottom: 6 }}>ELECTRONICS POLICY</div>
                  <div style={S.alertText}>{displayPost.logistics.electronicDevicesPolicy}</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={S.card}>
            <div style={S.cardBody}>
              {treatyCountry
                ? `We don't have verified consulate details for ${treatyCountry} yet. Please visit the official U.S. embassy website for your country.`
                : 'Your treaty country was not detected. Please visit the U.S. Embassy Finder for your consulate details.'}
            </div>
            <a
              href={getEmbassyFinderUrl(treatyCountry || '')}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 16, fontSize: 12, color: gold, border: `1px solid ${border}`, padding: '8px 16px', textDecoration: 'none' }}
            >
              Find My Consulate → usembassy.gov
            </a>
          </div>
        )}

        {/* ----------------------------------------------------------------
            What to Expect
        ---------------------------------------------------------------- */}
        <h2 style={S.sectionTitle}>What to Expect on the Day</h2>

        <div style={S.card}>
          <div style={S.cardTitle}>The Interview Process — Step by Step</div>
          {[
            { step: 'Arrive at the consulate', detail: 'Arrive 30 minutes before your appointment time. Have your appointment confirmation and passport ready at the entry security checkpoint.' },
            { step: 'Security screening', detail: 'You will pass through a security checkpoint similar to an airport — metal detector and bag X-ray. Leave all electronics in your vehicle before entering the security perimeter.' },
            { step: 'Document submission', detail: 'You present your complete tabbed binder and personal documents at the cashier or intake window. You may be asked to pay a visa issuance fee at this stage.' },
            { step: 'Waiting room', detail: 'After document submission, you wait in a waiting area. The officer reviews your package during this time — the interview happens after this review, not before.' },
            { step: 'Interview window', detail: 'Your name is called and you proceed to a glass interview window. You stand. The interview is typically 5–10 minutes. The officer asks verification questions about your business, investment, and qualifications.' },
            { step: 'Decision', detail: 'The officer will: (A) approve the visa on the spot — your passport will be returned within a few days by courier; (B) issue a 221(g) for administrative processing — additional review required; or (C) refuse the visa with a written reason.' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, flexShrink: 0, background: gold + '15', border: `1px solid ${gold}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: gold, fontWeight: 600, marginTop: 2 }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: text, marginBottom: 4 }}>{s.step}</div>
                <div style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>{s.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ----------------------------------------------------------------
            Tips
        ---------------------------------------------------------------- */}
        <h2 style={S.sectionTitle}>10 Things to Know Before You Walk In</h2>

        <div style={S.card}>
          {DAY_OF_TIPS.map((tip) => (
            <div key={tip.num} style={S.tipRow}>
              <div style={S.tipNum}>{tip.num}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: text, marginBottom: 4 }}>{tip.heading}</div>
                <div style={S.tipText}>{tip.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ----------------------------------------------------------------
            Document Checklist
        ---------------------------------------------------------------- */}
        <h2 style={S.sectionTitle}>Your Document Checklist</h2>

        {/* Progress */}
        <div style={S.progressRow}>
          <span style={{ fontSize: 13, color: muted }}>{checkedCount} of {totalItems} items confirmed</span>
          <span style={{ fontSize: 12, color: pct === 100 ? '#22c55e' : gold }}>{pct}%</span>
        </div>
        <div style={S.progressBar(pct)}>
          <div style={S.progressFill(pct)} />
        </div>

        {checklist.map((section) => {
          const isDontBring = section.id === 'do_not_bring';
          return (
            <div key={section.id} style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', color: isDontBring ? red : gold, textTransform: 'uppercase', margin: 0 }}>
                  {section.title}
                </h3>
                {!isDontBring && (
                  <span style={{ fontSize: 11, color: muted }}>
                    {section.items.filter(i => checked[i.id]).length}/{section.items.length}
                  </span>
                )}
              </div>

              {section.items.map((item) => (
                <div
                  key={item.id}
                  style={S.checkRow}
                  onClick={() => !isDontBring && toggle(item.id)}
                >
                  {!isDontBring ? (
                    <div style={S.checkbox(!!checked[item.id], item.critical)}>
                      {checked[item.id] && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke={gold} strokeWidth="1.5" strokeLinecap="square" />
                        </svg>
                      )}
                    </div>
                  ) : (
                    <div style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: red, fontSize: 14 }}>✕</div>
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
                      <span style={isDontBring ? { fontSize: 14, color: text, lineHeight: 1.4 } : S.itemLabel(!!checked[item.id])}>
                        {item.label}
                      </span>
                      {item.tab && <span style={S.tabBadge}>{item.tab}</span>}
                      {item.critical && !isDontBring && (
                        <span style={{ fontSize: 9, color: red, border: `1px solid ${red}40`, padding: '2px 5px', letterSpacing: '0.08em' }}>REQUIRED</span>
                      )}
                    </div>
                    {item.detail && (
                      <div style={S.itemDetail}>{item.detail}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* Print button */}
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => window.print()}
            style={{ fontSize: 12, letterSpacing: '0.08em', color: gold, border: `1px solid ${border}`, background: 'transparent', padding: '10px 20px', cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
          >
            Print this guide
          </button>
        </div>

      </div>
    </div>
  );
}
