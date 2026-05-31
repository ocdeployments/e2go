// Question key format: M[0-3]-[A-L]-[0-9]{2}
// Examples: M3-A-01 through M3-L-99, M0-01 through M0-99, M1-01, M2-01
export const QUESTION_KEY_REGEX = /^(M[0-3])-([A-L])-(\d{2})$/;

export function isValidQuestionKey(key: string): boolean {
  return QUESTION_KEY_REGEX.test(key);
}
