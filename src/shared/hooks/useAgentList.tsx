"use client";

import { deleteAgent } from "@/shared/api/delete_agents";
import { fetchAgents } from "@/shared/api/fetch_agents";
import type { AgentSummary } from "@/shared/lib/agent.types";
import type { ResourceDeleteResult } from "@/shared/lib/resourceListError";
import {
  type ResourceListState,
  useResourceList,
} from "@/shared/hooks/useResourceList";
import { createContext, useContext, useMemo, type ReactNode } from "react";

export interface UseAgentListReturn extends ResourceListState<AgentSummary> {
  agents: AgentSummary[];
  filteredAgents: AgentSummary[];
  handleDelete: (agentId: string) => Promise<ResourceDeleteResult>;
  refreshAgents: () => Promise<void>;
}

const fetchAgentItems = async () => (await fetchAgents())?.data ?? [];

const matchesAgentSearch = (agent: AgentSummary, query: string) =>
  agent.name.toLowerCase().includes(query) ||
  agent.prompt.toLowerCase().includes(query) ||
  (agent.role_name?.toLowerCase().includes(query) ?? false);

const AgentListContext = createContext<UseAgentListReturn | null>(null);

/**
 * Owns the one agent list. Every surface that shows agents - the left rail and
 * the catalog grid - reads it from here rather than fetching its own copy, so
 * there is no window in which the two disagree about which agents exist.
 */
export function AgentListProvider({ children }: { children: ReactNode }) {
  const list = useResourceList<AgentSummary>({
    fetchItems: fetchAgentItems,
    getKey: (agent) => agent.id,
    matchesSearch: matchesAgentSearch,
    deleteItem: async (agentId) => {
      await deleteAgent(agentId);
    },
  });

  const value = useMemo(
    () => ({
      ...list,
      agents: list.items,
      filteredAgents: list.filteredItems,
      refreshAgents: list.refresh,
    }),
    [list]
  );

  return (
    <AgentListContext.Provider value={value}>
      {children}
    </AgentListContext.Provider>
  );
}

export function useAgentList(): UseAgentListReturn {
  const list = useContext(AgentListContext);
  if (!list) {
    throw new Error("useAgentList must be used inside an AgentListProvider");
  }
  return list;
}
