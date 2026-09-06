import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, computeCheckDigit, normalize, type Kind } from "../src/checksum.js";
import { prettyPrint } from "../src/format.js";

interface ValidCase {
  name: string;
  input: string;
  kind: Kind;
  digits: string;
}

// Known-good codes, chosen for the awkward corners rather than the easy middle:
// an ISBN-10 whose check digit is the letter X, mixed punctuation, a
// lowercase x, and the all-zeros code that's checksum-valid despite not
// being a real registration.
const validCases: ValidCase[] = [
  {
    name: "isbn10 plain",
    input: "0306406152",
    kind: "isbn10",
    digits: "0306406152",
  },
  {
    name: "isbn10 with hyphens",
    input: "0-306-40615-2",
    kind: "isbn10",
    digits: "0306406152",
  },
  {
    name: "isbn10 check digit is X",
    input: "080442957X",
    kind: "isbn10",
    digits: "080442957X",
  },
  {
    name: "isbn10 check digit is lowercase x",
    input: "080442957x",
    kind: "isbn10",
    digits: "080442957X",
  },
  {
    name: "isbn10 all zeros is checksum-valid",
    input: "0000000000",
    kind: "isbn10",
    digits: "0000000000",
  },
  {
    name: "isbn13 plain",
    input: "9780306406157",
    kind: "isbn13",
    digits: "9780306406157",
  },
  {
    name: "isbn13 with hyphens",
    input: "978-0-306-40615-7",
    kind: "isbn13",
    digits: "9780306406157",
  },
  {
    name: "isbn13 with a leading/trailing space",
    input: " 9780306406157 ",
    kind: "isbn13",
    digits: "9780306406157",
  },
  {
    name: "upcA plain",
    input: "036000291452",
    kind: "upcA",
    digits: "036000291452",
  },
  {
    name: "upcA with spaces",
    input: "0 36000 29145 2",
    kind: "upcA",
    digits: "036000291452",
  },
  {
    name: "13-digit code outside the 978/979 prefix is ean13, not isbn13",
    input: "4006381333931",
    kind: "ean13",
    digits: "4006381333931",
  },
  {
    name: "979 prefix is also isbn13",
    input: "9790863571236",
    kind: "isbn13",
    digits: "9790863571236",
  },
];

for (const c of validCases) {
  test(`parse accepts: ${c.name}`, () => {
    const result = parse(c.input);
    assert.equal(result.ok, true);
    assert.deepEqual(result, { ok: true, kind: c.kind, digits: c.digits });
  });
}

interface InvalidCase {
  name: string;
  input: string;
}

// Things that must be rejected: wrong check digit, wrong length in both
// directions, an X anywhere but the ISBN-10 check position, and garbage
// characters that aren't digits or punctuation.
const invalidCases: InvalidCase[] = [
  { name: "isbn10 wrong check digit", input: "0306406151" },
  { name: "isbn10 with X in the wrong slot", input: "0X06406152" },
  { name: "isbn13 wrong check digit", input: "9780306406158" },
  { name: "upcA wrong check digit", input: "036000291451" },
  { name: "nine digits, one short of isbn10", input: "030640615" },
  { name: "eleven digits, between isbn10 and upcA", input: "03064061523" },
  { name: "fourteen digits, one past isbn13", input: "97803064061570" },
  { name: "empty string", input: "" },
  { name: "letters that are not a check digit X", input: "97803O6406157" },
  { name: "only punctuation", input: "--- --" },
];

for (const c of invalidCases) {
  test(`parse rejects: ${c.name}`, () => {
    const result = parse(c.input);
    assert.equal(result.ok, false);
  });
}

interface CheckDigitCase {
  kind: Kind;
  body: string;
  expected: string;
}

// computeCheckDigit should reproduce the check digit from each valid case
// above, including the isbn10-X case, in the forward direction.
const checkDigitCases: CheckDigitCase[] = [
  { kind: "isbn10", body: "030640615", expected: "2" },
  { kind: "isbn10", body: "080442957", expected: "X" },
  { kind: "isbn10", body: "000000000", expected: "0" },
  { kind: "isbn13", body: "978030640615", expected: "7" },
  { kind: "ean13", body: "400638133393", expected: "1" },
  { kind: "upcA", body: "03600029145", expected: "2" },
];

for (const c of checkDigitCases) {
  test(`computeCheckDigit(${c.kind}, ${c.body}) === ${c.expected}`, () => {
    assert.equal(computeCheckDigit(c.kind, c.body), c.expected);
  });
}

test("computeCheckDigit rejects a body of the wrong length", () => {
  assert.throws(() => computeCheckDigit("isbn10", "12345"));
  assert.throws(() => computeCheckDigit("isbn13", "12345"));
  assert.throws(() => computeCheckDigit("ean13", "12345"));
  assert.throws(() => computeCheckDigit("upcA", "12345"));
});

test("normalize strips hyphens and spaces and upcases X", () => {
  assert.equal(normalize(" 080442957x "), "080442957X");
});

interface PrettyCase {
  input: string;
  expected: string;
}

const prettyCases: PrettyCase[] = [
  { input: "9780306406157", expected: "9 780306 406157" },
  { input: "036000291452", expected: "0 36000 29145 2" },
  { input: "080442957X", expected: "080442957-X" },
  { input: "4006381333931", expected: "4 006381 333931" },
];

for (const c of prettyCases) {
  test(`prettyPrint formats: ${c.input}`, () => {
    const parsed = parse(c.input);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(prettyPrint(parsed), c.expected);
    }
  });
}
