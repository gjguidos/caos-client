import { agentFormDefaults } from "@/app/agents/_components/CreateAgentForm/agentForm";
import { Form } from "@/app/agents/_components/Form/Form";
import { listWorkflows } from "@/shared/api/fetch_workflows";
import { AgentFormValues } from "@/shared/lib/agent.types";
import { render, screen, waitFor } from "@/test-utils/test-utils";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import WorkflowsSection from "./WorkflowsSection";

vi.mock("@/shared/api/fetch_workflows", () => ({
  listWorkflows: vi.fn(),
}));

const mockListWorkflows = listWorkflows as Mock;

const catalog = [
  { key: "wf_a", name: "Workflow A", description: "First" },
  { key: "wf_b", name: "Workflow B", description: null },
];

let submitted: AgentFormValues | null = null;

function Harness({ defaults }: { defaults?: Partial<AgentFormValues> }) {
  const form = useForm<AgentFormValues>({
    defaultValues: { ...agentFormDefaults, ...defaults },
  });
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          submitted = values;
        })}
      >
        <WorkflowsSection form={form} />
        <button type="submit">Save</button>
      </form>
    </Form>
  );
}

describe("WorkflowsSection", () => {
  beforeEach(() => {
    submitted = null;
    mockListWorkflows.mockReset();
    mockListWorkflows.mockResolvedValue(catalog);
  });

  it("lists the catalog and writes selections back through the form field", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await screen.findByText("Workflow A");
    await user.click(screen.getByRole("checkbox", { name: /Workflow A/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(submitted?.workflows).toEqual(["wf_a"]));
  });

  // The list shows the label only; the key is an identifier the user never
  // types, and the description lives behind the info button.
  it("shows the label, not the key", async () => {
    render(<Harness />);

    await screen.findByText("Workflow A");
    expect(screen.queryByText("wf_a")).not.toBeInTheDocument();
    // Workflow B has no description, so it gets no info button.
    expect(
      screen.queryByRole("button", { name: "Workflow B info" })
    ).not.toBeInTheDocument();
  });

  it("reveals the description when the info button is focused", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await screen.findByText("Workflow A");
    expect(screen.queryByText("First")).not.toBeInTheDocument();

    await user.hover(screen.getByRole("button", { name: "Workflow A info" }));

    expect(await screen.findByRole("tooltip")).toHaveTextContent("First");
  });

  it("marks an attached key the loaded catalog does not hold as stale", async () => {
    render(<Harness defaults={{ workflows: ["wf_a", "wf_gone"] }} />);

    expect(await screen.findByText("wf_gone")).toBeInTheDocument();
    expect(screen.getByText("not in catalog")).toBeInTheDocument();
  });

  // A failed catalog fetch must not look like "every attached workflow was
  // deleted" — that would invite the user to detach live workflows.
  it("does not flag anything stale when the catalog fails to load", async () => {
    mockListWorkflows.mockRejectedValue(new Error("boom"));
    render(<Harness defaults={{ workflows: ["wf_a", "wf_b"] }} />);

    expect(
      await screen.findByText(/Could not load the workflow catalog/)
    ).toBeInTheDocument();
    expect(screen.queryByText("not in catalog")).not.toBeInTheDocument();
  });

  it("warns when workflows are attached without the workflow tool", async () => {
    render(<Harness defaults={{ workflows: ["wf_a"] }} />);

    expect(
      await screen.findByText(/can't be launched without the workflow tool/)
    ).toBeInTheDocument();
  });

  it("does not warn once the workflow tool is equipped", async () => {
    render(
      <Harness
        defaults={{
          workflows: ["wf_a"],
          tools: [{ key: "workflow", config: {} }],
        }}
      />
    );

    await screen.findByText("Workflow A");
    expect(
      screen.queryByText(/can't be launched without the workflow tool/)
    ).not.toBeInTheDocument();
  });
});
