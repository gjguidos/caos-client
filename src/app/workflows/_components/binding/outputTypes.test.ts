import { describe, expect, it } from "vitest";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import type { ToolOutput } from "@/store/slices/registry/toolsSlice";
import {
  argBindableInputs,
  argBindableSources,
  fileBindableInputs,
  imageBindableSources,
} from "./outputTypes";
import type { OutputSource } from "./types";

const output = (key: string, type: ToolOutput["type"]): ToolOutput => ({
  key,
  label: key,
  type,
  path: `result.${key}`,
});

const sources: OutputSource[] = [
  {
    stepId: "mixed",
    label: "Mixed",
    outputs: [output("answer", "string"), output("picture", "image")],
  },
  { stepId: "draw", label: "Draw", outputs: [output("picture", "image")] },
  { stepId: "bare", label: "Bare", outputs: [] },
];

describe("argBindableSources", () => {
  it("strips image outputs but keeps every source", () => {
    expect(argBindableSources(sources)).toEqual([
      {
        stepId: "mixed",
        label: "Mixed",
        outputs: [output("answer", "string")],
      },
      { stepId: "draw", label: "Draw", outputs: [] },
      { stepId: "bare", label: "Bare", outputs: [] },
    ]);
  });
});

describe("imageBindableSources", () => {
  it("keeps only image outputs and drops sources without any", () => {
    expect(imageBindableSources(sources)).toEqual([
      {
        stepId: "mixed",
        label: "Mixed",
        outputs: [output("picture", "image")],
      },
      { stepId: "draw", label: "Draw", outputs: [output("picture", "image")] },
    ]);
  });
});

const workflowInput = (
  key: string,
  kind: WorkflowInputField["input"],
  constraints?: Record<string, unknown>
): WorkflowInputField => ({ key, label: key, input: kind, constraints });

const inputs: WorkflowInputField[] = [
  workflowInput("topic", "text"),
  workflowInput("pic", "file"),
  workflowInput("count", "number"),
];

describe("fileBindableInputs", () => {
  it("keeps only file-kind inputs", () => {
    expect(fileBindableInputs(inputs).map((i) => i.key)).toEqual(["pic"]);
  });
});

describe("argBindableInputs", () => {
  it("excludes file-kind inputs", () => {
    expect(argBindableInputs(inputs).map((i) => i.key)).toEqual([
      "topic",
      "count",
    ]);
  });
});
