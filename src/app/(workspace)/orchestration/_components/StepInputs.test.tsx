import type { WorkflowStep } from "@/shared/lib/workflow/workflow.types";
import { render, screen, userEvent } from "@/test-utils/test-utils";
import {
  declaredImage,
  declaredValue,
  presentedImage,
  presentedOutput,
} from "@/test-utils/workflow-fixtures";
import { describe, expect, it, vi } from "vitest";
import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";
import type { UploadedFile } from "@/store/slices/uploadedFiles/uploadedFilesSlice";
import { extractWorkflowInputs } from "../_lib/parseWorkflowDefinition";
import type { ResolutionContext } from "../_lib/resolveStepInputs";
import { createRunInputLookup } from "../_lib/runInputDisplay";
import { StepInputs } from "./StepInputs";

// Built through the real converter so the declarations the panel reads labels
// and types off can't drift from the shape the run form is handed at runtime.
const INPUTS: UIComponent[] = extractWorkflowInputs({
  key: "brief_writer",
  inputs: [
    { key: "subject_line", label: "Subject line", input: "text" },
    { key: "photo", label: "Photo", input: "file" },
  ],
});

function renderInputs(
  step: WorkflowStep,
  context: Partial<ResolutionContext> = {},
  uploadedFiles: UploadedFile[] = []
) {
  const onSelectStep = vi.fn();
  render(
    <StepInputs
      step={step}
      context={{ inputs: {}, stepOutputs: {}, ...context }}
      getStepLabel={(id) => (id === "research" ? "Research" : undefined)}
      getRunInput={createRunInputLookup(INPUTS)}
      onSelectStep={onSelectStep}
    />,
    {
      preloadedState: {
        uploadedFiles: {
          byId: Object.fromEntries(
            uploadedFiles.map((file) => [file.fileId, file])
          ),
        },
      },
    }
  );
  return { onSelectStep };
}

const BRIEF: WorkflowStep = {
  id: "write",
  type: "tool",
  command: "@writer --brief=${outputs.research.answer}",
};

describe("StepInputs", () => {
  it("shows the value an upstream declared output produced", () => {
    renderInputs(BRIEF, {
      stepOutputs: {
        research: presentedOutput({
          declared: { answer: declaredValue("Answer", "Sales are up") },
        }),
      },
    });

    expect(screen.getByText("Sales are up")).toBeInTheDocument();
  });

  it("heads the row with the parameter and names the upstream output on the origin", () => {
    renderInputs(BRIEF, {
      stepOutputs: {
        research: presentedOutput({
          declared: { answer: declaredValue("Answer", "Sales are up") },
        }),
      },
    });

    expect(screen.getByText("Brief")).toBeInTheDocument();
    // The origin line is one sentence split across a label and a control, so it
    // is matched on the line's own text rather than on a single node's.
    expect(
      screen.getByText(
        (_, element) => element?.textContent === "from Research · Answer"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Research" })
    ).toBeInTheDocument();
  });

  it("orders rows by origin: run inputs, then upstream steps, then literals", () => {
    renderInputs(
      {
        id: "write",
        type: "tool",
        command:
          "@writer --tone=formal --brief=${outputs.research.answer} --topic=${inputs.subject_line}",
      },
      { inputs: { subject_line: "Q3 results" } }
    );

    const names = screen
      .getAllByRole("listitem")
      .map((item) => item.firstElementChild?.textContent);

    expect(names).toEqual(["Topic", "Brief", "Tone"]);
  });

  it("names a run input's origin and leaves a literal's unstated", () => {
    renderInputs(
      {
        id: "write",
        type: "tool",
        command: "@writer --tone=formal --topic=${inputs.subject_line}",
      },
      { inputs: { subject_line: "Q3 results" } }
    );

    expect(screen.getByText("from run input Subject line")).toBeInTheDocument();

    // The literal is its own origin, so its row is just the name and the value.
    const [, literalRow] = screen.getAllByRole("listitem");
    expect(literalRow.textContent).toBe("Toneformal");
  });

  it("navigates to the producing step from the chip", async () => {
    const user = userEvent.setup();
    const { onSelectStep } = renderInputs(BRIEF, {
      stepOutputs: {
        research: presentedOutput({
          declared: { answer: declaredValue("Answer", "Sales are up") },
        }),
      },
    });

    await user.click(screen.getByRole("button", { name: /Research/ }));
    expect(onSelectStep).toHaveBeenCalledWith("research");
  });

  describe("unresolved states", () => {
    it("says a producer has not run yet", () => {
      renderInputs(BRIEF);
      expect(screen.getByText("Waiting")).toBeInTheDocument();
    });

    it("says a producer failed", () => {
      renderInputs(BRIEF, {
        stepOutputs: {
          research: presentedOutput({ ok: false, error: "boom" }),
        },
      });

      expect(screen.getByText("Upstream failed")).toBeInTheDocument();
    });

    it("says a successful producer declared no such value", () => {
      renderInputs(BRIEF, {
        stepOutputs: {
          research: presentedOutput({ tool: "analyze", text: "ran" }),
        },
      });

      expect(screen.getByText("Nothing produced")).toBeInTheDocument();
    });

    it("still names the wiring while the value is unresolved", () => {
      renderInputs(BRIEF);
      expect(
        screen.getByRole("button", { name: "Research" })
      ).toBeInTheDocument();
    });

    it("keeps raw tokens out of the rows and in the command", async () => {
      const user = userEvent.setup();
      renderInputs(BRIEF);

      expect(
        screen.queryByText("${outputs.research.answer}")
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /Show command/ }));
      expect(
        screen.getByText(/\$\{outputs\.research\.answer\}/)
      ).toBeInTheDocument();
    });
  });

  describe("images", () => {
    const step: WorkflowStep = {
      id: "edit",
      type: "tool",
      command: "@draw --ref=${outputs.research.hero}",
    };

    it("renders an image-typed value as a thumbnail", () => {
      renderInputs(step, {
        stepOutputs: {
          research: presentedOutput({
            tool: "draw",
            images: [presentedImage("data:image/png;base64,hero")],
            declared: { hero: declaredImage("Hero Image", [0]) },
          }),
        },
      });

      expect(screen.getByRole("img", { name: "ref" })).toBeInTheDocument();
    });

    it("reports a declared image that produced nothing as absent", () => {
      renderInputs(step, {
        stepOutputs: {
          research: presentedOutput({
            tool: "draw",
            declared: { hero: declaredImage("Hero Image", []) },
          }),
        },
      });

      expect(screen.getByText("No image produced")).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });

  describe("file bindings", () => {
    const step: WorkflowStep = {
      id: "edit",
      type: "tool",
      file_bindings: { reference: "${outputs.research.hero}" },
    };

    it("resolves a slot to the upstream image rather than showing the token", () => {
      renderInputs(step, {
        stepOutputs: {
          research: presentedOutput({
            tool: "draw",
            images: [presentedImage()],
            declared: { hero: declaredImage("Hero Image", [0]) },
          }),
        },
      });

      expect(
        screen.getByRole("img", { name: "reference" })
      ).toBeInTheDocument();
      expect(
        screen.queryByText("${outputs.research.hero}")
      ).not.toBeInTheDocument();
    });

    it("shows an unresolved slot with its reason", () => {
      renderInputs(step);
      expect(screen.getByText("Waiting")).toBeInTheDocument();
    });
  });

  describe("uploaded files", () => {
    const FILE_ID = "f_0af6137ad4df41dea02eb3cb2d994210";
    const PHOTO: UploadedFile = {
      fileId: FILE_ID,
      name: "bathroom.png",
      mime: "image/png",
      size: 2048,
      previewUrl: "blob:mock/1",
    };

    it("shows an argument holding a file id as the file", () => {
      renderInputs(
        { id: "edit", type: "tool", command: "@draw --ref=${inputs.photo}" },
        { inputs: { photo: FILE_ID } },
        [PHOTO]
      );

      expect(
        screen.getByRole("img", { name: "bathroom.png" })
      ).toBeInTheDocument();
      expect(screen.queryByText(FILE_ID)).not.toBeInTheDocument();
    });

    it("does the same for a file slot bound to a run input", () => {
      renderInputs(
        {
          id: "edit",
          type: "tool",
          file_bindings: { reference: "${inputs.photo}" },
        },
        { inputs: { photo: FILE_ID } },
        [PHOTO]
      );

      expect(
        screen.getByRole("img", { name: "bathroom.png" })
      ).toBeInTheDocument();
    });

    it("still keeps the id off the row when nothing is known about it", () => {
      renderInputs(
        { id: "edit", type: "tool", command: "@draw --ref=${inputs.photo}" },
        { inputs: { photo: FILE_ID } }
      );

      expect(screen.getByText("Uploaded file")).toBeInTheDocument();
      expect(screen.queryByText(FILE_ID)).not.toBeInTheDocument();
    });
  });

  it("reports a step with nothing to show", () => {
    renderInputs({ id: "gate", type: "pause" });
    expect(
      screen.getByText("This step takes no arguments.")
    ).toBeInTheDocument();
  });
});
