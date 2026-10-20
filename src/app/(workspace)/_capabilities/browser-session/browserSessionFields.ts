import type { FormValues } from "@/app/(workspace)/_tool-form/toolForm.types";

/**
 * Components a tool declares to opt into delegated sign-in. Their presence is
 * what `supportsBrowserSession` detects when an agent's config says `auto`.
 */
export const BROWSER_SESSION_COMPONENT_IDS = [
  "auth_mode",
  "browser_session_id",
  "start_browser_session",
] as const;

/**
 * The form values a captured session writes.
 *
 * Single definition of the contract: the page, the submit path and the bridge
 * handler all route through here, so a run can never be sent half-labelled
 * (a session id with no `auth_mode`, say). `mode` moves to `browser` because a
 * delegated session only means anything to a tool that drives a real browser.
 */
export function authenticatedSessionValues(
  browserSessionId: string
): FormValues {
  return {
    auth_mode: "delegated_session",
    browser_session_id: browserSessionId,
    mode: "browser",
  };
}

/** The values an un-authenticated run carries, when the tool offers sign-in. */
export function anonymousSessionValues(): FormValues {
  return {
    auth_mode: "none",
  };
}
