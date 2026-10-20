import { describe, expect, it } from "vitest";
import { isMimeAccepted, mimeMatches, mimesOverlap } from "./mime";

describe("mimeMatches", () => {
  it("matches identical mimes", () => {
    expect(mimeMatches("image/png", "image/png")).toBe(true);
  });

  it("honors a type/* wildcard on either side", () => {
    expect(mimeMatches("image/*", "image/png")).toBe(true);
    expect(mimeMatches("image/png", "image/*")).toBe(true);
  });

  it("rejects a different major type", () => {
    expect(mimeMatches("image/*", "application/pdf")).toBe(false);
    expect(mimeMatches("image/png", "image/jpeg")).toBe(false);
  });
});

describe("mimesOverlap", () => {
  it("treats an absent or empty side as accepting anything", () => {
    expect(mimesOverlap(undefined, ["image/png"])).toBe(true);
    expect(mimesOverlap(["image/png"], undefined)).toBe(true);
    expect(mimesOverlap([], ["image/png"])).toBe(true);
    expect(mimesOverlap(null, null)).toBe(true);
  });

  it("detects an exact shared mime", () => {
    expect(mimesOverlap(["image/png", "image/jpeg"], ["image/jpeg"])).toBe(
      true
    );
  });

  it("returns false for disjoint sets", () => {
    expect(mimesOverlap(["image/png"], ["application/pdf"])).toBe(false);
  });

  it("honors type/* wildcards on either side", () => {
    expect(mimesOverlap(["image/*"], ["image/png"])).toBe(true);
    expect(mimesOverlap(["image/png"], ["image/*"])).toBe(true);
    expect(mimesOverlap(["image/*"], ["application/pdf"])).toBe(false);
  });
});

describe("isMimeAccepted", () => {
  it("accepts anything when the list is absent or empty", () => {
    expect(isMimeAccepted("application/pdf", undefined)).toBe(true);
    expect(isMimeAccepted("application/pdf", [])).toBe(true);
  });

  it("accepts an exact or wildcard match, rejects the rest", () => {
    expect(isMimeAccepted("image/png", ["image/png"])).toBe(true);
    expect(isMimeAccepted("image/png", ["image/*"])).toBe(true);
    expect(isMimeAccepted("application/pdf", ["image/*"])).toBe(false);
  });
});
