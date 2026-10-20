import { describe, expect, it } from "vitest";

import { buildEffectiveSubmitValues } from "./page";

describe("buildEffectiveSubmitValues", () => {
  it("passes values through untouched when the tool has no sign-in", () => {
    const values = { url: "https://example.com", auth_mode: "whatever" };

    expect(
      buildEffectiveSubmitValues({
        values,
        browserSessionSupported: false,
        browserSessionId: null,
      })
    ).toBe(values);
  });

  it("stamps a ready session onto the run", () => {
    const result = buildEffectiveSubmitValues({
      values: { url: "https://example.com" },
      browserSessionSupported: true,
      browserSessionId: "bs-1",
    });

    expect(result).toEqual({
      url: "https://example.com",
      auth_mode: "delegated_session",
      browser_session_id: "bs-1",
      mode: "browser",
    });
  });

  it("overrides a stale session id held in form state", () => {
    const result = buildEffectiveSubmitValues({
      values: { browser_session_id: "expired", auth_mode: "delegated_session" },
      browserSessionSupported: true,
      browserSessionId: "bs-2",
    });

    expect(result.browser_session_id).toBe("bs-2");
  });

  it("marks an un-authenticated run as anonymous", () => {
    const result = buildEffectiveSubmitValues({
      values: { url: "https://example.com" },
      browserSessionSupported: true,
      browserSessionId: null,
    });

    expect(result.auth_mode).toBe("none");
  });

  it("respects an auth_mode the user chose explicitly", () => {
    const result = buildEffectiveSubmitValues({
      values: { auth_mode: "service_account" },
      browserSessionSupported: true,
      browserSessionId: null,
    });

    expect(result.auth_mode).toBe("service_account");
  });
});
