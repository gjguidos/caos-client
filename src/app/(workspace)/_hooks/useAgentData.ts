import { fetchAgentById } from "@/shared/api/fetch_agents";
import type { AgentToolConfig } from "@/shared/lib/agent.types";
import { logger } from "@/shared/lib/logger";
import { TOOL_KEYS } from "@/shared/lib/toolKeys";
import { useToolRegistry } from "@/store/selectors";
import { ToolDefinition } from "@/store/slices/registry/toolsSlice";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  EnrichedTool,
  UseAgentDataOptions,
  UseAgentDataReturn,
} from "@/app/(workspace)/_types/chat.types";

export function useAgentData(options: UseAgentDataOptions): UseAgentDataReturn {
  const { agentId } = options;

  const [agentData, setAgentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const agentType: string = agentData?.type ?? "";

  const rawToolDefs = useToolRegistry();
  const toolRegs = useMemo(() => {
    return rawToolDefs.map(
      (e: ToolDefinition): EnrichedTool => {
        return {
          key: e.key,
          label: e.name,
          description: e.description,
          version: e.version,
          config_schema: e.config_schema,
          config: e.config,
          trigger_words:
            e.config?.trigger_words ?? [],
          capabilities: e.capabilities,
  
          ui: e?.ui?.components,
  
          uiGroupLabelMap:
            e?.ui?.config?.group_label_map,
  
          uiChatInput:
            e?.ui?.config?.chat_input ?? null,
  
          uiOutputProfiles:
            e?.ui?.config?.output_profiles ?? null,
  
          uiSearchBehavior:
            e?.ui?.config?.search_behavior ?? null,
  
          uiFeaturePanels:
            e?.ui?.config?.feature_panels ?? [],
  
          uiOperationBinding:
            e?.ui?.config
              ?.operation_binding ?? null,
  
          supports: e.supports,
        };
      }
    );
  }, [rawToolDefs]);

  const enrichedTools: EnrichedTool[] = useMemo(() => {
    if (!agentData?.tools || !toolRegs.length) return [];
    return agentData.tools
      .map((tool: AgentToolConfig) =>
        toolRegs.find((reg) => reg.key === tool.key)
      )
      .filter(Boolean);
  }, [agentData?.tools, toolRegs]);

  const hasRagTool = useMemo(
    () =>
      !!agentData?.tools?.some((t: AgentToolConfig) => t.key === TOOL_KEYS.rag),
    [agentData?.tools]
  );

  const fetchAgent = useCallback(async () => {
    if (!agentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = (await fetchAgentById(`${agentId}`)) as {
        success: boolean;
        data: any;
      };
      if (res?.success) {
        const agent = res.data;
        setAgentData(agent);
      } else {
        setError("Failed to fetch agent details.");
      }
    } catch (err) {
      logger.error("Failed to fetch agent", err);
      setError("Unexpected error fetching agent.");
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  return {
    agentData,
    agentType,
    isLoading,
    error,
    enrichedTools,
    hasRagTool,
    refetch: fetchAgent,
    setAgentData,
  };
}
