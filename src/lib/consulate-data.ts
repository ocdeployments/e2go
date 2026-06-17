/**
 * E-2 Consulate Data
 *
 * For E-2 visas, applicants apply at the U.S. Embassy or Consulate in their
 * country of NATIONALITY — not the nearest consulate to their current location.
 * As of September 2025, third-country national processing has been eliminated.
 *
 * Verified addresses for high-volume E-2 posts.
 * For countries not listed here, the official embassy finder is:
 * https://www.usembassy.gov
 */

export interface ConsulatePost {
  city: string;
  name: string;
  address: string;
  phone?: string;
  website: string;
  appointmentUrl?: string;
  appointmentSystem?: string;
  /** Approximate wait for an E-2 interview appointment */
  waitTimeNote?: string;
  /** Notes specific to E-2 applicants at this post */
  e2Note?: string;
  /** Practical logistics for the day of interview */
  logistics?: ConsulateLogistics;
}

export interface ConsulateLogistics {
  arriveMinutesBefore: number;
  nearestTransit?: string;
  parkingNote?: string;
  securityNote?: string;
  electronicDevicesPolicy: string;
  waitingRoomNote?: string;
}

export interface ConsulateCountryData {
  /** ISO 3166-1 alpha-2 or descriptive label matching the quiz value */
  country: string;
  /** Countries where E-2 is commonly processed */
  primaryPost: ConsulatePost;
  additionalPosts?: ConsulatePost[];
  /** Key warning for this country's applicants */
  countryNote?: string;
}

// ---------------------------------------------------------------------------
// Canadian Posts — full detail (primary market)
// ---------------------------------------------------------------------------

const CANADA_LOGISTICS: ConsulateLogistics = {
  arriveMinutesBefore: 30,
  electronicDevicesPolicy:
    'Cell phones, smartphones, tablets, laptops, smartwatches, and all other electronic devices are NOT permitted inside the consulate. Leave them in your vehicle or at the security desk before entering. Officers at security will ask you to power down and store any device.',
  securityNote:
    'Security screening is similar to an airport. You will walk through a metal detector and your bag will be X-rayed. Bring only what is necessary — large bags, backpacks, and laptop bags may be turned away.',
  waitingRoomNote:
    'After submitting your documents at the cashier window, you will wait in the waiting room and be called to an interview window. The officer reviews your package before you reach the window.',
  parkingNote: 'Street parking is limited. Plan for a paid garage nearby.',
};

export const CONSULATE_DATABASE: ConsulateCountryData[] = [
  // -------------------------------------------------------------------------
  // CANADA
  // -------------------------------------------------------------------------
  {
    country: 'Canada',
    primaryPost: {
      city: 'Toronto',
      name: 'U.S. Consulate General Toronto',
      address: '360 University Avenue, Toronto, Ontario M5G 1S4',
      phone: '+1 (416) 595-1700',
      website: 'https://ca.usembassy.gov/embassy-consulates/toronto/',
      appointmentUrl: 'https://www.ustraveldocs.com/ca',
      appointmentSystem: 'CGI Federal / ustraveldocs.com',
      waitTimeNote: 'Approximately 3–5 months for an interview appointment (as of mid-2026)',
      e2Note:
        'Toronto is the primary E-2 processing post for Canadian applicants and handles the highest volume of Canadian E-2 applications. Officers are experienced with E-2 cases. Current focus areas: source of funds traceability, non-marginality for sub-$300K investments, and Canadian home retention (immigrant intent).',
      logistics: {
        ...CANADA_LOGISTICS,
        nearestTransit: 'St. Patrick Station (Line 1 Yonge–University) — 3-minute walk north on University Avenue',
        parkingNote:
          'Wilson Parking at 390 Bay Street and multiple garages on Dundas/Queen. Budget $25–40 CAD for 2–3 hours.',
      },
    },
    additionalPosts: [
      {
        city: 'Calgary',
        name: 'U.S. Consulate General Calgary',
        address: '615 Macleod Trail SE, Suite 1000, Calgary, Alberta T2G 4T8',
        phone: '+1 (403) 266-8962',
        website: 'https://ca.usembassy.gov/embassy-consulates/calgary/',
        appointmentUrl: 'https://www.ustraveldocs.com/ca',
        appointmentSystem: 'CGI Federal / ustraveldocs.com',
        waitTimeNote: 'Shorter wait times than Toronto — approximately 2–4 months',
        e2Note: 'Processes E-2 applications for applicants in Alberta and British Columbia who prefer Calgary.',
        logistics: {
          ...CANADA_LOGISTICS,
          nearestTransit: 'City Hall LRT Station (CTrain Red/Blue line) — 10-minute walk',
          parkingNote: 'Municipal parking available in the area. Civic Square Parking at 8 Macleod Trail SE.',
        },
      },
      {
        city: 'Vancouver',
        name: 'U.S. Consulate General Vancouver',
        address: '1075 West Georgia Street, Vancouver, British Columbia V6E 3C9',
        phone: '+1 (604) 685-4311',
        website: 'https://ca.usembassy.gov/embassy-consulates/vancouver/',
        appointmentUrl: 'https://www.ustraveldocs.com/ca',
        appointmentSystem: 'CGI Federal / ustraveldocs.com',
        waitTimeNote: 'Approximately 2–4 months',
        e2Note: 'Serves British Columbia applicants. Some applicants in BC choose Calgary for shorter wait times.',
        logistics: {
          ...CANADA_LOGISTICS,
          nearestTransit: 'Burrard SkyTrain Station (Expo/Millennium Line) — 5-minute walk',
          parkingNote: 'Impark and multiple garages on Burrard and Alberni streets.',
        },
      },
      {
        city: 'Montréal',
        name: 'U.S. Consulate General Montréal',
        address: '1155 Saint-Alexandre Street, Montréal, Québec H2Z 1Z2',
        phone: '+1 (514) 398-9695',
        website: 'https://ca.usembassy.gov/embassy-consulates/montreal/',
        appointmentUrl: 'https://www.ustraveldocs.com/ca',
        appointmentSystem: 'CGI Federal / ustraveldocs.com',
        waitTimeNote: 'Approximately 3–5 months',
        e2Note: 'Serves Québec applicants. Interviews may be conducted in English or French.',
        logistics: {
          ...CANADA_LOGISTICS,
          nearestTransit: 'Square-Victoria–OACI metro station (Orange Line) — 3-minute walk',
          parkingNote: 'Multiple underground garages in Old Montreal nearby.',
        },
      },
      {
        city: 'Halifax',
        name: 'U.S. Consulate General Halifax',
        address: 'Suite 904, Cogswell Tower, 2000 Barrington Street, Halifax, Nova Scotia B3J 3K1',
        phone: '+1 (902) 429-2480',
        website: 'https://ca.usembassy.gov/embassy-consulates/halifax/',
        appointmentUrl: 'https://www.ustraveldocs.com/ca',
        appointmentSystem: 'CGI Federal / ustraveldocs.com',
        waitTimeNote: 'Shorter wait times — approximately 1–3 months',
        e2Note:
          'Lower volume post. Serves Atlantic Canada applicants. Some applicants from Ontario or Quebec choose Halifax for faster appointments.',
        logistics: {
          ...CANADA_LOGISTICS,
          nearestTransit: 'Halifax Transit bus routes on Barrington Street',
          parkingNote: 'Cogswell Tower building parking available. Street parking on Barrington Street.',
        },
      },
    ],
    countryNote:
      'Canadian applicants must apply at a U.S. Consulate in Canada. Toronto is the recommended post for E-2 applicants due to officer experience with E-2 cases. Confirm you are scheduling under the "E Visa" appointment category — not the general nonimmigrant visa category.',
  },

  // -------------------------------------------------------------------------
  // AUSTRALIA
  // -------------------------------------------------------------------------
  {
    country: 'Australia',
    primaryPost: {
      city: 'Sydney',
      name: 'U.S. Consulate General Sydney',
      address: 'MLC Centre, Level 59, 19-29 Martin Place, Sydney NSW 2000',
      phone: '+61 2 9373 9200',
      website: 'https://au.usembassy.gov/embassy-consulates/sydney/',
      appointmentUrl: 'https://www.ustraveldocs.com/au',
      appointmentSystem: 'CGI Federal',
      waitTimeNote: 'Approximately 2–4 months',
      e2Note:
        'Sydney is the primary E-2 processing post for Australian applicants. Australia has a strong E-2 treaty and receives a high volume of applications.',
      logistics: {
        arriveMinutesBefore: 30,
        nearestTransit: 'Martin Place Station (T1/T2/T3/T4 lines) — ground-level access',
        electronicDevicesPolicy:
          'No electronic devices permitted inside the consulate. Leave phones and electronics with security or in your vehicle.',
        securityNote: 'Standard security screening — similar to airport procedures.',
        waitingRoomNote: 'Waiting area provided after document submission. Dress professionally.',
      },
    },
    countryNote:
      'Australian nationals may also apply at the U.S. Embassy in Canberra or the U.S. Consulate in Melbourne, but Sydney processes the highest volume of E-2 cases.',
  },

  // -------------------------------------------------------------------------
  // UNITED KINGDOM
  // -------------------------------------------------------------------------
  {
    country: 'United Kingdom',
    primaryPost: {
      city: 'London',
      name: 'U.S. Embassy London',
      address: '33 Nine Elms Lane, London SW11 7US',
      phone: '+44 20 7499 9000',
      website: 'https://uk.usembassy.gov/',
      appointmentUrl: 'https://www.ustraveldocs.com/gb',
      appointmentSystem: 'CGI Federal',
      waitTimeNote: 'Approximately 3–6 months',
      e2Note:
        'UK nationals with full British citizenship qualify for E-2. British National (Overseas) passport holders do NOT qualify — full British Citizen status is required.',
      logistics: {
        arriveMinutesBefore: 30,
        nearestTransit: 'Nine Elms (Northern Line) — 5-minute walk',
        electronicDevicesPolicy:
          'No electronic devices of any kind permitted inside the embassy building. Security will ask you to leave all devices outside.',
        securityNote: 'Strict security perimeter. Arrive early to allow time for the entry process.',
        waitingRoomNote: 'Large waiting area. Bring printed appointment confirmation.',
      },
    },
    countryNote:
      'Verify your nationality status before applying. British National (Overseas), British Overseas Territories Citizens, and British Protected Persons do NOT qualify for E-2 — only full British Citizens with a standard British passport.',
  },

  // -------------------------------------------------------------------------
  // GERMANY
  // -------------------------------------------------------------------------
  {
    country: 'Germany',
    primaryPost: {
      city: 'Frankfurt',
      name: 'U.S. Consulate General Frankfurt',
      address: 'Giessener Strasse 30, 60435 Frankfurt am Main',
      phone: '+49 69 7535 0',
      website: 'https://de.usembassy.gov/embassy-consulates/frankfurt/',
      appointmentUrl: 'https://www.ustraveldocs.com/de',
      appointmentSystem: 'CGI Federal',
      waitTimeNote: 'Approximately 2–4 months',
      e2Note: 'Frankfurt is the primary E-2 processing post for German nationals. The embassy in Berlin also processes E-2 cases.',
      logistics: {
        arriveMinutesBefore: 30,
        nearestTransit: 'U-Bahn U5 to Preungesheim, then local bus',
        electronicDevicesPolicy: 'No electronic devices permitted inside. Leave all devices with security.',
        securityNote: 'Standard embassy security procedures apply.',
      },
    },
  },

  // -------------------------------------------------------------------------
  // JAPAN
  // -------------------------------------------------------------------------
  {
    country: 'Japan',
    primaryPost: {
      city: 'Tokyo',
      name: 'U.S. Embassy Tokyo',
      address: '1-10-5 Akasaka, Minato-ku, Tokyo 107-8420',
      phone: '+81 3 3224 5000',
      website: 'https://jp.usembassy.gov/',
      appointmentUrl: 'https://www.ustraveldocs.com/jp',
      appointmentSystem: 'CGI Federal',
      waitTimeNote: 'Approximately 2–4 months',
      e2Note: 'Japan is a high-volume E-2 treaty country. Tokyo processes the majority of Japanese E-2 applications.',
      logistics: {
        arriveMinutesBefore: 30,
        nearestTransit: 'Tameike-Sanno Station (Ginza/Namboku Line) — 5-minute walk',
        electronicDevicesPolicy: 'No electronic devices permitted inside the embassy.',
        securityNote: 'Embassy security — arrive with time for processing.',
      },
    },
  },

  // -------------------------------------------------------------------------
  // SOUTH KOREA
  // -------------------------------------------------------------------------
  {
    country: 'South Korea',
    primaryPost: {
      city: 'Seoul',
      name: 'U.S. Embassy Seoul',
      address: '188 Sejong-daero, Jongno-gu, Seoul 03141',
      phone: '+82 2 397 4114',
      website: 'https://kr.usembassy.gov/',
      appointmentUrl: 'https://www.ustraveldocs.com/kr',
      appointmentSystem: 'CGI Federal',
      waitTimeNote: 'Approximately 1–3 months',
      e2Note: 'South Korea is a very active E-2 treaty country. Many Korean investors apply for E-2 in food service and retail.',
      logistics: {
        arriveMinutesBefore: 30,
        nearestTransit: 'Gyeongbokgung Station (Line 3) — 10-minute walk',
        electronicDevicesPolicy: 'No electronic devices of any kind permitted inside.',
        securityNote: 'Strict security — passports required at entry.',
      },
    },
  },

  // -------------------------------------------------------------------------
  // MEXICO
  // -------------------------------------------------------------------------
  {
    country: 'Mexico',
    primaryPost: {
      city: 'Mexico City',
      name: 'U.S. Embassy Mexico City',
      address: 'Paseo de la Reforma 305, Col. Cuauhtémoc, 06500 Mexico City, CDMX',
      phone: '+52 55 5080 2000',
      website: 'https://mx.usembassy.gov/',
      appointmentUrl: 'https://mx.usembassy.gov/visas/',
      waitTimeNote: 'Approximately 3–6 months',
      e2Note: 'Mexico City processes the highest volume. U.S. Consulates in Guadalajara, Monterrey, and Ciudad Juárez also process E-2 cases.',
      logistics: {
        arriveMinutesBefore: 45,
        nearestTransit: 'Sevilla Metro Station (Line 1) — 5-minute walk',
        electronicDevicesPolicy: 'No electronic devices permitted inside the embassy.',
        securityNote: 'High-security perimeter. Arrive significantly early.',
      },
    },
    countryNote: 'Applicants outside Mexico City may apply at the nearest consulate: Guadalajara, Monterrey, Tijuana, Hermosillo, Mérida, Matamoros, Nogales, Nuevo Laredo, or Ciudad Juárez.',
  },

  // -------------------------------------------------------------------------
  // FRANCE
  // -------------------------------------------------------------------------
  {
    country: 'France',
    primaryPost: {
      city: 'Paris',
      name: 'U.S. Embassy Paris',
      address: '2 Avenue Gabriel, 75008 Paris',
      phone: '+33 1 43 12 22 22',
      website: 'https://fr.usembassy.gov/',
      appointmentUrl: 'https://www.ustraveldocs.com/fr',
      appointmentSystem: 'CGI Federal',
      waitTimeNote: 'Approximately 2–4 months',
      e2Note: 'Paris processes the majority of French E-2 applications.',
      logistics: {
        arriveMinutesBefore: 30,
        nearestTransit: 'Concorde Metro (Lines 1, 8, 12) — 5-minute walk',
        electronicDevicesPolicy: 'No electronic devices permitted inside the embassy.',
        securityNote: 'Standard embassy security screening.',
      },
    },
  },

  // -------------------------------------------------------------------------
  // ITALY
  // -------------------------------------------------------------------------
  {
    country: 'Italy',
    primaryPost: {
      city: 'Rome',
      name: 'U.S. Embassy Rome',
      address: 'Via Vittorio Veneto 121, 00187 Roma RM',
      phone: '+39 06 46741',
      website: 'https://it.usembassy.gov/',
      appointmentUrl: 'https://www.ustraveldocs.com/it',
      appointmentSystem: 'CGI Federal',
      waitTimeNote: 'Approximately 2–5 months',
      e2Note: 'Rome is the primary post. Milan and Florence also process nonimmigrant visas.',
      logistics: {
        arriveMinutesBefore: 30,
        nearestTransit: 'Barberini Metro Station (Line A) — 5-minute walk',
        electronicDevicesPolicy: 'No electronic devices permitted inside.',
        securityNote: 'Standard embassy security.',
      },
    },
  },

  // -------------------------------------------------------------------------
  // NETHERLANDS
  // -------------------------------------------------------------------------
  {
    country: 'Netherlands',
    primaryPost: {
      city: 'Amsterdam',
      name: 'U.S. Consulate General Amsterdam',
      address: 'Museumplein 19, 1071 DJ Amsterdam',
      phone: '+31 20 575 5309',
      website: 'https://nl.usembassy.gov/embassy-consulates/amsterdam/',
      appointmentUrl: 'https://www.ustraveldocs.com/nl',
      appointmentSystem: 'CGI Federal',
      waitTimeNote: 'Approximately 2–4 months',
      logistics: {
        arriveMinutesBefore: 30,
        nearestTransit: 'Tram 2, 5 or 12 to Museumplein',
        electronicDevicesPolicy: 'No electronic devices permitted inside.',
        securityNote: 'Standard embassy security.',
      },
    },
  },

  // -------------------------------------------------------------------------
  // SPAIN
  // -------------------------------------------------------------------------
  {
    country: 'Spain',
    primaryPost: {
      city: 'Madrid',
      name: 'U.S. Embassy Madrid',
      address: 'Calle de Serrano 75, 28006 Madrid',
      phone: '+34 91 587 2200',
      website: 'https://es.usembassy.gov/',
      appointmentUrl: 'https://www.ustraveldocs.com/es',
      appointmentSystem: 'CGI Federal',
      waitTimeNote: 'Approximately 2–4 months',
      logistics: {
        arriveMinutesBefore: 30,
        nearestTransit: 'Rubén Darío or Núñez de Balboa Metro (Line 5)',
        electronicDevicesPolicy: 'No electronic devices permitted inside.',
        securityNote: 'Standard embassy security.',
      },
    },
  },

  // -------------------------------------------------------------------------
  // TAIWAN
  // -------------------------------------------------------------------------
  {
    country: 'Taiwan',
    primaryPost: {
      city: 'Taipei',
      name: 'American Institute in Taiwan (AIT) — Taipei Office',
      address: 'No. 100, Jinhu Road, Neihu District, Taipei City 114',
      phone: '+886 2 2162 2000',
      website: 'https://www.ait.org.tw/',
      appointmentUrl: 'https://www.ait.org.tw/visas/nonimmigrant-visas/',
      waitTimeNote: 'Approximately 2–4 months',
      e2Note:
        'AIT operates as the de facto U.S. embassy in Taiwan. Taiwan (R.O.C.) nationals qualify for E-2. Use AIT\'s own appointment system — not CGI Federal.',
      logistics: {
        arriveMinutesBefore: 30,
        nearestTransit: 'Neihu MRT Station (Wenhu Line) — 15-minute walk or taxi',
        electronicDevicesPolicy: 'No electronic devices permitted inside AIT.',
        securityNote: 'Strict security perimeter. Passport required for entry.',
      },
    },
  },

  // -------------------------------------------------------------------------
  // ISRAEL
  // -------------------------------------------------------------------------
  {
    country: 'Israel',
    primaryPost: {
      city: 'Jerusalem',
      name: 'U.S. Embassy Jerusalem',
      address: '14 David Flusser Street, Jerusalem 9378322',
      phone: '+972 2 630 4000',
      website: 'https://il.usembassy.gov/',
      appointmentUrl: 'https://www.ustraveldocs.com/il',
      waitTimeNote: 'Approximately 2–5 months',
      logistics: {
        arriveMinutesBefore: 45,
        electronicDevicesPolicy: 'No electronic devices permitted inside the embassy.',
        securityNote: 'High-security facility. Arrive significantly early.',
      },
    },
  },

  // -------------------------------------------------------------------------
  // TURKEY
  // -------------------------------------------------------------------------
  {
    country: 'Turkey',
    primaryPost: {
      city: 'Ankara',
      name: 'U.S. Embassy Ankara',
      address: '110 Atatürk Blvd, Kavaklidere, 06100 Ankara',
      phone: '+90 312 455 5555',
      website: 'https://tr.usembassy.gov/',
      appointmentUrl: 'https://www.ustraveldocs.com/tr',
      waitTimeNote: 'Approximately 3–6 months',
      e2Note: 'Istanbul Consulate also processes E-2 applications: Kaplicalar Mevkii 2, Istinye, Istanbul.',
      logistics: {
        arriveMinutesBefore: 45,
        electronicDevicesPolicy: 'No electronic devices permitted inside.',
        securityNote: 'High-security facility. Arrive early.',
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/**
 * Find consulate data for a given treaty country name.
 * Returns null if the country is not in the verified database.
 */
export function getConsulateData(country: string): ConsulateCountryData | null {
  if (!country) return null;
  const normalized = country.trim().toLowerCase();
  return (
    CONSULATE_DATABASE.find(
      (c) => c.country.toLowerCase() === normalized
    ) ?? null
  );
}

/**
 * Returns the primary post for a country, or null.
 */
export function getPrimaryPost(country: string): ConsulatePost | null {
  return getConsulateData(country)?.primaryPost ?? null;
}

/**
 * Generic fallback URL for countries not in the verified database.
 */
export function getEmbassyFinderUrl(country: string): string {
  const encoded = encodeURIComponent(country);
  return `https://www.usembassy.gov/?country=${encoded}`;
}

/**
 * Returns the full list of verified countries in the database.
 */
export function getVerifiedCountries(): string[] {
  return CONSULATE_DATABASE.map((c) => c.country);
}
