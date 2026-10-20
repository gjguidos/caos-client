import { describe, expect, it } from "vitest";
import reducer, {
  setAgentTypes,
  type AgentTypeProfile,
} from "./agentTypeSlice";

const agentType = (name: string): AgentTypeProfile => ({
  key: name,
  name,
  description: `${name} description`,
});

describe("agentTypeSlice", () => {
  it("stores the agent types passed to setAgentTypes", () => {
    const types = [agentType("ChatAgent"), agentType("ResearchAgent")];
    const state = reducer(undefined, setAgentTypes(types));
    expect(state.list).toEqual(types);
  });

  it("falls back to an empty list when given undefined", () => {
    const seeded = reducer(undefined, setAgentTypes([agentType("ChatAgent")]));
    const cleared = reducer(seeded, setAgentTypes(undefined));
    expect(cleared.list).toEqual([]);
  });
});
