import { render, screen } from "@/test-utils/test-utils";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { InfoTooltipButton } from "./InfoTooltipButton";

describe("InfoTooltipButton", () => {
  it("names the button without reading out the whole explanation", () => {
    render(
      <InfoTooltipButton
        label="Visibility info"
        description="Public agents are visible to all users."
      />
    );

    expect(
      screen.getByRole("button", { name: "Visibility info" })
    ).toBeInTheDocument();
  });

  it("reveals the explanation on hover", async () => {
    render(
      <InfoTooltipButton
        label="Visibility info"
        description="Public agents are visible to all users."
      />
    );

    await userEvent.hover(screen.getByRole("button"));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Public agents are visible to all users."
    );
  });

  it("reveals the explanation on keyboard focus", async () => {
    render(
      <InfoTooltipButton
        label="Visibility info"
        description="Public agents are visible to all users."
      />
    );

    await userEvent.tab();

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Public agents are visible to all users."
    );
  });
});
