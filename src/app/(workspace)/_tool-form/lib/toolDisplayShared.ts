import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";

/** The mode pill renders into this slot of the input section. */
export const TOOL_MODE_RENDER_PATH =
  "workspace.conversationArea.inputSection.toolMode";

/**
 * The mode pill, identified by where it renders. It is otherwise an ordinary
 * `--mode` component; only the chat input pill and the builder's config panel
 * need to single it out (to render it as a pill / rewrite it into a select).
 */
export function findModeComponent(
  components: UIComponent[]
): UIComponent | undefined {
  return components.find((c) => c.render_paths.includes(TOOL_MODE_RENDER_PATH));
}

export function getComponentLabel(component: UIComponent): string {
  return (component.props?.label as string | undefined) ?? component.id;
}

export function sortBySlotOrder<T extends { slot_order: number | null }>(
  components: T[]
): T[] {
  return [...components].sort(
    (a, b) => (a.slot_order ?? 0) - (b.slot_order ?? 0)
  );
}
