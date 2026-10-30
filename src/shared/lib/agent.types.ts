/** A tool attached to an agent: the registry `key` plus its per-agent config. */
export type AgentToolConfig = {
  key: string;
  config?: Record<string, unknown>;
};

export type AgentSummary = {
  effective_gui_components?: GuiComponentDescriptor[];
  form_presentations?: Record<string, unknown>;
  _id: string;
  id: string;
  name: string;
  system_name: string;
  prompt: string;
  chat_url: string;
  role_name: string | null;
  /**
   * Functional Agent type. Used for legacy workspace routing only when the
   * backend's effective GUI list is empty.
   */
  type?: string | null;
  /** Server-owned runtime contract; historical definitions default to V1. */
  runtime_version?: "v1" | "v2";
  // Extended fields used by the agent editor
  /**
   * Reference key into the personality registry (e.g. "empty_eva"). Agents no
   * longer carry a full personality object; resolve details via the
   * `/v1/agents/personalities/{key}/soul` endpoint when needed.
   */
  personality_key?: string;
  tools?: AgentToolConfig[];
  /**
   * Workflow catalog keys this agent may launch. The backend refuses to run any
   * key not in this list.
   */
  workflows?: string[];
  visibility?: "public" | "private";
  whitelisted_groups?: string[];
  llm_type?: string;
  image_type?: string | null;
  video_type?: string | null;
  audio_type?: string | null;
  db_type?: string | null;
  cache_type?: string | null;
  knowledge_db_type?: string | null;
  embedding_type?: string | null;
  messaging_type?: string | null;
  rule_pack_ids?: string[];
};

/** Backend-resolved presentation. Unknown types remain visible, never imply chat. */
export type GuiComponentDescriptor = {
  type: string;
  key: string;
  version: number;
  default: boolean;
  config: {
    source?: {
      kind: string;
      contract?: string;
      schema_version?: number;
      key?: string;
      version?: string;
    };
  };
};

/**
 * Payload for PATCH /v1/agents/id/{agent_id}.
 * All fields optional - only provided fields will be updated.
 */
export type AgentUpdatePayload = Partial<
  Omit<
    AgentSummary,
    | "_id"
    | "id"
    | "system_name"
    | "chat_url"
    | "runtime_version"
    | "effective_gui_components"
    | "form_presentations"
  >
>;

/**
 * Strongly-typed form values shared by the Create Agent form and all its
 * sub-section components.
 */
/**
 * The cognitive modules the wizard can hold, in the order the spec sheet shows
 * them. The registry is free to ship more; anything not listed here has no home
 * in the form, so it is dropped at the fetch boundary rather than carried
 * around as an untyped extra.
 */
export const COGNITIVE_MODULE_KEYS = [
  "llm",
  "image",
  "video",
  "audio",
  "db",
  "cache",
  "communication",
  "knowledge_db",
  "embedding",
  "messaging",
] as const;

export type CognitiveModuleKey = (typeof COGNITIVE_MODULE_KEYS)[number];

export type AgentFormValues = {
  /** V2 review supports multiple packs; V1 keeps its existing single-pack input. */
  rulePackIds?: string[];
  guiComponents?: string;
  name: string;
  type: string;
  /** Selected role registry key, sent to the backend as `role_name`. */
  roleRegistry: string;
  prompt: string;
  /** Selected personality registry key, sent to the backend as `personality_key`. */
  personalityRegistry: string;
  tools: Array<{
    key: string;
    config: Record<string, unknown>;
  }>;
  /** Workflow catalog keys attached to the agent, sent as `workflows`. */
  workflows: string[];
  security: {
    visibility: "public" | "private";
    whitelisted_groups: string[];
  };
  cognitive_modules: Record<CognitiveModuleKey, string>;
  /** Selected rule pack registry key, sent to the backend as a single-entry `rule_pack_ids`. */
  rulepackRegistry: string;
};
