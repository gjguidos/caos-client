import { describe, expect, it } from "vitest";

import {
  isBridgeEventEnvelope,
  isBrowserSessionBridgeData,
  parseAgentBridgeEvent,
} from "./bridgeEvents";

describe("isBridgeEventEnvelope", () => {
  it("recognises browser-session events under each type alias", () => {
    for (const key of ["type", "event", "name", "event_type"]) {
      expect(
        isBridgeEventEnvelope({ [key]: "browser_session.authenticated" })
      ).toBe(true);
    }
  });

  it("routes every browser-session event, not just authenticated", () => {
    expect(isBridgeEventEnvelope({ type: "browser_session.failed" })).toBe(
      true
    );
    expect(isBridgeEventEnvelope({ type: "browser_session.expired" })).toBe(
      true
    );
  });

  it("leaves non-bridge traffic on the normal message path", () => {
    expect(isBridgeEventEnvelope({ event: "agent.comm" })).toBe(false);
    expect(isBridgeEventEnvelope({ type: "tool.started" })).toBe(false);
    expect(isBridgeEventEnvelope(null)).toBe(false);
    expect(isBridgeEventEnvelope("browser_session.authenticated")).toBe(false);
  });
});

describe("parseAgentBridgeEvent", () => {
  it("returns null when there is no recognisable event type", () => {
    expect(parseAgentBridgeEvent({ foo: "bar" })).toBeNull();
    expect(parseAgentBridgeEvent(null)).toBeNull();
  });

  it("normalises a browser-session payload from snake_case", () => {
    const event = parseAgentBridgeEvent({
      type: "browser_session.authenticated",
      data: {
        browser_session_id: "sess-1",
        domain: "example.com",
        final_url: "https://example.com/home",
      },
    });

    expect(event?.type).toBe("browser_session.authenticated");

    if (!event || !isBrowserSessionBridgeData(event.data)) {
      throw new Error("expected browser session data");
    }

    expect(event.data.browserSessionId).toBe("sess-1");
    expect(event.data.finalUrl).toBe("https://example.com/home");
    // `authenticated` implies ready when the payload omits the flag.
    expect(event.data.ready).toBe(true);
  });

  it("accepts camelCase aliases and a payload envelope", () => {
    const event = parseAgentBridgeEvent({
      event_type: "browser_session.authenticated",
      payload: { sessionId: "sess-2", ready: false },
    });

    if (!event || !isBrowserSessionBridgeData(event.data)) {
      throw new Error("expected browser session data");
    }

    expect(event.data.browserSessionId).toBe("sess-2");
    expect(event.data.ready).toBe(false);
  });

  it("keeps an unmapped event as `unknown` while preserving its raw type", () => {
    const event = parseAgentBridgeEvent({ type: "something.else" });

    expect(event?.type).toBe("unknown");
    expect(event?.rawType).toBe("something.else");
  });

  it("picks up a message from either the envelope or the payload", () => {
    expect(
      parseAgentBridgeEvent({ type: "tool.started", message: "outer" })?.message
    ).toBe("outer");

    expect(
      parseAgentBridgeEvent({
        type: "tool.started",
        data: { text: "inner" },
      })?.message
    ).toBe("inner");
  });
});
