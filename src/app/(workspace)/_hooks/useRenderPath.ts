import type {
  RenderPath,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { useMemo } from "react";

/**
 * Pure function — safe to call outside React (e.g. serializers).
 *
 * Returns all UIComponents that belong to the given render path,
 * sorted by slot_order. All render_paths string matching lives here.
 *
 * Special paths:
 *   "propertiesPanel" — matches any component whose render path starts
 *                       with "propertiesPanel" (groups are sub-paths).
 */
export function getRenderPathComponents(
  path: RenderPath,
  components: UIComponent[] | null | undefined
): UIComponent[] {
  if (!components || components.length === 0) return [];

  const filtered =
    path === "propertiesPanel"
      ? components.filter((c) =>
          c.render_paths.some((p) => p.startsWith("propertiesPanel"))
        )
      : components.filter((c) => c.render_paths.includes(path));

  return [...filtered].sort(
    (a, b) => (a.slot_order ?? Infinity) - (b.slot_order ?? Infinity)
  );
}

/**
 * Hook — each render location in the UI calls this with its own path.
 * Returns the sorted UIComponents that the BE has configured for this slot.
 *
 * @example
 * // In ToolChatBar (mode pill strip):
 * const toolModeComponents = useRenderPath(
 *   "workspace.conversationArea.inputSection.toolMode",
 *   currentToolUI
 * );
 *
 * // In PropertiesPanel:
 * const panelComponents = useRenderPath("propertiesPanel", uiComponents);
 */
export function useRenderPath(
  path: RenderPath,
  components: UIComponent[] | null | undefined
): UIComponent[] {
  return useMemo(
    () => getRenderPathComponents(path, components),
    [path, components]
  );
}
