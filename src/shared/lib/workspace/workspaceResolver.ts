/**
 * workspaceResolver — the single source of truth mapping an agent's `type` to the
 * workspace it opens into (route + which side panels show).
 *
 * Adding a third workspace later should be a one-entry change here, not scattered
 * `pathname.startsWith("/chat/")` checks across the layout and agent list.
 *
 * Pure module — no React, no Redux, no Next imports. Unit-tested in isolation.
 */

export type WorkspaceKind = "chat" | "orchestration" | "form";

/** Which AppShell side panels a workspace uses. */
export interface WorkspacePanels {
  /** Global agent-list panel on the left. */
  left: boolean;
  /** Right-hand panel slot (tool-form PropertiesPanel for chat). */
  right: boolean;
}

/** Minimal agent shape the resolver needs to build a route. */
export interface WorkspaceAgentLike {
  type?: string | null;
  runtime_version?: "v1" | "v2";
  system_name: string;
  id: string;
}

export interface WorkspaceDescriptor {
  kind: WorkspaceKind;
  /** First path segment, e.g. "chat" → "/chat/<system_name>/<id>". */
  routeSegment: string;
  panels: WorkspacePanels;
  /** Names the destination on a card's open affordance, e.g. "Open chat". */
  openLabel: string;
  /** Build the route to open a specific agent in this workspace. */
  routeFor: (agent: WorkspaceAgentLike) => string;
}

/** The workspace catalog. One entry per workspace kind. */
const WORKSPACE_TABLE: Record<
  WorkspaceKind,
  { routeSegment: string; panels: WorkspacePanels; openLabel: string }
> = {
  chat: {
    routeSegment: "chat",
    panels: { left: true, right: true },
    openLabel: "Open chat",
  },
  orchestration: {
    routeSegment: "orchestration",
    // Phase 1: canvas placeholder, no right panel yet (NodeInspector lands later).
    panels: { left: true, right: false },
    openLabel: "Open canvas",
  },
  form: {
    routeSegment: "form",
    // Phase 1: canvas placeholder, no right panel yet (NodeInspector lands later).
    panels: { left: true, right: false },
    openLabel: "Open form",
  },
};

const WORKSPACE_KINDS = new Set<string>(Object.keys(WORKSPACE_TABLE));

/** The default workspace when an agent's type is absent or unknown. */
export const DEFAULT_WORKSPACE_KIND: WorkspaceKind = "chat";

/**
 * Resolve an agent `type` value to a workspace kind. An agent's `type` is an
 * agent-type registry key (`chat`, `orchestration`), so a key that names a
 * workspace opens that workspace. Every other type → default (chat).
 */
export function resolveWorkspaceKind(
  type: string | null | undefined
): WorkspaceKind {
  const kind = type?.toLowerCase();
  return kind && WORKSPACE_KINDS.has(kind)
    ? (kind as WorkspaceKind)
    : DEFAULT_WORKSPACE_KIND;
}

/** Build the descriptor for a given workspace kind. */
export function getWorkspaceDescriptor(
  kind: WorkspaceKind
): WorkspaceDescriptor {
  const entry = WORKSPACE_TABLE[kind];
  return {
    kind,
    routeSegment: entry.routeSegment,
    panels: entry.panels,
    openLabel: entry.openLabel,
    routeFor: (agent) =>
      `/${entry.routeSegment}/${agent.system_name}/${agent.id}`,
  };
}

/** Resolve the workspace descriptor for an agent (by its `type`). */
export function resolveWorkspace(
  agent: Pick<WorkspaceAgentLike, "type" | "runtime_version">
): WorkspaceDescriptor {
  if (agent.runtime_version === "v2") {
    return {
      kind: "chat",
      routeSegment: "v2/conversations",
      panels: { left: false, right: false },
      openLabel: "Open V2 conversation",
      routeFor: (participant) =>
        `/v2/conversations?agent=${encodeURIComponent(participant.id)}`,
    };
  }
  return getWorkspaceDescriptor(resolveWorkspaceKind(agent.type));
}

/**
 * Derive the workspace kind from a route pathname (e.g. "/orchestration/foo/123").
 * Returns null for non-workspace routes (e.g. the "/" landing/list page) so callers
 * can distinguish "an agent is open" from "no agent open".
 */
export function workspaceKindFromPathname(
  pathname: string | null | undefined
): WorkspaceKind | null {
  if (!pathname) return null;
  for (const kind of Object.keys(WORKSPACE_TABLE) as WorkspaceKind[]) {
    if (pathname.startsWith(`/${WORKSPACE_TABLE[kind].routeSegment}/`)) {
      return kind;
    }
  }
  return null;
}
