import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowBuilderShell } from "./WorkflowBuilderShell";

// The builder mounts React Flow (no layout in jsdom) and loads data; stub it to a
// passthrough so the shell's gating/wiring can be asserted in isolation.
vi.mock("./WorkflowBuilder", () => ({
  WorkflowBuilder: (props: { mode: string; workflowId?: string }) => (
    <div data-testid="workflow-builder" data-mode={props.mode}>
      {props.workflowId ?? ""}
    </div>
  ),
}));

// React Flow's provider doesn't need stubbing, but keep it cheap and noise-free.
vi.mock("@xyflow/react", () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// useAuth is globally mocked in vitest.setup; override here so each test can
// control `canCreateAgent` (the global mock doesn't expose it).
const authState = {
  userId: "test-user-id" as string | null,
  canCreateAgent: true,
};
vi.mock("@/shared/auth/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

describe("WorkflowBuilderShell", () => {
  beforeEach(() => {
    authState.userId = "test-user-id";
    authState.canCreateAgent = true;
  });

  it("renders the builder in new mode", () => {
    render(<WorkflowBuilderShell mode="new" />);
    const builder = screen.getByTestId("workflow-builder");
    expect(builder).toHaveAttribute("data-mode", "new");
  });

  it("passes the workflow key through in edit mode", () => {
    render(<WorkflowBuilderShell mode="edit" workflowId="wf-123" />);
    const builder = screen.getByTestId("workflow-builder");
    expect(builder).toHaveAttribute("data-mode", "edit");
    expect(builder).toHaveTextContent("wf-123");
  });

  it("shows the access fallback for a non-admin user", () => {
    authState.canCreateAgent = false;
    render(<WorkflowBuilderShell mode="new" />);
    expect(
      screen.getByText("You need admin access to build workflows")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("workflow-builder")).not.toBeInTheDocument();
  });
});
