import { describe, expect, it, vi } from "vitest";
import { logger } from "@/shared/lib/logger";
import { findByKey, labelForKey, withValidKeys } from "./registryEntry";

const entries = [
  { key: "writer_tool", name: "Writer Tool" },
  { key: "rag", name: "RAG Tool" },
];

describe("findByKey", () => {
  it("finds an entry by key", () => {
    expect(findByKey(entries, "rag")?.name).toBe("RAG Tool");
  });

  it("returns null for an unknown key or no key", () => {
    expect(findByKey(entries, "nope")).toBeNull();
    expect(findByKey(entries, undefined)).toBeNull();
    expect(findByKey(entries, "")).toBeNull();
  });

  it("does not match on name", () => {
    expect(findByKey(entries, "Writer Tool")).toBeNull();
  });
});

describe("labelForKey", () => {
  it("renders the display name for a key", () => {
    expect(labelForKey(entries, "writer_tool")).toBe("Writer Tool");
  });

  it("falls back to the key when the entry is missing", () => {
    expect(labelForKey(entries, "green_claim_analyzer")).toBe(
      "green_claim_analyzer"
    );
  });

  it("renders empty for no key", () => {
    expect(labelForKey(entries, undefined)).toBe("");
    expect(labelForKey(entries, "")).toBe("");
  });
});

describe("withValidKeys", () => {
  it("keeps entries that have a key", () => {
    expect(withValidKeys(entries, "tool")).toEqual(entries);
  });

  it("drops entries the backend sent without a usable key", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const incoming: Array<{ key?: string; name: string }> = [
      ...entries,
      { name: "Broken" },
      { key: "", name: "Also" },
    ];

    expect(withValidKeys(incoming, "tool")).toEqual(entries);
    expect(warn).toHaveBeenCalledOnce();

    warn.mockRestore();
  });
});
