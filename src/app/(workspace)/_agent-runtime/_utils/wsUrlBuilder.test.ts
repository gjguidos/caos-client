import { describe, expect, it, vi } from "vitest";
import { buildAgentWebSocketUrl } from "./wsUrlBuilder";

vi.mock("@/shared/auth/lib/utils", () => ({
  buildWebSocketBase: vi.fn((apiBase: string) => {
    // Mock implementation: convert http to ws, https to wss
    return apiBase.replace("http://", "ws://").replace("https://", "wss://");
  }),
}));

describe("wsUrlBuilder", () => {
  describe("buildAgentWebSocketUrl", () => {
    const API_BASE = "http://localhost:8000/api";
    const WS_BASE = "ws://localhost:8000/api";
    const AGENT_SYSTEM_NAME = "test-agent";
    const AGENT_NAME = "Test Agent";
    const TOKEN = "mock-jwt-token";

    it("builds correct WebSocket URL with all parameters", () => {
      const url = buildAgentWebSocketUrl({
        apiBase: API_BASE,
        agentSystemName: AGENT_SYSTEM_NAME,
        agentName: AGENT_NAME,
        token: TOKEN,
      });

      expect(url).toBe(
        `${WS_BASE}/ws/api/v1/agent/${AGENT_SYSTEM_NAME}?token=${TOKEN}&agent_name=${encodeURIComponent(AGENT_NAME)}`
      );
    });

    it("URL-encodes token parameter with special characters", () => {
      const SPECIAL_TOKEN = "token+with/special=chars&more";
      const url = buildAgentWebSocketUrl({
        apiBase: API_BASE,
        agentSystemName: AGENT_SYSTEM_NAME,
        agentName: AGENT_NAME,
        token: SPECIAL_TOKEN,
      });

      expect(url).toContain(`token=${encodeURIComponent(SPECIAL_TOKEN)}`);
      expect(url).not.toContain(SPECIAL_TOKEN); // Should be encoded
    });

    it("URL-encodes agentName parameter with spaces", () => {
      const NAME_WITH_SPACES = "My Test Agent";
      const url = buildAgentWebSocketUrl({
        apiBase: API_BASE,
        agentSystemName: AGENT_SYSTEM_NAME,
        agentName: NAME_WITH_SPACES,
        token: TOKEN,
      });

      expect(url).toContain(
        `agent_name=${encodeURIComponent(NAME_WITH_SPACES)}`
      );
      expect(url).toContain("agent_name=My%20Test%20Agent");
    });

    it("URL-encodes agentName parameter with special characters", () => {
      const SPECIAL_NAME = "Agent&Name=Special+Chars";
      const url = buildAgentWebSocketUrl({
        apiBase: API_BASE,
        agentSystemName: AGENT_SYSTEM_NAME,
        agentName: SPECIAL_NAME,
        token: TOKEN,
      });

      expect(url).toContain(`agent_name=${encodeURIComponent(SPECIAL_NAME)}`);
      expect(url).not.toContain("Agent&Name"); // Should be encoded
    });

    it("uses correct path format", () => {
      const url = buildAgentWebSocketUrl({
        apiBase: API_BASE,
        agentSystemName: AGENT_SYSTEM_NAME,
        agentName: AGENT_NAME,
        token: TOKEN,
      });

      expect(url).toMatch(/\/ws\/api\/v1\/agent\/[\w-]+\?/);
    });

    it("includes agentSystemName in path", () => {
      const CUSTOM_SYSTEM_NAME = "custom-agent-system";
      const url = buildAgentWebSocketUrl({
        apiBase: API_BASE,
        agentSystemName: CUSTOM_SYSTEM_NAME,
        agentName: AGENT_NAME,
        token: TOKEN,
      });

      expect(url).toContain(`/ws/api/v1/agent/${CUSTOM_SYSTEM_NAME}?`);
    });

    it("handles HTTPS API base", () => {
      const HTTPS_API_BASE = "https://production.example.com/api";
      const EXPECTED_WSS_BASE = "wss://production.example.com/api";

      const url = buildAgentWebSocketUrl({
        apiBase: HTTPS_API_BASE,
        agentSystemName: AGENT_SYSTEM_NAME,
        agentName: AGENT_NAME,
        token: TOKEN,
      });

      expect(url.startsWith(EXPECTED_WSS_BASE)).toBe(true);
    });

    it("maintains query parameter order", () => {
      const url = buildAgentWebSocketUrl({
        apiBase: API_BASE,
        agentSystemName: AGENT_SYSTEM_NAME,
        agentName: AGENT_NAME,
        token: TOKEN,
      });

      const [, queryString] = url.split("?");
      const params = queryString.split("&");

      expect(params[0].startsWith("token=")).toBe(true);
      expect(params[1].startsWith("agent_name=")).toBe(true);
    });

    it("handles empty agentName", () => {
      const url = buildAgentWebSocketUrl({
        apiBase: API_BASE,
        agentSystemName: AGENT_SYSTEM_NAME,
        agentName: "",
        token: TOKEN,
      });

      expect(url).toContain("agent_name=");
      expect(url).toMatch(/agent_name=(&|$)/);
    });

    it("handles empty token", () => {
      const url = buildAgentWebSocketUrl({
        apiBase: API_BASE,
        agentSystemName: AGENT_SYSTEM_NAME,
        agentName: AGENT_NAME,
        token: "",
      });

      expect(url).toContain("token=");
      expect(url).toMatch(/token=&/);
    });

    it("handles agentSystemName with hyphens", () => {
      const HYPHENATED_NAME = "my-custom-agent-system";
      const url = buildAgentWebSocketUrl({
        apiBase: API_BASE,
        agentSystemName: HYPHENATED_NAME,
        agentName: AGENT_NAME,
        token: TOKEN,
      });

      expect(url).toContain(`/ws/api/v1/agent/${HYPHENATED_NAME}?`);
    });

    it("handles Unicode characters in agentName", () => {
      const UNICODE_NAME = "Agent 测试 🤖";
      const url = buildAgentWebSocketUrl({
        apiBase: API_BASE,
        agentSystemName: AGENT_SYSTEM_NAME,
        agentName: UNICODE_NAME,
        token: TOKEN,
      });

      expect(url).toContain(`agent_name=${encodeURIComponent(UNICODE_NAME)}`);
      expect(decodeURIComponent(url.split("agent_name=")[1])).toBe(
        UNICODE_NAME
      );
    });
  });
});
