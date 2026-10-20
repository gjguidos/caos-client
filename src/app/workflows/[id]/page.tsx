"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { WorkflowBuilderShell } from "../_components/WorkflowBuilderShell";

export default function EditWorkflowPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense fallback={null}>
      <WorkflowBuilderShell mode="edit" workflowId={id} />
    </Suspense>
  );
}
