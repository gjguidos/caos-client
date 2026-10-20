/**
 * stepArgs — the single classifier behind every per-step "what's set?" view.
 *
 * A tool node's `command` is the source of truth (no cached values). Walking the
 * tool's prefillable components against the command-resolved values, each arg is
 * classified once into:
 *  - `binding`         — a `${…}` reference, carrying its resolved `source` label,
 *  - `literal`         — a set literal, carrying its formatted `value`,
 *  - `missingRequired` — a required arg left unset,
 *  - `optionalUnset`   — an optional arg left unset (usually filtered out).
 *
 * The node status line, the bound-field chips, the preview rows, and save-time
 * validation are all filters/maps over this one list, so they can't disagree on
 * what a command means.
 */

import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";
import { isEmptyValue } from "@/app/(workspace)/_tool-form/lib/uiComponentSerializer";
import { collectPrefillableComponents } from "./collectPrefillableComponents";
import { nodeCommandToValues } from "./nodeCommand";
import {
  isWholeReference,
  parseReferences,
  resolveReferenceSource,
} from "@/shared/lib/workflow/references";

export type StepArgKind =
  | "binding"
  | "literal"
  | "missingRequired"
  | "optionalUnset";

/** One classified arg of a tool step. */
export interface StepArg {
  /** Tool UI component id used for write-back from the workflow builder. */
  componentId: string;
  /** Human-facing field label, falling back to the component id. */
  field: string;
  kind: StepArgKind;
  /** Resolved source label — `binding` only. */
  source?: string;
  /** Parsed workflow references contained in the configured value. */
  references: ReturnType<typeof parseReferences>;
  /** Formatted literal text — `literal` only. */
  value?: string;
}

function formatLiteral(value: unknown): string {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

/**
 * Classify every prefillable arg of `tool` as set by `command`. `getStepLabel`
 * resolves `${outputs.<id>}` bindings to a producer label; pass a no-op when the
 * caller only cares about literal/required classification.
 */
export function classifyStepArgs(
  tool: ToolDefinition,
  command: string,
  getStepLabel: (stepId: string) => string | undefined = () => undefined
): StepArg[] {
  const { components } = collectPrefillableComponents(tool);
  const values = nodeCommandToValues(tool, command);

  const args: StepArg[] = [];
  for (const component of components) {
    const value = values[component.id];
    const references = typeof value === "string" ? parseReferences(value) : [];
    const field = (component.props?.label as string) ?? component.id;

    // Only a value that is *exactly* one `${…}` token is a binding; a mixed
    // expression (e.g. `Summarize: ${outputs.s1.text}`) falls through to the
    // literal path so the full text is preserved, matching the render layer's
    // whole-vs-mixed split.
    if (isWholeReference(value)) {
      const [ref] = parseReferences(value as string);
      if (ref) {
        args.push({
          componentId: component.id,
          field,
          kind: "binding",
          references,
          source: resolveReferenceSource(ref, getStepLabel),
        });
        continue;
      }
    }

    if (!isEmptyValue(value)) {
      args.push({
        componentId: component.id,
        field,
        kind: "literal",
        value: formatLiteral(value),
        references,
      });
    } else {
      args.push({
        componentId: component.id,
        field,
        kind: component.flag_config?.required
          ? "missingRequired"
          : "optionalUnset",
        references,
      });
    }
  }
  return args;
}
