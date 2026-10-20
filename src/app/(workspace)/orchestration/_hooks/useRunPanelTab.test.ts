import type { RunStatus } from "@/shared/lib/workflow/workflow.types";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useRunPanelTab } from "./useRunPanelTab";

function renderTab(runStatus: RunStatus | null = null, isStarting = false) {
  return renderHook(
    ({ status, starting }: { status: RunStatus | null; starting: boolean }) =>
      useRunPanelTab(status, starting),
    { initialProps: { status: runStatus, starting: isStarting } }
  );
}

describe("useRunPanelTab", () => {
  it("opens on Inputs before anything has run", () => {
    const { result } = renderTab();
    expect(result.current.tab).toBe("inputs");
  });

  it("moves to Events when a run is dispatched", () => {
    const { result, rerender } = renderTab();

    rerender({ status: null, starting: true });

    expect(result.current.tab).toBe("events");
  });

  it("moves to Events when the first snapshot arrives without a start", () => {
    const { result, rerender } = renderTab();

    rerender({ status: "RUNNING", starting: false });

    expect(result.current.tab).toBe("events");
  });

  it.each<RunStatus>(["COMPLETED", "FAILED", "CANCELLED"])(
    "moves to Outputs once the run settles as %s",
    (status) => {
      const { result, rerender } = renderTab();

      rerender({ status: "RUNNING", starting: false });
      rerender({ status, starting: false });

      expect(result.current.tab).toBe("outputs");
    }
  );

  it("leaves the tab alone when the run pauses", () => {
    const { result, rerender } = renderTab();

    rerender({ status: "RUNNING", starting: false });
    act(() => result.current.setTab("inputs"));
    rerender({ status: "PAUSED", starting: false });

    expect(result.current.tab).toBe("inputs");
  });

  it("returns to Inputs when the run state is cleared", () => {
    const { result, rerender } = renderTab();

    rerender({ status: "COMPLETED", starting: false });
    rerender({ status: null, starting: false });

    expect(result.current.tab).toBe("inputs");
  });

  it("does not let a manual pick suppress the next auto-switch", () => {
    const { result, rerender } = renderTab();

    rerender({ status: "RUNNING", starting: false });
    act(() => result.current.setTab("inputs"));
    rerender({ status: "COMPLETED", starting: false });

    expect(result.current.tab).toBe("outputs");
  });

  it("lands on Outputs for a run whose first snapshot is already terminal", () => {
    const { result, rerender } = renderTab();

    rerender({ status: null, starting: true });
    rerender({ status: "COMPLETED", starting: false });

    expect(result.current.tab).toBe("outputs");
  });

  it("stays put while nothing transitions", () => {
    const { result, rerender } = renderTab();

    rerender({ status: "RUNNING", starting: false });
    act(() => result.current.setTab("outputs"));
    rerender({ status: "RUNNING", starting: false });

    expect(result.current.tab).toBe("outputs");
  });
});
