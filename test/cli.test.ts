import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "../src/cli.js";

// run() prints to console.log/console.error rather than returning text, so
// these tests capture those calls and restore them afterward.
function captureOutput(fn: () => number): { exitCode: number; stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const realLog = console.log;
  const realError = console.error;
  console.log = (line: string) => stdout.push(line);
  console.error = (line: string) => stderr.push(line);
  try {
    const exitCode = fn();
    return { exitCode, stdout, stderr };
  } finally {
    console.log = realLog;
    console.error = realError;
  }
}

test("run prints usage and fails with no arguments", () => {
  const { exitCode, stderr } = captureOutput(() => run([]));
  assert.equal(exitCode, 1);
  assert.equal(stderr.length, 1);
  assert.match(stderr[0], /^usage:/);
});

test("run prints kind and pretty form for a valid code", () => {
  const { exitCode, stdout, stderr } = captureOutput(() => run(["978-0-306-40615-7"]));
  assert.equal(exitCode, 0);
  assert.deepEqual(stdout, ["isbn13\t9 780306 406157"]);
  assert.deepEqual(stderr, []);
});

test("run reports an error and a nonzero exit for an invalid code", () => {
  const { exitCode, stdout, stderr } = captureOutput(() => run(["0306406151"]));
  assert.equal(exitCode, 1);
  assert.deepEqual(stdout, []);
  assert.equal(stderr.length, 1);
  assert.match(stderr[0], /bad ISBN-10 check digit/);
});

test("run handles a mix of valid and invalid codes, one line each", () => {
  const { exitCode, stdout, stderr } = captureOutput(() => run(["036000291452", "0306406151"]));
  assert.equal(exitCode, 1);
  assert.deepEqual(stdout, ["upcA\t0 36000 29145 2"]);
  assert.equal(stderr.length, 1);
});
