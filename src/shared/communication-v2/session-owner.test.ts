import { afterEach, expect, it, vi } from "vitest";
import { v2SessionOwner, v2WebsocketBase } from "./session-owner";
afterEach(() => vi.unstubAllEnvs());
it("returns an opaque per-session marker that changes even for the same user", () => {
  const session = { sub: "owner", localAccessToken: "server-private-bearer" };
  expect(v2SessionOwner(session)).toMatch(/^[a-f0-9]{64}$/);
  expect(v2SessionOwner(session)).not.toContain("server-private-bearer");
  expect(v2SessionOwner(session)).not.toBe(
    v2SessionOwner({ ...session, localAccessToken: "replacement-bearer" })
  );
  expect(v2SessionOwner(null)).toBeNull();
});
it("requires opt-in and accepts only credential-free socket origins", () => {
  vi.stubEnv("GENESIS_COMMUNICATION_URL", "");
  expect(v2WebsocketBase()).toBeNull();
  vi.stubEnv(
    "GENESIS_COMMUNICATION_URL",
    "https://api.example/api/v2/agentverse/communication"
  );
  expect(v2WebsocketBase()).toBe("wss://api.example");
  for (const value of [
    "wss://user:secret@api.example",
    "wss://api.example?token=secret",
    "ftp://api.example",
  ]) {
    vi.stubEnv("GENESIS_WEBSOCKET_URL", value);
    expect(v2WebsocketBase()).toBeNull();
  }
});
