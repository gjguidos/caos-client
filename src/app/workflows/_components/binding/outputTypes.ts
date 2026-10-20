/**
 * outputTypes — the authoring-time bridge between a target field's input widget
 * and the output vocabulary (`string | number | boolean | list | object | image`).
 *
 * Compatibility is advisory only: a mismatch is badged in the picker, never
 * blocked. The engine `str()`-coerces resolved values into the command string, so
 * a mismatch is not a hard runtime error for the text-ish core.
 *
 * The `object` field type is the JSON (`JsonField`) input: an `object` output
 * binds into it cleanly, and into any other field with a mismatch badge.
 *
 * `image` is the exception to "advisory": an `image` output can only feed a
 * file-input slot (`file_bindings`), never a text-ish command arg. That split is
 * owned here by `argBindableSources` / `imageBindableSources`; the binding
 * controls stay policy-free and render whatever sources they're handed.
 */

import type { FieldType } from "@/app/(workspace)/_tool-form/toolForm.types";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import type { ToolOutputType } from "@/store/slices/registry/toolsSlice";
import type { OutputSource } from "./types";

/**
 * Map a target field's input widget (`UIComponent.type`) to the output type it
 * expects. Partial: field types that are not binding targets (`action`,
 * `hidden`) are left unmapped and fall through to "no expectation".
 */
const FIELD_TYPE_TO_OUTPUT_TYPE: Partial<Record<FieldType, ToolOutputType>> = {
  text: "string",
  free_text: "string",
  select: "string",
  number: "number",
  multiselect: "list",
  boolean: "boolean",
  object: "object",
  // A file field's only bindable feed is an image output (via file slots).
  file: "image",
};

/** The output type a field can accept, or `undefined` when the widget is unknown. */
export function expectedOutputType(
  fieldType: FieldType | undefined
): ToolOutputType | undefined {
  return fieldType ? FIELD_TYPE_TO_OUTPUT_TYPE[fieldType] : undefined;
}

/**
 * Whether `outputType` is compatible with a field expecting `expected`. Unknown
 * expectations (no mapping) are treated as compatible so we never over-badge.
 */
export function isOutputCompatible(
  expected: ToolOutputType | undefined,
  outputType: ToolOutputType
): boolean {
  return expected === undefined || expected === outputType;
}

/**
 * Sources narrowed to the outputs a command arg may bind (everything but
 * `image`). Sources are kept even when narrowed to zero outputs so "an upstream
 * step exists" cues (toggle visibility, pill label resolution) stay accurate.
 */
export function argBindableSources(
  sources: ReadonlyArray<OutputSource>
): OutputSource[] {
  return sources.map((source) => ({
    ...source,
    outputs: source.outputs.filter((o) => o.type !== "image"),
  }));
}

/**
 * Sources narrowed to their `image` outputs — the only valid feed for a file
 * slot. Sources with no image outputs are dropped; they can never be picked.
 */
export function imageBindableSources(
  sources: ReadonlyArray<OutputSource>
): OutputSource[] {
  return sources
    .map((source) => ({
      ...source,
      outputs: source.outputs.filter((o) => o.type === "image"),
    }))
    .filter((source) => source.outputs.length > 0);
}

/**
 * Workflow inputs a file slot may bind — `file`-kind only. Mirrors the
 * `imageBindableSources` split: a slot's other valid feed besides an upstream
 * image output is a declared file input (`${inputs.<key>}`).
 */
export function fileBindableInputs(
  inputs: ReadonlyArray<WorkflowInputField>
): WorkflowInputField[] {
  return inputs.filter((input) => input.input === "file");
}

/**
 * Workflow inputs a command arg may bind — everything but `file`-kind. A
 * file_id in a text arg is a footgun, so the picker never offers it (mirrors
 * `argBindableSources` excluding `image` outputs).
 */
export function argBindableInputs(
  inputs: ReadonlyArray<WorkflowInputField>
): WorkflowInputField[] {
  return inputs.filter((input) => input.input !== "file");
}
