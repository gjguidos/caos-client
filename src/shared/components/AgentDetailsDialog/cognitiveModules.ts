import type { AgentSummary } from "@/shared/lib/agent.types";
import type { Definition } from "./DefinitionList";

/**
 * The cognitive module fields of `AgentSummary`, in display order.
 *
 * Labels are spelled out rather than derived from the field name: the create
 * form derives its labels from the *form* key names (`llm`, `knowledge_db`),
 * which differ from these API names, so the same derivation here would produce
 * "Llm Type" and "Knowledge Db Type".
 */
export const COGNITIVE_MODULE_FIELDS: ReadonlyArray<{
  field: keyof AgentSummary;
  label: string;
}> = [
  { field: "llm_type", label: "Model" },
  { field: "knowledge_db_type", label: "Knowledge base" },
  { field: "embedding_type", label: "Embeddings" },
  { field: "db_type", label: "Database" },
  { field: "cache_type", label: "Cache" },
  { field: "messaging_type", label: "Messaging" },
  { field: "image_type", label: "Image" },
  { field: "video_type", label: "Video" },
  { field: "audio_type", label: "Audio" },
];

/**
 * The modules an agent actually has configured. Unset modules are dropped
 * rather than shown as blank, so the list reflects the agent's real capability
 * surface instead of a fixed eight-row table that is mostly empty.
 */
export function listCognitiveModules(agent: AgentSummary | null): Definition[] {
  if (!agent) return [];

  return COGNITIVE_MODULE_FIELDS.flatMap(({ field, label }) => {
    const value = agent[field];
    return typeof value === "string" && value.trim() ? [{ label, value }] : [];
  });
}
