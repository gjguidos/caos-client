/**
 * Backend tool-registry keys the frontend branches on.
 *
 * Most tools are driven entirely by their registry entry and need no constant
 * here. These are the exceptions: keys the UI special-cases (a bespoke setup
 * flow, a hidden config dialog, a dedicated icon). Collected in one place so a
 * backend rename has a single grep target instead of five.
 */
export const TOOL_KEYS = {
  rag: "rag",
  writer: "writer",
  greenClaim: "green_claim",
  workflow: "workflow",
} as const;

/** Role registry key -> tool registry key pre-selected when the chat opens. */
const DEFAULT_TOOL_KEY_BY_ROLE: Record<string, string> = {
  writer_assistant: TOOL_KEYS.writer,
  compliance_auditor: TOOL_KEYS.greenClaim,
};

/**
 * Mirror of the backend's `canonicalize()`: lowercase, whitespace and other
 * separators collapsed to `_`.
 *
 * Agents persist whatever spelling of a role they were created with, so
 * `role_name` may hold either the registry key or the display name. Role keys
 * and names are defined to agree under this transform (`"Writer Assistant"` ->
 * `"writer_assistant"`), which is how the backend resolves the same field.
 */
const canonicalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");

/**
 * Key of the tool to pre-select for an agent's role, or null when the role has
 * no default or the agent doesn't carry that tool.
 */
export function defaultToolKeyForRole(
  role: string | null | undefined,
  tools: readonly { key: string }[]
): string | null {
  const toolKey = role
    ? DEFAULT_TOOL_KEY_BY_ROLE[canonicalize(role)]
    : undefined;
  if (!toolKey) return null;
  return tools.some((tool) => tool.key === toolKey) ? toolKey : null;
}
