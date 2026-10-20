import { describe, expect, it, vi } from "vitest";
// FileField reaches for the toast slice, so these need the store provider.
import { render, screen } from "@/test-utils/test-utils";

import type { FieldConfig } from "@/app/(workspace)/_tool-form/toolForm.types";
import { FieldRenderer } from "./FieldRenderer";

function renderField(config: FieldConfig, value?: unknown) {
  const onChange = vi.fn();

  render(
    <FieldRenderer config={config} value={value as never} onChange={onChange} />
  );

  return { onChange };
}

describe("FieldRenderer", () => {
  it("renders a JSON field for object inputs", () => {
    renderField(
      {
        key: "cfg",
        type: "object",
        widget: "JsonField",
        label: "Config",
      },
      '{"a":1}'
    );

    expect(screen.getByLabelText("Config")).toBeInTheDocument();
  });

  it("renders a file field for file inputs", () => {
    renderField({
      key: "doc",
      type: "file",
      widget: "FileField",
      label: "Document",
      acceptedMimes: ["application/pdf"],
    });

    expect(screen.getByLabelText("Document")).toBeInTheDocument();
  });

  it("renders a switch for boolean inputs", () => {
    renderField(
      {
        key: "follow",
        type: "boolean",
        widget: "SwitchField",
        label: "Follow links",
      },
      true
    );

    expect(screen.getByLabelText("Follow links")).toBeChecked();
  });

  // A field the backend declared but the client cannot draw must stay visible;
  // silently dropping it hides a contract mismatch until someone reports a
  // missing option.
  it("shows a placeholder for a widget with no renderer", () => {
    renderField({
      key: "mystery",
      type: "select",
      widget: "PillGroup",
      label: "Mystery",
      options: [],
    });

    expect(screen.getByText("Mystery")).toBeInTheDocument();
    expect(screen.getByText(/not implemented yet/)).toBeInTheDocument();
  });
});
