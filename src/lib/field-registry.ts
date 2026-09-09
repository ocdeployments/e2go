// Single source of truth mapping every intake fact and every case-file tool
// to a card. Both /case-profile and /onboarding read completion state from
// this registry (via /api/case/completion) instead of each maintaining its
// own hardcoded field list.
//
// Ground truth for question keys was pulled directly from the live apply
// pages (src/app/apply/{story,business,investment,qualifications,family,ties}/page.tsx),
// src/lib/ds160-question-sets.ts, and the doc-extraction map
// (src/app/api/apply/parse-document/route.ts: INTAKE_FIELD_MAP/FIELD_LABELS) —
// not from src/app/apply/module3/* (a legacy QA-/QB-/.../QK- system, out of scope).
//
// section-completion (src/app/api/apply/section-completion/route.ts) keeps
// running unchanged during the transition; this registry supersedes its
// prefix-count logic for every new consumer.

export type CardId =
  | 'investor_profile'
  | 'story'
  | 'business_details'
  | 'investment_snapshot'
  | 'qualifications'
  | 'family_dependents'
  | 'ties'
  | 'security_background'
  | 'gap_analysis'
  | 'market_analysis'
  | 'fdd_review'
  | 'simulator'
  | 'prep_kit'
  | 'document_vault'
  | 'generate_package';

export interface FieldDefinition {
  questionKey: string;
  cardId: CardId;
  clientLabel: string;
  moduleHref: string;
  required: boolean;
  perPerson: boolean;
  /** Once answered anywhere, never ask again — surfaces as a prefill everywhere else. */
  askOnce: boolean;
}

export type CardCategory = 'case_file' | 'case_intelligence' | 'interview_prep' | 'documents';

export const CARD_CATEGORY_LABELS: Record<CardCategory, string> = {
  case_file: 'Case File',
  case_intelligence: 'Case Intelligence',
  interview_prep: 'Interview Prep',
  documents: 'Documents',
};

export interface CardDefinition {
  id: CardId;
  label: string;
  kind: 'intake' | 'tool';
  category: CardCategory;
  moduleHref: string;
  order: number;
}

export const CARD_DEFINITIONS: Record<CardId, CardDefinition> = {
  investor_profile:    { id: 'investor_profile',    label: 'Your profile',        kind: 'intake', category: 'case_file',         moduleHref: '/apply/story',                     order: 1 },
  story:               { id: 'story',               label: 'Your story',          kind: 'intake', category: 'case_file',         moduleHref: '/apply/story',                     order: 2 },
  business_details:    { id: 'business_details',    label: 'Your business',       kind: 'intake', category: 'case_file',         moduleHref: '/apply/business',                  order: 3 },
  investment_snapshot: { id: 'investment_snapshot', label: 'Your investment',     kind: 'intake', category: 'case_file',         moduleHref: '/apply/investment',                order: 4 },
  qualifications:      { id: 'qualifications',      label: 'Your qualifications', kind: 'intake', category: 'case_file',         moduleHref: '/apply/qualifications',            order: 5 },
  family_dependents:   { id: 'family_dependents',   label: 'Family & dependents', kind: 'intake', category: 'case_file',         moduleHref: '/apply/family',                    order: 6 },
  ties:                { id: 'ties',                label: 'Ties to home',        kind: 'intake', category: 'case_file',         moduleHref: '/apply/ties',                      order: 7 },
  security_background: { id: 'security_background', label: 'Security background', kind: 'intake', category: 'case_file',         moduleHref: '/apply/security/[personId]',       order: 8 },
  gap_analysis:        { id: 'gap_analysis',        label: 'Gap analysis',        kind: 'tool',   category: 'case_intelligence', moduleHref: '/gap-analysis',                    order: 9 },
  market_analysis:     { id: 'market_analysis',     label: 'Market analysis',     kind: 'tool',   category: 'case_intelligence', moduleHref: '/market-analysis',                 order: 10 },
  fdd_review:          { id: 'fdd_review',          label: 'FDD review',          kind: 'tool',   category: 'case_intelligence', moduleHref: '/fdd',                             order: 11 },
  simulator:           { id: 'simulator',           label: 'Interview simulator', kind: 'tool',   category: 'interview_prep',    moduleHref: '/simulator',                       order: 12 },
  prep_kit:            { id: 'prep_kit',            label: 'Prep kit',           kind: 'tool',   category: 'interview_prep',    moduleHref: '/simulator/prep-kit',              order: 13 },
  document_vault:      { id: 'document_vault',      label: 'Documents',          kind: 'tool',   category: 'documents',         moduleHref: '/documents',                        order: 14 },
  generate_package:    { id: 'generate_package',    label: 'Generate package',   kind: 'tool',   category: 'documents',         moduleHref: '/generate',                         order: 15 },
};

function fields(cardId: CardId, moduleHref: string, perPerson: boolean, defs: [string, string, boolean?][]): FieldDefinition[] {
  return defs.map(([questionKey, clientLabel, required]) => ({
    questionKey,
    cardId,
    clientLabel,
    moduleHref,
    required: required ?? false,
    perPerson,
    askOnce: true,
  }));
}

// ---------------------------------------------------------------------------
// investor_profile — M3-A-* (identity/bio) — src/app/apply/story/page.tsx
// ---------------------------------------------------------------------------
const INVESTOR_PROFILE_FIELDS = fields('investor_profile', '/apply/story', false, [
  ['M3-A-01', 'Full legal name as it appears on your passport', true],
  ['M3-A-02', 'Have you ever used any other names?', true],
  ['M3-A-03', 'Date of birth', true],
  ['M3-A-04', 'Place of birth (city and country)', true],
  ['M3-A-05', 'Country of citizenship', true],
  ['M3-A-06', 'Do you hold citizenship in any other country?', true],
  ['M3-A-08', 'U.S. Social Security Number or Taxpayer ID (ITIN)'],
  ['M3-A-09', 'Current home address', true],
  ['M3-A-10', 'How long have you lived at this address?'],
  ['M3-A-11', 'Primary phone number', true],
  ['M3-A-12', 'Email address', true],
  ['M3-A-13', 'Social media platforms'],
  ['M3-A-14', "Parents' full names"],
  ['M3-A-15', 'Have you ever lost a passport or had one stolen?', true],
  ['M3-A-16', 'List your last 5 trips to the United States'],
  ['M3-A-17', 'Countries visited in the past 5 years'],
  ['M3-A-18', 'Do you have immediate family members living in the United States?', true],
  ['M3-A-19', 'Have you ever applied for a U.S. green card or immigrant visa?', true],
  ['M3-A-20', "Have you ever held a U.S. driver's license?", true],
  ['M3-A-21', 'Have you held any U.S. visas in the past?', true],
]);

// ---------------------------------------------------------------------------
// story — M3-S1-* (narrative) — src/app/apply/story/page.tsx
// ---------------------------------------------------------------------------
const STORY_FIELDS = fields('story', '/apply/story', false, [
  ['M3-S1-01', 'What have you spent your career doing, and how does it connect to this business?'],
  ['M3-S1-02', 'Why are you making this move, and why now?'],
  ['M3-S1-03', 'What qualifies you to run this specific type of business?'],
  ['M3-S1-04', 'What are your first-year priorities?'],
  ['M3-S1-05', 'Is there anything in your application a consular officer might question?'],
  ['M3-S1-05-option', 'Nothing unusual to address'],
]);

// ---------------------------------------------------------------------------
// business_details — M3-E-*, M3-G-*, M3-K-* — src/app/apply/business/page.tsx
// Includes M3-B-* and M3-E-STARTUP-COSTS, which section-completion's prefix
// scan doesn't count today (a known gap) but which live on the same page.
// ---------------------------------------------------------------------------
const BUSINESS_DETAILS_FIELDS = fields('business_details', '/apply/business', false, [
  ['M3-E-01', 'Business legal name', true],
  ['M3-E-02', 'Entity type', true],
  ['M3-E-03', 'State of registration', true],
  ['M3-E-04', 'EIN (Employer Identification Number)'],
  ['M3-E-05', 'Date entity formed'],
  ['M3-E-06', 'Ownership percentage (%)', true],
  ['M3-E-13', 'How is your ownership stake documented?', true],
  ['M3-E-07', 'Operating agreement in place?', true],
  ['M3-E-12', 'Has the entity been formed?', true],
  ['M3-E-STARTUP-COSTS', 'Startup cost breakdown'],
  ['M3-G-04', 'Does the business have a physical U.S. location?', true],
  ['M3-G-05', 'Business address'],
  ['M3-G-06', 'Type of premises'],
  ['M3-G-07', 'Lease term or ownership status'],
  ['M3-G-08', 'Is the business currently operational?', true],
  ['M3-G-08a', 'How many days/week will you personally be present managing this business?', true],
  ['M3-G-09', 'Walk me through the first 90 days after you open'],
  ['M3-G-10', 'What licenses or permits does the business hold or have applied for?'],
  ['M3-G-11', 'Have you obtained the required business insurance?'],
  ['M3-G-ADDRESS', 'Business address (lease-extracted)'],
  ['M3-G-RENT', 'Monthly base rent'],
  ['M3-G-LEASE-TERM', 'Lease term (years)'],
  ['M3-G-LEASE-EXP', 'Lease expiration date'],
  ['M3-K-01', 'Describe your business in three sentences', true],
  ['M3-K-02', 'Who are your target customers?'],
  ['M3-K-11', 'What is the size of your target market?'],
  ['M3-K-03', 'Who else is doing this in your area, and what is your competitive advantage?'],
  ['M3-K-12', 'What market trends support your business?'],
  ['M3-B-01', 'Business description'],
  ['M3-B-02', 'Target location'],
  ['M3-B-03', 'Planned/current employees'],
]);

// ---------------------------------------------------------------------------
// investment_snapshot — M3-F-*, M3-H-*, M3-I-* — src/app/apply/investment/page.tsx
// Includes doc-extracted-only keys (M3-FDD-*, M3-FA-*, M3-ACQ-REASON, M3-F-SRC,
// M3-I-NET1, M3-I-PROJECTIONS, M3-I-BREAKEVEN, M3-B-BANK, M3-B-WIRE, M3-H-SELLER)
// and the interview-prep cluster M3-I-11..15, which visually renders on the
// qualifications page but carries the investment prefix.
// ---------------------------------------------------------------------------
const INVESTMENT_SNAPSHOT_FIELDS = fields('investment_snapshot', '/apply/investment', false, [
  ['M3-F-01', 'Investment type', true],
  ['M3-F-02', 'Total invested to date (USD)', true],
  ['M3-F-03', 'Total cost to establish the business (USD)', true],
  ['M3-F-04', 'How was the investment deployed?', true],
  ['M3-F-NEW-01', 'Are funds actually spent on business expenses?'],
  ['M3-F-NET', 'Approximate net worth'],
  ['M3-F-05', 'Source of funds', true],
  ['M3-F-SRC', 'Source of funds narrative'],
  ['M3-F-09', 'Franchise fee'],
  ['M3-F-10', 'Franchise investment range (low)'],
  ['M3-F-11', 'Franchise investment range (high)'],
  ['M3-H-NEW-01', 'Can you trace the funds from origin to US business account?'],
  ['M3-H-01', 'Walk me through the money (full trace narrative)', true],
  ['M3-H-02', 'Over what period were funds accumulated?'],
  ['M3-H-03', 'Were funds held in multiple currencies?'],
  ['M3-H-05', 'Were any funds a gift or inheritance?'],
  ['M3-H-08', 'How were the funds transferred to the U.S. business?'],
  ['M3-H-09', 'Do you have wire transfer records or payment receipts?'],
  ['M3-H-10', 'Were funds converted from a foreign currency?'],
  ['M3-H-SELLER', 'Seller-financing details'],
  ['M3-I-03', 'What is the basis for your revenue projections?'],
  ['M3-I-04', 'Annual salary/draw Year 1'],
  ['M3-I-05', 'Full-time U.S. employees Year 1'],
  ['M3-I-06', 'Part-time U.S. employees Year 1'],
  ['M3-I-07', 'Planned roles for Year 1 hires'],
  ['M3-I-09', 'Does the business serve the U.S. market beyond your household?'],
  ['M3-I-10', 'What evidence supports your non-marginality argument?'],
  ['M3-I-01', 'Year 1 revenue'],
  ['M3-I-NET1', 'Year 1 net income'],
  ['M3-I-PROJECTIONS', 'Revenue projections'],
  ['M3-I-BREAKEVEN', 'Breakeven analysis'],
  ['M3-I-11', 'Interview prep: investment questions'],
  ['M3-I-12', 'Interview prep: investment questions'],
  ['M3-I-13', 'Interview prep: investment questions'],
  ['M3-I-14', 'Interview prep: investment questions'],
  ['M3-I-15', 'Interview prep: investment questions'],
  ['M3-B-BANK', 'U.S. bank account'],
  ['M3-B-WIRE', 'Wire transfer details'],
  ['M3-FDD-ROYALTY', 'Royalty rate'],
  ['M3-FDD-TERM', 'Initial franchise term (years)'],
  ['M3-FDD-LOW', 'FDD investment range (low)'],
  ['M3-FDD-HIGH', 'FDD investment range (high)'],
  ['M3-FA-DATE', 'Franchise agreement date'],
  ['M3-FA-TERRITORY', 'Franchise territory description'],
  ['M3-ACQ-REASON', 'Reason for sale (acquisition)'],
]);

// ---------------------------------------------------------------------------
// qualifications — M3-Q-*, M3-V-* — src/app/apply/qualifications/page.tsx
// ---------------------------------------------------------------------------
const QUALIFICATIONS_FIELDS = fields('qualifications', '/apply/qualifications', false, [
  ['M3-Q-00', 'What type of business or franchise are you pursuing?'],
  ['M3-Q-01', 'Education completed', true],
  ['M3-Q-02A', 'Primary field of study'],
  ['M3-Q-02B', 'Degree or certification received'],
  ['M3-Q-02C', 'Institution attended'],
  ['M3-Q-02D', 'Year completed'],
  ['M3-Q-02E', 'Additional qualifications, certifications, or degrees'],
  ['M3-Q-03', 'English language proficiency'],
  ['M3-Q-04', 'Describe your professional background'],
  ['M3-Q-05', 'Years of professional experience'],
  ['M3-Q-06', 'What relevant skills or experience do you bring?'],
  ['M3-Q-07', 'Have you owned or operated a business before?'],
  ['M3-Q-10', 'How did you decide on this particular business?'],
  ['M3-Q-11', 'What research or due diligence did you do?'],
  ['M3-Q-12', 'Have you visited the business location in person?'],
  ['M3-Q-20', 'Your official title/position in the business', true],
  ['M3-Q-21', 'Day-to-day responsibilities', true],
  ['M3-Q-22', 'Authority to hire/fire employees?'],
  ['M3-Q-23', 'Will you sign contracts/financial commitments?'],
  ['M3-Q-24', 'Will you be physically present in the U.S. managing the business?', true],
  ['M3-Q-25', 'How will you structure your time in this business?'],
  ['M3-V-01', 'Have you ever been denied a U.S. visa?'],
  ['M3-V-02', 'Visa type, date of denial, and reason given'],
  ['M3-V-03', 'Have you ever overstayed a U.S. visa / unauthorized presence?'],
  ['M3-V-04', 'Dates, circumstances, and resolution'],
  ['M3-V-05', 'Have you ever been in removal/deportation proceedings?'],
  ['M3-V-06', 'Details and outcome'],
  ['M3-V-07', 'Have you previously held any U.S. visa status?'],
  ['M3-V-08', 'Prior U.S. visa statuses, dates, purpose'],
]);

// ---------------------------------------------------------------------------
// family_dependents — M3-L-*, CHILD-{n}-* — src/app/apply/family/page.tsx
// ---------------------------------------------------------------------------
const FAMILY_DEPENDENTS_FIELDS: FieldDefinition[] = [
  ...fields('family_dependents', '/apply/family', false, [
    ['M3-L-01', 'Will your spouse or partner be applying for E-2 dependent status?', true],
    ['M3-L-02', 'Spouse full legal name', true],
    ['M3-L-03', 'Spouse date of birth'],
    ['M3-L-04', 'Spouse nationality'],
    ['M3-L-05', 'Spouse passport number'],
    ['M3-L-06', 'Will your spouse apply for U.S. work authorization (EAD)?'],
    ['M3-L-07', 'Will any children be applying as E-2 dependents?', true],
    ['M3-L-07-COUNT', 'How many children will apply?', true],
    ['M3-L-08', 'Children summary (auto-generated)'],
    ['M3-L-09', 'What relationship documents do you have available?'],
    ['M3-L-10', 'Have all dependent documents been officially translated?'],
    ['M3-L-11', 'Will your dependents travel with you to the U.S.?'],
    ['M3-L-12', 'If dependents are not traveling together, explain timeline'],
  ]),
  ...([1, 2, 3, 4, 5] as const).flatMap((n) =>
    fields('family_dependents', '/apply/family', true, [
      [`CHILD-${n}-NAME`, `Child ${n} full name`, true],
      [`CHILD-${n}-DOB`, `Child ${n} date of birth`],
      [`CHILD-${n}-NATIONALITY`, `Child ${n} nationality`],
      [`CHILD-${n}-PASSPORT`, `Child ${n} passport number`],
    ]),
  ),
];

// ---------------------------------------------------------------------------
// ties — M3-T-* — src/app/apply/ties/page.tsx
// ---------------------------------------------------------------------------
const TIES_FIELDS = fields('ties', '/apply/ties', false, [
  ['M3-T-01', 'What property or assets do you own in your home country?', true],
  ['M3-T-02', 'Asset list'],
  ['M3-T-03', 'Do you own your primary residence?'],
  ['M3-T-04', 'What family ties remain in your home country?', true],
  ['M3-T-05', 'Describe your family situation'],
  ['M3-T-06', 'Are you involved in community organizations/activities?'],
  ['M3-T-07', 'What financial obligations do you have in your home country?'],
  ['M3-T-08', 'Describe your ongoing financial ties'],
  ['M3-T-09', 'How long do you intend to stay in the U.S. on E-2 status?', true],
  ['M3-T-10', 'What are your plans when your E-2 status ends?'],
  ['M3-T-11', 'Describe your long-term plans / exit strategy'],
]);

// ---------------------------------------------------------------------------
// security_background — M3-SEC-*, M3-POC-*, M3-TC-*, M3-AC-* — per person.
// Sourced verbatim from src/lib/ds160-question-sets.ts. Security questions
// render at /apply/security/[personId]; POC/Travel Companions render at
// /apply/dependent/[familyMemberId] as part of the same per-person DS-160
// mini-flow. M3-AC-* (Application Contact) is defined in ds160-question-sets.ts
// but is not currently imported/rendered anywhere — kept in the registry so
// it isn't silently lost, flagged here as unwired rather than given a
// fabricated live href.
// ---------------------------------------------------------------------------
const SECURITY_FIELDS: FieldDefinition[] = [
  ...fields('security_background', '/apply/security/[personId]', true, [
    ['M3-SEC-H-01', 'Communicable disease of public health significance?', true],
    ['M3-SEC-H-01-EXPLAIN', 'Explanation'],
    ['M3-SEC-H-02', 'Physical or mental disorder posing a safety threat?', true],
    ['M3-SEC-H-02-EXPLAIN', 'Explanation'],
    ['M3-SEC-H-03', 'Drug abuser or addict?', true],
    ['M3-SEC-H-03-EXPLAIN', 'Explanation'],
    ['M3-SEC-C-01', 'Ever arrested or convicted for any offense or crime?', true],
    ['M3-SEC-C-01-EXPLAIN', 'Explanation'],
    ['M3-SEC-C-02', 'Ever violated any law relating to controlled substances?', true],
    ['M3-SEC-C-02-EXPLAIN', 'Explanation'],
    ['M3-SEC-M-01', 'Coming to engage in prostitution or unlawful commercialized vice?', true],
    ['M3-SEC-M-01-EXPLAIN', 'Explanation'],
    ['M3-SEC-M-02', 'Ever involved in money laundering?', true],
    ['M3-SEC-M-02-EXPLAIN', 'Explanation'],
    ['M3-SEC-M-03', 'Ever committed or conspired to commit a human trafficking offense?', true],
    ['M3-SEC-M-03-EXPLAIN', 'Explanation'],
    ['M3-SEC-I-01', 'Ever sought a visa or immigration benefit by fraud or misrepresentation?', true],
    ['M3-SEC-I-01-EXPLAIN', 'Explanation'],
    ['M3-SEC-I-02', 'Ever unlawfully present, overstayed, or removed/deported?', true],
    ['M3-SEC-I-02-EXPLAIN', 'Explanation'],
    ['M3-SEC-I-03', 'Attended U.S. public school on F status without reimbursing?', true],
    ['M3-SEC-I-03-EXPLAIN', 'Explanation'],
    ['M3-SEC-S-01', 'Seek to engage in espionage, sabotage, or export control violations?', true],
    ['M3-SEC-S-01-EXPLAIN', 'Explanation'],
    ['M3-SEC-S-02', 'Seek to engage in terrorist activities, or member of a terrorist org?', true],
    ['M3-SEC-S-02-EXPLAIN', 'Explanation'],
    ['M3-SEC-S-03', 'Member of a paramilitary, self-defense, rebel, or insurgent group?', true],
    ['M3-SEC-S-03-EXPLAIN', 'Explanation'],
    ['M3-SEC-S-04', 'Participated in genocide, torture, or extrajudicial killings?', true],
    ['M3-SEC-S-04-EXPLAIN', 'Explanation'],
    ['M3-SEC-S-05', 'Recruited, used, or served as a child soldier?', true],
    ['M3-SEC-S-05-EXPLAIN', 'Explanation'],
  ]),
  ...fields('security_background', '/apply/dependent/[familyMemberId]', true, [
    ['M3-POC-01', 'Do you know a U.S. person/organization who can be reached about your visit?', true],
    ['M3-POC-02', 'Contact name'],
    ['M3-POC-03', 'Organization (if applicable)'],
    ['M3-POC-04', 'Relationship to you'],
    ['M3-POC-05', 'U.S. address'],
    ['M3-POC-06', 'Phone number'],
    ['M3-POC-07', 'Email address'],
    ['M3-TC-01', 'Are other persons traveling with you?', true],
    ['M3-TC-02', 'Are you traveling as part of a group or organization?'],
    ['M3-TC-03', 'Group or organization name'],
    ['M3-TC-04', 'List each traveling companion — name and relationship'],
    // Defined in ds160-question-sets.ts but not currently wired to any route.
    ['M3-AC-01', 'Contact person full name', true],
    ['M3-AC-02', 'Contact person title / role in the business'],
    ['M3-AC-03', 'Contact phone number', true],
    ['M3-AC-04', 'Contact email address', true],
    ['M3-AC-05', 'Is this contact authorized to respond to consular officer questions?'],
  ]),
];

export const FIELD_REGISTRY: FieldDefinition[] = [
  ...INVESTOR_PROFILE_FIELDS,
  ...STORY_FIELDS,
  ...BUSINESS_DETAILS_FIELDS,
  ...INVESTMENT_SNAPSHOT_FIELDS,
  ...QUALIFICATIONS_FIELDS,
  ...FAMILY_DEPENDENTS_FIELDS,
  ...TIES_FIELDS,
  ...SECURITY_FIELDS,
];

const FIELD_BY_KEY = new Map(FIELD_REGISTRY.map((f) => [f.questionKey, f]));

export function getFieldDefinition(questionKey: string): FieldDefinition | undefined {
  return FIELD_BY_KEY.get(questionKey);
}

export function getFieldsForCard(cardId: CardId): FieldDefinition[] {
  return FIELD_REGISTRY.filter((f) => f.cardId === cardId);
}

export function getRequiredFieldsForCard(cardId: CardId): FieldDefinition[] {
  return FIELD_REGISTRY.filter((f) => f.cardId === cardId && f.required);
}

export const INTAKE_CARD_IDS: CardId[] = (Object.values(CARD_DEFINITIONS) as CardDefinition[])
  .filter((c) => c.kind === 'intake')
  .map((c) => c.id);

export const TOOL_CARD_IDS: CardId[] = (Object.values(CARD_DEFINITIONS) as CardDefinition[])
  .filter((c) => c.kind === 'tool')
  .map((c) => c.id);
