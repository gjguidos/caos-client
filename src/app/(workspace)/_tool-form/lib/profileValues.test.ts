import { describe, expect, it } from "vitest";

import type { OutputProfilesConfig } from "@/app/(workspace)/_tool-form/toolForm.types";
import {
  formatProfileValue,
  getProfileDefaults,
  getProfilePreview,
  hasMeaningfulValue,
  humanizeFieldName,
  outputProfileField,
  profileValuesEqual,
  summariseProfileValues,
} from "./profileValues";

describe("getProfileDefaults", () => {
  it("reads defaults nested under `defaults`", () => {
    const config: OutputProfilesConfig = {
      profiles: {
        fast: { defaults: { max_pages: 5 }, preview: { note: "quick" } },
      },
    };

    expect(getProfileDefaults(config, "fast")).toEqual({ max_pages: 5 });
  });

  it("reads defaults sent flat on the entry", () => {
    const config: OutputProfilesConfig = {
      profiles: { fast: { max_pages: 5, output_format: "md" } },
    };

    expect(getProfileDefaults(config, "fast")).toEqual({
      max_pages: 5,
      output_format: "md",
    });
  });

  it("excludes the preview block from flat defaults", () => {
    const config: OutputProfilesConfig = {
      profiles: { fast: { max_pages: 5, preview: { note: "quick" } } },
    };

    expect(getProfileDefaults(config, "fast")).toEqual({ max_pages: 5 });
  });

  it("returns null for a missing config, key or entry", () => {
    expect(getProfileDefaults(null, "fast")).toBeNull();
    expect(getProfileDefaults({ profiles: {} }, undefined)).toBeNull();
    expect(getProfileDefaults({ profiles: {} }, "nope")).toBeNull();
    expect(getProfileDefaults({ profiles: { fast: {} } }, "fast")).toBeNull();
  });
});

describe("getProfilePreview", () => {
  it("returns the preview block when present", () => {
    const config: OutputProfilesConfig = {
      profiles: { fast: { preview: { note: "quick" } } },
    };

    expect(getProfilePreview(config, "fast")).toEqual({ note: "quick" });
  });

  it("returns null when the entry carries no preview", () => {
    expect(
      getProfilePreview({ profiles: { fast: { max_pages: 5 } } }, "fast")
    ).toBeNull();
  });
});

describe("profileValuesEqual", () => {
  it("ignores ordering and the list/CSV split", () => {
    expect(profileValuesEqual(["a", "b"], "b,a")).toBe(true);
    expect(profileValuesEqual("b, a", ["a", "b"])).toBe(true);
  });

  it("still separates genuinely different values", () => {
    expect(profileValuesEqual(["a"], ["a", "b"])).toBe(false);
    expect(profileValuesEqual(1, 2)).toBe(false);
  });
});

describe("formatProfileValue", () => {
  it("renders lists, CSV, booleans and blanks readably", () => {
    expect(formatProfileValue(["a", "b"])).toBe("a, b");
    expect(formatProfileValue("a,b")).toBe("a, b");
    expect(formatProfileValue(true)).toBe("Yes");
    expect(formatProfileValue(false)).toBe("No");
    expect(formatProfileValue("")).toBe("Not set");
    expect(formatProfileValue(null)).toBe("Not set");
    expect(formatProfileValue(3)).toBe("3");
  });
});

describe("hasMeaningfulValue", () => {
  it("treats blanks and empty lists as absent", () => {
    expect(hasMeaningfulValue(undefined)).toBe(false);
    expect(hasMeaningfulValue(null)).toBe(false);
    expect(hasMeaningfulValue("   ")).toBe(false);
    expect(hasMeaningfulValue([])).toBe(false);
  });

  it("treats false and 0 as supplied values", () => {
    expect(hasMeaningfulValue(false)).toBe(true);
    expect(hasMeaningfulValue(0)).toBe(true);
    expect(hasMeaningfulValue("x")).toBe(true);
  });
});

describe("humanizeFieldName", () => {
  it("turns a snake_case field into a label", () => {
    expect(humanizeFieldName("crawl_depth")).toBe("Crawl Depth");
  });
});

describe("outputProfileField", () => {
  it("defaults to output_profile", () => {
    expect(outputProfileField(null)).toBe("output_profile");
    expect(outputProfileField({})).toBe("output_profile");
  });

  it("honours a field the config names", () => {
    expect(outputProfileField({ field: "report_profile" })).toBe(
      "report_profile"
    );
  });
});

describe("summariseProfileValues", () => {
  it("summarises whatever keys the profile carries", () => {
    expect(
      summariseProfileValues({ max_pages: 5, output_format: "markdown" })
    ).toEqual(["max pages 5", "output format markdown"]);
  });

  it("renders a set flag as its name and drops an unset one", () => {
    expect(
      summariseProfileValues({
        include_raw_pages: true,
        include_security_audit: false,
      })
    ).toEqual(["include raw pages"]);
  });

  it("restricts and orders by preview_fields when given", () => {
    expect(
      summariseProfileValues({ max_pages: 5, max_depth: 2, noise: "x" }, [
        "max_depth",
        "max_pages",
      ])
    ).toEqual(["max depth 2", "max pages 5"]);
  });

  it("skips blanks and returns nothing for an absent source", () => {
    expect(summariseProfileValues({ a: "", b: [], c: null })).toEqual([]);
    expect(summariseProfileValues(null)).toEqual([]);
  });
});
