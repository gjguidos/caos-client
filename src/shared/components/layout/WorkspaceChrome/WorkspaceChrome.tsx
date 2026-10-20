
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/shared/auth/hooks/useAuth";

import { AppShell } from "@/shared/components/layout/AppShell/AppShell";
import { GlobalPanel } from "@/shared/components/layout/GlobalPanel/GlobalPanel";
import { SidebarFooter } from "@/shared/components/layout/AppShell/SidebarFooter";
import { SidebarHeader } from "@/shared/components/layout/AppShell/SidebarHeader";
import ProfileMenu from "@/shared/components/ProfileMenu";

import { AgentListProvider } from "@/shared/hooks/useAgentList";
import { cn } from "@/shared/lib/utils";

import {
  getWorkspaceDescriptor,
  workspaceKindFromPathname,
} from "@/shared/lib/workspace/workspaceResolver";

interface WorkspaceChromeProps {
  children: ReactNode;

  /**
   * Right-sidebar content for workspaces that support it.
   *
   * The workspace descriptor controls whether the
   * right rail is displayed.
   */
  rightSidebar?: ReactNode;
}

/**
 * Shared application chrome for CAOS.
 *
 * Provides:
 * - Global sidebar
 * - Workspace-aware layout
 * - Local-session profile
 * - Optional right sidebar
 * - Shared agent list context
 *
 * Authentication redirects are handled outside
 * this component. It does not initiate sign-in.
 */
export function WorkspaceChrome({
  children,
  rightSidebar,
}: Readonly<WorkspaceChromeProps>) {
  const { userId, session } = useAuth();
  const pathname = usePathname();

  const workspaceKind =
    workspaceKindFromPathname(pathname);

  const descriptor = workspaceKind
    ? getWorkspaceDescriptor(workspaceKind)
    : null;

  const isAgentRoute = descriptor !== null;

  const agentId = isAgentRoute
    ? (pathname?.split("/").pop() ?? null)
    : null;

  const isChatRoute = workspaceKind === "chat";
  const isOrchestrationRoute =
    workspaceKind === "orchestration";

  /**
   * Local sessions still provide the identity used
   * by the sidebar and the agent-list provider.
   */
  const hasSession = Boolean(userId);

  const leftSidebar =
    hasSession && (descriptor?.panels.left ?? true) ? (
      <GlobalPanel
        isAgentRoute={isAgentRoute}
        agentId={agentId}
      />
    ) : null;

  const shell = (
    <AppShell
      leftSidebarHeader={<SidebarHeader />}
      leftSidebarFooter={
        <SidebarFooter>
          <ProfileMenu
            name={session?.name}
            username={session?.preferred_username}
          />
        </SidebarFooter>
      }
      leftSidebar={leftSidebar}
      rightSidebar={
        descriptor?.panels.right
          ? rightSidebar
          : undefined
      }
      className={cn(
        "bg-background",
        isOrchestrationRoute && "!px-0"
      )}
      workingAreaClassName={cn(
        isAgentRoute && "overflow-hidden",
        isChatRoute
          ? "mx-auto min-w-[320px] max-w-screen-xl rounded-lg"
          : "px-8 pt-8",
        isOrchestrationRoute && "!p-0"
      )}
    >
      {children}
    </AppShell>
  );

  /**
   * The agent list belongs above both the global
   * sidebar and the workspace content.
   *
   * Only mount the provider once a session identity
   * is available, avoiding premature agent requests.
   */
  return hasSession ? (
    <AgentListProvider>
      {shell}
    </AgentListProvider>
  ) : (
    shell
  );
}
