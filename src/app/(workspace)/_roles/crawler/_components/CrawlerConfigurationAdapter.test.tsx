import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/test-utils/test-utils";

import type { FormRoleConfigurationProps } from "@/app/(workspace)/_agent-runtime/lib/formRoleResolver";
import type { UseBrowserSessionReturn } from "@/app/(workspace)/_capabilities/browser-session/useBrowserSession";
import { CrawlerConfigurationAdapter } from "./CrawlerConfigurationAdapter";

function makeSession(
  overrides: Partial<UseBrowserSessionReturn> = {}
): UseBrowserSessionReturn {
  return {
    browserSessionId: null,
    interactiveUrl: null,
    expiresAt: null,
    status: "idle",
    ready: false,
    alive: null,
    error: null,
    isStarting: false,
    isCapturing: false,
    isClosing: false,
    isBusy: false,
    hasSession: false,
    start: vi.fn().mockResolvedValue(null),
    capture: vi.fn().mockResolvedValue(null),
    refreshStatus: vi.fn().mockResolvedValue(null),
    close: vi.fn().mockResolvedValue(true),
    openInteractiveBrowser: vi.fn(),
    reset: vi.fn(),
    markAuthenticated: vi.fn(),
    ...overrides,
  };
}

function renderAdapter(overrides: Partial<FormRoleConfigurationProps> = {}) {
  const onStartBrowserSession = vi.fn();
  const onCaptureBrowserSession = vi.fn();

  const props: FormRoleConfigurationProps = {
    tool: null,
    values: { url: "https://example.com" },
    setValue: vi.fn(),
    formError: null,
    executionError: null,
    isRunning: false,
    operationStatus: null,
    canExecute: true,
    hasResultOrLogs: false,
    supportsBrowserSession: true,
    browserSession: makeSession(),
    onStartBrowserSession,
    onCaptureBrowserSession,
    onSubmit: vi.fn(),
    cancelOperation: vi.fn().mockResolvedValue(undefined),
    onReset: vi.fn(),
    ...overrides,
  };

  render(<CrawlerConfigurationAdapter {...props} />);

  return { onStartBrowserSession, onCaptureBrowserSession };
}

/*
 * These cover the seam that was broken: the page did not pass the two session
 * handlers, they were optional, and optional chaining turned the Sign in button
 * into a no-op. Asserting the click reaches the handler is what catches that.
 */
describe("CrawlerConfigurationAdapter browser-session wiring", () => {
  it("reaches the start handler from the target section", async () => {
    const user = userEvent.setup();
    const { onStartBrowserSession } = renderAdapter();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(onStartBrowserSession).toHaveBeenCalledTimes(1);
  });

  it("keeps sign-in disabled until a URL is entered", () => {
    renderAdapter({ values: { url: "" } });

    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  });

  it("reaches the capture handler once a session is awaiting sign-in", async () => {
    const user = userEvent.setup();
    const { onCaptureBrowserSession } = renderAdapter({
      browserSession: makeSession({
        hasSession: true,
        browserSessionId: "bs-1",
        status: "awaiting_authentication",
      }),
    });

    await user.click(screen.getByRole("button", { name: "I have signed in" }));

    expect(onCaptureBrowserSession).toHaveBeenCalledTimes(1);
  });

  it("derives the action status from the session state", () => {
    renderAdapter({
      browserSession: makeSession({ isStarting: true, status: "starting" }),
    });

    expect(
      screen.getByRole("button", { name: "Starting browser..." })
    ).toBeDisabled();
  });

  it("reports a session error to the user", () => {
    renderAdapter({
      browserSession: makeSession({
        error: "Enter a valid URL before starting sign-in.",
        status: "failed",
      }),
    });

    expect(
      screen.getByText("Enter a valid URL before starting sign-in.")
    ).toBeInTheDocument();
  });
});
