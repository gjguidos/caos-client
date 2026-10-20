import { getPublicApiBase } from "@/shared/lib/getApiClient";
import fetchData from "@/shared/lib/server-actions";

export async function deleteAgent(agent_id: string) {
  const base = getPublicApiBase();
  if (!base) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE in environment");
  }

  const response = await fetchData({
    path: `${base}/v1/agents/id/${agent_id}`,
    method: "DELETE",
  });
  return response;
}
