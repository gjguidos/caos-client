import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils/test-utils";
import { WorkflowCanvas } from "./WorkflowCanvas";
import type { WorkflowDefinition } from "@/shared/lib/workflow/workflow.types";

const definition: WorkflowDefinition = {
  steps: [
    { id: "first", type: "tool", command: "@Writer" },
    { id: "second", type: "end" },
  ],
} as WorkflowDefinition;

/** React Flow measures its container and uses matrix maths jsdom doesn't ship. */
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.DOMMatrixReadOnly = class {
    m22 = 1;
    constructor() {}
  } as unknown as typeof DOMMatrixReadOnly;
  Element.prototype.getBoundingClientRect = vi.fn(
    () =>
      ({
        width: 800,
        height: 600,
        top: 0,
        left: 0,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
      }) as DOMRect
  );
});

/** The node's own wrapper is the React Flow node element, which carries the
 * `selected` class; our border classes live on the div we render inside it. */
function nodeElement(label: string): HTMLElement {
  const el = screen.getByText(label).closest(".react-flow__node");
  if (!el) throw new Error(`no node element for ${label}`);
  return el as HTMLElement;
}

describe("WorkflowCanvas selection", () => {
  it("marks the node matching selectedStepId as selected", () => {
    render(<WorkflowCanvas definition={definition} selectedStepId="first" />);

    expect(nodeElement("first")).toHaveClass("selected");
    expect(nodeElement("second")).not.toHaveClass("selected");
  });

  it("marks nothing selected when no step is selected", () => {
    render(<WorkflowCanvas definition={definition} selectedStepId={null} />);

    expect(nodeElement("first")).not.toHaveClass("selected");
    expect(nodeElement("second")).not.toHaveClass("selected");
  });
});
