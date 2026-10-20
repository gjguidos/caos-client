import { describe, expect, it } from "vitest";
import {
  encodeCancel,
  encodeGet,
  encodeResume,
  encodeStart,
} from "./workflowCommand";

describe("encodeStart", () => {
  it("names the workflow and url-encodes inputs as a JSON blob", () => {
    expect(encodeStart("tap_replacer_v1", { topic: "cats", count: 3 })).toBe(
      `@workflow --op=start --workflow_key=tap_replacer_v1 --inputs=${encodeURIComponent(
        JSON.stringify({ topic: "cats", count: 3 })
      )}`
    );
  });

  it("encodes an empty inputs object", () => {
    expect(encodeStart("tap_replacer_v1", {})).toBe(
      `@workflow --op=start --workflow_key=tap_replacer_v1 --inputs=${encodeURIComponent(
        "{}"
      )}`
    );
  });
});

describe("encodeResume", () => {
  it("includes step_id and pause_id in the pause_payload when known", () => {
    const runId = "run-123";
    const workflowKey = "mini_v1";
    const action = "continue" as const;
    const data = { answer: "yes" };
    const expected = `@workflow --op=resume --run_id=${runId} --workflow_key=${workflowKey} --pause_payload=${encodeURIComponent(
      JSON.stringify({
        action,
        step_id: "review",
        pause_id: "run-123:review",
        data,
      })
    )}`;

    expect(
      encodeResume({
        runId,
        workflowKey,
        action,
        stepId: "review",
        pauseId: "run-123:review",
        data,
      })
    ).toBe(expected);
  });

  it("omits step_id/pause_id and --workflow_key when not provided; defaults data to {}", () => {
    const expected = `@workflow --op=resume --run_id=run-1 --pause_payload=${encodeURIComponent(
      JSON.stringify({ action: "cancel", data: {} })
    )}`;
    expect(encodeResume({ runId: "run-1", action: "cancel" })).toBe(expected);
  });
});

describe("encodeGet / encodeCancel", () => {
  it("encodeGet targets a run id", () => {
    expect(encodeGet("run-7")).toBe("@workflow --op=get --run_id=run-7");
  });

  it("encodeCancel targets a run id and its workflow key", () => {
    expect(encodeCancel("run-7", "wf")).toBe(
      "@workflow --op=cancel --run_id=run-7 --workflow_key=wf"
    );
  });
});
