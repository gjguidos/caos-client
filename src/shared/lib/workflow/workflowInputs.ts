/**
 * Readers for a `WorkflowInputField`'s free-form `constraints`. Kept here, next
 * to the type, so every surface that interprets a constraint (the Run-panel
 * parser, the admin editor, the builder's binding badges) shares one narrowing
 * and can't drift.
 */

/**
 * A `file` input's declared `constraints.accepted_mimes`, narrowed to a
 * non-empty string array. Returns `undefined` when absent, empty, or malformed
 * (the caller treats that as "accepts any file"). Values may use `type/*`
 * wildcards; matching is done by `@/shared/lib/mime`.
 */
export function readAcceptedMimes(
  constraints: Record<string, unknown> | null | undefined
): string[] | undefined {
  const value = constraints?.accepted_mimes;
  if (!Array.isArray(value)) return undefined;
  const mimes = value.filter((v): v is string => typeof v === "string");
  return mimes.length > 0 ? mimes : undefined;
}
