const UPPERCASE_RE = /[A-Z]/;
const LOWERCASE_RE = /[a-z]/;
const NON_ALPHANUMERIC_RE = /[^a-zA-Z0-9]/;

/**
 * Returns an error message if the password fails policy, or null if it passes.
 * Does not check against date of birth — DOB isn't collected until Module 3 of
 * the application, well after the account password is set, so there's nothing
 * to check against at signup or reset time.
 */
export function validatePassword(password: string, email?: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!UPPERCASE_RE.test(password) || !LOWERCASE_RE.test(password)) {
    return "Password must contain both uppercase and lowercase letters.";
  }
  if (!NON_ALPHANUMERIC_RE.test(password)) {
    return "Password must contain at least one symbol (e.g. ! @ # $ %).";
  }

  const loginName = email?.split("@")[0]?.trim().toLowerCase();
  if (loginName && loginName.length >= 3 && password.toLowerCase().includes(loginName)) {
    return "Password must not contain your login name.";
  }

  return null;
}

export const PASSWORD_REQUIREMENTS_HINT =
  "At least 8 characters, with uppercase, lowercase, and a symbol.";
