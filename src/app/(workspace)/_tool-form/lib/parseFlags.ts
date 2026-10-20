/**
 * Canonical CLI-flag parser shared by the chat display path
 * (`parseToolCommand.ts`) and the builder's editable round-trip
 * (`parseCommandToValues.ts`). Keep a single implementation so the two never
 * drift on quoting/escaping rules.
 */

/** Matches `--flag="quoted value"` or `--flag=unquoted`. */
const FLAG_REGEX = /--([a-zA-Z0-9_-]+)=(?:"((?:[^"\\]|\\.)*)"|(\S+))/g;

/**
 * Parse `@<tool> --flag=value …` into a `--flag → value` map. The leading
 * `@<tool>` token (if any) is ignored — it contains no `--flag=` pairs — so this
 * is safe to run over either a full command or just its flag tail.
 */
export function parseFlags(command: string): Record<string, string> {
  const flagValues: Record<string, string> = {};
  // Construct a fresh matcher per call so the stateful `lastIndex` can't leak.
  const regex = new RegExp(FLAG_REGEX.source, "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(command)) !== null) {
    const flag = `--${match[1]}`;
    flagValues[flag] =
      match[2] !== undefined ? match[2].replace(/\\"/g, '"') : match[3];
  }
  return flagValues;
}
