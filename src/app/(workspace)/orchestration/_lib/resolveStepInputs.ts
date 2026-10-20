/**
 * resolveStepInputs — what actually flowed into a step.
 *
 * The backend reports a step's *output* but never its input, so the run page
 * reconstructs it: a step's `command` carries `--flag=value` pairs whose values
 * may be `${…}` reference tokens, and the run already holds everything those
 * tokens point at (the inputs the run was started with, plus every prior step's
 * output). Resolving one against the other turns "this step referenced
 * `${outputs.research.answer}`" into "this step received *this text*", which is
 * the difference between reading a definition and debugging a run.
 *
 * Pure and total: an unresolvable reference is reported as unresolved rather
 * than silently rendering blank.
 */

import { parseFlags } from "@/app/(workspace)/_tool-form/lib/parseFlags";
import {
  isPresentedStepOutput,
  resolveDeclaredImages,
} from "@/shared/lib/workflow/declaredOutputs";
import {
  isWholeReference,
  parseReferences,
  type Reference,
} from "@/shared/lib/workflow/references";
import type {
  PresentedImage,
  WorkflowStep,
} from "@/shared/lib/workflow/workflow.types";

export type ArgSource =
  | { kind: "literal" }
  | { kind: "input"; key: string }
  | {
      kind: "output";
      stepId: string;
      outputKey: string;
      /** Drill-down beyond the declared key, e.g. `score` in `…data.score`. */
      path?: string;
      /** The producer's label for this output, once the value has resolved. */
      label?: string;
    }
  /** A reference the grammar doesn't classify (neither `inputs.` nor `outputs.`). */
  | { kind: "unknown"; expression: string }
  /** A value mixing literal text with one or more references. */
  | { kind: "mixed" };

/**
 * Why a reference has no value. The cases mean different things to someone
 * debugging: nobody filled the run input in, the producer hasn't got there yet,
 * it got there and blew up, it ran fine but never declared what the command
 * asks for (an authoring mistake the builder also flags as
 * `UNKNOWN_OUTPUT_REFERENCE`), or the reference names nothing the grammar knows
 * and so will never resolve at all.
 *
 * `unset` is the one that is waiting on the reader rather than on the run, which
 * is why it is its own outcome and not a `pending` a renderer has to re-derive
 * from the source kind. `unresolvable` is the one that no amount of waiting
 * fixes, which is why it is not a `pending` either.
 */
export type UnresolvedReason =
  | "unset"
  | "pending"
  | "failed"
  | "undeclared"
  | "unresolvable";

export interface ResolvedArg {
  /** Flag name without the leading dashes, e.g. `topic` for `--topic=…`. */
  name: string;
  source: ArgSource;
  /** The resolved value. `undefined` when the source hasn't produced it yet. */
  value?: unknown;
  /**
   * Set in place of `value` when the upstream output declared an `image`, so a
   * caller renders thumbnails without having to re-derive the type. An empty
   * list is resolved-but-empty ("declared an image, produced none"), not
   * unresolved.
   */
  images?: PresentedImage[];
  /** The resolved value came from the token's inline `|default`. */
  usedFallback?: boolean;
  /** Set only when nothing resolved; says which empty case this is. */
  unresolved?: UnresolvedReason;
}

/** Walk a dotted path (`a.b.c`) into a value, or undefined if it doesn't exist. */
function walkPath(value: unknown, path: string): unknown {
  if (!path) return value;
  let current = value;
  for (const segment of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
    if (current === undefined) return undefined;
  }
  return current;
}

export interface ResolutionContext {
  /**
   * The inputs that apply to what is being shown: the ones a recorded run was
   * started with, or - before any run exists - the ones the run form has been
   * filled in with so far. Which of those two it is, is the page's call and not
   * this module's; by the time it arrives here it is just "the inputs".
   */
  inputs: Record<string, unknown>;
  /** Per-step outputs keyed by step id, merged over live events. */
  stepOutputs: Record<string, unknown>;
}

/** What a single reference resolved to, or why it didn't. */
interface ReferenceResolution {
  value?: unknown;
  images?: PresentedImage[];
  /** The producer's display label for the declared output. */
  label?: string;
  unresolved?: UnresolvedReason;
}

/**
 * Resolve `${outputs.<stepId>.<key>[.<path>]}` against the producer's payload.
 *
 * The key is looked up in the producer's `declared_outputs` - the map the engine
 * itself resolves `${outputs.…}` against - not by walking the display fields.
 * An `image` entry points into the payload's own `images` by index, so it
 * resolves to images rather than to a value.
 */
function resolveOutputReference(
  ref: Reference,
  ctx: ResolutionContext
): ReferenceResolution {
  const payload = ctx.stepOutputs[ref.key ?? ""];
  if (payload === undefined) return { unresolved: "pending" };
  if (!isPresentedStepOutput(payload)) return { unresolved: "undeclared" };

  // A step that failed declared nothing *because* it failed - say so, rather
  // than blaming the author for a key the tool does declare.
  const emptyReason: UnresolvedReason = payload.ok ? "undeclared" : "failed";
  const entry = payload.declared_outputs?.[ref.outputKey ?? ""];
  if (!entry) return { unresolved: emptyReason };

  const label = { label: entry.label };

  if (entry.type === "image") {
    // A drill-down into an image is meaningless: the entry has no `value`.
    if (ref.path) return { ...label, unresolved: "undeclared" };
    return { ...label, images: resolveDeclaredImages(payload, entry) };
  }

  const value = walkPath(entry.value, ref.path ?? "");
  return value === undefined
    ? { ...label, unresolved: emptyReason }
    : { ...label, value };
}

/** Resolve one classified reference against the run. */
function resolveReference(
  ref: Reference,
  ctx: ResolutionContext
): ReferenceResolution {
  if (ref.kind === "input") {
    const value = ctx.inputs[ref.key ?? ""];
    return value === undefined ? { unresolved: "unset" } : { value };
  }
  if (ref.kind === "output") return resolveOutputReference(ref, ctx);
  // Neither `inputs.` nor `outputs.`: there is nothing for this to resolve
  // against now or later, so it is not pending on anything.
  return { unresolved: "unresolvable" };
}

/** Classify a reference into the arg's reported source. */
function sourceOf(ref: Reference, label?: string): ArgSource {
  if (ref.kind === "input") return { kind: "input", key: ref.key ?? "" };
  if (ref.kind === "output") {
    return {
      kind: "output",
      stepId: ref.key ?? "",
      outputKey: ref.outputKey ?? "",
      ...(ref.path ? { path: ref.path } : {}),
      ...(label ? { label } : {}),
    };
  }
  return { kind: "unknown", expression: ref.raw };
}

/**
 * Resolve one whole `${…}` token into the arg shape the panel renders, applying
 * the token's inline `|default` before reporting it as unresolved.
 *
 * The `|default` is always literal text, so falling back to it drops any
 * `images` the reference would otherwise have carried.
 */
function resolveWholeReference(
  ref: Reference,
  name: string,
  ctx: ResolutionContext
): ResolvedArg {
  const resolution = resolveReference(ref, ctx);
  const source = sourceOf(ref, resolution.label);

  if (resolution.images !== undefined) {
    return { name, source, images: resolution.images };
  }
  if (resolution.value !== undefined) {
    return { name, source, value: resolution.value };
  }
  if (ref.fallback !== undefined) {
    return { name, source, value: ref.fallback, usedFallback: true };
  }
  return { name, source, unresolved: resolution.unresolved ?? "pending" };
}

/**
 * Every argument a step's command sets, resolved against the run.
 *
 * Order follows the command, so the list reads the way the step was authored.
 */
export function resolveStepInputs(
  step: WorkflowStep,
  ctx: ResolutionContext
): ResolvedArg[] {
  if (!step.command) return [];

  const flags = parseFlags(step.command);

  return Object.entries(flags).map(([flag, raw]) => {
    const name = flag.replace(/^--/, "");

    // Only a value that is exactly one token is a resolvable reference. A mixed
    // value (`Summarize: ${outputs.s1.text}`) is reported as its literal text —
    // partially substituting it would misrepresent what the engine sent.
    if (isWholeReference(raw)) {
      const [ref] = parseReferences(raw);
      if (ref) return resolveWholeReference(ref, name, ctx);
    }

    if (raw.includes("${")) {
      return { name, source: { kind: "mixed" as const }, value: raw };
    }

    return { name, source: { kind: "literal" as const }, value: raw };
  });
}

/**
 * A step's file slots, resolved the same way its arguments are.
 *
 * `file_bindings` is already structured - each value is a single `${…}` token,
 * so there is nothing to parse out of a command - and each one almost always
 * points at an upstream `image` output. An `${inputs.…}` binding resolves to the
 * opaque `file_id` the run was started with, which the panel renders as the file
 * it names. A slot holding anything else is shown as the literal it is.
 */
export function resolveFileBindings(
  step: WorkflowStep,
  ctx: ResolutionContext
): ResolvedArg[] {
  return Object.entries(step.file_bindings ?? {}).map(([slot, raw]) => {
    const [ref] = parseReferences(raw);
    return ref
      ? resolveWholeReference(ref, slot, ctx)
      : { name: slot, source: { kind: "literal" as const }, value: raw };
  });
}
