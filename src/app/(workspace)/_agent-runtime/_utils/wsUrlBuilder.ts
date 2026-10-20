import { buildWebSocketBase } from "@/shared/auth/lib/utils";
import type { WsUrlOptions } from "@/app/(workspace)/_types/websocket.types";

export function buildAgentWebSocketUrl(options: WsUrlOptions): string {
  const { apiBase, agentSystemName, agentName, token } = options;

  const wsBase = buildWebSocketBase(apiBase);
  const tokenParam = `token=${encodeURIComponent(token)}`;
  const nameParam = `agent_name=${encodeURIComponent(agentName)}`;

  return `${wsBase}/ws/api/v1/agent/${encodeURIComponent(agentSystemName)}?${tokenParam}&${nameParam}`;
}
