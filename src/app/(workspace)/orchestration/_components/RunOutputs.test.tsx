import { render, screen, within } from "@/test-utils/test-utils";
import type { WorkflowStep } from "@/shared/lib/workflow/workflow.types";
import { declaredValue, presentedOutput } from "@/test-utils/workflow-fixtures";
import { describe, expect, it } from "vitest";
import { RunOutputs } from "./RunOutputs";

const STEPS: WorkflowStep[] = [
  { id: "research", type: "tool", label: "Research" },
  { id: "write", type: "tool", label: "Write draft" },
  { id: "publish", type: "tool", label: "Publish" },
  { id: "review", type: "pause", label: "Review brief" },
  { id: "end", type: "end", label: "End" },
];

function renderOutputs(
  overrides: Partial<React.ComponentProps<typeof RunOutputs>> = {}
) {
  render(
    <RunOutputs
      steps={STEPS}
      stepOutputs={{}}
      stepErrors={{}}
      outputOrder={[]}
      {...overrides}
    />
  );
}

describe("RunOutputs", () => {
  it("orders sections by arrival, not by definition order", () => {
    renderOutputs({
      stepOutputs: { write: "The draft", research: "Sales are up" },
      outputOrder: ["write", "research"],
    });

    const entries = screen.getAllByRole("listitem");
    expect(entries[0]).toHaveAttribute("data-testid", "output-entry-write");
    expect(entries[1]).toHaveAttribute("data-testid", "output-entry-research");
  });

  it("labels a step's results by what its tool declared", () => {
    renderOutputs({
      stepOutputs: {
        write: presentedOutput({
          text: "The draft",
          declared: {
            product_description: declaredValue(
              "Product Description",
              "The draft"
            ),
          },
        }),
      },
      outputOrder: ["write"],
    });

    expect(screen.getByText("Product Description")).toBeInTheDocument();
  });

  it("omits steps that produced nothing", () => {
    renderOutputs({
      stepOutputs: { research: "Sales are up" },
      outputOrder: ["research"],
    });

    expect(screen.getByTestId("output-entry-research")).toBeInTheDocument();
    expect(screen.queryByTestId("output-entry-write")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("output-entry-publish")
    ).not.toBeInTheDocument();
  });

  it("lists tool steps only, whatever state the others carry", () => {
    renderOutputs({
      stepOutputs: { review: "approved", research: "Sales are up" },
      stepErrors: { end: "run halted" },
      outputOrder: ["review", "research", "end"],
    });

    expect(screen.getByTestId("output-entry-research")).toBeInTheDocument();
    expect(screen.queryByTestId("output-entry-review")).not.toBeInTheDocument();
    expect(screen.queryByTestId("output-entry-end")).not.toBeInTheDocument();
  });

  it("gives a step that failed without an output its own section", () => {
    renderOutputs({
      stepErrors: { publish: "upstream rejected the draft" },
      outputOrder: ["publish"],
    });

    expect(screen.getByTestId("output-entry-publish")).toBeInTheDocument();
    expect(screen.getByText("Publish")).toBeInTheDocument();
    expect(screen.getByText("upstream rejected the draft")).toBeInTheDocument();
  });

  it("offers a copy only for a step that has an output", () => {
    renderOutputs({
      stepOutputs: { research: "Sales are up" },
      stepErrors: { publish: "upstream rejected the draft" },
      outputOrder: ["research", "publish"],
    });

    expect(
      within(screen.getByTestId("output-entry-research")).getByRole("button", {
        name: "Copy Research",
      })
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("output-entry-publish")).queryByRole("button", {
        name: "Copy Publish",
      })
    ).not.toBeInTheDocument();
  });

  it("hangs the copy off each declared value rather than the step", () => {
    renderOutputs({
      stepOutputs: {
        write: presentedOutput({
          text: "The draft",
          declared: {
            product_description: declaredValue(
              "Product Description",
              "The draft"
            ),
          },
        }),
      },
      outputOrder: ["write"],
    });

    expect(
      screen.getByRole("button", { name: "Copy Product Description" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Copy Write draft" })
    ).not.toBeInTheDocument();
  });

  it("carries neither a run-wide download nor a way into a step", () => {
    renderOutputs({
      stepOutputs: { research: "Sales are up" },
      outputOrder: ["research"],
    });

    expect(
      screen.queryByRole("button", { name: "Download all" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open" })
    ).not.toBeInTheDocument();
  });

  it("invites the run to finish when nothing has been produced", () => {
    renderOutputs();
    expect(
      screen.getByText(
        "No outputs yet. Completed steps show their results here."
      )
    ).toBeInTheDocument();
  });
});
