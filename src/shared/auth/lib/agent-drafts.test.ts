import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { proxyAgentDrafts } from "./agent-drafts";
import { readSession } from "./session";
import { getApiAccessToken } from "./get-api-token";

vi.mock("./session", () => ({ readSession: vi.fn() }));
vi.mock("./get-api-token", () => ({ getApiAccessToken: vi.fn() }));

const DRAFT = "0b5c2d4e-1f00-5a00-8000-000000000001";
const PROPOSAL = "0b5c2d4e-1f00-5a00-8000-000000000002";
const UPSTREAM = "http://api/api/v2/agentverse/agents/enki/creation-drafts";

beforeEach(() => {
  vi.stubEnv("GENESIS_AGENTS_URL", "http://api/api/v2/agentverse/agents/");
  vi.mocked(readSession).mockResolvedValue({ userId: "owner" } as never);
  vi.mocked(getApiAccessToken).mockResolvedValue("server-only-bearer");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ success: true, data: { contract: "draft" } })
      )
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

function request(
  method: string,
  query = "",
  {
    body,
    origin = "http://client",
    key,
  }: { body?: string; origin?: string; key?: string } = {}
) {
  return new Request(`http://client/api/caos/v2/agents/enki/drafts${query}`, {
    method,
    headers: { origin, ...(key ? { "Idempotency-Key": key } : {}) },
    body,
  });
}

it("maps exactly the allowlisted operations to the fixed upstream with the server bearer", async () => {
  const cases: [string, string[], string, string | undefined, string][] = [
    [
      "GET",
      [],
      "?status=open&limit=1",
      undefined,
      `${UPSTREAM}?status=open&limit=1`,
    ],
    ["POST", [], "", "draft-key-000000000001", UPSTREAM],
    ["GET", [DRAFT], "", undefined, `${UPSTREAM}/${DRAFT}`],
    ["PATCH", [DRAFT], "", undefined, `${UPSTREAM}/${DRAFT}`],
    [
      "POST",
      [DRAFT, "fork"],
      "",
      "draft-fork-000000000001",
      `${UPSTREAM}/${DRAFT}/fork`,
    ],
    [
      "POST",
      [DRAFT, "revisions", "3", "review"],
      "",
      undefined,
      `${UPSTREAM}/${DRAFT}/revisions/3/review`,
    ],
    [
      "POST",
      [DRAFT, "approval"],
      "",
      undefined,
      `${UPSTREAM}/${DRAFT}/approval`,
    ],
    ["POST", [DRAFT, "reopen"], "", undefined, `${UPSTREAM}/${DRAFT}/reopen`],
    [
      "GET",
      [DRAFT, "proposals"],
      "?state=open",
      undefined,
      `${UPSTREAM}/${DRAFT}/proposals?state=open`,
    ],
    [
      "GET",
      [DRAFT, "proposals", PROPOSAL],
      "",
      undefined,
      `${UPSTREAM}/${DRAFT}/proposals/${PROPOSAL}`,
    ],
    [
      "POST",
      [DRAFT, "proposals", PROPOSAL, "decision"],
      "",
      undefined,
      `${UPSTREAM}/${DRAFT}/proposals/${PROPOSAL}/decision`,
    ],
  ];
  for (const [method, path, query, key, upstream] of cases) {
    vi.mocked(fetch).mockClear();
    const body =
      method === "GET" || path.at(-1) === "review" ? undefined : "{}";
    const response = await proxyAgentDrafts(
      request(method, query, { body, key }),
      "enki",
      path,
      method as "GET"
    );
    expect(response.status, `${method} ${path.join("/")}`).toBe(200);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(upstream);
    expect(init).toEqual(
      expect.objectContaining({
        method,
        redirect: "error",
        headers: expect.objectContaining({
          Authorization: "Bearer server-only-bearer",
        }),
      })
    );
    if (key)
      expect((init?.headers as Record<string, string>)["Idempotency-Key"]).toBe(
        key
      );
  }
});

it("refuses unknown shapes, identities, queries, cross-origin writes and missing keys", async () => {
  const refused: [string, string[], string, Record<string, string>][] = [
    ["GET", [DRAFT, "revisions"], "", {}],
    ["POST", [DRAFT, "approvals"], "", {}],
    ["PATCH", [], "", {}],
    ["GET", ["not-a-uuid"], "", {}],
    ["POST", [DRAFT, "revisions", "0", "review"], "", {}],
    ["POST", [DRAFT, "proposals", "x", "decision"], "", {}],
    ["GET", [], "?status=everything", {}],
    ["GET", [], "?owner=intruder", {}],
    ["GET", [], "?limit=500", {}],
    ["POST", [], "", {}], // No Idempotency-Key.
    ["POST", [DRAFT, "fork"], "", { key: "short" }],
    ["PATCH", [DRAFT], "", { origin: "http://evil" }],
  ];
  for (const [method, path, query, options] of refused) {
    const response = await proxyAgentDrafts(
      request(method, query, {
        body: method === "GET" ? undefined : "{}",
        ...options,
      }),
      "enki",
      path,
      method as "GET"
    );
    expect([400, 403], `${method} ${path.join("/")}${query}`).toContain(
      response.status
    );
  }
  expect(
    (await proxyAgentDrafts(request("GET"), "../admin", [], "GET")).status
  ).toBe(400);
  vi.mocked(readSession).mockResolvedValue(null as never);
  expect(
    (await proxyAgentDrafts(request("GET"), "enki", [], "GET")).status
  ).toBe(401);
  expect(fetch).not.toHaveBeenCalled();
});

it("passes only typed conflict details across the boundary", async () => {
  vi.mocked(fetch).mockResolvedValue(
    Response.json(
      {
        detail: {
          code: "proposal.field_conflict",
          retryable: false,
          current_revision: 4,
          conflicting_fields: ["name"],
          applicable_fields: ["prompt", "<script>"],
          message: "upstream text",
        },
      },
      { status: 409 }
    )
  );
  const response = await proxyAgentDrafts(
    request("POST", "", { body: "{}" }),
    "enki",
    [DRAFT, "proposals", PROPOSAL, "decision"],
    "POST"
  );
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({
    error: "Draft request denied or unavailable",
    code: "proposal.field_conflict",
    retryable: false,
    current_revision: 4,
    conflicting_fields: ["name"],
  });
  vi.mocked(fetch).mockResolvedValue(
    Response.json({ detail: "x" }, { status: 500 })
  );
  const failed = await proxyAgentDrafts(request("GET"), "enki", [DRAFT], "GET");
  expect(failed.status).toBe(503);
});

it("preserves 201 for a created draft and refuses oversized bodies", async () => {
  vi.mocked(fetch).mockResolvedValue(
    Response.json({ contract: "draft" }, { status: 201 })
  );
  const created = await proxyAgentDrafts(
    request("POST", "", { body: "{}", key: "draft-key-000000000001" }),
    "enki",
    [],
    "POST"
  );
  expect(created.status).toBe(201);
  const large = await proxyAgentDrafts(
    request("PATCH", "", { body: "x".repeat(200 * 1024) }),
    "enki",
    [DRAFT],
    "PATCH"
  );
  expect(large.status).toBe(413);
});
