"use client";

import { Suspense } from "react";
import { WorkflowBuilderShell } from "../_components/WorkflowBuilderShell";

export default function NewWorkflowPage() {
  return (
    <Suspense fallback={null}>
      <WorkflowBuilderShell mode="new" />
    </Suspense>
  );
}
