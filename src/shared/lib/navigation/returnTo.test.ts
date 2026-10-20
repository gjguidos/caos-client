import { describe, expect, it } from "vitest";
import { safeReturnTo, withReturnTo } from "./returnTo";

describe("safeReturnTo", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeReturnTo("/chat/assistant/agent-1", "/")).toBe(
      "/chat/assistant/agent-1"
    );
    expect(safeReturnTo("/workflows?tab=all", "/")).toBe("/workflows?tab=all");
  });

  it("falls back when the param is missing or empty", () => {
    expect(safeReturnTo(null, "/workflows")).toBe("/workflows");
    expect(safeReturnTo(undefined, "/")).toBe("/");
    expect(safeReturnTo("", "/")).toBe("/");
  });

  // An unvalidated `?from=` is an open redirect: the editor would bounce a
  // signed-in user straight off-origin on save.
  it.each([
    "//evil.com",
    "//evil.com/path",
    "/\\evil.com",
    "https://evil.com",
    "http://evil.com",
    "javascript:alert(1)",
    "evil.com",
  ])("refuses %s", (hostile) => {
    expect(safeReturnTo(hostile, "/")).toBe("/");
  });
});

describe("withReturnTo", () => {
  it("appends the origin as an encoded query param", () => {
    expect(withReturnTo("/agents/a-1/edit", "/chat/assistant/a-1")).toBe(
      "/agents/a-1/edit?from=%2Fchat%2Fassistant%2Fa-1"
    );
  });

  it("uses & when the href already has a query string", () => {
    expect(withReturnTo("/agents/a-1/edit?step=tools", "/")).toBe(
      "/agents/a-1/edit?step=tools&from=%2F"
    );
  });

  it("leaves the href alone when there is no origin to return to", () => {
    expect(withReturnTo("/agents/a-1/edit", null)).toBe("/agents/a-1/edit");
  });
});
