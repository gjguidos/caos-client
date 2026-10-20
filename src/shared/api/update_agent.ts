import { AgentUpdatePayload } from "@/shared/lib/agent.types";

export async function updateAgent(agentId: string, data: AgentUpdatePayload) {
  const response = await fetch(`/api/agents/${agentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message: string | undefined;
    try {
      const j = JSON.parse(text || "null");
      message = j?.error ?? j?.message ?? undefined;
    } catch {
      /* not JSON */
    }
    throw new Error(message ?? `Failed to update agent: ${response.status}`);
  }

  return response.json();
}
