// Person-agnostic DS-160 question-set registry — Phase 2 of the DS-160 intake plan.
// Every array here uses the same QuestionField shape as src/app/apply/family/page.tsx.
// Question keys carry no person suffix; person scoping happens entirely via
// answers.family_member_id (NULL = principal). One definition serves the
// principal's Module 3 flow and every dependent's mini-DS-160 flow.

export interface QuestionField {
  key: string;
  type: 'text' | 'textarea' | 'single' | 'multi' | 'currency';
  label: string;
  helperText?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  showIf?: { key: string; value: string };
}

const YES_NO = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
];

// ---------------------------------------------------------------------------
// Security & Background — DS-160's five sworn-statement pages.
// Self-attestation only; not extractable from uploaded documents.
// ---------------------------------------------------------------------------

export const SECURITY_HEALTH_QUESTIONS: QuestionField[] = [
  {
    key: 'M3-SEC-H-01',
    type: 'single',
    label: 'Do you have a communicable disease of public health significance?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-H-01-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-H-01', value: 'yes' },
  },
  {
    key: 'M3-SEC-H-02',
    type: 'single',
    label: 'Do you have a physical or mental disorder that has posed, or is likely to pose, a threat to your safety or the safety of others?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-H-02-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-H-02', value: 'yes' },
  },
  {
    key: 'M3-SEC-H-03',
    type: 'single',
    label: 'Are you or have you ever been a drug abuser or addict?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-H-03-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-H-03', value: 'yes' },
  },
];

export const SECURITY_CRIMINAL_QUESTIONS: QuestionField[] = [
  {
    key: 'M3-SEC-C-01',
    type: 'single',
    label: 'Have you ever been arrested or convicted for any offense or crime, even though subject to a pardon, amnesty, or similar legal action?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-C-01-EXPLAIN',
    type: 'textarea',
    label: 'Please explain — include the offense, date, location, and disposition.',
    showIf: { key: 'M3-SEC-C-01', value: 'yes' },
  },
  {
    key: 'M3-SEC-C-02',
    type: 'single',
    label: 'Have you ever violated, or engaged in a conspiracy to violate, any law relating to controlled substances?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-C-02-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-C-02', value: 'yes' },
  },
];

export const SECURITY_MORAL_QUESTIONS: QuestionField[] = [
  {
    key: 'M3-SEC-M-01',
    type: 'single',
    label: 'Are you coming to the United States to engage in prostitution or unlawful commercialized vice, or have you been engaged in prostitution or procuring prostitutes within the past 10 years?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-M-01-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-M-01', value: 'yes' },
  },
  {
    key: 'M3-SEC-M-02',
    type: 'single',
    label: 'Have you ever been involved in, or do you seek to engage in, money laundering?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-M-02-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-M-02', value: 'yes' },
  },
  {
    key: 'M3-SEC-M-03',
    type: 'single',
    label: 'Have you ever committed or conspired to commit a human trafficking offense, or knowingly benefited from such trafficking?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-M-03-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-M-03', value: 'yes' },
  },
];

export const SECURITY_IMMIGRATION_QUESTIONS: QuestionField[] = [
  {
    key: 'M3-SEC-I-01',
    type: 'single',
    label: 'Have you ever sought to obtain, or assisted others to obtain, a visa, entry into the U.S., or any other immigration benefit by fraud or willful misrepresentation?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-I-01-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-I-01', value: 'yes' },
  },
  {
    key: 'M3-SEC-I-02',
    type: 'single',
    label: 'Have you ever been unlawfully present, overstayed the terms of a U.S. visa, or been removed or deported from any country?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-I-02-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-I-02', value: 'yes' },
  },
  {
    key: 'M3-SEC-I-03',
    type: 'single',
    label: 'Have you attended a U.S. public elementary or secondary school on student (F) status without reimbursing the school?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-I-03-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-I-03', value: 'yes' },
  },
];

export const SECURITY_SEVERE_QUESTIONS: QuestionField[] = [
  {
    key: 'M3-SEC-S-01',
    type: 'single',
    label: 'Do you seek to engage in espionage, sabotage, export control violations, or any other illegal activity while in the United States?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-S-01-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-S-01', value: 'yes' },
  },
  {
    key: 'M3-SEC-S-02',
    type: 'single',
    label: 'Do you seek to engage in terrorist activities, or have you ever been a member or representative of a terrorist organization?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-S-02-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-S-02', value: 'yes' },
  },
  {
    key: 'M3-SEC-S-03',
    type: 'single',
    label: 'Have you ever been a member of, or affiliated with, a paramilitary unit, self-defense unit, vigilante unit, rebel group, guerrilla group, or insurgent organization?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-S-03-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-S-03', value: 'yes' },
  },
  {
    key: 'M3-SEC-S-04',
    type: 'single',
    label: 'Have you ever ordered, incited, committed, assisted, or otherwise participated in genocide, torture, or extrajudicial killings?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-S-04-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-S-04', value: 'yes' },
  },
  {
    key: 'M3-SEC-S-05',
    type: 'single',
    label: 'Have you ever recruited, used, or served as a child soldier?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-SEC-S-05-EXPLAIN',
    type: 'textarea',
    label: 'Please explain.',
    showIf: { key: 'M3-SEC-S-05', value: 'yes' },
  },
];

export interface SecuritySubArea {
  key: string;
  label: string;
  questions: QuestionField[];
}

export const SECURITY_SUB_AREAS: SecuritySubArea[] = [
  { key: 'health', label: 'Health-related grounds', questions: SECURITY_HEALTH_QUESTIONS },
  { key: 'criminal', label: 'Criminal history & controlled substances', questions: SECURITY_CRIMINAL_QUESTIONS },
  { key: 'moral', label: 'Prostitution, money laundering & trafficking', questions: SECURITY_MORAL_QUESTIONS },
  { key: 'immigration', label: 'Immigration violations', questions: SECURITY_IMMIGRATION_QUESTIONS },
  { key: 'severe', label: 'Security, terrorism & genocide', questions: SECURITY_SEVERE_QUESTIONS },
];

// ---------------------------------------------------------------------------
// U.S. Point of Contact — one section per filer (principal + every dependent).
// ---------------------------------------------------------------------------

export const US_POC_QUESTIONS: QuestionField[] = [
  {
    key: 'M3-POC-01',
    type: 'single',
    label: 'Do you know a person or organization in the United States who can be reached for information about your visit?',
    required: true,
    options: YES_NO,
  },
  { key: 'M3-POC-02', type: 'text', label: 'Contact name', showIf: { key: 'M3-POC-01', value: 'yes' } },
  { key: 'M3-POC-03', type: 'text', label: 'Organization (if applicable)', showIf: { key: 'M3-POC-01', value: 'yes' } },
  {
    key: 'M3-POC-04',
    type: 'single',
    label: 'Relationship to you',
    showIf: { key: 'M3-POC-01', value: 'yes' },
    options: [
      { value: 'relative', label: 'Relative' },
      { value: 'friend', label: 'Friend' },
      { value: 'business', label: 'Business associate' },
      { value: 'employer', label: 'Prospective employer' },
      { value: 'school', label: 'School official' },
      { value: 'other', label: 'Other' },
    ],
  },
  { key: 'M3-POC-05', type: 'text', label: 'U.S. address', showIf: { key: 'M3-POC-01', value: 'yes' } },
  { key: 'M3-POC-06', type: 'text', label: 'Phone number', showIf: { key: 'M3-POC-01', value: 'yes' } },
  { key: 'M3-POC-07', type: 'text', label: 'Email address', showIf: { key: 'M3-POC-01', value: 'yes' } },
];

// ---------------------------------------------------------------------------
// Travel Companions — one section per filer.
// ---------------------------------------------------------------------------

export const TRAVEL_COMPANIONS_QUESTIONS: QuestionField[] = [
  {
    key: 'M3-TC-01',
    type: 'single',
    label: 'Are other persons traveling with you?',
    required: true,
    options: YES_NO,
  },
  {
    key: 'M3-TC-02',
    type: 'single',
    label: 'Are you traveling as part of a group or organization?',
    showIf: { key: 'M3-TC-01', value: 'yes' },
    options: YES_NO,
  },
  { key: 'M3-TC-03', type: 'text', label: 'Group or organization name', showIf: { key: 'M3-TC-02', value: 'yes' } },
  {
    key: 'M3-TC-04',
    type: 'textarea',
    label: 'List each traveling companion — full name and relationship to you (e.g. "Jane Doe, spouse").',
    showIf: { key: 'M3-TC-01', value: 'yes' },
  },
];

// ---------------------------------------------------------------------------
// Application Contact — E-2 petition only, principal filer.
// ---------------------------------------------------------------------------

export const APPLICATION_CONTACT_QUESTIONS: QuestionField[] = [
  { key: 'M3-AC-01', type: 'text', label: 'Contact person full name', required: true },
  { key: 'M3-AC-02', type: 'text', label: 'Contact person title / role in the business' },
  { key: 'M3-AC-03', type: 'text', label: 'Contact phone number', required: true },
  { key: 'M3-AC-04', type: 'text', label: 'Contact email address', required: true },
  {
    key: 'M3-AC-05',
    type: 'single',
    label: 'Is this contact authorized to respond to consular officer questions about the petition?',
    options: YES_NO,
  },
];
