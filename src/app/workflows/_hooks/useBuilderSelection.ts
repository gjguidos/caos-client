"use client";

import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import type { BuilderStepNodeType } from "../_components/nodes/BuilderStepNode";

/**
 * What the builder has selected. The canvas has two kinds of selectable thing
 * with two different owners — React Flow owns step selection (it lives on the
 * nodes), this hook owns the input index — so rather than shipping two nullable
 * fields whose mutual exclusion every reader has to re-derive, they are resolved
 * into one value here and consumed as one everywhere else.
 */
export type BuilderSelection =
  | { kind: "step"; node: BuilderStepNodeType }
  | { kind: "input"; index: number; field: WorkflowInputField };

export interface UseBuilderSelectionArgs {
  /** The declared inputs an input selection indexes into. */
  inputs: ReadonlyArray<WorkflowInputField>;
  /** Step selection lives on the nodes, so selecting one is a graph write. */
  setNodes: Dispatch<SetStateAction<BuilderStepNodeType[]>>;
  /** The single React Flow-selected step, or null (none / multi-select). */
  selectedStepNode: BuilderStepNodeType | null;
}

export interface UseBuilderSelection {
  /** The one selected thing: a step, a declared input, or nothing. */
  selection: BuilderSelection | null;
  /** Select an input node by declaration index, or clear the selection. */
  selectInput: (index: number | null) => void;
  /** Select exactly one step node by id. */
  selectStep: (stepId: string) => void;
  /** Clear both step and input selection. */
  clearSelection: () => void;
  /**
   * Drop the input selection without touching the graph. React Flow's own change
   * handler calls this when it reports a step becoming selected — the one half of
   * the exclusivity below that this hook cannot initiate itself.
   */
  clearInputSelection: () => void;
}

/**
 * The builder canvas's selection model: which single thing — one step or one
 * declared input — is currently being configured.
 *
 * It owns *both* writes, including the step-selection ones, because
 * step-versus-input exclusivity is an invariant, and an invariant enforced in one
 * file is a fact where the same invariant enforced at five call sites is only a
 * convention. Every write goes through `selectInput` / `selectStep` /
 * `clearInputSelection`; every reader takes `selection`.
 */
export function useBuilderSelection({
  inputs,
  setNodes,
  selectedStepNode,
}: UseBuilderSelectionArgs): UseBuilderSelection {
  const [selectedInputIndex, setSelectedInputIndex] = useState<number | null>(
    null
  );

  const clearStepSelection = useCallback(() => {
    setNodes((prev) =>
      prev.map((n) => (n.selected ? { ...n, selected: false } : n))
    );
  }, [setNodes]);

  const clearInputSelection = useCallback(
    () => setSelectedInputIndex(null),
    []
  );

  const clearSelection = useCallback(() => {
    setSelectedInputIndex(null);
    clearStepSelection();
  }, [clearStepSelection]);

  const selectInput = useCallback<UseBuilderSelection["selectInput"]>(
    (index) => {
      setSelectedInputIndex(index);
      if (index !== null) clearStepSelection();
    },
    [clearStepSelection]
  );

  const selectStep = useCallback<UseBuilderSelection["selectStep"]>(
    (stepId) => {
      setSelectedInputIndex(null);
      setNodes((prev) =>
        prev.map((n) =>
          n.selected === (n.id === stepId)
            ? n
            : { ...n, selected: n.id === stepId }
        )
      );
    },
    [setNodes]
  );

  const selection = useMemo(
    () => resolveSelection(selectedInputIndex, inputs, selectedStepNode),
    [selectedInputIndex, inputs, selectedStepNode]
  );

  return {
    selection,
    selectInput,
    selectStep,
    clearSelection,
    clearInputSelection,
  };
}

/**
 * Resolve the two selection sources into one. The input selection wins, and an
 * index that no longer names a declared input resolves as no input selection at
 * all: `removeInput` clears it, but an edit-mode load can still land a shorter
 * `inputs[]` under a live index, and falling through beats rendering a panel for
 * an input that is not there.
 */
export function resolveSelection(
  selectedInputIndex: number | null,
  inputs: ReadonlyArray<WorkflowInputField>,
  selectedStepNode: BuilderStepNodeType | null
): BuilderSelection | null {
  if (selectedInputIndex !== null) {
    const field = inputs[selectedInputIndex];
    if (field) return { kind: "input", index: selectedInputIndex, field };
  }
  return selectedStepNode ? { kind: "step", node: selectedStepNode } : null;
}
