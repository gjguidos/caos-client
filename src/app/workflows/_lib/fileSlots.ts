/**
 * fileSlots — the naming rule for a tool's declared file slots.
 *
 * A slot's `label` is display text a tool author may leave blank, while `name`
 * is the binding key and always present. Every view that names a slot — the
 * step's File inputs section, the Used-by list, the input panel's picker —
 * falls back the same way, so the rule lives here rather than in each of them.
 */

import type { FileSlotSpec } from "@/store/slices/registry/toolsSlice";

/** Display text for one file slot, falling back to its binding key. */
export function fileSlotLabel(slot: FileSlotSpec): string {
  return slot.label?.trim() || slot.name;
}
