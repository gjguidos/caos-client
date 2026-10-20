import { describe, expect, it } from "vitest";
import reducer, {
  setTools,
  type ToolDefinition,
  type ToolOutput,
} from "./toolsSlice";

const tool = (outputs: ToolOutput[]): ToolDefinition => ({
  key: "search",
  name: "search",
  description: "",
  version: "1.0.0",
  outputs,
});

describe("toolsSlice", () => {
  it("round-trips an object-typed output into tool.outputs", () => {
    const outputs: ToolOutput[] = [
      { key: "answer", label: "Answer", type: "string", path: "result.answer" },
      { key: "data", label: "Data", type: "object", path: "result.data" },
    ];
    const state = reducer(undefined, setTools([tool(outputs)]));
    expect(state.list[0].outputs).toEqual(outputs);
    expect(state.list[0].outputs?.[1].type).toBe("object");
  });

  it("surfaces outputs declared under metadata", () => {
    const outputs: ToolOutput[] = [
      { key: "data", label: "Data", type: "object", path: "result.data" },
    ];
    const state = reducer(
      undefined,
      setTools([
        {
          key: "t",
          name: "t",
          description: "",
          version: "1",
          metadata: { outputs },
        },
      ])
    );
    expect(state.list[0].outputs).toEqual(outputs);
  });
});
