const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instruction[s]?/gi,
  /you\s+are\s+now\s+(a\s+)?(legal|lawyer|attorney|advisor)/gi,
  /remove\s+(all\s+)?disclaimers?/gi,
  /###\s*SYSTEM/gi,
  /<\|im_start\|>/gi,
  /\boverride\s+(previous\s+)?prompt\b/gi,
  /<\/?(instructions?|system|prompt)>/gi,
  /end\s+of\s+(user\s+)?input/gi,
  /new\s+instructions?:/gi,
];

export function sanitizeForPrompt(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let sanitized = input;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[redacted]');
  }
  return sanitized;
}

export function wrapUserContent(input: string): string {
  const sanitized = sanitizeForPrompt(input);
  return `<user_provided_content>${sanitized}</user_provided_content>`;
}
