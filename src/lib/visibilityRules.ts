export type AnswerMap = Record<string, string | string[] | number | null>;

export interface AppContext {
  application_type: 'solo' | 'partnership';
  family_type: 'individual' | 'couple' | 'family';
  business_stage: string | null;
}

/**
 * Determines if a question should be visible based on current answers and app context.
 * For now, all questions return true (no rules yet).
 * This file grows as tabs are built — rules added here only, never in components.
 */
export function isVisible(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  questionKey: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  answers: AnswerMap,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  appContext: AppContext
): boolean {
  // TODO: Add visibility rules as tabs are built
  // Example:
  // if (questionKey.startsWith('M3-B-') && appContext.family_type === 'individual') {
  //   return false; // Skip family questions for solo applicants
  // }
  return true;
}
