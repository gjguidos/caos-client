import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TextEncoder } from "node:util";
import { jwtVerify } from "jose";
vi.mock("server-only", () => ({}));
import { createLocalAccessToken } from "./local-token";
import { getApiAccessToken } from "../lib/get-api-token";
import { readSession, setSessionCookie } from "../lib/session";

beforeEach(() => {
  vi.stubGlobal("Uint8Array", new TextEncoder().encode("").constructor);
  vi.stubEnv("AUTH_MODE", "local");
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("GENESIS_LOGOUT_REQUIRED", "true");
  vi.stubEnv("LOCAL_JWT_SECRET", "local-development-test-secret-at-least-32");
  vi.stubEnv("SESSION_SECRET", "cookie-development-test-secret-at-least-32");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("issues fresh signed tenant sessions and reuses the exact token across API calls", async () => {
  const first = await createLocalAccessToken();
  const second = await createLocalAccessToken();
  const key = new TextEncoder().encode(process.env.LOCAL_JWT_SECRET);
  const a = (
    await jwtVerify(first, key, { issuer: "CAOS-local", audience: "CAOS-api" })
  ).payload;
  const b = (await jwtVerify(second, key)).payload;
  expect(a.tid).toBe("caos-local");
  expect(a.sid).toBeTruthy();
  expect(a.sid).not.toBe(b.sid);
  const session = { sub: String(a.sub), localAccessToken: first };
  expect(await getApiAccessToken(session)).toBe(first);
  expect(await getApiAccessToken(session)).toBe(first);
  await expect(getApiAccessToken({ sub: String(a.sub) })).rejects.toThrow(
    "login required"
  );
});

it("requires the signed browser cookie and preserves its exact token", async () => {
  expect(await readSession(new Request("http://local"))).toBeNull();
  const token = await createLocalAccessToken();
  const response = new Response();
  await setSessionCookie(response, { sub: "owner", localAccessToken: token });
  const cookie = (response.headers.get("set-cookie") ?? "").split(";")[0];
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(
    (await readSession(new Request("http://local", { headers: { cookie } })))
      ?.localAccessToken
  ).toBe(token);
  expect(
    await readSession(
      new Request("http://local", { headers: { cookie: cookie + "invalid" } })
    )
  ).toBeNull();
});

it("retains V1 local mode when Genesis is disabled", async () => {
  vi.stubEnv("GENESIS_LOGOUT_REQUIRED", "false");
  expect(await readSession(new Request("http://local"))).not.toBeNull();
  expect(await getApiAccessToken({ sub: "owner" })).toBeTruthy();
});
