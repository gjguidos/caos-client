import { render, screen, userEvent } from "@/test-utils/test-utils";
import { describe, expect, it, vi } from "vitest";
import { WorkflowPicker } from "./WorkflowPicker";

const brief = {
  key: "brief_writer",
  name: "Brief Writer",
  description: "Drafts the weekly brief",
  stale: false,
};
const audit = {
  key: "supplier_audit",
  name: "Supplier Audit",
  description: null,
  stale: false,
};

function renderPicker(
  overrides: Partial<React.ComponentProps<typeof WorkflowPicker>> = {}
) {
  const onWorkflowChange = vi.fn();
  render(
    <WorkflowPicker
      agentName="Brief Writer Agent"
      workflows={[brief, audit]}
      workflowKey="brief_writer"
      onWorkflowChange={onWorkflowChange}
      locked={false}
      {...overrides}
    />
  );
  return { onWorkflowChange };
}

function trigger() {
  return screen.getByRole("button", { name: /Brief Writer$/ });
}

describe("WorkflowPicker", () => {
  it("offers no affordance when there is nothing to switch to", () => {
    renderPicker({ workflows: [brief] });

    expect(
      screen.getByRole("heading", { name: "Brief Writer" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("titles the page when the agent has no workflow attached", () => {
    renderPicker({ workflows: [], workflowKey: null });
    expect(
      screen.getByRole("heading", { name: "No workflow" })
    ).toBeInTheDocument();
  });

  it("describes each workflow, falling back to its key", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(trigger());

    expect(screen.getByText("Drafts the weekly brief")).toBeInTheDocument();
    expect(screen.getByText("supplier_audit")).toBeInTheDocument();
  });

  it("closes on Escape and hands focus back to the trigger", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveFocus();
  });

  it("closes on a click outside", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(trigger());
    await user.click(document.body);

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("does not open while a run holds the picker", async () => {
    const user = userEvent.setup();
    renderPicker({ locked: true });

    await user.click(trigger());

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });
});
