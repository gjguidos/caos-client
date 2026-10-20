import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";
import { renderHook } from "@/test-utils/test-utils";
import { describe, expect, it } from "vitest";
import { getRenderPathComponents, useRenderPath } from "./useRenderPath";

function makeComponent(
  overrides: Partial<UIComponent> & { id: string }
): UIComponent {
  return {
    type: "text",
    widget: "TextField",
    group: null,
    render_paths: [],
    slot_order: null,
    props: {},
    ...overrides,
  };
}

const TOOL_MODE_PATH =
  "workspace.conversationArea.inputSection.toolMode" as const;
const INPUT_ACTION_BAR_PATH =
  "workspace.conversationArea.inputSection.inputActionBar" as const;

const pillGroup = makeComponent({
  id: "mode",
  widget: "PillGroup",
  render_paths: [TOOL_MODE_PATH],
  slot_order: 0,
});

const fileUpload = makeComponent({
  id: "file",
  widget: "TextField",
  render_paths: [INPUT_ACTION_BAR_PATH],
  slot_order: 1,
});

const panelField = makeComponent({
  id: "tone",
  widget: "CheckboxGroupField",
  group: "style",
  render_paths: ["propertiesPanel.style"],
  slot_order: 0,
});

const panelField2 = makeComponent({
  id: "length",
  widget: "NumberField",
  group: "style",
  render_paths: ["propertiesPanel.style"],
  slot_order: 1,
});

const ALL_COMPONENTS = [pillGroup, fileUpload, panelField, panelField2];

describe("getRenderPathComponents", () => {
  it("returns empty array for undefined components", () => {
    expect(getRenderPathComponents(TOOL_MODE_PATH, undefined)).toEqual([]);
  });

  it("returns empty array for null components", () => {
    expect(getRenderPathComponents(TOOL_MODE_PATH, null)).toEqual([]);
  });

  it("returns empty array for empty components array", () => {
    expect(getRenderPathComponents(TOOL_MODE_PATH, [])).toEqual([]);
  });

  it("returns only the component matching the exact path", () => {
    const result = getRenderPathComponents(TOOL_MODE_PATH, ALL_COMPONENTS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("mode");
  });

  it("returns empty array when no component matches the path", () => {
    const result = getRenderPathComponents("chatInput", [
      pillGroup,
      fileUpload,
    ]);
    expect(result).toHaveLength(0);
  });

  it("matches propertiesPanel prefix for any propertiesPanel sub-path", () => {
    const result = getRenderPathComponents("propertiesPanel", ALL_COMPONENTS);
    expect(result.map((c) => c.id)).toEqual(["tone", "length"]);
  });

  it("does NOT match propertiesPanel prefix when using an exact sub-path", () => {
    const result = getRenderPathComponents(
      "propertiesPanel.style",
      ALL_COMPONENTS
    );
    expect(result.map((c) => c.id)).toEqual(["tone", "length"]);
  });

  it("sorts results by slot_order ascending", () => {
    const unordered = makeComponent({
      id: "b",
      render_paths: [TOOL_MODE_PATH],
      slot_order: 2,
    });
    const first = makeComponent({
      id: "a",
      render_paths: [TOOL_MODE_PATH],
      slot_order: 1,
    });
    const result = getRenderPathComponents(TOOL_MODE_PATH, [unordered, first]);
    expect(result.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("appends null slot_order items after ordered ones", () => {
    const ordered = makeComponent({
      id: "first",
      render_paths: [TOOL_MODE_PATH],
      slot_order: 0,
    });
    const unordered = makeComponent({
      id: "last",
      render_paths: [TOOL_MODE_PATH],
      slot_order: null,
    });
    const result = getRenderPathComponents(TOOL_MODE_PATH, [
      unordered,
      ordered,
    ]);
    expect(result.map((c) => c.id)).toEqual(["first", "last"]);
  });

  it("includes a component that lists multiple render_paths", () => {
    const multiPath = makeComponent({
      id: "multi",
      render_paths: [TOOL_MODE_PATH, INPUT_ACTION_BAR_PATH],
      slot_order: 0,
    });
    expect(
      getRenderPathComponents(TOOL_MODE_PATH, [multiPath]).map((c) => c.id)
    ).toEqual(["multi"]);
    expect(
      getRenderPathComponents(INPUT_ACTION_BAR_PATH, [multiPath]).map(
        (c) => c.id
      )
    ).toEqual(["multi"]);
  });

  it("does not mutate the original components array", () => {
    const components = [fileUpload, pillGroup];
    getRenderPathComponents(TOOL_MODE_PATH, components);
    expect(components[0].id).toBe("file");
    expect(components[1].id).toBe("mode");
  });
});

describe("useRenderPath", () => {
  it("returns the same result as getRenderPathComponents", () => {
    const { result } = renderHook(() =>
      useRenderPath(TOOL_MODE_PATH, ALL_COMPONENTS)
    );
    expect(result.current).toEqual(
      getRenderPathComponents(TOOL_MODE_PATH, ALL_COMPONENTS)
    );
  });

  it("returns empty array when components is undefined", () => {
    const { result } = renderHook(() =>
      useRenderPath(TOOL_MODE_PATH, undefined)
    );
    expect(result.current).toEqual([]);
  });

  it("returns empty array when components is null", () => {
    const { result } = renderHook(() => useRenderPath(TOOL_MODE_PATH, null));
    expect(result.current).toEqual([]);
  });

  it("returns a stable reference when inputs do not change", () => {
    const { result, rerender } = renderHook(() =>
      useRenderPath(TOOL_MODE_PATH, ALL_COMPONENTS)
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
