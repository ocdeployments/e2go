// M3-style: M0-M3, any alphanumeric section code (S1, A, Q, T…), alphanumeric/dash suffix
// Q-style: extraction engine keys like QA-01, QI-05-Y1, QK-04
export const QUESTION_KEY_REGEX =
  /^(M[0-3]-[A-Za-z][A-Za-z0-9]*-[A-Za-z0-9][A-Za-z0-9-]*|Q[A-Z]+-[A-Za-z0-9][A-Za-z0-9-]*)$/;

export function isValidQuestionKey(key: string): boolean {
  return QUESTION_KEY_REGEX.test(key);
}
