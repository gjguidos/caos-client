import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCreationReview } from "./useCreationReview";

const DIGEST = "a".repeat(64);
const T0 = Date.parse("2026-10-30T09:00:00Z");

function review(overrides: Record<string, unknown> = {}) {
  return {
    contract: "caos.agent_creation_review",
    schema_version: 1,
    source_agent_id: "enki",
    validation: { valid: true, normalized_digest: "b".repeat(64), issues: [] },
    composition: {
      compatible: true,
      issues: [],
      preview: { name: "Candidate" },
    },
    eligibility: { eligible: true, reasons: [] },
    review_digest: DIGEST,
    validated_at: "2026-10-30T09:00:00Z",
    expires_at: "2026-10-30T09:10:00Z",
    capability: { signal: "data.validation", version: "1.0.0" },
    authorizes: { creation: false, activation: false },
    ...overrides,
  };
}

const approval = {
  contract: "caos.agent_creation_review_approval",
  schema_version: 1,
  approval_id: "approval-1",
  source_agent_id: "enki",
  state: "approved",
  review_digest: DIGEST,
  approved_at: "2026-10-30T09:01:00Z",
  expires_at: "2026-10-31T09:01:00Z",
  revoked_at: null,
  audit_event_id: "event-1",
  authorizes: { creation: false, activation: false },
};

function deferred() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((done) => (resolve = done));
  return { promise, resolve };
}

const draft = (prompt: string) => ({
  contract: "caos.agent_creation_draft",
  schema_version: 1,
  resource_type: "agent",
  creation: { name: "Candidate", prompt },
});

let now = T0;
beforeEach(() => {
  now = T0;
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

function setup(initial = draft("one")) {
  return renderHook(
    ({ value }) => useCreationReview("enki", value, () => now),
    {
      initialProps: { value: initial },
    }
  );
}

it("drops superseded responses so an older review never replaces a newer one", async () => {
  const first = deferred();
  const second = deferred();
  vi.mocked(fetch)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const { result } = setup();
  act(() => void result.current.validate());
  act(() => void result.current.validate());
  second.resolve(Response.json(review({ review_digest: "c".repeat(64) })));
  await waitFor(() => expect(result.current.status).toBe("current"));
  first.resolve(Response.json(review()));
  await act(async () => {});
  expect(result.current.review?.review_digest).toBe("c".repeat(64));
  // The superseded request was aborted, not merely ignored.
  expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
});

it("marks the review stale after an edit and expired after its expiry", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.mocked(fetch).mockResolvedValue(Response.json(review()));
  const { result, rerender } = setup();
  await act(async () => void (await result.current.validate()));
  expect(result.current.status).toBe("current");
  expect(result.current.canApprove).toBe(true);
  rerender({ value: draft("two") });
  expect(result.current.status).toBe("stale");
  expect(result.current.canApprove).toBe(false);
  rerender({ value: draft("one") });
  expect(result.current.status).toBe("current");
  try {
    now = Date.parse("2026-10-30T09:10:00Z");
    await act(async () => void vi.advanceTimersByTime(10 * 60 * 1000 + 100));
  } finally {
    vi.useRealTimers();
  }
  expect(result.current.status).toBe("expired");
  expect(result.current.canApprove).toBe(false);
});

it("approves the exact reviewed draft and retries with the same idempotency key", async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(Response.json(review()))
    .mockResolvedValueOnce(
      Response.json(
        { error: "x", code: "approval.unavailable", retryable: true },
        { status: 503 }
      )
    )
    .mockResolvedValueOnce(Response.json(approval));
  const { result } = setup();
  await act(async () => void (await result.current.validate()));
  await act(async () => void (await result.current.approve()));
  expect(result.current.retryable).toBe(true);
  expect(result.current.approval).toBeUndefined();
  await act(async () => void (await result.current.approve()));
  expect(result.current.approval?.state).toBe("approved");
  expect(result.current.approvalCurrent).toBe(true);
  expect(result.current.canApprove).toBe(false);
  const bodies = vi
    .mocked(fetch)
    .mock.calls.slice(1)
    .map(([url, init]) => [url, JSON.parse(String(init?.body))]);
  expect(bodies[0][0]).toBe(
    "/api/caos/v2/agents/enki/creation-review/approvals"
  );
  expect(bodies[0][1]).toEqual({
    contract: "caos.agent_creation_review_approval",
    schema_version: 1,
    draft: draft("one"),
    review_digest: DIGEST,
    decision: "approve",
    confirmed: true,
    idempotency_key: expect.stringMatching(/^[A-Za-z0-9_-]{16,128}$/),
  });
  expect(bodies[1][1].idempotency_key).toBe(bodies[0][1].idempotency_key);
});

it("never approves an ineligible review and rejects responses that claim authority", async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(
      Response.json(
        review({
          eligibility: {
            eligible: false,
            reasons: ["requester.cannot_create"],
          },
          review_digest: null,
        })
      )
    )
    .mockResolvedValueOnce(
      Response.json(
        review({ authorizes: { creation: true, activation: false } })
      )
    );
  const { result } = setup();
  await act(async () => void (await result.current.validate()));
  expect(result.current.canApprove).toBe(false);
  await act(async () => void (await result.current.approve()));
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () => void (await result.current.validate()));
  expect(result.current.error).toBeTruthy();
  expect(result.current.review?.authorizes.creation).toBe(false);
});

function creation(state: string, overrides: Record<string, unknown> = {}) {
  return {
    contract: "caos.agent_creation",
    schema_version: 1,
    creation_id: "creation-1",
    state,
    approval_id: "approval-1",
    source_agent_id: "enki",
    operation_id: "operation-1",
    agent_id: state === "completed" ? "agent-1" : null,
    issue_codes: [],
    retryable: state === "accepted" || state === "provisioning",
    authorizes: { activation: false },
    ...overrides,
  };
}

it("creates only after an approval, with one idempotency key across retries and reconciliation", async () => {
  sessionStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json(review()))
      .mockResolvedValueOnce(Response.json(approval))
      .mockResolvedValueOnce(
        Response.json(
          { error: "x", code: "creation.unavailable", retryable: true },
          { status: 503 }
        )
      )
      .mockResolvedValueOnce(
        Response.json(creation("provisioning"), { status: 202 })
      )
      .mockResolvedValueOnce(Response.json(creation("completed")));
    const { result } = setup();
    await act(async () => void (await result.current.validate()));
    expect(result.current.canCreate).toBe(false);
    await act(async () => void (await result.current.create()));
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => void (await result.current.approve()));
    expect(result.current.canCreate).toBe(true);
    await act(async () => void (await result.current.create()));
    expect(result.current.retryable).toBe(true);
    await act(async () => void (await result.current.create()));
    expect(result.current.creationPending).toBe(true);
    // Automatic, bounded re-check reconciles the pending creation.
    await act(async () => void vi.advanceTimersByTime(1600));
    await waitFor(() =>
      expect(result.current.creation?.state).toBe("completed")
    );
    expect(result.current.canCreate).toBe(false);
    const calls = vi.mocked(fetch).mock.calls.slice(2);
    expect(calls.map(([url]) => url)).toEqual(
      Array(3).fill("/api/caos/v2/agents/enki/creation-review/create")
    );
    const keys = calls.map(
      ([, init]) => (init?.headers as Record<string, string>)["Idempotency-Key"]
    );
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
    expect(sessionStorage.getItem("caos:agent-creation:approval-1")).toBe(
      keys[0]
    );
    expect(JSON.parse(String(calls[0][1]?.body))).toEqual({
      contract: "caos.agent_creation_request",
      schema_version: 1,
      approval_id: "approval-1",
      expected_review_digest: DIGEST,
    });
  } finally {
    vi.useRealTimers();
  }
});

it("prevents duplicate submission while a creation request is in flight", async () => {
  const pendingCreate = deferred();
  vi.mocked(fetch)
    .mockResolvedValueOnce(Response.json(review()))
    .mockResolvedValueOnce(Response.json(approval))
    .mockReturnValueOnce(pendingCreate.promise);
  const { result } = setup();
  await act(async () => void (await result.current.validate()));
  await act(async () => void (await result.current.approve()));
  act(() => void result.current.create());
  expect(result.current.canCreate).toBe(false);
  act(() => void result.current.create());
  expect(fetch).toHaveBeenCalledTimes(3);
  pendingCreate.resolve(
    Response.json(creation("failed", { issue_codes: ["approval.revoked"] }))
  );
  await waitFor(() => expect(result.current.creation?.state).toBe("failed"));
  expect(result.current.canCreate).toBe(false);
});
