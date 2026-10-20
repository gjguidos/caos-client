import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useWorkflowInputs } from "./useWorkflowInputs";
import { useBuilderSelection } from "./useBuilderSelection";
import { inputNodeId } from "../_lib/inputNodes";
import type { BuilderStepNodeType } from "../_components/nodes/BuilderStepNode";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";

const stepNode: BuilderStepNodeType = {
  id: "s1",
  type: "builderStep",
  position: { x: 300, y: 40 },
  data: { stepType: "tool", label: "Write", toolName: "writer" },
};

// `useToolRegistry` is a `shallowEqual` selector, so the builder gets one
// identity across renders. Hoisted so the fixture does too - an inline literal
// would invalidate every memo under test on each render.
const noTools: ToolDefinition[] = [];

/**
 * The two hooks as the builder composes them — inputs state above, selection
 * beside it. Declaring selects, so testing them apart would only assert the
 * wiring the builder already owns.
 */
function setup(initialNodes: BuilderStepNodeType[] = []) {
  return renderHook(() => {
    const [inputs, setInputs] = useState<WorkflowInputField[]>([]);
    const [nodes, setNodes] = useState(initialNodes);
    const selected = nodes.filter((n) => n.selected);

    const { selection, selectInput, clearInputSelection } = useBuilderSelection(
      {
        inputs,
        setNodes,
        selectedStepNode: selected.length === 1 ? selected[0] : null,
      }
    );
    const api = useWorkflowInputs({
      inputs,
      setInputs,
      nodes,
      tools: noTools,
      selection,
      selectInput,
    });

    return { inputs, selection, clearInputSelection, setNodes, ...api };
  });
}

describe("useWorkflowInputs", () => {
  it("keeps gutter node identity when a step only moves", () => {
    const far: BuilderStepNodeType = {
      ...stepNode,
      id: "s2",
      position: { x: 600, y: 200 },
    };
    const { result } = setup([stepNode, far]);

    act(() => result.current.declareInput());
    const before = result.current.inputNodes[0];

    // A drag rewrites the moved node with a new position on every pointer move.
    // React Flow hides a node it has to re-measure, so rebuilding the gutter
    // here is what made it blink; only the extreme step moves the column.
    act(() =>
      result.current.setNodes((prev) =>
        prev.map((n) =>
          n.id === "s2" ? { ...n, position: { x: 640, y: 260 } } : n
        )
      )
    );

    expect(result.current.inputNodes[0]).toBe(before);
  });

  it("keeps gutter node identity while the moving step is the selected one", () => {
    const far: BuilderStepNodeType = {
      ...stepNode,
      id: "s2",
      position: { x: 600, y: 200 },
    };
    const { result } = setup([stepNode, far]);

    // Declaring selects the input, so the step selection has to be taken back
    // afterwards - the two are exclusive.
    act(() => result.current.declareInput());
    act(() => {
      result.current.setNodes((prev) =>
        prev.map((n) => (n.id === "s2" ? { ...n, selected: true } : n))
      );
      result.current.clearInputSelection();
    });
    const before = result.current.inputNodes[0];

    // React Flow selects a step as the drag starts, so this is the ordinary
    // case: the selection object is rewritten every frame along with the node
    // it points at, and the gutter must not follow it.
    act(() =>
      result.current.setNodes((prev) =>
        prev.map((n) =>
          n.id === "s2" ? { ...n, position: { x: 640, y: 260 } } : n
        )
      )
    );

    expect(result.current.selection).toEqual({
      kind: "step",
      node: expect.objectContaining({ id: "s2" }),
    });
    expect(result.current.inputNodes[0]).toBe(before);
  });

  it("declares an input and selects it, so the panel opens on it", () => {
    const { result } = setup();

    act(() => result.current.declareInput());

    expect(result.current.inputs).toHaveLength(1);
    expect(result.current.selection).toEqual({
      kind: "input",
      index: 0,
      field: { key: "input_1", label: "", input: "text" },
    });
  });

  it("selects each newly declared input in turn", () => {
    const { result } = setup();

    act(() => result.current.declareInput());
    act(() => result.current.declareInput());

    expect(result.current.inputs.map((i) => i.key)).toEqual([
      "input_1",
      "input_2",
    ]);
    expect(result.current.selection).toMatchObject({ kind: "input", index: 1 });
  });

  it("names each declare's own index when two land in one batch", () => {
    const { result } = setup();

    // No render between them, so both read the same committed state — the case
    // keydown repeat and double clicks produce.
    act(() => {
      result.current.declareInput();
      result.current.declareInput();
    });

    expect(result.current.inputs.map((i) => i.key)).toEqual([
      "input_1",
      "input_2",
    ]);
    expect(result.current.selection).toMatchObject({ kind: "input", index: 1 });
  });

  it("never reuses a key a surviving input already holds", () => {
    const { result } = setup();

    act(() => result.current.declareInput());
    act(() => result.current.declareInput());
    act(() => result.current.removeInput(0));
    act(() => result.current.declareInput());

    expect(result.current.inputs.map((i) => i.key)).toEqual([
      "input_2",
      "input_3",
    ]);
  });

  it("drops the selection on remove, because later ids shift down", () => {
    const { result } = setup();

    act(() => result.current.declareInput());
    act(() => result.current.declareInput());
    act(() => result.current.removeInput(0));

    expect(result.current.inputs.map((i) => i.key)).toEqual(["input_2"]);
    expect(result.current.selection).toBeNull();
  });

  it("moves the cached measurements down with the ids on remove", () => {
    const { result } = setup([stepNode]);

    act(() => result.current.declareInput());
    act(() => result.current.declareInput());
    act(() =>
      result.current.noteInputDimensions([
        [inputNodeId(0), { width: 180, height: 60 }],
        [inputNodeId(1), { width: 180, height: 120 }],
      ])
    );
    act(() => result.current.removeInput(0));

    // The surviving input keeps its own size, not the removed one's.
    expect(result.current.inputNodes[0].measured).toEqual({
      width: 180,
      height: 120,
    });
  });

  it("does not seed a freshly declared input with a removed one's size", () => {
    const { result } = setup([stepNode]);

    act(() => result.current.declareInput());
    act(() =>
      result.current.noteInputDimensions([
        [inputNodeId(0), { width: 180, height: 200 }],
      ])
    );
    act(() => result.current.removeInput(0));
    act(() => result.current.declareInput());

    // The new input takes index 0 back; the entry for it died with its node.
    expect(result.current.inputNodes[0].measured).toBeUndefined();
  });

  it("patches one input without touching the others", () => {
    const { result } = setup();

    act(() => result.current.declareInput());
    act(() => result.current.declareInput());
    act(() => result.current.updateInput(0, { label: "Topic" }));

    expect(result.current.inputs[0]).toMatchObject({
      key: "input_1",
      label: "Topic",
    });
    expect(result.current.inputs[1].label).toBe("");
  });

  it("clearInputSelection drops the input selection only", () => {
    const { result } = setup();

    act(() => result.current.declareInput());
    act(() => result.current.clearInputSelection());

    expect(result.current.inputs).toHaveLength(1);
    expect(result.current.selection).toBeNull();
  });

  it("projects a gutter node per input, marking the selected one", () => {
    const { result } = setup([stepNode]);

    act(() => result.current.declareInput());
    act(() => result.current.declareInput());

    expect(result.current.inputNodes.map((n) => n.id)).toEqual([
      inputNodeId(0),
      inputNodeId(1),
    ]);
    expect(result.current.inputNodes.map((n) => n.selected)).toEqual([
      false,
      true,
    ]);
  });
});
