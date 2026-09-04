/**
 * Checksum math for the three barcode families that show up on books and
 * retail packaging: ISBN-10, ISBN-13 (identical math to EAN-13), and UPC-A.
 *
 * The parser only checks arithmetic, not real-world assignment. A string
 * that passes `parse` is checksum-valid, not necessarily a book or product
 * that actually exists.
 */

export type Kind = "isbn10" | "isbn13" | "upcA";

export interface ParsedCode {
  ok: true;
  kind: Kind;
  digits: string;
}

export interface ParseError {
  ok: false;
  reason: string;
}

export type ParseOutcome = ParsedCode | ParseError;

/** Strips the punctuation people paste in (hyphens, spaces) and upcases any check-digit X. */
export function normalize(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

function isbn10CheckDigit(body9: string): string {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(body9[i]);
  const remainder = (11 - (sum % 11)) % 11;
  return remainder === 10 ? "X" : String(remainder);
}

function isbn10Valid(code: string): boolean {
  if (!/^\d{9}[\dX]$/.test(code)) return false;
  return isbn10CheckDigit(code.slice(0, 9)) === code[9];
}

// ISBN-13 is just an EAN-13 barcode, so this is the shared math for both,
// and (via a leading-zero pad) for UPC-A too.
function ean13CheckDigit(body12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const weight = i % 2 === 0 ? 1 : 3;
    sum += weight * Number(body12[i]);
  }
  return String((10 - (sum % 10)) % 10);
}

function ean13Valid(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  return ean13CheckDigit(code.slice(0, 12)) === code[12];
}

function upcACheckDigit(body11: string): string {
  return ean13CheckDigit("0" + body11);
}

function upcAValid(code: string): boolean {
  if (!/^\d{12}$/.test(code)) return false;
  return ean13Valid("0" + code);
}

/**
 * Parses and validates a barcode string, inferring the kind from its length
 * after normalization: 10 digits -> ISBN-10, 12 -> UPC-A, 13 -> ISBN-13.
 * A 13-digit code that isn't actually a book (doesn't start 978/979) still
 * validates and is still labeled "isbn13" here, since the checksum can't
 * tell the difference between ISBN-13 and a generic EAN-13.
 */
export function parse(input: string): ParseOutcome {
  const digits = normalize(input);
  switch (digits.length) {
    case 10:
      if (!isbn10Valid(digits)) {
        return { ok: false, reason: `bad ISBN-10 check digit in "${input}"` };
      }
      return { ok: true, kind: "isbn10", digits };
    case 12:
      if (!upcAValid(digits)) {
        return { ok: false, reason: `bad UPC-A check digit in "${input}"` };
      }
      return { ok: true, kind: "upcA", digits };
    case 13:
      if (!ean13Valid(digits)) {
        return { ok: false, reason: `bad ISBN-13 check digit in "${input}"` };
      }
      return { ok: true, kind: "isbn13", digits };
    default:
      return {
        ok: false,
        reason: `expected 10, 12, or 13 digits after stripping punctuation, got ${digits.length} in "${input}"`,
      };
  }
}

/** Computes the check digit for a body of the right length (9 / 11 / 12 digits, no check digit attached). */
export function computeCheckDigit(kind: Kind, body: string): string {
  switch (kind) {
    case "isbn10":
      if (!/^\d{9}$/.test(body)) throw new Error("isbn10 body must be exactly 9 digits");
      return isbn10CheckDigit(body);
    case "isbn13":
      if (!/^\d{12}$/.test(body)) throw new Error("isbn13 body must be exactly 12 digits");
      return ean13CheckDigit(body);
    case "upcA":
      if (!/^\d{11}$/.test(body)) throw new Error("upcA body must be exactly 11 digits");
      return upcACheckDigit(body);
  }
}
