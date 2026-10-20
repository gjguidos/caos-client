import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FetchResult } from "@/shared/lib/server-actions";

// Mock the fetch layer so we test the create/update result-mapping (envelope
// unwrap + structured error branching) without the server-only auth helpers.
const fetchDataResult = vi.fn();
vi.mock("@/shared/lib/server-actions", () => ({
  default: vi.fn(),
  fetchDataResult: (...args: unknown[]) => fetchDataResult(...args),
}));

import { createWorkflow, updateWorkflow } from "./fetch_workflows";
import type { WorkflowDefinition } from "@/shared/lib/workflow/workflow.types";

const definition: WorkflowDefinition = { execution_mode: "dag", steps: [] };
const body = { name: "My Flow", definition };

function ok(document: unknown): FetchResult {
  return { ok: true, status: 201, body: { data: document } };
}
function fail(status: number, body: unknown): FetchResult {
  return { ok: false, status, body };
}

describe("createWorkflow", () => {
  beforeEach(() => fetchDataResult.mockReset());

  it("returns the created document on success", async () => {
    const doc = { key: "my_flow", name: "My Flow" };
    fetchDataResult.mockResolvedValue(ok(doc));

    const result = await createWorkflow(body);

    expect(result).toEqual({ ok: true, document: doc });
    expect(fetchDataResult).toHaveBeenCalledWith(
      expect.objectContaining({ method: "POST", data: body })
    );
  });

  it("maps a 422 into structured per-step issues", async () => {
    fetchDataResult.mockResolvedValue(
      fail(422, {
        error_code: "WORKFLOW_VALIDATION_ERROR",
        message: "Validation failed",
        data: {
          errors: [
            { code: "DAG_INVALID", message: "cycle", step_id: "a" },
            { code: "TOOL_UNKNOWN", message: "no tool", tool_key: "ghost" },
          ],
        },
      })
    );

    const result = await createWorkflow(body);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("WORKFLOW_VALIDATION_ERROR");
    expect(result.message).toBe("Validation failed");
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0]).toMatchObject({
      code: "DAG_INVALID",
      step_id: "a",
    });
  });

  it("maps a 409 DUPLICATE_KEY with no issues", async () => {
    fetchDataResult.mockResolvedValue(
      fail(409, { error_code: "DUPLICATE_KEY", message: "exists" })
    );

    const result = await createWorkflow(body);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("DUPLICATE_KEY");
    expect(result.issues).toEqual([]);
  });
});

describe("updateWorkflow", () => {
  beforeEach(() => fetchDataResult.mockReset());

  it("PATCHes the keyed endpoint and returns the document", async () => {
    const doc = { key: "my_flow", name: "Renamed" };
    fetchDataResult.mockResolvedValue({
      ok: true,
      status: 200,
      body: { data: doc },
    });

    const result = await updateWorkflow("my_flow", { name: "Renamed" });

    expect(result).toEqual({ ok: true, document: doc });
    expect(fetchDataResult).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "PATCH",
        path: expect.stringContaining("/v1/workflows/key/my_flow"),
      })
    );
  });

  it("surfaces in-use agent ids on a 409", async () => {
    fetchDataResult.mockResolvedValue(
      fail(409, {
        error_code: "WORKFLOW_IN_USE",
        message: "in use",
        data: { agent_ids: ["agent-1", "agent-2"] },
      })
    );

    const result = await updateWorkflow("my_flow", { name: "x" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.inUseAgentIds).toEqual(["agent-1", "agent-2"]);
  });
});
