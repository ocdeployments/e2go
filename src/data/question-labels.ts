/**
 * Static label maps for intake question keys.
 * Kept here (not in document-extraction-engine.ts) so lightweight consumers
 * like the simulator case-summary route don't depend on the extraction engine.
 */

export const SECTION_MAP: Record<string, string> = {
  Q0: 'section_2_business',
  QA: 'section_1_story',
  QD: 'section_1_story',
  QE: 'section_2_business',
  QG: 'section_2_business',
  QK: 'section_2_business',
  QF: 'section_3_investment',
  QH: 'section_3_investment',
  QI: 'section_3_investment',
  QJ: 'section_4_qualifications',
  QL: 'section_5_family',
  'M3-T': 'section_6_ties',
};

export const SECTION_LABELS: Record<string, string> = {
  section_1_story:         'Your story',
  section_2_business:      'Your business',
  section_3_investment:    'Your investment',
  section_4_qualifications:'Your qualifications',
  section_5_family:        'Your family',
  section_6_ties:          'Your ties',
};

export const QUESTION_LABELS: Record<string, string> = {
  'QA-01': 'Full legal name',
  'QA-05': 'Nationality/citizenship',
  'QA-09': 'Current address',
  'QA-51': 'Business legal name',
  'QA-52': 'Business address',
  'QD-01': 'Professional background',
  'QD-02': 'Motivation for move',
  'QD-03': 'Relevant experience',
  'QD-04': 'First-year plan',
  'QD-05': 'Ties to home country',
  'QE-02': 'Entity type',
  'QE-03': 'State of registration',
  'QE-04': 'EIN',
  'QF-02': 'Total investment amount',
  'QF-03': 'Total business cost',
  'QF-05': 'Source of funds',
  'QF-07': 'US business bank',
  'QF-09': 'Franchise system',
  'QG-02': 'Operational status',
  'QH-01': 'Funds narrative',
  'QI-04': 'Employee headcount Y1',
  'QI-05-Y1': 'Year 1 revenue',
  'QI-05-Y2': 'Year 2 revenue',
  'QI-05-Y3': 'Year 3 revenue',
  'QI-05-Y4': 'Year 4 revenue',
  'QI-05-Y5': 'Year 5 revenue',
  'QI-06-Y1': 'Year 1 net income',
  'QI-06-Y2': 'Year 2 net income',
  'QI-06-Y3': 'Year 3 net income',
  'QI-06-Y4': 'Year 4 net income',
  'QI-06-Y5': 'Year 5 net income',
  'QJ-01': 'Education',
  'QJ-03': 'Work history',
  'QJ-04': 'Relevant specific experience',
  'QK-01': 'Business description',
  'QK-02': 'Target customers',
  'QK-03': 'Market opportunity',
  'QK-04': 'Competitive advantage',
};
