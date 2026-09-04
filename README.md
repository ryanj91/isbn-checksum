# isbn-checksum

A parser and pretty printer for the checksum digit on ISBN-10, ISBN-13, and
UPC-A codes.

These three formats each protect themselves with a single check digit
computed from the digits before it, using three different (but related)
weighted-sum formulas:

- **ISBN-10**: weights 10 down to 1, mod 11. The check digit can come out to
  10, which is written as the letter `X`.
- **ISBN-13** (and EAN-13 barcodes generally, since an ISBN-13 *is* an
  EAN-13): weights alternating 1 and 3, mod 10.
- **UPC-A**: same alternating-weight idea as EAN-13. In fact a UPC-A code is
  checksum-identical to an EAN-13 code with a `0` glued on the front, so
  that's how this library computes it internally.

A string with a valid check digit is *checksum-valid*, not necessarily a
real, assigned book or product number. All-zeros passes the math. This
library only tells you the arithmetic is consistent.

## Usage

```ts
import { parse, computeCheckDigit } from "./src/checksum.js";
import { prettyPrint } from "./src/format.js";

parse("978-0-306-40615-7");
// => { ok: true, kind: "isbn13", digits: "9780306406157" }

parse("0-306-40615-1"); // last digit tampered with
// => { ok: false, reason: 'bad ISBN-10 check digit in "0-306-40615-1"' }

const parsed = parse("080442957X");
if (parsed.ok) {
  prettyPrint(parsed); // => "080442957-X"
}

// Compute a check digit yourself, e.g. while assembling a new code:
computeCheckDigit("isbn13", "978030640615"); // => "7"
```

`parse` accepts hyphens and spaces anywhere and strips them before checking,
and treats a lowercase `x` the same as `X` for ISBN-10. It infers which
format you gave it purely from the digit count after stripping punctuation
(10 / 12 / 13), so a 13-digit EAN-13 barcode that isn't actually a book
still parses fine and is labeled `"isbn13"` — the checksum can't tell an
ISBN-13 apart from a generic EAN-13 without also checking the `978`/`979`
prefix.

## Pretty printing

`prettyPrint` currently reproduces the "human readable interpretation" text
that GS1 prints directly under an EAN-13 or UPC-A barcode (grouped 1-6-6 and
1-5-5-1 respectively), because that grouping is fixed by the standard and
doesn't need any outside data.

The hyphenation printed on the back of an actual book (registration group /
publisher / title) is a different thing — it depends on the official ISBN
registration-group range table, which isn't in this repo yet. For now,
`prettyPrint` on an ISBN-10 code only sets its check digit apart
(`"080442957-X"`); see the roadmap.

## Layout

- `src/checksum.ts` — normalization, validation, and check-digit
  computation for all three formats.
- `src/format.ts` — pretty printing.
- `test/checksum.test.ts` — table-driven tests, run with `node --test`
  against the compiled output.

## Development

No dependencies to install. Compile with `tsc` (via `npm run build`), then
run the compiled tests with `node --test dist/test`.
