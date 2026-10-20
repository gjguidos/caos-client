/**
 * The text form of an arbitrary displayed value.
 *
 * A copy button has to put on the clipboard what the reader believes they are
 * copying, so the pane and the button both render from here rather than
 * formatting the same value twice and hoping the two agree: strings read
 * unquoted, structures as pretty-printed JSON.
 */
export function formatForClipboard(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    // `undefined` for a function or symbol, which JSON has no form for.
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    // Circular or otherwise unserialisable: something the reader can see beats
    // a blank pane and a button that silently does nothing.
    return String(value);
  }
}
