import { render, screen, userEvent } from "@/test-utils/test-utils";
import { describe, expect, it, vi } from "vitest";
import { RunBar } from "./RunBar";

function renderBar(
  overrides: Partial<React.ComponentProps<typeof RunBar>> = {}
) {
  const onCancel = vi.fn();
  const onRunAgain = vi.fn();
  const onWorkflowChange = vi.fn();
  render(
    <RunBar
      agentName="Brief Writer Agent"
      workflows={[
        {
          key: "brief_writer",
          name: "Brief Writer",
          description: "Drafts the weekly brief",
          stale: false,
        },
        { key: "wf_gone", name: "wf_gone", description: null, stale: true },
      ]}
      workflowKey="brief_writer"
      onWorkflowChange={onWorkflowChange}
      runStatus={null}
      isStarting={false}
      startedAt={null}
      onCancel={onCancel}
      onRunAgain={onRunAgain}
      {...overrides}
    />
  );
  return { onCancel, onRunAgain, onWorkflowChange };
}

/** The picker's trigger, which is also the page's title. */
function trigger() {
  return screen.getByRole("button", { name: /Brief Writer$/ });
}

describe("RunBar", () => {
  it("titles the page with the active workflow, under the agent's name", () => {
    renderBar();
    expect(
      screen.getByRole("heading", { name: "Brief Writer" })
    ).toBeInTheDocument();
    expect(screen.getByText("Brief Writer Agent")).toBeInTheDocument();
    expect(trigger()).toHaveAttribute("aria-haspopup", "listbox");
  });

  it("flags a deleted workflow and blocks selecting it", async () => {
    const user = userEvent.setup();
    const { onWorkflowChange } = renderBar();

    await user.click(trigger());

    expect(
      screen.getByText("Unavailable — this workflow was deleted")
    ).toBeInTheDocument();

    await user.click(screen.getByText("wf_gone"));
    expect(onWorkflowChange).not.toHaveBeenCalled();
  });

  it("switches workflow", async () => {
    const user = userEvent.setup();
    const { onWorkflowChange } = renderBar({
      workflows: [
        {
          key: "brief_writer",
          name: "Brief Writer",
          description: null,
          stale: false,
        },
        { key: "wf_other", name: "Other", description: null, stale: false },
      ],
    });

    await user.click(trigger());
    await user.click(screen.getByText("Other"));

    expect(onWorkflowChange).toHaveBeenCalledWith("wf_other");
  });

  it("locks the picker while a run is in progress", () => {
    renderBar({ runStatus: "RUNNING" });
    expect(trigger()).toHaveAttribute("aria-disabled", "true");
  });

  it("offers no lifecycle control before a run exists", () => {
    renderBar();
    expect(
      screen.queryByRole("button", { name: "Cancel run" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Run again" })
    ).not.toBeInTheDocument();
  });

  it("cancels an active run", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderBar({ runStatus: "RUNNING" });

    expect(screen.getByRole("status")).toHaveTextContent("Running");
    await user.click(screen.getByRole("button", { name: "Cancel run" }));

    expect(onCancel).toHaveBeenCalled();
  });

  it("offers Cancel while paused, since the run is still live", () => {
    renderBar({ runStatus: "PAUSED" });
    expect(
      screen.getByRole("button", { name: "Cancel run" })
    ).toBeInTheDocument();
  });

  it("offers a rerun once the run settles", async () => {
    const user = userEvent.setup();
    const { onRunAgain } = renderBar({ runStatus: "COMPLETED" });

    await user.click(screen.getByRole("button", { name: "Run again" }));

    expect(onRunAgain).toHaveBeenCalled();
  });

  it("shows a pending state between sending start and the first snapshot", () => {
    renderBar({ isStarting: true });
    expect(screen.getByRole("status")).toHaveTextContent("Starting…");
  });

  it("shows the elapsed time once the run has a start", () => {
    renderBar({ runStatus: "COMPLETED", startedAt: Date.now() - 4200 });
    expect(screen.getByLabelText("Run duration")).toBeInTheDocument();
  });
});
