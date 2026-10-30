import type {
  ToolUIConfig,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import type { DeclaredOutputType } from "@/shared/lib/workflow/workflow.types";
import type { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RegistryEntry } from "./registryEntry";

/** Raw backend metadata for a tool, before `normalizeTool` surfaces it. */
type ToolMetadata = {
  config_schema?: string;
  config?: { trigger_words?: string[]; [key: string]: unknown };
  trigger_words?: string[];
  capabilities?: string[];
  tags?: string[];
  [key: string]: unknown;
};

/**
 * The vocabulary of declared tool-output types (aligned to input widgets).
 * `image` is special: it is the only type that can source a file-slot binding
 * (see `supports.files.slots`), and it never binds into a text-ish command arg.
 *
 * Owned by `shared/lib/workflow` so a tool's declaration and a run's resolved
 * `declared_outputs` entry cannot drift apart.
 */
export type ToolOutputType = DeclaredOutputType;

/** A typed output a tool declares, bindable into a downstream step's field. */
export interface ToolOutput {
  /** Author-facing handle, e.g. "answer" — the `<key>` in `${outputs.<id>.<key>}`. */
  key: string;
  /** Display text, e.g. "Answer". */
  label: string;
  type: ToolOutputType;
  /** Env-relative locator the engine projects from, e.g. "result.answer". */
  path: string;
}

/**
 * A named file input slot a tool declares. A workflow author binds one upstream
 * `image` output into it via a step's `file_bindings[<name>]`. `required`,
 * `accepted_mimes` and the parent `max_count` are ADVISORY: the runtime does not
 * enforce them, so the builder is the only place they're surfaced.
 */
export interface FileSlotSpec {
  /** Binding key (machine); the key used in `file_bindings`. */
  name: string;
  /** Display text shown to the builder author. */
  label: string;
  accepted_mimes?: string[] | null;
  required?: boolean;
}

/** A tool's file-input support declaration (`supports.files`). */
export interface FilesSupport {
  max_count: number;
  max_size_bytes: number;
  accepted_mimes: string[] | null;
  /** Named input slots a workflow step can bind images into (absent = none). */
  slots?: FileSlotSpec[];
}

export interface ToolDefinition extends RegistryEntry<ToolMetadata> {
  // Core identity
  description: string;
  version: string;
  tool_class?: string;
  aliases?: string[];

  // Activation
  activation?: string;
  trigger_pattern?: string;
  trigger_words?: string[];
  regex_triggers?: string[];
  priority?: number;
  auto_policy?: string | null;

  // Configuration
  config?: { trigger_words?: string[]; [key: string]: unknown };
  default_config?: { trigger_words?: string[]; [key: string]: unknown };
  /** Python class path reference, e.g. "src.domains.agentverse.tools.writer_tool.WriterToolConfig" */
  config_schema?: string;
  /** Public projection of the Tool's schema, limited to its Agent admin fields. */
  agent_config_schema?: Record<string, unknown>;
  parameters_schema?: Record<string, unknown>;

  // Classification
  capabilities?: string[];
  tags?: string[];

  // UI
  ui?: {
    components?: UIComponent[];
    config?: ToolUIConfig;
    [key: string]: unknown;
  };

  // Runtime behaviour
  renderers?: Record<string, string>;
  result_contract?: Record<string, unknown>;
  outputs?: ToolOutput[];
  supports?: {
    streaming?: boolean;
    attachments?: unknown[];
    multi_turn_memory?: boolean;
    files?: FilesSupport;
  };
  requires_collection?: boolean;
  required_rulepacks?: boolean;
  min_rulepacks?: number | null;
  examples?: unknown[];
  instructions?: string;
}

type ToolsState = { list: ToolDefinition[] };
const initialState: ToolsState = { list: [] };

/**
 * Normalize a tool from backend:
 * - surface `tags`, `capabilities`, `trigger_words`, `config_schema`, `config`
 *   from metadata if missing at top level.
 */
export function normalizeTool(t: ToolDefinition): ToolDefinition {
  const md = t.metadata ?? {};

  return {
    ...t,
    config_schema: t.config_schema ?? md.config_schema,
    config: t.config ?? md.config,
    trigger_words:
      t.trigger_words ?? md.trigger_words ?? md.config?.trigger_words,
    capabilities: t.capabilities ?? md.capabilities,
    tags: t.tags ?? md.tags,
    outputs: t.outputs ?? (md.outputs as ToolOutput[] | undefined),
  };
}

const toolsSlice = createSlice({
  name: "tools",
  initialState,
  reducers: {
    setTools(state, action: PayloadAction<ToolDefinition[] | undefined>) {
      const incoming = action.payload ?? [];
      state.list = incoming.map(normalizeTool);
    },
  },
});

export const { setTools } = toolsSlice.actions;
export default toolsSlice.reducer;

export const selectTools = (state: RootState) => state.tools.list;
