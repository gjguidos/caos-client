import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BuilderHeader } from "./BuilderHeader";

function renderHeader(
  saveStatus: "clean" | "dirty" | "saving",
  overrides: Partial<React.ComponentProps<typeof BuilderHeader>> = {}
) {
  return render(
    <BuilderHeader
      name="My workflow"
      onNameChange={vi.fn()}
      description=""
      onDescriptionChange={vi.fn()}
      onSave={vi.fn()}
      isSaving={saveStatus === "saving"}
      saveStatus={saveStatus}
      {...overrides}
    />
  );
}

describe("BuilderHeader save-status pill", () => {
  const pill = () => within(screen.getByTestId("save-status"));

  it("shows 'All changes saved' when clean", () => {
    renderHeader("clean");
    expect(pill().getByText("All changes saved")).toBeInTheDocument();
  });

  it("shows 'Unsaved changes' when dirty", () => {
    renderHeader("dirty");
    expect(pill().getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("shows 'Saving…' while saving", () => {
    renderHeader("saving");
    expect(pill().getByText("Saving…")).toBeInTheDocument();
  });
});

describe("BuilderHeader workflow details", () => {
  // Skapa's focus lock focuses the name field ~50ms after the dialog opens.
  // Wait for that before typing, otherwise keystrokes can land while focus is
  // still in flight and get dropped.
  const openDialog = async () => {
    await userEvent.click(screen.getByTestId("edit-workflow-details"));
    await waitFor(() => expect(screen.getByLabelText(/Name/)).toHaveFocus());
  };

  it("shows the workflow name, falling back to a placeholder", () => {
    const { rerender } = renderHeader("clean");
    expect(screen.getByText("My workflow")).toBeInTheDocument();

    rerender(
      <BuilderHeader
        name=""
        onNameChange={vi.fn()}
        description=""
        onDescriptionChange={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        saveStatus="clean"
      />
    );
    expect(screen.getByText("Untitled workflow")).toBeInTheDocument();
  });

  it("opens the edit dialog seeded with the current values", async () => {
    renderHeader("clean", { description: "Does a thing" });
    await openDialog();

    expect(screen.getByLabelText(/Name/)).toHaveValue("My workflow");
    expect(screen.getByLabelText(/Description/)).toHaveValue("Does a thing");
  });

  it("lifts both fields only on save", async () => {
    const onNameChange = vi.fn();
    const onDescriptionChange = vi.fn();
    renderHeader("clean", { onNameChange, onDescriptionChange });
    await openDialog();

    await userEvent.type(screen.getByLabelText(/Name/), " v2");
    await userEvent.type(screen.getByLabelText(/Description/), "Notes");
    expect(onNameChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("workflow-details-save"));
    expect(onNameChange).toHaveBeenCalledWith("My workflow v2");
    expect(onDescriptionChange).toHaveBeenCalledWith("Notes");
  });

  it("discards edits on cancel", async () => {
    const onNameChange = vi.fn();
    renderHeader("clean", { onNameChange });
    await openDialog();

    await userEvent.type(screen.getByLabelText(/Name/), " v2");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onNameChange).not.toHaveBeenCalled();
    expect(screen.getByText("My workflow")).toBeInTheDocument();
  });
});
