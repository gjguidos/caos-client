
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { BuilderAccessGate } from "@/shared/components/BuilderAccessGate/BuilderAccessGate";
import { ResourceBrowser } from "@/shared/components/ResourceList/ResourceBrowser";
import { WorkflowCard } from "@/shared/components/WorkflowCard/WorkflowCard";

import { useToast } from "@/shared/hooks/useToast";
import { useWorkflowList } from "@/shared/hooks/useWorkflowList";

/**
 * Workflow catalog.
 *
 * Builder-only: users run workflows through an
 * orchestration agent, so a read-only catalog would
 * expose workflows they cannot act on.
 *
 * The access gate prevents unauthorized catalog
 * fetching and displays an explanation instead.
 */
export default function WorkflowsPage() {
  return (
    <BuilderAccessGate
      resource="workflows"
      backHref="/"
      backLabel="Back to agents"
    >
      <WorkflowCatalog />
    </BuilderAccessGate>
  );
}

function WorkflowCatalog() {
  const workflowList = useWorkflowList();
  const { showError, showSuccess } = useToast();
  const router = useRouter();

  const [creatingWorkflow, setCreatingWorkflow] =
    useState(false);

  const handleNewWorkflow = () => {
    setCreatingWorkflow(true);
    router.push("/workflows/new");
  };

  const handleDelete = async (key: string) => {
    const result = await workflowList.handleDelete(key);

    if (result.ok) {
      showSuccess("Workflow deleted");
      return;
    }

    if (
      result.errorCode === "WORKFLOW_IN_USE" &&
      result.inUseAgentIds?.length
    ) {
      showError("Workflow is in use", {
        description: `Used by ${result.inUseAgentIds.length} agent(s). Remove it from those agents before deleting.`,
      });
      return;
    }

    showError("Failed to delete workflow", {
      description: result.message,
    });
  };

  return (
    <ResourceBrowser
      title="Workflows"
      resource="workflow"
      searchPlaceholder="Search workflows..."
      list={workflowList}
      getKey={(workflow) => workflow.key}
      renderCard={(workflow) => (
        <WorkflowCard
          workflow={workflow}
          onDelete={handleDelete}
        />
      )}
      action={
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleNewWorkflow}
          disabled={creatingWorkflow}
          aria-label="Create Workflow"
        >
          {creatingWorkflow ? (
            <Loader2
              className="size-4 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Plus
              className="size-4"
              aria-hidden="true"
            />
          )}

          {creatingWorkflow
            ? "Creating..."
            : "Create Workflow"}
        </Button>
      }
      emptyCopy={{
        searchTitle: "No Workflows Found",
        searchDescription:
          "Try adjusting your search to find what you're looking for.",
        defaultTitle: "No workflows yet",
        defaultDescription:
          "You have not created any workflows yet. Click the button above to create your first workflow.",
      }}
    />
  );
}
