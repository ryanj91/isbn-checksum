/**
 * Checksum math for the barcode families that show up on books and retail
 * packaging: ISBN-10, ISBN-13, plain EAN-13 (identical math to ISBN-13, but
 * outside the 978/979 prefix the ISBN agency assigns under), UPC-A, and
 * EAN-8 (the short form GS1 assigns when a package is too small for a full
 * EAN-13, e.g. cans and cosmetics).
 *
 * The parser only checks arithmetic, not real-world assignment. A string
 * that passes `parse` is checksum-valid, not necessarily a book or product
 * that actually exists.
 */

export type Kind = "isbn10" | "isbn13" | "ean13" | "upcA" | "ean8";

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

// Every ISBN-13 is an EAN-13, but not every EAN-13 is an ISBN-13: the
// ISBN registration agency only ever assigns codes under these two GS1
// prefixes, "Bookland" (978) and its 2007 overflow range (979).
function isIsbn13Prefix(digits: string): boolean {
  return digits.startsWith("978") || digits.startsWith("979");
}

function upcACheckDigit(body11: string): string {
  return ean13CheckDigit("0" + body11);
}

function upcAValid(code: string): boolean {
  if (!/^\d{12}$/.test(code)) return false;
  return ean13Valid("0" + code);
}

// EAN-8 uses the same alternating-weight idea as EAN-13, just with weights
// 3/1 instead of 1/3 (GS1 defines it starting from the check digit end, so
// the leftmost of the 7 body digits gets weight 3, not 1).
function ean8CheckDigit(body7: string): string {
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const weight = i % 2 === 0 ? 3 : 1;
    sum += weight * Number(body7[i]);
  }
  return String((10 - (sum % 10)) % 10);
}

function ean8Valid(code: string): boolean {
  if (!/^\d{8}$/.test(code)) return false;
  return ean8CheckDigit(code.slice(0, 7)) === code[7];
}

/**
 * Parses and validates a barcode string, inferring the kind from its length
 * after normalization: 8 digits -> EAN-8, 10 -> ISBN-10, 12 -> UPC-A, 13 ->
 * ISBN-13 or EAN-13. A 13-digit code is only labeled "isbn13" if it also
 * starts with the 978 or 979 prefix the ISBN agency assigns under;
 * otherwise it's a checksum-valid EAN-13 that isn't a book, labeled
 * "ean13". EAN-8 is never a book — it's a separate GS1 allocation for
 * packages too small for a full EAN-13 — so it's always labeled "ean8".
 */
export function parse(input: string): ParseOutcome {
  const digits = normalize(input);
  switch (digits.length) {
    case 8:
      if (!ean8Valid(digits)) {
        return { ok: false, reason: `bad EAN-8 check digit in "${input}"` };
      }
      return { ok: true, kind: "ean8", digits };
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
        return { ok: false, reason: `bad EAN-13 check digit in "${input}"` };
      }
      return { ok: true, kind: isIsbn13Prefix(digits) ? "isbn13" : "ean13", digits };
    default:
      return {
        ok: false,
        reason: `expected 8, 10, 12, or 13 digits after stripping punctuation, got ${digits.length} in "${input}"`,
      };
  }
}

/**
 * Converts a valid ISBN-10 to its ISBN-13 equivalent: drop the ISBN-10
 * check digit, prefix "978", and recompute the check digit under EAN-13
 * math. Every ISBN-10 has exactly one ISBN-13 form.
 */
export function isbn10ToIsbn13(input: string): ParseOutcome {
  const parsed = parse(input);
  if (!parsed.ok) return parsed;
  if (parsed.kind !== "isbn10") {
    return { ok: false, reason: `expected an ISBN-10, got ${parsed.kind} in "${input}"` };
  }
  const body12 = "978" + parsed.digits.slice(0, 9);
  return { ok: true, kind: "isbn13", digits: body12 + ean13CheckDigit(body12) };
}

/**
 * Converts a valid ISBN-13 back to ISBN-10. Only codes under the 978 prefix
 * have an ISBN-10 form - 979 exists specifically because the 978 space was
 * running out, so a 979 code (or a non-ISBN EAN-13) has no ISBN-10 form.
 */
export function isbn13ToIsbn10(input: string): ParseOutcome {
  const parsed = parse(input);
  if (!parsed.ok) return parsed;
  if (parsed.kind !== "isbn13") {
    return { ok: false, reason: `expected an ISBN-13, got ${parsed.kind} in "${input}"` };
  }
  if (!parsed.digits.startsWith("978")) {
    return { ok: false, reason: `ISBN-13 "${input}" has no ISBN-10 equivalent (not a 978 code)` };
  }
  const body9 = parsed.digits.slice(3, 12);
  return { ok: true, kind: "isbn10", digits: body9 + isbn10CheckDigit(body9) };
}

/** Computes the check digit for a body of the right length (7 / 9 / 11 / 12 digits, no check digit attached). */
export function computeCheckDigit(kind: Kind, body: string): string {
  switch (kind) {
    case "isbn10":
      if (!/^\d{9}$/.test(body)) throw new Error("isbn10 body must be exactly 9 digits");
      return isbn10CheckDigit(body);
    case "isbn13":
    case "ean13":
      if (!/^\d{12}$/.test(body)) throw new Error(`${kind} body must be exactly 12 digits`);
      return ean13CheckDigit(body);
    case "upcA":
      if (!/^\d{11}$/.test(body)) throw new Error("upcA body must be exactly 11 digits");
      return upcACheckDigit(body);
    case "ean8":
      if (!/^\d{7}$/.test(body)) throw new Error("ean8 body must be exactly 7 digits");
      return ean8CheckDigit(body);
  }
}
