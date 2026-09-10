/**
 * Legal identity of the operating entity.
 *
 * Used in email footers and anywhere the company must be named. CAN-SPAM (US)
 * and CASL (Canada) require every *commercial* email to carry the sender's
 * legal name and a valid physical postal address; purely transactional mail
 * (receipts, password resets, "your package is ready") is exempt from the
 * address requirement but naming the entity is still good practice.
 */

export const COMPANY_LEGAL_NAME = 'Prodigal Son IT Solutions LLC';
export const COMPANY_DBA = 'E2go.app';

/**
 * TODO(romy): set this to the registered-agent (or virtual-mailbox) street
 * address before any marketing / promotional email campaign goes out. It does
 * NOT have to be a home address — a commercial registered-agent address is
 * already public on the Texas SOS record and is fine here — but a
 * state-and-country string alone ("Texas, USA") does not satisfy CAN-SPAM.
 * While this is empty the footer prints the entity name only, which is
 * sufficient for transactional mail but not for a commercial send.
 */
export const COMPANY_POSTAL_ADDRESS = '';

/** One-line company identity for an email footer. */
export function companyFooterLine(): string {
  const base = `${COMPANY_LEGAL_NAME} (d/b/a ${COMPANY_DBA})`;
  return COMPANY_POSTAL_ADDRESS ? `${base} · ${COMPANY_POSTAL_ADDRESS}` : base;
}
