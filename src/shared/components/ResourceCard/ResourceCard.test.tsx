import { render, screen } from "@/test-utils/test-utils";
import { describe, expect, it } from "vitest";
import { ResourceCard } from "./ResourceCard";

describe("ResourceCard", () => {
  it("names the destination on an openable card", () => {
    render(
      <ResourceCard
        label="Workflow: Nightly sync"
        href="/workflows/nightly"
        openLabel="Open workflow"
      >
        <p>Body</p>
      </ResourceCard>
    );

    expect(screen.getByRole("link")).toHaveTextContent("Open workflow");
  });

  it("shows no open affordance when there is nowhere to go", () => {
    render(
      <ResourceCard label="Workflow: Built-in">
        <p>Body</p>
      </ResourceCard>
    );

    // The affordance's absence is the only signal that a built-in card is
    // read-only, so it must not fall back to the default label.
    expect(screen.queryByText("Open")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
