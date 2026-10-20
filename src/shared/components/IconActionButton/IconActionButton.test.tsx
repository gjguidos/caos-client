
import { render, screen } from "@/test-utils/test-utils";
import { Pencil } from "lucide-react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IconActionButton } from "./IconActionButton";

const noop = () => {};

describe("IconActionButton", () => {
  it("names the button for assistive tech without rendering visible text", () => {
    render(
      <IconActionButton
        icon={Pencil}
        label="Edit agent"
        onClick={noop}
      />
    );

    const button = screen.getByRole("button", {
      name: "Edit agent",
    });

    expect(button).toHaveTextContent("");
    expect(button).toHaveAttribute(
      "aria-label",
      "Edit agent"
    );
  });

  it("reveals the label on hover", async () => {
    const user = userEvent.setup();

    render(
      <IconActionButton
        icon={Pencil}
        label="Edit agent"
        onClick={noop}
      />
    );

    await user.hover(
      screen.getByRole("button", {
        name: "Edit agent",
      })
    );

    expect(
      await screen.findByRole("tooltip")
    ).toHaveTextContent("Edit agent");
  });

  it("reveals the label on keyboard focus", async () => {
    const user = userEvent.setup();

    render(
      <IconActionButton
        icon={Pencil}
        label="Edit agent"
        onClick={noop}
      />
    );

    await user.tab();

    expect(
      screen.getByRole("button", {
        name: "Edit agent",
      })
    ).toHaveFocus();

    expect(
      await screen.findByRole("tooltip")
    ).toHaveTextContent("Edit agent");
  });

  it("calls onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <IconActionButton
        icon={Pencil}
        label="Edit agent"
        onClick={onClick}
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: "Edit agent",
      })
    );

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <IconActionButton
        icon={Pencil}
        label="Edit agent"
        onClick={onClick}
        disabled
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: "Edit agent",
      })
    );

    expect(onClick).not.toHaveBeenCalled();
  });

  it("stays focusable and keeps its tooltip while disabled", async () => {
    const user = userEvent.setup();

    render(
      <IconActionButton
        icon={Pencil}
        label="Edit agent"
        onClick={noop}
        disabled
      />
    );

    const button = screen.getByRole("button", {
      name: "Edit agent",
    });

    expect(button).toHaveAttribute(
      "aria-disabled",
      "true"
    );

    // The component deliberately does not use
    // the native disabled attribute.
    expect(button).not.toBeDisabled();

    await user.tab();

    expect(button).toHaveFocus();

    expect(
      await screen.findByRole("tooltip")
    ).toHaveTextContent("Edit agent");
  });

  it("renders a link when given an href", () => {
    render(
      <IconActionButton
        icon={Pencil}
        label="Edit agent"
        href="/agents/1/edit"
      />
    );

    expect(
      screen.getByRole("link", {
        name: "Edit agent",
      })
    ).toHaveAttribute(
      "href",
      "/agents/1/edit"
    );
  });
});
