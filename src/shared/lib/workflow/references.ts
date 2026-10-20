/**
 * The `${…}` reference grammar that lets a step's arg point at a workflow input
 * or a prior step's output instead of a static literal.
 *
 * The grammar is owned by the engine (`helpers/templating.py`, regex
 * `\$\{([^}]+)\}`, `strict=True`). The frontend conforms to it:
 *  - `${inputs.<key>}`             → a declared workflow input
 *  - `${outputs.<step_id>.<key>}`  → a prior step's declared, typed output
 *  - inline default with `|`: `${inputs.topic|Untitled}`
 *
 * Outputs are strict: a step exposes only the keys its tool declares (no implicit
 * `.text`, no `.env.*` escape hatch).
 *
 * Lives in `shared` because both the workflow builder (authoring the bindings)
 * and the run page (resolving them against a live run) read the same grammar.
 */

/** Matches each `${…}` token; capture group is the inner expression. */
const REFERENCE_TOKEN = /\$\{([^}]+)\}/g;
/** A value that is exactly one whole `${…}` token (optionally `${…|default}`). */
const WHOLE_REFERENCE = /^\$\{[^{}]+\}$/;

export type ReferenceKind = "input" | "output" | "other";

export interface Reference {
  /** The inner expression (without `${ }`), e.g. `inputs.topic|Untitled`. */
  raw: string;
  kind: ReferenceKind;
  /** Input key (`inputs.<key>`) or output step id (`outputs.<id>…`). */
  key?: string;
  /** Declared output key after the step id, e.g. `answer` in `outputs.s1.answer`. */
  outputKey?: string;
  /**
   * Drill-down into the declared output's value, when the token goes deeper than
   * the declared key: `score` in `outputs.audit.data.score`. Only an `object` or
   * `list` output can carry one.
   */
  path?: string;
  /** Inline `|default`, when the token carries one. */
  fallback?: string;
}

/** Strip an inline `|default` suffix, returning just the resolution expression. */
function exprOf(inner: string): string {
  const pipe = inner.indexOf("|");
  return pipe === -1 ? inner : inner.slice(0, pipe);
}

/** The inline `|default`, when present. */
function fallbackOf(inner: string): string | undefined {
  const pipe = inner.indexOf("|");
  return pipe === -1 ? undefined : inner.slice(pipe + 1);
}

/** Classify a single `${…}` inner expression. */
export function classify(inner: string): Reference {
  const expr = exprOf(inner).trim();
  const fallback = fallbackOf(inner);
  const withFallback = fallback !== undefined ? { fallback } : {};

  if (expr.startsWith("inputs.")) {
    return {
      raw: inner,
      kind: "input",
      key: expr.slice("inputs.".length),
      ...withFallback,
    };
  }
  if (expr.startsWith("outputs.")) {
    // `outputs.<stepId>.<declaredKey>[.<path…>]` — segment 2 is always the key a
    // tool declares; anything after it drills into that output's value.
    const [key = "", outputKey = "", ...rest] = expr
      .slice("outputs.".length)
      .split(".");
    const path = rest.join(".");
    return {
      raw: inner,
      kind: "output",
      key,
      outputKey,
      ...(path ? { path } : {}),
      ...withFallback,
    };
  }
  return { raw: inner, kind: "other", ...withFallback };
}

/** Extract and classify every `${…}` token in a command string. */
export function parseReferences(command: string): Reference[] {
  const out: Reference[] = [];
  const regex = new RegExp(REFERENCE_TOKEN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(command)) !== null) {
    out.push(classify(match[1]));
  }
  return out;
}

// ---- Token builders -------------------------------------------------------

/** Build a workflow-input reference token: `${inputs.<key>}`. */
export function buildInputReference(key: string): string {
  return `\${inputs.${key}}`;
}

/** Build a step-output reference token: `${outputs.<stepId>.<key>}`. */
export function buildOutputReference(stepId: string, key: string): string {
  return `\${outputs.${stepId}.${key}}`;
}

/**
 * Resolve a reference to its human-facing *source* label: the input key for
 * `${inputs.…}`, the producer step's label for `${outputs.<id>.…}` (via the
 * caller-supplied `getStepLabel`, falling back to the raw step id), or the raw
 * expression otherwise. Shared by every surface that renders a binding.
 */
export function resolveReferenceSource(
  ref: Reference,
  getStepLabel: (stepId: string) => string | undefined
): string {
  if (ref.kind === "input") return `inputs.${ref.key}`;
  if (ref.kind === "output")
    return getStepLabel(ref.key ?? "") ?? ref.key ?? "";
  return ref.raw;
}

// ---- Render-rule predicates (chip vs raw-expression) ----------------------

/** True when the value is exactly one whole `${…}` token (→ binding classification). */
export function isWholeReference(value: unknown): boolean {
  return typeof value === "string" && WHOLE_REFERENCE.test(value.trim());
}

/** True when the value carries any `${…}` reference (whole or mixed). */
export function isBoundValue(value: unknown): boolean {
  return typeof value === "string" && value.includes("${");
}
