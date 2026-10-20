import { describe, expect, it } from "vitest";
import { collectDescendants, type DependencyEdge } from "./collectDescendants";

/** Edge `A → B` means "B depends_on A"; descendants follow edges forward. */
const edge = (source: string, target: string): DependencyEdge => ({
  source,
  target,
});

describe("collectDescendants", () => {
  it("returns an empty set for a node with no successors", () => {
    expect(collectDescendants("a", [edge("a", "b")])).toEqual(new Set(["b"]));
    expect(collectDescendants("b", [edge("a", "b")])).toEqual(new Set());
  });

  it("follows a chain transitively", () => {
    const edges = [edge("a", "b"), edge("b", "c"), edge("c", "d")];
    expect(collectDescendants("a", edges)).toEqual(new Set(["b", "c", "d"]));
    expect(collectDescendants("b", edges)).toEqual(new Set(["c", "d"]));
  });

  it("collects fan-out across multiple branches", () => {
    const edges = [
      edge("a", "b"),
      edge("a", "c"),
      edge("b", "d"),
      edge("c", "d"),
    ];
    expect(collectDescendants("a", edges)).toEqual(new Set(["b", "c", "d"]));
  });

  it("ignores disconnected nodes", () => {
    const edges = [edge("a", "b"), edge("x", "y")];
    expect(collectDescendants("a", edges)).toEqual(new Set(["b"]));
  });

  it("excludes the node itself unless a cycle leads back", () => {
    expect(collectDescendants("a", [edge("a", "b")]).has("a")).toBe(false);
  });

  it("terminates on a cycle and includes the looped nodes", () => {
    const edges = [edge("a", "b"), edge("b", "c"), edge("c", "a")];
    expect(collectDescendants("a", edges)).toEqual(new Set(["a", "b", "c"]));
  });
});
