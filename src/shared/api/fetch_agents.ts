import { getPublicApiBase } from "@/shared/lib/getApiClient";
import fetchData from "@/shared/lib/server-actions";
import type { ApiEnvelope } from "@/shared/api/envelope";
import type { AgentSummary } from "@/shared/lib/agent.types";

type FetchAgentsResponse = ApiEnvelope<AgentSummary[]> | null;

type AgentByIdResponse = ApiEnvelope<unknown> | null;

export async function fetchAgentById(agent_id: string) {
  const base = getPublicApiBase();
  if (!base) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_BASE in environment when fetching agent by ID"
    );
  }
  return await fetchData<AgentByIdResponse>({
    path: `${base}/v1/agents/id/${agent_id}`,
    method: "GET",
  });
}

export async function fetchAgents(): Promise<FetchAgentsResponse> {
  const base = getPublicApiBase();
  if (!base) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_BASE in environment when fetching agents"
    );
  }
  return await fetchData<FetchAgentsResponse>({
    path: `${base}/v1/agents/list`,
    method: "GET",
  });
}

// Uses a custom fetchData function from @/shared/lib/server-actions.
// Gets the backend base URL from process.env.NEXT_PUBLIC_API_BASE.
// Throws an error if the base URL is missing.
// Fetches a list of agents from the backend API at the specified endpoint,
// found in /agentverse/src/domains/agentverse/interfaces/api/v1/interface.py
