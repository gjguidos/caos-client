import * as fetchAgentsApi from "@/shared/api/fetch_agents";
import { createMockStore } from "@/test-utils/test-utils";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentData } from "./useAgentData";

vi.mock("@/shared/api/fetch_agents", () => ({
  fetchAgentById: vi.fn(),
}));

vi.mock("@/shared/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("useAgentData", () => {
  const AGENT_ID = "agent-123";
  const AGENT_NAME = "Test Agent";
  const AGENT_ROLE = "assistant";
  const AGENT_TYPE = "chat";

  const MOCK_AGENT_DATA = {
    id: AGENT_ID,
    name: AGENT_NAME,
    type: AGENT_TYPE,
    role_name: AGENT_ROLE,
    description: "A helpful test agent",
    tools: [
      { key: "calculator_tool", config: {} },
      { key: "weather_tool", config: {} },
      { key: "rag", config: {} },
    ],
  };

  const MOCK_TOOL_REGISTRY = [
    {
      key: "calculator_tool",
      name: "Calculator Tool",
      description: "Performs calculations",
      version: "1.0.0",
    },
    {
      key: "weather_tool",
      name: "Weather Tool",
      description: "Gets weather information",
      version: "1.0.0",
    },
    {
      key: "rag",
      name: "RAG Tool",
      description: "Retrieval augmented generation",
      version: "1.0.0",
    },
  ];

  const createWrapper = (toolRegistry = MOCK_TOOL_REGISTRY) => {
    const store = createMockStore({
      tools: { list: toolRegistry as any },
    });

    return ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("starts with loading state", () => {
      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: true,
        data: MOCK_AGENT_DATA,
      });

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.agentData).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe("Successful Data Fetching", () => {
    it("fetches and sets agent data on mount", async () => {
      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: true,
        data: MOCK_AGENT_DATA,
      });

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.agentData).toEqual(MOCK_AGENT_DATA);
      expect(result.current.agentType).toBe(AGENT_TYPE);
      expect(result.current.error).toBeNull();
    });

    it("calls fetchAgentById with correct agentId", async () => {
      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: true,
        data: MOCK_AGENT_DATA,
      });

      renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(fetchAgentsApi.fetchAgentById).toHaveBeenCalledWith(AGENT_ID);
      });
    });

    it("enriches tools with registry data", async () => {
      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: true,
        data: MOCK_AGENT_DATA,
      });

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enrichedTools).toHaveLength(3);
      expect(result.current.enrichedTools[0]).toMatchObject({
        key: "calculator_tool",
        label: "Calculator Tool",
        description: "Performs calculations",
        version: "1.0.0",
      });
    });

    it("detects RAG tool presence", async () => {
      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: true,
        data: MOCK_AGENT_DATA,
      });

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasRagTool).toBe(true);
    });

    it("detects no RAG tool when not present", async () => {
      const AGENT_WITHOUT_RAG = {
        ...MOCK_AGENT_DATA,
        tools: [
          { key: "calculator_tool", config: {} },
          { key: "weather_tool", config: {} },
        ],
      };

      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: true,
        data: AGENT_WITHOUT_RAG,
      });

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasRagTool).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("handles API failure response", async () => {
      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: false,
        data: null,
      });

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Failed to fetch agent details.");
      expect(result.current.agentData).toBeNull();
    });

    it("handles API exception", async () => {
      const ERROR_MESSAGE = "Network error";
      vi.mocked(fetchAgentsApi.fetchAgentById).mockRejectedValue(
        new Error(ERROR_MESSAGE)
      );

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Unexpected error fetching agent.");
      expect(result.current.agentData).toBeNull();
    });
  });

  describe("Tool Enrichment", () => {
    it("returns empty array when no tools in agent data", async () => {
      const AGENT_NO_TOOLS = {
        ...MOCK_AGENT_DATA,
        tools: [],
      };

      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: true,
        data: AGENT_NO_TOOLS,
      });

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enrichedTools).toEqual([]);
    });

    it("returns empty array when tool registry is empty", async () => {
      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: true,
        data: MOCK_AGENT_DATA,
      });

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper([]), // Empty tool registry
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enrichedTools).toEqual([]);
    });

    it("filters out tools not in registry", async () => {
      const PARTIAL_REGISTRY = [MOCK_TOOL_REGISTRY[0]]; // Only Calculator Tool

      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: true,
        data: MOCK_AGENT_DATA,
      });

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(PARTIAL_REGISTRY),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enrichedTools).toHaveLength(1);
      expect(result.current.enrichedTools[0].label).toBe("Calculator Tool");
    });

    it("enriches a tool that declares no ui block", async () => {
      const TOOL_WITHOUT_UI = [
        {
          key: "basic_tool",
          name: "Basic Tool",
          description: "A basic tool",
          version: "1.0.0",
        },
      ];

      const AGENT_WITH_BASIC_TOOL = {
        ...MOCK_AGENT_DATA,
        tools: [{ key: "basic_tool", config: {} }],
      };

      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: true,
        data: AGENT_WITH_BASIC_TOOL,
      });

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(TOOL_WITHOUT_UI),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enrichedTools[0].label).toBe("Basic Tool");
      expect(result.current.enrichedTools[0].ui).toBeUndefined();
    });
  });

  describe("Refetch Functionality", () => {
    it("refetches agent data when refetch is called", async () => {
      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: true,
        data: MOCK_AGENT_DATA,
      });

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const UPDATED_AGENT_DATA = {
        ...MOCK_AGENT_DATA,
        name: "Updated Agent",
      };

      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: true,
        data: UPDATED_AGENT_DATA,
      });

      result.current.refetch();

      await waitFor(() => {
        expect(result.current.agentData?.name).toBe("Updated Agent");
        expect(result.current.isLoading).toBe(false);
      });

      expect(fetchAgentsApi.fetchAgentById).toHaveBeenCalledTimes(2);
    });

    it("clears error on successful refetch", async () => {
      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValueOnce({
        success: false,
        data: null,
      });

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to fetch agent details.");
      });

      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValueOnce({
        success: true,
        data: MOCK_AGENT_DATA,
      });

      result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.agentData).toEqual(MOCK_AGENT_DATA);
      });
    });
  });

  describe("SetAgentData Functionality", () => {
    it("allows manual setting of agent data", async () => {
      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: true,
        data: MOCK_AGENT_DATA,
      });

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const NEW_AGENT_DATA = {
        ...MOCK_AGENT_DATA,
        name: "Manually Set Agent",
        type: "orchestration",
      };

      result.current.setAgentData(NEW_AGENT_DATA);

      await waitFor(() => {
        expect(result.current.agentData).toEqual(NEW_AGENT_DATA);
        expect(result.current.agentType).toBe("orchestration");
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles agent data without tools property", async () => {
      const AGENT_NO_TOOLS_PROP = {
        id: AGENT_ID,
        name: AGENT_NAME,
        role_name: AGENT_ROLE,
      };

      vi.mocked(fetchAgentsApi.fetchAgentById).mockResolvedValue({
        success: true,
        data: AGENT_NO_TOOLS_PROP,
      });

      const { result } = renderHook(() => useAgentData({ agentId: AGENT_ID }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enrichedTools).toEqual([]);
      expect(result.current.hasRagTool).toBe(false);
    });
  });
});
