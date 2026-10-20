import { describe, expect, it } from "vitest";
import { extractWorkflowInputs } from "./parseWorkflowDefinition";
import {
  createRunInputLookup,
  isFileInput,
  runInputLabel,
} from "./runInputDisplay";

// Built through the real converter so what the lookup is handed can't drift
// from the shape the run form gets at runtime.
const INPUTS = extractWorkflowInputs({
  key: "brief_writer",
  inputs: [
    { key: "subject_line", label: "Subject line", input: "text" },
    { key: "crop_size", input: "text" },
    { key: "photo", label: "Photo", input: "file" },
  ],
});

const lookup = createRunInputLookup(INPUTS);

describe("runInputLabel", () => {
  it("uses the label the run form gives the input", () => {
    expect(runInputLabel("subject_line", lookup("subject_line"))).toBe(
      "Subject line"
    );
  });

  it("reads the key out as words when the input declares no label", () => {
    // `getComponentLabel` falls back to the raw id, which is no better a name
    // than having found no declaration at all - so both land in the same place.
    expect(runInputLabel("crop_size", lookup("crop_size"))).toBe("Crop size");
  });

  it("reads the key out as words when nothing declares it", () => {
    expect(runInputLabel("crop_size", lookup("nope"))).toBe("Crop size");
  });
});

describe("isFileInput", () => {
  it("is true only for an input declared as a file", () => {
    expect(isFileInput(lookup("photo"))).toBe(true);
    expect(isFileInput(lookup("subject_line"))).toBe(false);
    expect(isFileInput(lookup("nope"))).toBe(false);
  });
});
