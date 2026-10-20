import { describe, expect, it } from "vitest";
import {
  classifyFrame,
  createReducer,
  initialCreateState,
  parseCreateResult,
  type CreateState,
} from "./agentCreationMachine";

const creating: CreateState = {
  ...initialCreateState,
  phase: "creating",
  creatingName: "Bob",
};

describe("parseCreateResult", () => {
  it("returns null for non-terminal frames", () => {
    expect(parseCreateResult({ type: "log", message: "hi" })).toBeNull();
    expect(
      parseCreateResult({ type: "event", event: "something.else" })
    ).toBeNull();
  });

  it("marks OK events with an agent id as success", () => {
    const result = parseCreateResult({
      type: "event",
      event: "joshu-a.create",
      response: {
        status: "OK",
        agent: { agent_id: "a1", agent_system_name: "bob_sys" },
        response: "done",
      },
    });
    expect(result).toEqual({
      ok: true,
      message: "done",
      agent: { agent_id: "a1", agent_system_name: "bob_sys" },
    });
  });

  it("marks ERROR events as failure with a fallback message", () => {
    const result = parseCreateResult({
      type: "event",
      event: "joshu-a.create",
      response: { status: "ERROR", agent: null },
    });
    expect(result?.ok).toBe(false);
    expect(result?.message).toBe("Agent creation failed.");
  });
});

describe("classifyFrame", () => {
  it("surfaces non-JSON frames as a raw log line", () => {
    expect(classifyFrame("boom")).toEqual({
      kind: "log",
      entry: { message: "boom" },
    });
  });

  it("maps type:log frames to log entries with level and stage", () => {
    expect(
      classifyFrame(
        JSON.stringify({
          type: "log",
          level: "success",
          stage: "validate",
          message: "ok",
          ts: "t",
        })
      )
    ).toEqual({
      kind: "log",
      entry: { level: "success", stage: "validate", message: "ok", ts: "t" },
    });
  });

  it("treats type:error frames as non-terminal error log lines", () => {
    expect(
      classifyFrame(JSON.stringify({ type: "error", response: "nope" }))
    ).toEqual({
      kind: "log",
      entry: { level: "error", stage: null, message: "nope" },
    });
  });

  it("ignores the trailing chat no-op marker", () => {
    expect(
      classifyFrame(JSON.stringify({ type: "chat", event: "joshu-a.create" }))
    ).toEqual({ kind: "ignore" });
  });

  it("resolves terminal joshu-a.create events", () => {
    const action = classifyFrame(
      JSON.stringify({
        type: "event",
        event: "joshu-a.create",
        response: {
          status: "OK",
          agent: { agent_id: "a1", agent_system_name: "bob_sys" },
          response: "done",
        },
      })
    );
    expect(action.kind).toBe("resolve");
  });
});

describe("createReducer", () => {
  it("begin resets logs and enters the creating phase", () => {
    const seeded: CreateState = {
      ...initialCreateState,
      logs: [{ message: "old" }],
      phase: "error",
    };
    expect(createReducer(seeded, { type: "begin", name: "Bob" })).toEqual({
      phase: "creating",
      logs: [],
      agentDetail: null,
      creatingName: "Bob",
      message: "",
    });
  });

  it("appends log frames", () => {
    const next = createReducer(creating, {
      type: "frame",
      action: { kind: "log", entry: { message: "line" } },
    });
    expect(next.logs).toEqual([{ message: "line" }]);
  });

  it("resolves success into the success phase with agent detail", () => {
    const next = createReducer(creating, {
      type: "frame",
      action: {
        kind: "resolve",
        result: {
          ok: true,
          message: "done",
          agent: { agent_id: "a1", agent_system_name: "bob_sys" },
        },
      },
    });
    expect(next.phase).toBe("success");
    expect(next.agentDetail).toMatchObject({
      agent_id: "a1",
      agent_system_name: "bob_sys",
      status: "OK",
    });
  });

  it("ignores a terminal resolve when not creating", () => {
    const idle: CreateState = { ...initialCreateState, phase: "idle" };
    const next = createReducer(idle, {
      type: "frame",
      action: {
        kind: "resolve",
        result: { ok: true, message: "done", agent: { agent_id: "a1" } },
      },
    });
    expect(next).toBe(idle);
  });

  it("reset returns to the idle phase", () => {
    expect(createReducer(creating, { type: "reset" }).phase).toBe("idle");
  });
});
