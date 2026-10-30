import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { proxyCreationReview } from "./agent-creation-review";
import { readSession } from "./session";
import { getApiAccessToken } from "./get-api-token";

vi.mock("./session", () => ({ readSession: vi.fn() }));
vi.mock("./get-api-token", () => ({ getApiAccessToken: vi.fn() }));

beforeEach(() => {
  vi.stubEnv("GENESIS_AGENTS_URL", "http://api/api/v2/agentverse/agents/");
  vi.mocked(readSession).mockResolvedValue({ userId: "owner" } as never);
  vi.mocked(getApiAccessToken).mockResolvedValue("server-only-bearer");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ success: true, data: { contract: "review" } })
      )
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

function request(body = "{}", origin = "http://client") {
  return new Request("http://client/api/caos/v2/agents/enki/creation-review", {
    method: "POST",
    headers: { origin },
    body,
  });
}

it("forwards the exact draft to the fixed upstream with the server-held bearer", async () => {
  const response = await proxyCreationReview(
    request('{"draft":1}'),
    "enki",
    "validate"
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ contract: "review" });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(fetch).toHaveBeenCalledWith(
    "http://api/api/v2/agentverse/agents/enki/creation-draft/validate",
    expect.objectContaining({
      method: "POST",
      body: '{"draft":1}',
      redirect: "error",
      headers: expect.objectContaining({
        Authorization: "Bearer server-only-bearer",
      }),
    })
  );
  await proxyCreationReview(request(), "enki", "revoke", "approval-1");
  expect(vi.mocked(fetch).mock.calls[1][0]).toBe(
    "http://api/api/v2/agentverse/agents/enki/creation-draft/approvals/approval-1/revoke"
  );
});

it("rejects cross-origin, malformed identities, anonymous and oversized requests", async () => {
  expect(
    (
      await proxyCreationReview(
        request("{}", "http://evil"),
        "enki",
        "validate"
      )
    ).status
  ).toBe(403);
  for (const [agent, operation, approval] of [
    ["../x", "validate", undefined],
    ["enki", "revoke", undefined],
    ["enki", "approvals", "approval-1"],
    ["enki", "revoke", "a/b"],
  ] as const)
    expect(
      (await proxyCreationReview(request(), agent, operation, approval)).status
    ).toBe(400);
  expect(
    (await proxyCreationReview(request("x".repeat(70000)), "enki", "validate"))
      .status
  ).toBe(413);
  vi.mocked(readSession).mockResolvedValueOnce(null as never);
  expect(
    (await proxyCreationReview(request(), "enki", "validate")).status
  ).toBe(401);
  vi.unstubAllEnvs();
  expect(
    (await proxyCreationReview(request(), "enki", "validate")).status
  ).toBe(503);
  expect(fetch).not.toHaveBeenCalled();
});

it("exposes only typed upstream error codes, never upstream text", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json(
      { detail: { code: "review.stale", retryable: false, secret: "x" } },
      { status: 409 }
    )
  );
  const stale = await proxyCreationReview(request(), "enki", "approvals");
  expect(stale.status).toBe(409);
  expect(await stale.json()).toEqual({
    error: "Review request denied or unavailable",
    code: "review.stale",
    retryable: false,
  });
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ detail: "Traceback: internal" }, { status: 500 })
  );
  const failed = await proxyCreationReview(request(), "enki", "approvals");
  expect(failed.status).toBe(503);
  expect((await failed.json()).code).toBeUndefined();
});

it("requires and forwards a valid Idempotency-Key for creation and preserves 202", async () => {
  const create = (key?: string) =>
    new Request(
      "http://client/api/caos/v2/agents/enki/creation-review/create",
      {
        method: "POST",
        headers: {
          origin: "http://client",
          ...(key ? { "idempotency-key": key } : {}),
        },
        body: "{}",
      }
    );
  for (const key of [undefined, "short", "x".repeat(16) + "!"])
    expect(
      (await proxyCreationReview(create(key), "enki", "create")).status
    ).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ state: "provisioning" }, { status: 202 })
  );
  const key = "k".repeat(24);
  const response = await proxyCreationReview(create(key), "enki", "create");
  expect(response.status).toBe(202);
  expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
    "http://api/api/v2/agentverse/agents/enki/creation-draft/create"
  );
  expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toMatchObject({
    "Idempotency-Key": key,
    Authorization: "Bearer server-only-bearer",
  });
});
