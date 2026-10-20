import { render, screen, userEvent } from "@/test-utils/test-utils";
import { describe, expect, it, vi } from "vitest";
import type { WorkflowPauseInfo } from "@/shared/lib/workflow/workflow.types";
import { PauseForm } from "./PauseForm";

function pause(overrides: Partial<WorkflowPauseInfo> = {}): WorkflowPauseInfo {
  return {
    pauseId: "p1",
    stepId: "gate",
    prompt: "Approve the draft?",
    ...overrides,
  };
}

const baseProps = {
  isResuming: false,
  isConnected: true,
  onContinue: vi.fn(),
  onCancel: vi.fn(),
};

describe("PauseForm — approval-only gate", () => {
  it("renders the prompt", () => {
    render(<PauseForm {...baseProps} pause={pause()} />);
    expect(screen.getByText("Approve the draft?")).toBeInTheDocument();
  });

  it("enables Continue immediately and resumes with the pause identifiers", async () => {
    const onContinue = vi.fn();
    const user = userEvent.setup();
    render(
      <PauseForm {...baseProps} onContinue={onContinue} pause={pause()} />
    );

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeEnabled();

    await user.click(continueButton);
    expect(onContinue).toHaveBeenCalledWith({
      action: "continue",
      data: { pause_id: "p1", step_id: "gate" },
    });
  });

  it("fires onCancel from the Cancel button", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<PauseForm {...baseProps} pause={pause()} onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("disables controls while resuming", () => {
    render(<PauseForm {...baseProps} pause={pause()} isResuming />);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
