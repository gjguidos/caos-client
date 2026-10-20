
"use client";

import type { WorkflowDocument } from "@/shared/api/fetch_workflows";

import { Badge } from "@/components/ui/badge";
import { ResourceCard } from "@/shared/components/ResourceCard/ResourceCard";
import { cn } from "@/shared/lib/utils";

interface WorkflowCardProps {
  workflow: WorkflowDocument;
  onDelete: (key: string) => Promise<unknown>;
  isDeleting?: boolean;
}

function WorkflowCardBody({
  workflow,
}: Readonly<{
  workflow: WorkflowDocument;
}>) {
  const isBuiltin = workflow.origin === "builtin";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        isBuiltin && "pt-4"
      )}
    >
      <h3 className="line-clamp-2 text-xl font-semibold tracking-tight text-foreground">
        {workflow.name}
      </h3>

      <p className="mt-1 line-clamp-5 text-sm leading-relaxed text-muted-foreground">
        {workflow.description || "No description provided."}
      </p>
    </div>
  );
}

export function WorkflowCard({
  workflow,
  onDelete,
  isDeleting = false,
}: Readonly<WorkflowCardProps>) {
  const isBuiltin = workflow.origin === "builtin";

  return (
    <ResourceCard
      label={`Workflow: ${workflow.name}`}
      href={
        isBuiltin
          ? undefined
          : `/workflows/${encodeURIComponent(workflow.key)}`
      }
      openLabel="Edit workflow"
      badge={
        isBuiltin ? (
          <div className="absolute left-2 top-2 z-10">
            <Badge
              variant="secondary"
              className="px-2 py-0.5 text-[10px] font-medium"
            >
              Built-in
            </Badge>
          </div>
        ) : undefined
      }
      deleteConfig={
        isBuiltin
          ? undefined
          : {
              label: "Delete workflow",
              confirmationText: "Delete this workflow?",
              onDelete: () => onDelete(workflow.key),
              disabled: isDeleting,
            }
      }
    >
      <WorkflowCardBody workflow={workflow} />
    </ResourceCard>
  );
}
