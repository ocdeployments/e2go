/**
 * Legacy decoder. The simulator's quick-start form used to store the treaty
 * country as a slug; it now stores the same display name the quiz does, which
 * falls through the lookup below unchanged. This map only exists to render
 * applications answered before that change — including 'hungary', which the
 * old form offered even though Hungary has no E-2 treaty.
 */
export const COUNTRY_LABELS: Record<string, string> = {
  canada: 'Canada', united_kingdom: 'United Kingdom', australia: 'Australia',
  japan: 'Japan', south_korea: 'South Korea', germany: 'Germany',
  france: 'France', italy: 'Italy', spain: 'Spain', netherlands: 'Netherlands',
  switzerland: 'Switzerland', sweden: 'Sweden', belgium: 'Belgium',
  norway: 'Norway', denmark: 'Denmark', finland: 'Finland', ireland: 'Ireland',
  austria: 'Austria', poland: 'Poland', czech_republic: 'Czech Republic',
  hungary: 'Hungary', romania: 'Romania', mexico: 'Mexico',
  colombia: 'Colombia', argentina: 'Argentina', chile: 'Chile',
  turkey: 'Turkey', israel: 'Israel', jordan: 'Jordan',
  thailand: 'Thailand', pakistan: 'Pakistan', other: 'Other',
};

export function resolveCountryLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return COUNTRY_LABELS[raw] || raw;
}
