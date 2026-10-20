import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils/test-utils";
import { AgentMessage } from "./AgentMessage";

describe("AgentMessage", () => {
  it("names what produced the message", () => {
    render(
      <AgentMessage source="Green Claim Tool">
        <p>a report</p>
      </AgentMessage>
    );
    expect(screen.getByText("Green Claim Tool output")).toBeInTheDocument();
  });

  it("attributes a widget the same way it attributes text", () => {
    const { rerender } = render(
      <AgentMessage source="Writer Tool">
        <p>prose</p>
      </AgentMessage>
    );
    const forText = screen.getByText("Writer Tool output").className;

    rerender(
      <AgentMessage source="Writer Tool">
        <section>a widget</section>
      </AgentMessage>
    );

    expect(screen.getByText("Writer Tool output").className).toBe(forText);
  });

  it("goes unattributed while the agent is still loading", () => {
    render(
      <AgentMessage source="">
        <p>something</p>
      </AgentMessage>
    );

    expect(screen.getByText("something")).toBeInTheDocument();
    expect(screen.queryByText(/output/)).not.toBeInTheDocument();
  });
});
