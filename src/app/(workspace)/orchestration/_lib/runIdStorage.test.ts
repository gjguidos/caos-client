import { beforeEach, describe, expect, it } from "vitest";
import { runIdStore } from "./runIdStorage";

describe("runIdStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keys the run id by agent and workflow", () => {
    runIdStore("agent-1", "wf_a").save("run-1");
    expect(localStorage.getItem("orchestration:runId:agent-1:wf_a")).toBe(
      "run-1"
    );
    expect(runIdStore("agent-1", "wf_a").load()).toBe("run-1");
  });

  it("keeps runs of two workflows on the same agent apart", () => {
    runIdStore("agent-1", "wf_a").save("run-a");
    runIdStore("agent-1", "wf_b").save("run-b");
    expect(runIdStore("agent-1", "wf_a").load()).toBe("run-a");
    expect(runIdStore("agent-1", "wf_b").load()).toBe("run-b");
  });

  it("returns null for an agent/workflow pair with no stored run", () => {
    runIdStore("agent-1", "wf_a").save("run-a");
    expect(runIdStore("agent-1", "wf_b").load()).toBeNull();
    expect(runIdStore("agent-2", "wf_a").load()).toBeNull();
  });

  it("clears only the given pair", () => {
    runIdStore("agent-1", "wf_a").save("run-a");
    runIdStore("agent-1", "wf_b").save("run-b");
    runIdStore("agent-1", "wf_a").clear();
    expect(runIdStore("agent-1", "wf_a").load()).toBeNull();
    expect(runIdStore("agent-1", "wf_b").load()).toBe("run-b");
  });

  it.each([null, undefined])(
    "is inert without a workflow key (%p)",
    (workflowKey) => {
      const store = runIdStore("agent-1", workflowKey);
      store.save("run-1");
      expect(store.load()).toBeNull();
      expect(localStorage.length).toBe(0);
    }
  );
});
