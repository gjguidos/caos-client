
"use client";

import { Users, Workflow } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/shared/auth/hooks/useAuth";
import { SidebarRow } from "@/shared/components/layout/AppShell/SidebarRow";
import { useAgentList } from "@/shared/hooks/useAgentList";
import { resolveWorkspace } from "@/shared/lib/workspace/workspaceResolver";

import { RailList } from "./RailList";

interface GlobalPanelProps {
  /** Whether an agent workspace (chat or orchestration) is currently open. */
  isAgentRoute: boolean;
  agentId: string | null;
}

/**
 * Unified application navigation.
 *
 * Agents:
 * - Catalog link
 * - Scrollable list of agent workspaces
 *
 * Workflows:
 * - Builder-only catalog link
 *
 * All navigation rows share the same styling
 * through SidebarRow.
 */
export function GlobalPanel({
  isAgentRoute,
  agentId,
}: Readonly<GlobalPanelProps>) {
  const router = useRouter();
  const pathname = usePathname();

  const agentList = useAgentList();
  const { canCreateAgent } = useAuth();

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden px-4 pt-4">
      {/* Agent navigation */}
      <section className="flex min-h-0 flex-col">
        <SidebarRow
          variant="section"
          label="Agents"
          icon={Users}
          href="/"
          isActive={pathname === "/"}
        />

        {/* Only agent rows scroll; the section heading stays visible. */}
        <div className="min-h-0 overflow-y-auto">
          <RailList
            items={agentList.agents}
            getKey={(agent) => agent.id}
            getLabel={(agent) => agent.name}
            loading={agentList.loading}
            activeKey={
              isAgentRoute ? agentId : null
            }
            emptyLabel="No agents yet"
            onSelect={(agent) =>
              router.push(
                resolveWorkspace(agent).routeFor(agent)
              )
            }
          />
        </div>
      </section>

      {/* Workflow builder navigation */}
      {canCreateAgent && (
        <section className="flex shrink-0 flex-col gap-4">
          <div className="border-t border-border" />

          <SidebarRow
            variant="section"
            label="Workflows"
            icon={Workflow}
            href="/workflows"
            isActive={
              pathname?.startsWith("/workflows") ??
              false
            }
          />
        </section>
      )}
    </div>
  );
}
