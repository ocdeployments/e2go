import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';

export interface GeoData {
  country: string | null;
  city: string | null;
  region: string | null;
}

export function extractGeo(headers: Headers | ReadonlyHeaders): GeoData {
  return {
    country: headers.get('x-vercel-ip-country') ?? null,
    city:    decodeURIComponent(headers.get('x-vercel-ip-city') ?? '') || null,
    region:  headers.get('x-vercel-ip-region') ?? null,
  };
}

// ISO 3166-1 alpha-2 → full country name
// Focused on E-2 visa treaty countries (major source markets)
export const COUNTRY_NAMES: Record<string, string> = {
  CA: 'Canada',
  GB: 'United Kingdom',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  BE: 'Belgium',
  JP: 'Japan',
  KR: 'South Korea',
  IL: 'Israel',
  TR: 'Turkey',
  MX: 'Mexico',
  CO: 'Colombia',
  AR: 'Argentina',
  BR: 'Brazil',
  ZA: 'South Africa',
  IE: 'Ireland',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  CH: 'Switzerland',
  AT: 'Austria',
  PT: 'Portugal',
  PL: 'Poland',
  NZ: 'New Zealand',
  SG: 'Singapore',
  IN: 'India',
  US: 'United States',
  PH: 'Philippines',
  PK: 'Pakistan',
  NG: 'Nigeria',
  GH: 'Ghana',
  KE: 'Kenya',
  EG: 'Egypt',
  AE: 'UAE',
  SA: 'Saudi Arabia',
  QA: 'Qatar',
  HK: 'Hong Kong',
  TW: 'Taiwan',
  CN: 'China',
};

// Canadian provinces for city grouping
export const CA_REGIONS: Record<string, string> = {
  ON: 'Ontario',
  BC: 'British Columbia',
  AB: 'Alberta',
  QC: 'Quebec',
  MB: 'Manitoba',
  SK: 'Saskatchewan',
  NS: 'Nova Scotia',
  NB: 'New Brunswick',
  NL: 'Newfoundland',
  PE: 'Prince Edward Island',
  YT: 'Yukon',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
};

// UK regions for grouping
export const GB_REGIONS: Record<string, string> = {
  ENG: 'England',
  SCT: 'Scotland',
  WLS: 'Wales',
  NIR: 'Northern Ireland',
};
