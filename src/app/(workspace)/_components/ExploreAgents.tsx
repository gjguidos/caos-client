
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/shared/auth/hooks/useAuth";
import { AgentCard } from "@/shared/components/AgentCard/AgentCard";
import { ResourceBrowser } from "@/shared/components/ResourceList/ResourceBrowser";
import { useAgentList } from "@/shared/hooks/useAgentList";
import { useToast } from "@/shared/hooks/useToast";

/**
 * The one agent catalog. Chatting and building act on the same list of objects,
 * so there is a single grid; what differs between people is which affordances
 * each card offers, not which page they are on.
 */
export function ExploreAgents() {
  const agentList = useAgentList();
  const { canCreateAgent } = useAuth();
  const { showError, showSuccess } = useToast();
  const router = useRouter();

  const [creatingAgent, setCreatingAgent] = useState(false);

  const handleCreateAgent = () => {
    setCreatingAgent(true);
    router.push("/agents/new");
  };

  const handleDelete = async (agentId: string) => {
    const result = await agentList.handleDelete(agentId);

    if (result.ok) {
      showSuccess("Agent deleted");
      return;
    }

    showError("Failed to delete agent", {
      description: result.message,
    });
  };

  return (
    <ResourceBrowser
      title="Agents"
      resource="agent"
      searchPlaceholder="Search agents..."
      list={agentList}
      getKey={(agent) => agent.id}
      renderCard={(agent) => (
        <AgentCard
          agent={agent}
          onDelete={canCreateAgent ? handleDelete : undefined}
        />
      )}
      action={
        canCreateAgent ? (
          <Button
            variant="default"
            size="sm"
            onClick={handleCreateAgent}
            disabled={creatingAgent}
            aria-label="Create Agent"
          >
            {creatingAgent ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create Agent
          </Button>
        ) : undefined
      }
      emptyCopy={{
        searchTitle: "No agents found",
        searchDescription:
          "Try adjusting your search to find what you're looking for.",
        defaultTitle: "No agents yet",
        defaultDescription: canCreateAgent
          ? "Create your first agent to get started."
          : "There are no agents to chat with yet. Check back soon.",
      }}
    />
  );
}
