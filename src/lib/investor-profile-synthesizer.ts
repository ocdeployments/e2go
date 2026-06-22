// Builds a unified investor profile from whatever data is available.
// Priority order for each field:
//   1. QFN Franchise Navigator answers (explicit, high confidence)
//   2. M3-A-08 role title inference (medium confidence)
//   3. M3-A-09 activities description inference (medium confidence)
//   4. Archetype from case_profiles (derived from quiz prior_business + industry_interest)
//   5. Business category (domain background inference)
//
// This ensures gap analysis, document generation, and FDD scoring all receive
// intelligent investor context regardless of whether the user ran the Franchise
// Navigator — the ERP connections fire for every user path.

export interface InvestorProfile {
  professionalBackground: string | null;
  managementExperience: string | null;
  operatorStyle: string | null;
  priorBusiness: string | null;
  hoursPerWeek: string | null;
  source: 'qfn' | 'inferred' | 'mixed' | 'unknown';
}

interface AnswerEntry {
  question_key: string;
  answer_value?: string | null;
}

interface AppContext {
  business_category?: string | null;
  operational_status?: string | null;
}

export function synthesizeInvestorProfile(
  answers: AnswerEntry[],
  app: AppContext,
  archetype?: string | null
): InvestorProfile {
  const am = new Map<string, string>();
  for (const a of answers) {
    if (a.question_key && a.answer_value) am.set(a.question_key, a.answer_value);
  }
  const get = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = am.get(k);
      if (v) return v;
    }
    return null;
  };

  // ── QFN path (explicit, high confidence) ────────────────────────────────────
  const qfnBg    = get('QFN-07');
  const qfnMgmt  = get('QFN-08');
  const qfnStyle = get('QFN-09');
  const qfnPrior = get('QFN-10');
  const qfnHours = get('QFN-01');
  const hasQfn   = !!(qfnBg || qfnMgmt || qfnPrior);

  // ── Inference path (derived, medium confidence) ──────────────────────────────
  const role         = get('M3-A-08', 'QA-08') ?? '';
  const activities   = get('M3-A-09', 'QA-09') ?? '';
  const roleLC       = role.toLowerCase();
  const actLC        = activities.toLowerCase();
  const cat          = (app.business_category ?? '').toLowerCase();
  const arc          = (archetype ?? '').toLowerCase();

  // Professional background — from business category
  let inferBg: string | null = null;
  if (/senior|elder|home.?care/.test(cat)) {
    inferBg = 'Healthcare / Senior Care';
  } else if (/health|medical|clinic|pharma/.test(cat)) {
    inferBg = 'Healthcare';
  } else if (/educat|learning|tutor|school|training/.test(cat)) {
    inferBg = 'Education / Training';
  } else if (/food|restaurant|qsr|cafe|bakery|catering/.test(cat)) {
    inferBg = 'Food Service / Hospitality';
  } else if (/fitness|gym|wellness|spa|yoga/.test(cat)) {
    inferBg = 'Health & Fitness';
  } else if (/tech|software|digital|saas|it\b/.test(cat)) {
    inferBg = 'Technology';
  } else if (/business|consult|professional|service/.test(cat)) {
    inferBg = 'Business / Professional Services';
  } else if (/retail|store|shop/.test(cat)) {
    inferBg = 'Retail';
  } else if (/home.?service|cleaning|landscap|handyman|plumb|electrical/.test(cat)) {
    inferBg = 'Home Services / Trades';
  }

  // Management experience — from role title, then archetype
  let inferMgmt: string | null = null;
  if (/president|ceo|c\.e\.o|chief\s|managing director|managing partner|executive director/.test(roleLC)) {
    inferMgmt = 'Significant executive management experience (inferred from role title)';
  } else if (/\bdirector\b|vice.?president|\bvp\b|general manager|operations manager|regional manager/.test(roleLC)) {
    inferMgmt = 'Significant management experience (inferred from role title)';
  } else if (/\bmanager\b|supervisor|team lead|department head/.test(roleLC)) {
    inferMgmt = 'Moderate management experience (inferred from role title)';
  } else if (/\bowner\b|founder|co.?founder|proprietor|business owner/.test(roleLC)) {
    inferMgmt = 'Prior business ownership (inferred from role)';
  } else if (arc === 'builder') {
    inferMgmt = 'Professional background with demonstrated management capacity (from applicant profile)';
  } else if (arc === 'buyer') {
    inferMgmt = 'Prior business or management experience (from applicant profile)';
  } else if (arc === 'investor') {
    inferMgmt = 'Capital/investment background — active management depth requires documentation (from applicant profile)';
  } else if (arc === 'career_switcher') {
    inferMgmt = 'Limited prior management experience — first business venture (from applicant profile)';
  }

  // Prior business — from archetype (strongest signal) then role text
  let inferPrior: string | null = null;
  if (arc === 'career_switcher') {
    inferPrior = 'No — first business venture (from applicant profile)';
  } else if (arc === 'buyer') {
    inferPrior = 'Yes — prior business or ownership experience (from applicant profile)';
  } else if (arc === 'builder') {
    inferPrior = 'Yes — professional services or prior venture (from applicant profile)';
  } else if (arc === 'investor') {
    inferPrior = 'Yes — investment/ownership history (from applicant profile)';
  } else if (/\bowner\b|founder|co.?founder|prior business|previous company/.test(roleLC + ' ' + actLC)) {
    inferPrior = 'Yes — role description suggests prior business ownership';
  }

  // Operator style — from activities description
  let inferStyle: string | null = null;
  const systemsTerms = ['sop', 'systems', 'process', 'procedures', 'train staff', 'training staff', 'delegate', 'scale', 'build team', 'hire and'];
  const handsOnTerms = ['personally serve', 'directly with customer', 'hands-on', 'day-to-day customer', 'myself serve'];
  if (systemsTerms.some(t => actLC.includes(t))) {
    inferStyle = 'Systems-builder (builds processes, delegates execution)';
  } else if (handsOnTerms.some(t => actLC.includes(t))) {
    inferStyle = 'Hands-on operator (directly customer-facing)';
  }

  const hasInferred = !!(inferBg || inferMgmt || inferPrior);
  const source: InvestorProfile['source'] =
    hasQfn && hasInferred ? 'mixed' :
    hasQfn    ? 'qfn' :
    hasInferred ? 'inferred' : 'unknown';

  return {
    professionalBackground: qfnBg    ?? inferBg,
    managementExperience:   qfnMgmt  ?? inferMgmt,
    operatorStyle:          qfnStyle ?? inferStyle,
    priorBusiness:          qfnPrior ?? inferPrior,
    hoursPerWeek:           qfnHours, // not inferred — too speculative without asking
    source,
  };
}

export function formatInvestorProfileContext(profile: InvestorProfile): string | null {
  const lines: string[] = [];
  if (profile.professionalBackground) lines.push(`Professional background: ${profile.professionalBackground}`);
  if (profile.priorBusiness)          lines.push(`Prior business ownership: ${profile.priorBusiness}`);
  if (profile.managementExperience)   lines.push(`Management experience: ${profile.managementExperience}`);
  if (profile.hoursPerWeek)           lines.push(`Planned weekly hours: ${profile.hoursPerWeek}`);
  if (profile.operatorStyle)          lines.push(`Operator style: ${profile.operatorStyle}`);
  if (lines.length === 0) return null;

  const sourceLabel =
    profile.source === 'qfn'      ? 'from Franchise Navigator' :
    profile.source === 'inferred' ? 'synthesized from case data' :
    profile.source === 'mixed'    ? 'Franchise Navigator + case data' :
                                    'available data';

  return [`INVESTOR PROFILE (${sourceLabel}):`, ...lines].join('\n');
}
