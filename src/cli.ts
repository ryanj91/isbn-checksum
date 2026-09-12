#!/usr/bin/env node
/**
 * Command-line wrapper around parse/prettyPrint: one code in, one line of
 * "kind<TAB>pretty-printed form" out, or an error on stderr. Exit status is
 * 0 only if every argument parsed.
 */
import { parse } from "./checksum.js";
import { prettyPrint } from "./format.js";

export function run(args: string[]): number {
  if (args.length === 0) {
    console.error("usage: isbn-checksum <code> [<code> ...]");
    return 1;
  }
  let exitCode = 0;
  for (const arg of args) {
    const result = parse(arg);
    if (result.ok) {
      console.log(`${result.kind}\t${prettyPrint(result)}`);
    } else {
      console.error(result.reason);
      exitCode = 1;
    }
  }
  return exitCode;
}

// Only run as a program when invoked directly, not when imported (e.g. by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = run(process.argv.slice(2));
}
