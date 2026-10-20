/**
 * Builder palette step kinds + id generation.
 *
 * The palette is hybrid: concrete tool nodes (one per registered ToolSpec) plus a
 * fixed set of control step types. A "palette kind" is the lightweight payload
 * dragged/clicked from the palette and turned into a builder node by the canvas.
 */

import type { StepType } from "@/shared/lib/workflow/workflow.types";
import { v4 as uuidv4 } from "uuid";

/** A structural (non-tool) step type offered as a fixed palette entry. */
export type StructuralStepType = Exclude<StepType, "tool">;

export interface ControlStepKind {
  type: StructuralStepType;
  label: string;
}

/** Fixed control step types, in palette order. */
export const CONTROL_STEP_KINDS: readonly ControlStepKind[] = [
  { type: "pause", label: "Pause" },
  { type: "set", label: "Set" },
  { type: "wait_event", label: "Wait Event" },
  { type: "end", label: "End" },
];

/**
 * What the palette hands to the canvas to materialize a node. A tool kind carries
 * the tool name (serialized into a `@<tool>` command); control kinds carry only
 * their type + label.
 */
export type PaletteKind =
  | { stepType: "tool"; toolName: string; label: string }
  | { stepType: StructuralStepType; label: string };

/**
 * Stable identity for a palette kind, safe as a React key. Tools are keyed by
 * their unique `toolName` (display labels can collide across tools); control
 * kinds by their unique `stepType`.
 */
export function paletteKindKey(kind: PaletteKind): string {
  return kind.stepType === "tool" ? `tool:${kind.toolName}` : kind.stepType;
}

/** MIME-ish key used for the drag-and-drop dataTransfer payload. */
export const PALETTE_DND_TYPE = "application/workflow-step-kind";

/** Serialize a palette kind for a drag's dataTransfer. */
export function encodePaletteKind(kind: PaletteKind): string {
  return JSON.stringify(kind);
}

/** Parse a dataTransfer payload back into a palette kind (null if malformed). */
export function decodePaletteKind(
  raw: string | undefined | null
): PaletteKind | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PaletteKind;
    if (parsed && typeof parsed.stepType === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a step id: `${stepType}_${shortId}`. Never shown to the author — the
 * human-facing handle is the node label.
 */
export function makeStepId(stepType: StepType): string {
  return `${stepType}_${uuidv4().slice(0, 8)}`;
}
