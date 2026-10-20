import { describe, expect, it } from "vitest";

import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";
import { uiComponentToFieldConfig } from "./uiComponentToFieldConfig";

function component(overrides: Partial<UIComponent> = {}): UIComponent {
  return {
    id: "max_pages",
    type: "number",
    widget: "NumberField",
    group: "Advanced",
    render_paths: [],
    slot_order: 0,
    props: {},
    ...overrides,
  } as UIComponent;
}

describe("uiComponentToFieldConfig", () => {
  it("carries id, label, helper text and required across", () => {
    const config = uiComponentToFieldConfig(
      component({
        props: { label: "Max pages", helperText: "Upper bound" },
        flag_config: { flag: "--max_pages", required: true },
      })
    );

    expect(config).toMatchObject({
      key: "max_pages",
      label: "Max pages",
      helperText: "Upper bound",
      required: true,
      type: "number",
    });
  });

  it("maps ComboBoxField onto the select renderer", () => {
    const config = uiComponentToFieldConfig(
      component({
        widget: "ComboBoxField",
        type: "select",
        props: { options: [{ value: "a" }, { value: "b", label: "B" }] },
      })
    );

    expect(config).toMatchObject({
      type: "select",
      widget: "SelectField",
      options: [
        { value: "a", label: "a" },
        { value: "b", label: "B" },
      ],
    });
  });

  it("drops hidden fields and flags widgets with no renderer", () => {
    expect(uiComponentToFieldConfig(component({ widget: "HiddenField" }))).toBe(
      null
    );

    expect(
      uiComponentToFieldConfig(
        component({ widget: "PillGroup" as UIComponent["widget"] })
      )
    ).toBe("unimplemented");
  });

  it("converts a component with no group, so panels outside the accordion work", () => {
    const config = uiComponentToFieldConfig(
      component({ group: null, widget: "TextField", type: "text" })
    );

    expect(config).toMatchObject({ key: "max_pages", type: "text" });
  });
});
