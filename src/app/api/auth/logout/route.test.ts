import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/shared/auth/lib/session", () => ({
  readSession: vi.fn(async () => ({ sub: "owner" })),
  clearSessionCookie: vi.fn(),
}));
vi.mock("@/shared/auth/lib/get-api-token", () => ({
  getApiAccessToken: vi.fn(async () => "verified-session-token"),
}));
vi.mock("@/shared/auth/lib/utils", () => ({
  getBaseUrl: () => "http://localhost:4000",
}));
vi.mock("@/shared/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { clearSessionCookie } from "@/shared/auth/lib/session";
import { GET } from "./route";

const req = () => new NextRequest("http://localhost:4000/api/auth/logout");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GENESIS_LOGOUT_REQUIRED", "true");
  vi.stubEnv(
    "GENESIS_LOGOUT_URL",
    "http://api:8001/api/v2/agentverse/session/logout"
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Genesis logout acknowledgement", () => {
  it("clears the cookie only after durable backend acknowledgement", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    expect((await GET(req())).status).toBe(307);
    expect(clearSessionCookie).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer verified-session-token" },
        redirect: "error",
      })
    );
  });
  it.each([503, 403, 200])(
    "retains the cookie for an unacknowledged status %i",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(null, { status }))
      );
      expect((await GET(req())).status).toBe(503);
      expect(clearSessionCookie).not.toHaveBeenCalled();
    }
  );
  it("retains the cookie on a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      })
    );
    expect((await GET(req())).status).toBe(503);
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });
  it("denies missing configuration", async () => {
    vi.stubEnv("GENESIS_LOGOUT_URL", "");
    expect((await GET(req())).status).toBe(503);
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });
  it("preserves V1 without calling the backend", async () => {
    vi.stubEnv("GENESIS_LOGOUT_REQUIRED", "false");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await GET(req())).status).toBe(307);
    expect(fetcher).not.toHaveBeenCalled();
    expect(clearSessionCookie).toHaveBeenCalledOnce();
  });
});
