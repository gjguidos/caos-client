import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatEventTime,
  stepElapsed,
  toEpochMs,
} from "./formatDuration";

describe("formatDuration", () => {
  it("reads sub-10s with one decimal", () => {
    expect(formatDuration(4200)).toBe("4.2s");
    expect(formatDuration(400)).toBe("0.4s");
  });

  it("drops the decimal between 10s and a minute", () => {
    expect(formatDuration(42_000)).toBe("42s");
  });

  it("switches to m:ss at a minute", () => {
    expect(formatDuration(72_000)).toBe("1:12");
    expect(formatDuration(600_000)).toBe("10:00");
  });

  it("switches to h:mm:ss at an hour", () => {
    expect(formatDuration(3_723_000)).toBe("1:02:03");
  });

  it("refuses to invent a duration from bad input", () => {
    expect(formatDuration(-1)).toBe("—");
    expect(formatDuration(Number.NaN)).toBe("—");
  });
});

describe("toEpochMs", () => {
  it("parses an ISO timestamp", () => {
    expect(toEpochMs("2026-01-01T00:00:00Z")).toBe(
      Date.parse("2026-01-01T00:00:00Z")
    );
  });

  it("returns null for missing or unparseable input", () => {
    expect(toEpochMs()).toBeNull();
    expect(toEpochMs("not a date")).toBeNull();
  });
});

describe("stepElapsed", () => {
  const started = "2026-01-01T00:00:00Z";
  const now = Date.parse("2026-01-01T00:00:10Z");

  it("measures a finished step between its own timestamps", () => {
    expect(
      stepElapsed(
        { startedAt: started, completedAt: "2026-01-01T00:00:04Z" },
        now
      )
    ).toBe(4000);
  });

  it("measures a running step against now", () => {
    expect(stepElapsed({ startedAt: started }, now)).toBe(10_000);
  });

  it("returns null for a step that never started", () => {
    expect(stepElapsed(undefined, now)).toBeNull();
    expect(stepElapsed({ completedAt: started }, now)).toBeNull();
  });
});

describe("formatEventTime", () => {
  it("pads to a fixed width so the rail stays aligned", () => {
    const ts = new Date(2026, 0, 1, 9, 4, 3, 7).getTime();
    expect(formatEventTime(ts)).toBe("09:04:03.007");
  });
});
