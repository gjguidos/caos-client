import { describe, expect, it } from "vitest";
import {
  canConnect,
  isDuplicateEdge,
  isSelfLoop,
  wouldCreateCycle,
  type GraphEdgeLike,
} from "./graphGuardrails";

describe("isSelfLoop", () => {
  it("flags a node connecting to itself", () => {
    expect(isSelfLoop({ source: "a", target: "a" })).toBe(true);
  });
  it("allows distinct endpoints", () => {
    expect(isSelfLoop({ source: "a", target: "b" })).toBe(false);
  });
});

describe("isDuplicateEdge", () => {
  const edges: GraphEdgeLike[] = [{ source: "a", target: "b" }];
  it("detects an existing edge", () => {
    expect(isDuplicateEdge(edges, { source: "a", target: "b" })).toBe(true);
  });
  it("treats the reverse direction as distinct", () => {
    expect(isDuplicateEdge(edges, { source: "b", target: "a" })).toBe(false);
  });
});

describe("wouldCreateCycle", () => {
  it("blocks a direct back-edge (A→B then B→A)", () => {
    const edges: GraphEdgeLike[] = [{ source: "a", target: "b" }];
    expect(wouldCreateCycle(edges, { source: "b", target: "a" })).toBe(true);
  });

  it("blocks a transitive cycle (A→B→C then C→A)", () => {
    const edges: GraphEdgeLike[] = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ];
    expect(wouldCreateCycle(edges, { source: "c", target: "a" })).toBe(true);
  });

  it("allows a non-cyclic edge in a DAG", () => {
    const edges: GraphEdgeLike[] = [
      { source: "a", target: "b" },
      { source: "a", target: "c" },
    ];
    expect(wouldCreateCycle(edges, { source: "b", target: "c" })).toBe(false);
  });
});

describe("canConnect", () => {
  const edges: GraphEdgeLike[] = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
  ];

  it("accepts a valid new edge", () => {
    expect(canConnect(edges, { source: "a", target: "c" })).toBe(true);
  });
  it("rejects an incomplete connection", () => {
    expect(canConnect(edges, { source: "a", target: null })).toBe(false);
  });
  it("rejects a self-loop", () => {
    expect(canConnect(edges, { source: "a", target: "a" })).toBe(false);
  });
  it("rejects a duplicate", () => {
    expect(canConnect(edges, { source: "a", target: "b" })).toBe(false);
  });
  it("rejects a cycle", () => {
    expect(canConnect(edges, { source: "c", target: "a" })).toBe(false);
  });
});
