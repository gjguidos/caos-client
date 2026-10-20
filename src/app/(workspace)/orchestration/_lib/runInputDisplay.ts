/**
 * How a run input is named and rendered once only its key survives.
 *
 * A run's recorded inputs and a step's `${inputs.<key>}` references both arrive
 * as bare keys pointing at values. Neither carries the label the run form gave
 * the field, and neither says whether the value is a file - a `file_id` is a
 * string like any other. Both answers live on the input's declaration, so both
 * panels reach it the same way, through here.
 */

import { getComponentLabel } from "@/app/(workspace)/_tool-form/lib/toolDisplayShared";
import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";
import { humanizeKey } from "@/shared/lib/humanizeKey";

/** The declaration behind a run input key, or undefined if it declares none. */
export type RunInputLookup = (key: string) => UIComponent | undefined;

/**
 * One lookup over a workflow's declared inputs, built once and shared by every
 * panel that needs it rather than each re-scanning the list per row.
 */
export function createRunInputLookup(inputs: UIComponent[]): RunInputLookup {
  const byId = new Map(inputs.map((input) => [input.id, input]));
  return (key) => byId.get(key);
}

/**
 * What to call a run input: the label its form field carries, or the key read
 * out as words when it carries none. A declaration without a label is no better
 * a name than no declaration at all, so both land in the same place.
 */
export function runInputLabel(key: string, input?: UIComponent): string {
  const label = input && getComponentLabel(input);
  return label && label !== input?.id ? label : humanizeKey(key);
}

/** Whether the value under this key is a file id rather than text. */
export function isFileInput(input?: UIComponent): boolean {
  return input?.type === "file";
}
