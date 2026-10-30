"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Info, Pencil } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { useAuth } from "@/shared/auth/hooks/useAuth";
import { AgentDetailsDialog } from "@/shared/components/AgentDetailsDialog/AgentDetailsDialog";
import { ResourceCard } from "@/shared/components/ResourceCard/ResourceCard";

import type { AgentSummary } from "@/shared/lib/agent.types";
import { withReturnTo } from "@/shared/lib/navigation/returnTo";
import { resolveWorkspace } from "@/shared/lib/workspace/workspaceResolver";

import { useSoul } from "@/store/selectors";

interface AgentCardProps {
  agent: AgentSummary;
  onDelete?: (agentId: string) => Promise<unknown>;
  isDeleting?: boolean;
}

/**
 * Agent resource card.
 *
 * Clicking the card opens the agent workspace.
 * Details and editing are separate actions.
 *
 * Editing and deletion remain permission-gated.
 */
export function AgentCard({
  agent,
  onDelete,
  isDeleting = false,
}: AgentCardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [showDetails, setShowDetails] = useState(false);

  const personality = useSoul(agent.personality_key);
  const { canCreateAgent } = useAuth();

  const workspace = resolveWorkspace(agent);
  const workspaceHref = workspace.routeFor(agent);

  const editHref = withReturnTo(`/agents/${agent.id}/edit`, pathname);

  return (
    <>
      <ResourceCard
        label={`Agent: ${agent.name}`}
        href={workspaceHref}
        openLabel={workspace.openLabel}
        actions={
          <>
            {workspace.kind !== "chat" &&
              agent.effective_gui_components?.some(
                (component) =>
                  component.type === "chat" && component.version === 1
              ) && (
                <Link
                  href={`/v2/conversations?agent=${encodeURIComponent(agent.id)}`}
                  className="rounded-md p-2 text-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Open conversation
                </Link>
              )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Agent details"
              title="Agent details"
              onClick={() => setShowDetails(true)}
              className="size-8"
            >
              <Info className="size-4" aria-hidden="true" />
            </Button>

            {canCreateAgent && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Edit agent"
                title="Edit agent"
                onClick={() => router.push(editHref)}
                className="size-8"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </Button>
            )}
          </>
        }
        deleteConfig={
          canCreateAgent && onDelete
            ? {
                label: "Delete agent",
                confirmationText: "Delete this agent?",
                onDelete: () => onDelete(agent.id),
                disabled: isDeleting,
              }
            : undefined
        }
      >
        <div className="flex flex-col gap-2">
          <h3 className="line-clamp-2 text-xl font-semibold tracking-tight text-foreground">
            {agent.name}
          </h3>

          <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
            {personality?.description || "No description available."}
          </p>
        </div>
      </ResourceCard>

      {showDetails && (
        <AgentDetailsDialog
          agentData={agent}
          onClose={() => setShowDetails(false)}
        />
      )}
    </>
  );
}
