import type { ParsedCode } from "./checksum.js";

/**
 * Groups digits the way they're actually printed under a barcode (the GS1
 * "human readable interpretation" text), not the publisher-assigned
 * hyphenation you see on a book's back cover. That grouping needs the
 * official ISBN registration-group range table, which this project doesn't
 * ship yet - see README.
 */
export function prettyPrint(result: ParsedCode): string {
  const { kind, digits } = result;
  switch (kind) {
    case "isbn13":
    case "ean13":
      // GS1 groups EAN-13 as 1-6-6 under the bars: "9 780306 406157".
      // Same grouping whether or not the code is actually a book.
      return `${digits.slice(0, 1)} ${digits.slice(1, 7)} ${digits.slice(7, 13)}`;
    case "upcA":
      // UPC-A groups as 1-5-5-1: number system, two data blocks, check digit.
      return `${digits.slice(0, 1)} ${digits.slice(1, 6)} ${digits.slice(6, 11)} ${digits.slice(11, 12)}`;
    case "isbn10":
      // No registration-group table available yet, so only the check digit
      // (the one part that's always unambiguous) gets set apart.
      return `${digits.slice(0, 9)}-${digits.slice(9, 10)}`;
  }
}
