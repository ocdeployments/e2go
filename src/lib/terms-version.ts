// Single source of truth for the current Terms of Service version.
// middleware.ts (gate check) and /api/auth/accept-terms (acceptance write)
// must always agree on this value — see BC-17 / Gap G-14.
export const TERMS_VERSION = '1.0';
