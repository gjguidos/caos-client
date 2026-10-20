import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { resolveSelection, useBuilderSelection } from "./useBuilderSelection";
import type { BuilderStepNodeType } from "../_components/nodes/BuilderStepNode";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";

const stepNode: BuilderStepNodeType = {
  id: "s1",
  type: "builderStep",
  position: { x: 300, y: 40 },
  data: { stepType: "tool", label: "Write", toolName: "writer" },
};

const topic: WorkflowInputField = {
  key: "topic",
  label: "Topic",
  input: "text",
};

function setup(
  inputs: WorkflowInputField[] = [topic],
  selectedStepNode: BuilderStepNodeType | null = null
) {
  const setNodes = vi.fn();
  const view = renderHook(() =>
    useBuilderSelection({ inputs, setNodes, selectedStepNode })
  );
  return { ...view, setNodes };
}

describe("resolveSelection", () => {
  it("is nothing when neither source has a selection", () => {
    expect(resolveSelection(null, [topic], null)).toBeNull();
  });

  it("reports the step when only a step is selected", () => {
    expect(resolveSelection(null, [topic], stepNode)).toEqual({
      kind: "step",
      node: stepNode,
    });
  });

  it("lets the input win over a step selection left behind", () => {
    // The two sources have different owners, so both can be set for a render.
    expect(resolveSelection(0, [topic], stepNode)).toEqual({
      kind: "input",
      index: 0,
      field: topic,
    });
  });

  it("falls through when the index no longer names a declared input", () => {
    expect(resolveSelection(5, [topic], stepNode)).toEqual({
      kind: "step",
      node: stepNode,
    });
    expect(resolveSelection(5, [topic], null)).toBeNull();
  });
});

describe("useBuilderSelection", () => {
  it("selects a declared input by index", () => {
    const { result } = setup();

    act(() => result.current.selectInput(0));

    expect(result.current.selection).toEqual({
      kind: "input",
      index: 0,
      field: topic,
    });
  });

  it("clears the step selection on the canvas when an input is selected", () => {
    const { result, setNodes } = setup([topic], stepNode);

    act(() => result.current.selectInput(0));

    expect(setNodes).toHaveBeenCalled();
  });

  it("does not touch the graph when the input selection is cleared", () => {
    const { result, setNodes } = setup();

    act(() => result.current.clearInputSelection());

    expect(setNodes).not.toHaveBeenCalled();
    expect(result.current.selection).toBeNull();
  });

  it("drops the input selection when a step is selected", () => {
    const { result, setNodes } = setup();

    act(() => result.current.selectInput(0));
    act(() => result.current.selectStep("s1"));

    expect(result.current.selection).toBeNull();
    expect(setNodes).toHaveBeenCalled();
  });

  it("clears both the input and step selections together", () => {
    const setNodes = vi.fn();
    const { result, rerender } = renderHook(
      ({ selectedStepNode }) =>
        useBuilderSelection({ inputs: [topic], setNodes, selectedStepNode }),
      {
        initialProps: {
          selectedStepNode: stepNode as BuilderStepNodeType | null,
        },
      }
    );

    act(() => result.current.selectInput(0));
    act(() => result.current.clearSelection());

    const update = setNodes.mock.calls.at(-1)?.[0] as (
      prev: BuilderStepNodeType[]
    ) => BuilderStepNodeType[];
    expect(update([{ ...stepNode, selected: true }])[0].selected).toBe(false);

    // React Flow reports no selected step once the graph write lands.
    rerender({ selectedStepNode: null });
    expect(result.current.selection).toBeNull();
  });

  it("selects exactly one step, deselecting the rest", () => {
    const { result, setNodes } = setup();
    const others: BuilderStepNodeType[] = [
      { ...stepNode, id: "s1", selected: false },
      { ...stepNode, id: "s2", selected: true },
    ];

    act(() => result.current.selectStep("s1"));

    const update = setNodes.mock.calls.at(-1)?.[0] as (
      prev: BuilderStepNodeType[]
    ) => BuilderStepNodeType[];
    expect(update(others).map((n) => n.selected)).toEqual([true, false]);
  });
});
