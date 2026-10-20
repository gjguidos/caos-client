import { describe, expect, it } from "vitest";
import { readAcceptedMimes } from "./workflowInputs";

describe("readAcceptedMimes", () => {
  it("reads a valid accepted_mimes constraint", () => {
    expect(readAcceptedMimes({ accepted_mimes: ["image/png"] })).toEqual([
      "image/png",
    ]);
  });

  it("keeps only the string entries", () => {
    expect(
      readAcceptedMimes({ accepted_mimes: ["image/png", 42, null] })
    ).toEqual(["image/png"]);
  });

  it("returns undefined for absent, empty, or malformed constraints", () => {
    expect(readAcceptedMimes(undefined)).toBeUndefined();
    expect(readAcceptedMimes(null)).toBeUndefined();
    expect(readAcceptedMimes({})).toBeUndefined();
    expect(readAcceptedMimes({ accepted_mimes: [] })).toBeUndefined();
    expect(readAcceptedMimes({ accepted_mimes: "image/png" })).toBeUndefined();
    expect(readAcceptedMimes({ accepted_mimes: [1, 2] })).toBeUndefined();
  });
});
