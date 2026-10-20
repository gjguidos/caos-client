import type { WorkflowPauseInfo } from "@/shared/lib/workflow/workflow.types";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useStepSelection } from "./useStepSelection";

function gate(overrides: Partial<WorkflowPauseInfo> = {}): WorkflowPauseInfo {
  return {
    pauseId: "p1",
    stepId: "review_brief",
    prompt: "Approve?",
    ...overrides,
  };
}

describe("useStepSelection", () => {
  it("starts at run scope", () => {
    const { result } = renderHook(() => useStepSelection(null));
    expect(result.current.selectedStepId).toBeNull();
  });

  it("scopes to the paused step when a gate arrives", () => {
    const { result, rerender } = renderHook(
      (pause: WorkflowPauseInfo | null) => useStepSelection(pause),
      { initialProps: null as WorkflowPauseInfo | null }
    );

    rerender(gate());

    expect(result.current.selectedStepId).toBe("review_brief");
  });

  it("stays at run scope once the reader goes back while still paused", () => {
    const { result, rerender } = renderHook(
      (pause: WorkflowPauseInfo | null) => useStepSelection(pause),
      { initialProps: gate() as WorkflowPauseInfo | null }
    );

    act(() => result.current.clear());
    rerender(gate());

    expect(result.current.selectedStepId).toBeNull();
  });

  it("scopes to the next gate after the first is answered", () => {
    const { result, rerender } = renderHook(
      (pause: WorkflowPauseInfo | null) => useStepSelection(pause),
      { initialProps: gate() as WorkflowPauseInfo | null }
    );

    act(() => result.current.clear());
    rerender(null);
    rerender(gate({ pauseId: "p2", stepId: "review_draft" }));

    expect(result.current.selectedStepId).toBe("review_draft");
  });

  it("selects and clears on demand", () => {
    const { result } = renderHook(() => useStepSelection(null));

    act(() => result.current.select("write"));
    expect(result.current.selectedStepId).toBe("write");

    act(() => result.current.clear());
    expect(result.current.selectedStepId).toBeNull();
  });
});
