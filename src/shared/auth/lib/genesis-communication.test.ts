import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { proxyCommunication } from "./genesis-communication";
import { readSession } from "./session";
import { getApiAccessToken } from "./get-api-token";

vi.mock("./session", () => ({ readSession: vi.fn() }));
vi.mock("./get-api-token", () => ({ getApiAccessToken: vi.fn() }));

beforeEach(() => {
  vi.stubEnv(
    "GENESIS_COMMUNICATION_URL",
    "http://api/api/v2/agentverse/communication"
  );
  vi.mocked(readSession).mockResolvedValue({ userId: "owner" } as never);
  vi.mocked(getApiAccessToken).mockResolvedValue("server-only-bearer");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        ticket: "ticket",
        expires_in: 30,
        token: "must-not-leak",
      })
    )
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

function request(origin = "http://client") {
  return new Request("http://client/api/caos/v2/ticket", {
    method: "POST",
    headers: { origin },
  });
}

it("mediates exact server token and returns only ticket fields without caching", async () => {
  const response = await proxyCommunication(request(), "ticket");
  expect(response.status).toBe(201);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({ ticket: "ticket", expires_in: 30 });
  expect(fetch).toHaveBeenCalledWith(
    "http://api/api/v2/agentverse/communication/ticket",
    expect.objectContaining({
      headers: {
        Authorization: "Bearer server-only-bearer",
        "Content-Type": "application/json",
      },
      redirect: "error",
      cache: "no-store",
    })
  );
});

it("denies cross-origin requests before reading credentials", async () => {
  expect(
    (await proxyCommunication(request("http://evil"), "ticket")).status
  ).toBe(403);
  expect(readSession).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it("denies missing sessions and disabled backend configuration", async () => {
  vi.mocked(readSession).mockResolvedValueOnce(null);
  expect((await proxyCommunication(request(), "ticket")).status).toBe(401);
  vi.stubEnv("GENESIS_COMMUNICATION_URL", "");
  expect((await proxyCommunication(request(), "ticket")).status).toBe(503);
  expect(fetch).not.toHaveBeenCalled();
});

it("caps conversation request bytes before forwarding to the API", async () => {
  const oversized = new Request("http://client/api/caos/v2/conversations", {
    method: "POST",
    headers: { origin: "http://client" },
    body: "é".repeat(2049),
  });
  expect((await proxyCommunication(oversized, "conversations")).status).toBe(
    413
  );
  expect(fetch).not.toHaveBeenCalled();
});

it("opens an ID with authenticated no-store GET and rejects path injection", async () => {
  const req = new Request(
    "http://client/api/caos/v2/conversations/conversation"
  );
  const response = await proxyCommunication(
    req,
    "conversations",
    "conversation"
  );
  expect(response.status).toBe(200);
  expect(fetch).toHaveBeenCalledWith(
    "http://api/api/v2/agentverse/communication/conversations/conversation",
    expect.objectContaining({
      method: "GET",
      cache: "no-store",
      redirect: "error",
      body: undefined,
    })
  );
  vi.mocked(fetch).mockClear();
  expect(
    (await proxyCommunication(req, "conversations", "../ticket")).status
  ).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
it("preserves authorization denial for open without revealing upstream details", async () => {
  vi.mocked(fetch).mockResolvedValue(
    Response.json({ secret: "private" }, { status: 403 })
  );
  const response = await proxyCommunication(
    new Request("http://client/api/caos/v2/conversations/id"),
    "conversations",
    "id"
  );
  expect(response.status).toBe(403);
  expect(await response.text()).not.toContain("private");
});

it("accepts the configured localhost origin when Next binds on 0.0.0.0", async () => {
  vi.stubEnv("NEXT_SERVER_BASE_URL", "http://localhost:4000");
  const req = new Request("http://0.0.0.0:4000/api/caos/v2/ticket", {
    method: "POST",
    headers: { origin: "http://localhost:4000" },
  });
  expect((await proxyCommunication(req, "ticket")).status).toBe(201);
});

it("unwraps the actual API HTTP middleware envelope before whitelisting ticket fields", async () => {
  vi.mocked(fetch).mockResolvedValue(
    Response.json({
      success: true,
      statusCode: 201,
      data: { ticket: "single-use", expires_in: 30, token: "private" },
    })
  );
  const response = await proxyCommunication(request(), "ticket");
  expect(await response.json()).toEqual({
    ticket: "single-use",
    expires_in: 30,
  });
});
it("unwraps and minimizes conversation metadata from the running API", async () => {
  vi.mocked(fetch).mockResolvedValue(
    Response.json({
      success: true,
      data: {
        id: "conversation",
        agent_ids: ["adam"],
        member_user_ids: ["private-member"],
      },
    })
  );
  const response = await proxyCommunication(
    new Request("http://client/conversations/id"),
    "conversations",
    "id"
  );
  expect(await response.json()).toEqual({
    id: "conversation",
    agent_ids: ["adam"],
  });
});

it("proxies bounded history with server credentials and whitelists transcript fields", async () => {
  vi.mocked(fetch).mockResolvedValue(
    Response.json({
      messages: [
        {
          id: "m",
          sequence: 1,
          event_id: "e",
          participant_id: "a",
          kind: "capability_contribution",
          content: "hints",
          capability: "chat.context",
          outcome: "completed",
          secret: "must-not-leak",
        },
      ],
      next_cursor: null,
    })
  );
  const result = await proxyCommunication(
    new Request(
      "http://client/api/caos/v2/conversations/c/history?limit=10&cursor=abc_"
    ),
    "conversations",
    "c",
    true
  );
  expect(result.status).toBe(200);
  expect(result.headers.get("cache-control")).toBe("no-store");
  expect(await result.text()).not.toContain("must-not-leak");
  expect(fetch).toHaveBeenCalledWith(
    "http://api/api/v2/agentverse/communication/conversations/c/history?cursor=abc_&limit=10",
    expect.objectContaining({ method: "GET", redirect: "error" })
  );
});
it("rejects invalid history windows before fetching and preserves denial", async () => {
  for (const query of ["limit=101", "cursor=../other", "limit=0"]) {
    expect(
      (
        await proxyCommunication(
          new Request(`http://client/history?${query}`),
          "conversations",
          "c",
          true
        )
      ).status
    ).toBe(400);
  }
  expect(fetch).not.toHaveBeenCalled();
  vi.mocked(fetch).mockResolvedValue(
    Response.json({ private: true }, { status: 403 })
  );
  expect(
    (
      await proxyCommunication(
        new Request("http://client/history"),
        "conversations",
        "c",
        true
      )
    ).status
  ).toBe(403);
});
