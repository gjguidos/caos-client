import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StepNodeHeader } from "./StepNodeHeader";

describe("StepNodeHeader", () => {
  it("names the step", () => {
    render(<StepNodeHeader stepType="tool" label="Write draft" />);
    expect(screen.getByText("Write draft")).toBeInTheDocument();
  });

  it("says the step's kind for a reader who cannot see the icon", () => {
    // The kind is carried by an icon alone, so without this the only thing
    // distinguishing a tool step from a control step is invisible to a screen
    // reader. It cannot ride on the icon's own `aria-label`: `SSRIcon` writes
    // `aria-hidden` unconditionally, which would suppress it.
    render(<StepNodeHeader stepType="wait_event" label="Await approval" />);
    expect(screen.getByText("Wait event")).toBeInTheDocument();
  });

  it("distinguishes a tool step from a control step", () => {
    const { unmount } = render(
      <StepNodeHeader stepType="tool" label="Write draft" />
    );
    expect(screen.getByText("Tool")).toBeInTheDocument();
    unmount();

    render(<StepNodeHeader stepType="pause" label="Check in" />);
    expect(screen.getByText("Pause")).toBeInTheDocument();
  });
});
