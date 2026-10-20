import { describe, expect, it } from "vitest";
import {
  resolveAttachedWorkflows,
  type WorkflowCatalog,
} from "./attachedWorkflows";

const ready: WorkflowCatalog = {
  status: "ready",
  entries: [
    { key: "wf_a", name: "Workflow A", description: "Does A" },
    { key: "wf_b", name: "Workflow B" },
  ],
};

describe("resolveAttachedWorkflows", () => {
  it("resolves names from the catalog, preserving the agent's order", () => {
    expect(resolveAttachedWorkflows(["wf_b", "wf_a"], ready)).toEqual([
      { key: "wf_b", name: "Workflow B", description: null, stale: false },
      { key: "wf_a", name: "Workflow A", description: "Does A", stale: false },
    ]);
  });

  it("keeps keys missing from a loaded catalog, marked stale and named by key", () => {
    expect(resolveAttachedWorkflows(["wf_a", "wf_gone"], ready)).toEqual([
      { key: "wf_a", name: "Workflow A", description: "Does A", stale: false },
      { key: "wf_gone", name: "wf_gone", description: null, stale: true },
    ]);
  });

  it("treats every key as stale against a loaded but empty catalog", () => {
    expect(
      resolveAttachedWorkflows(["wf_a"], { status: "ready", entries: [] })
    ).toEqual([{ key: "wf_a", name: "wf_a", description: null, stale: true }]);
  });

  it("falls back to the key when the catalog entry has no name", () => {
    expect(
      resolveAttachedWorkflows(["wf_a"], {
        status: "ready",
        entries: [{ key: "wf_a", name: null }],
      })
    ).toEqual([{ key: "wf_a", name: "wf_a", description: null, stale: false }]);
  });

  // The whole point of the union: an unknown catalog must never be read as
  // "these workflows were deleted".
  it.each([
    ["loading", { status: "loading" } as WorkflowCatalog],
    ["unavailable", { status: "unavailable" } as WorkflowCatalog],
  ])("marks nothing stale while the catalog is %s", (_label, catalog) => {
    expect(resolveAttachedWorkflows(["wf_a", "wf_gone"], catalog)).toEqual([
      { key: "wf_a", name: "wf_a", description: null, stale: false },
      { key: "wf_gone", name: "wf_gone", description: null, stale: false },
    ]);
  });

  it("returns [] for no attached keys", () => {
    expect(resolveAttachedWorkflows([], ready)).toEqual([]);
  });
});
