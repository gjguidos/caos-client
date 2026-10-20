import type {
  EnrichedTool,
  ToolDisplayPayload,
} from "@/app/(workspace)/_types/chat.types";
import type { FormValues } from "@/app/(workspace)/_tool-form/toolForm.types";
import { buildToolDisplay } from "@/app/(workspace)/_tool-form/lib/buildToolDisplay";
import { parseFlags } from "@/app/(workspace)/_tool-form/lib/parseFlags";

interface ParsedCommand {
  toolKey: string;
  flagValues: Record<string, string>;
}

function parseCommandString(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  const atMatch = trimmed.match(/^@([^\s]+)/);
  if (!atMatch) return null;

  return {
    toolKey: atMatch[1],
    flagValues: parseFlags(trimmed.slice(atMatch[0].length)),
  };
}

export function findToolDisplayFromCommand(
  rawMessage: string,
  enrichedTools: EnrichedTool[]
): ToolDisplayPayload | undefined {
  const parsed = parseCommandString(rawMessage);
  if (!parsed) return undefined;

  // The tool is selected by its canonical key (@<toolKey>), not by mode.
  const tool = enrichedTools.find((t) => t.key === parsed.toolKey);
  if (!tool?.ui) return undefined;

  // Re-key the parsed CLI flags back onto component ids so the display is built
  // by the same canonical path as the live form (buildToolDisplay). multiselect
  // values are split into arrays; buildToolDisplay joins them for display.
  const values: FormValues = {};
  for (const component of tool.ui) {
    const flag = component.flag_config?.flag;
    const raw = flag ? parsed.flagValues[flag] : undefined;
    if (raw === undefined) continue;
    values[component.id] =
      component.type === "multiselect" ? raw.split(",") : raw;
  }

  // The chat input is keyed by its config id (buildToolDisplay reads it there),
  // which may not correspond to a component in tool.ui.
  if (tool.uiChatInput) {
    const raw = parsed.flagValues[tool.uiChatInput.flag];
    if (raw !== undefined) values[tool.uiChatInput.id] = raw;
  }

  return buildToolDisplay(values, tool.ui, tool.label, tool.uiChatInput);
}
