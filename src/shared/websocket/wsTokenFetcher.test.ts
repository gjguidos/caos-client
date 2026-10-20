import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/mocks/server";
import { logger } from "@/shared/lib/logger";
import { fetchWebSocketToken } from "./wsTokenFetcher";

vi.mock("@/shared/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("wsTokenFetcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchWebSocketToken", () => {
    const WS_TOKEN_URL = "/api/auth/websocket-token";
    const MOCK_TOKEN = "mock-jwt-token-12345";

    it("fetches token successfully", async () => {
      server.use(
        http.get(WS_TOKEN_URL, () => {
          return HttpResponse.json({ token: MOCK_TOKEN });
        })
      );

      const token = await fetchWebSocketToken();
      expect(token).toBe(MOCK_TOKEN);
      expect(logger.error).not.toHaveBeenCalled();
    });

    const HTTP_ERROR_CASES = [
      { status: 404, description: "404 error" },
      { status: 500, description: "500 error" },
      { status: 401, description: "401 error" },
      { status: 403, description: "403 error" },
    ];

    it.each(HTTP_ERROR_CASES)(
      "returns null on $description",
      async ({ status }) => {
        server.use(
          http.get(WS_TOKEN_URL, () => {
            return new HttpResponse(null, { status });
          })
        );

        const token = await fetchWebSocketToken();
        expect(token).toBeNull();
        expect(logger.error).toHaveBeenCalledWith(
          "WebSocket token fetch failed:",
          status
        );
      }
    );

    it("returns null on network error", async () => {
      server.use(
        http.get(WS_TOKEN_URL, () => {
          return HttpResponse.error();
        })
      );

      const token = await fetchWebSocketToken();
      expect(token).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch WebSocket token:",
        expect.any(Error)
      );
    });

    it("returns null when response missing token", async () => {
      server.use(
        http.get(WS_TOKEN_URL, () => {
          return HttpResponse.json({ success: true });
        })
      );

      const token = await fetchWebSocketToken();
      expect(token).toBeNull();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("returns null when token is empty string", async () => {
      server.use(
        http.get(WS_TOKEN_URL, () => {
          return HttpResponse.json({ token: "" });
        })
      );

      const token = await fetchWebSocketToken();
      expect(token).toBeNull();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("returns null when token is null", async () => {
      server.use(
        http.get(WS_TOKEN_URL, () => {
          return HttpResponse.json({ token: null });
        })
      );

      const token = await fetchWebSocketToken();
      expect(token).toBeNull();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("handles malformed JSON response", async () => {
      server.use(
        http.get(WS_TOKEN_URL, () => {
          return new HttpResponse("not json", {
            headers: { "Content-Type": "application/json" },
          });
        })
      );

      const token = await fetchWebSocketToken();
      expect(token).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch WebSocket token:",
        expect.any(Error)
      );
    });
  });
});
