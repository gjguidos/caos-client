import { server } from "@/mocks/server";
import { act, renderHook } from "@/test-utils/test-utils";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWebSocketReconnect } from "./useWebSocketReconnect";

describe("useWebSocketReconnect", () => {
  const SESSION_URL = "/api/auth/session";
  const AUTHENTICATED_SESSION = { authenticated: true };
  const CODE_NORMAL_CLOSE = 1000;
  const CODE_ABNORMAL_CLOSE = 1006;
  const CODE_INTERNAL_ERROR = 1011;
  const DEFAULT_BASE_DELAY = 1000;
  const REASON_NORMAL = "Normal closure";
  const REASON_ABNORMAL = "Abnormal closure";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    server.use(
      http.get(SESSION_URL, () => {
        return HttpResponse.json(AUTHENTICATED_SESSION);
      })
    );
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  const createCloseEvent = (code: number, reason = ""): CloseEvent => {
    return new CloseEvent("close", { code, reason });
  };

  it("initializes with zero attempts", () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const { result } = renderHook(() =>
      useWebSocketReconnect({ onReconnect: MOCK_ON_RECONNECT })
    );

    expect(result.current.attempts).toBe(0);
  });

  it("does not reconnect on code 1000 (normal close)", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const { result } = renderHook(() =>
      useWebSocketReconnect({ onReconnect: MOCK_ON_RECONNECT })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_NORMAL_CLOSE, REASON_NORMAL);

    act(() => {
      result.current.scheduleReconnect(CLOSE_EVENT);
    });

    await vi.runAllTimersAsync();

    expect(MOCK_ON_RECONNECT).not.toHaveBeenCalled();
  });

  it("schedules reconnection on abnormal close codes", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const { result } = renderHook(() =>
      useWebSocketReconnect({ onReconnect: MOCK_ON_RECONNECT })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_ABNORMAL_CLOSE, REASON_ABNORMAL);

    act(() => {
      result.current.scheduleReconnect(CLOSE_EVENT);
    });

    await vi.runAllTimersAsync();

    expect(MOCK_ON_RECONNECT).toHaveBeenCalledTimes(1);
  });

  it("uses exponential backoff (1s, 2s, 4s, 8s)", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const EXPECTED_DELAYS = [1000, 2000, 4000, 8000];
    const { result } = renderHook(() =>
      useWebSocketReconnect({
        onReconnect: MOCK_ON_RECONNECT,
        baseDelayMs: DEFAULT_BASE_DELAY,
      })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_ABNORMAL_CLOSE);

    for (let i = 0; i < EXPECTED_DELAYS.length; i++) {
      const EXPECTED_DELAY = EXPECTED_DELAYS[i];

      act(() => {
        result.current.scheduleReconnect(CLOSE_EVENT);
      });

      // Fast-forward past the session check
      await vi.runOnlyPendingTimersAsync();

      await vi.advanceTimersByTimeAsync(EXPECTED_DELAY);

      expect(MOCK_ON_RECONNECT).toHaveBeenCalledTimes(i + 1);
    }
  });

  it("caps delay at maxDelayMs (30s)", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const MAX_DELAY = 5000;
    const { result } = renderHook(() =>
      useWebSocketReconnect({
        onReconnect: MOCK_ON_RECONNECT,
        baseDelayMs: DEFAULT_BASE_DELAY,
        maxDelayMs: MAX_DELAY,
      })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_ABNORMAL_CLOSE);

    // Schedule many reconnects to exceed max delay
    // After enough attempts, the delay should be capped at MAX_DELAY
    // Attempt 1: 1000ms, Attempt 2: 2000ms, Attempt 3: 4000ms, Attempt 4: 5000ms (capped)
    for (let i = 0; i < 4; i++) {
      act(() => {
        result.current.scheduleReconnect(CLOSE_EVENT);
      });
    }

    await vi.runAllTimersAsync();
    expect(MOCK_ON_RECONNECT).toHaveBeenCalled();
    expect(MOCK_ON_RECONNECT).toHaveBeenCalledTimes(4);
  });

  it("stops after maxAttempts reached", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const MOCK_ON_MAX_ATTEMPTS = vi.fn();
    const MAX_ATTEMPTS = 3;
    const { result } = renderHook(() =>
      useWebSocketReconnect({
        onReconnect: MOCK_ON_RECONNECT,
        maxAttempts: MAX_ATTEMPTS,
        onMaxAttemptsReached: MOCK_ON_MAX_ATTEMPTS,
      })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_ABNORMAL_CLOSE);

    // Try to reconnect exactly maxAttempts times
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      act(() => {
        result.current.scheduleReconnect(CLOSE_EVENT);
      });
    }

    // Try one more time - should trigger onMaxAttemptsReached
    act(() => {
      result.current.scheduleReconnect(CLOSE_EVENT);
    });

    await vi.runAllTimersAsync();

    expect(MOCK_ON_RECONNECT).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(MOCK_ON_MAX_ATTEMPTS).toHaveBeenCalledTimes(1);
  });

  it("checks session before reconnecting", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const SESSION_FETCH_SPY = vi.fn();

    server.use(
      http.get(SESSION_URL, () => {
        SESSION_FETCH_SPY();
        return HttpResponse.json(AUTHENTICATED_SESSION);
      })
    );

    const { result } = renderHook(() =>
      useWebSocketReconnect({ onReconnect: MOCK_ON_RECONNECT })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_ABNORMAL_CLOSE);

    act(() => {
      result.current.scheduleReconnect(CLOSE_EVENT);
    });

    await vi.runAllTimersAsync();

    expect(SESSION_FETCH_SPY).toHaveBeenCalled();
    expect(MOCK_ON_RECONNECT).toHaveBeenCalled();
  });

  it("reconnects even if session check fails", async () => {
    const MOCK_ON_RECONNECT = vi.fn();

    server.use(
      http.get(SESSION_URL, () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() =>
      useWebSocketReconnect({ onReconnect: MOCK_ON_RECONNECT })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_ABNORMAL_CLOSE);

    act(() => {
      result.current.scheduleReconnect(CLOSE_EVENT);
    });

    await vi.runAllTimersAsync();

    expect(MOCK_ON_RECONNECT).toHaveBeenCalled();
  });

  it("calls onReconnect with correct timing", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const FIRST_DELAY = 1000;
    const { result } = renderHook(() =>
      useWebSocketReconnect({ onReconnect: MOCK_ON_RECONNECT })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_ABNORMAL_CLOSE);

    act(() => {
      result.current.scheduleReconnect(CLOSE_EVENT);
    });

    // Run pending timers for session check
    await vi.runOnlyPendingTimersAsync();

    // Now advance by the delay
    await vi.advanceTimersByTimeAsync(FIRST_DELAY);

    expect(MOCK_ON_RECONNECT).toHaveBeenCalledTimes(1);
  });

  it("resetAttempts clears attempts counter", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const { result } = renderHook(() =>
      useWebSocketReconnect({ onReconnect: MOCK_ON_RECONNECT })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_ABNORMAL_CLOSE);

    act(() => {
      result.current.scheduleReconnect(CLOSE_EVENT);
      result.current.scheduleReconnect(CLOSE_EVENT);
      result.current.scheduleReconnect(CLOSE_EVENT);
    });

    await vi.runAllTimersAsync();

    act(() => {
      result.current.resetAttempts();
    });

    expect(result.current.attempts).toBe(0);
  });

  it("resetAttempts clears pending timeout", () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const { result } = renderHook(() =>
      useWebSocketReconnect({ onReconnect: MOCK_ON_RECONNECT })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_ABNORMAL_CLOSE);

    act(() => {
      result.current.scheduleReconnect(CLOSE_EVENT);
    });

    act(() => {
      result.current.resetAttempts();
    });

    vi.runAllTimers();

    expect(MOCK_ON_RECONNECT).not.toHaveBeenCalled();
  });

  it("respects custom shouldReconnect function", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const MOCK_SHOULD_RECONNECT = vi.fn(() => false);
    const { result } = renderHook(() =>
      useWebSocketReconnect({
        onReconnect: MOCK_ON_RECONNECT,
        shouldReconnect: MOCK_SHOULD_RECONNECT,
      })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_INTERNAL_ERROR);

    act(() => {
      result.current.scheduleReconnect(CLOSE_EVENT);
    });

    await vi.runAllTimersAsync();

    expect(MOCK_SHOULD_RECONNECT).toHaveBeenCalledWith(CLOSE_EVENT);
    expect(MOCK_ON_RECONNECT).not.toHaveBeenCalled();
  });

  it("custom shouldReconnect can override default behavior", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const MOCK_SHOULD_RECONNECT = vi.fn(() => true);
    const { result } = renderHook(() =>
      useWebSocketReconnect({
        onReconnect: MOCK_ON_RECONNECT,
        shouldReconnect: MOCK_SHOULD_RECONNECT,
      })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_NORMAL_CLOSE);

    act(() => {
      result.current.scheduleReconnect(CLOSE_EVENT);
    });

    await vi.runAllTimersAsync();

    expect(MOCK_SHOULD_RECONNECT).toHaveBeenCalledWith(CLOSE_EVENT);
    expect(MOCK_ON_RECONNECT).toHaveBeenCalled();
  });

  it("handles custom baseDelayMs", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const CUSTOM_BASE_DELAY = 500;
    const { result } = renderHook(() =>
      useWebSocketReconnect({
        onReconnect: MOCK_ON_RECONNECT,
        baseDelayMs: CUSTOM_BASE_DELAY,
      })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_ABNORMAL_CLOSE);

    act(() => {
      result.current.scheduleReconnect(CLOSE_EVENT);
    });

    await vi.runOnlyPendingTimersAsync();

    await vi.advanceTimersByTimeAsync(CUSTOM_BASE_DELAY);

    expect(MOCK_ON_RECONNECT).toHaveBeenCalledTimes(1);
  });

  it("handles custom maxDelayMs", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const CUSTOM_MAX_DELAY = 5000;
    const { result } = renderHook(() =>
      useWebSocketReconnect({
        onReconnect: MOCK_ON_RECONNECT,
        baseDelayMs: DEFAULT_BASE_DELAY,
        maxDelayMs: CUSTOM_MAX_DELAY,
      })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_ABNORMAL_CLOSE);

    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.scheduleReconnect(CLOSE_EVENT);
      });
    }

    await vi.runAllTimersAsync();
    expect(MOCK_ON_RECONNECT).toHaveBeenCalled();
  });

  it("clears timeout on unmount", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const { result, unmount } = renderHook(() =>
      useWebSocketReconnect({ onReconnect: MOCK_ON_RECONNECT })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_ABNORMAL_CLOSE);

    act(() => {
      result.current.scheduleReconnect(CLOSE_EVENT);
    });

    unmount();

    await vi.runAllTimersAsync();
  });

  it("handles multiple rapid reconnect attempts", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const RAPID_ATTEMPTS = 5;
    const { result } = renderHook(() =>
      useWebSocketReconnect({ onReconnect: MOCK_ON_RECONNECT })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_ABNORMAL_CLOSE);

    act(() => {
      for (let i = 0; i < RAPID_ATTEMPTS; i++) {
        result.current.scheduleReconnect(CLOSE_EVENT);
      }
    });

    await vi.runAllTimersAsync();

    expect(MOCK_ON_RECONNECT).toHaveBeenCalledTimes(RAPID_ATTEMPTS);
  });

  it("onMaxAttemptsReached is optional", async () => {
    const MOCK_ON_RECONNECT = vi.fn();
    const MAX_ATTEMPTS = 2;
    const { result } = renderHook(() =>
      useWebSocketReconnect({
        onReconnect: MOCK_ON_RECONNECT,
        maxAttempts: MAX_ATTEMPTS,
      })
    );
    const CLOSE_EVENT = createCloseEvent(CODE_ABNORMAL_CLOSE);

    for (let i = 0; i < MAX_ATTEMPTS + 1; i++) {
      act(() => {
        result.current.scheduleReconnect(CLOSE_EVENT);
      });
    }

    await vi.runAllTimersAsync();

    expect(MOCK_ON_RECONNECT).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });
});
