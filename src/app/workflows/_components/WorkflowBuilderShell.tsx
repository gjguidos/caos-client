"use client";

import { BuilderAccessGate } from "@/shared/components/BuilderAccessGate/BuilderAccessGate";
import { ReactFlowProvider } from "@xyflow/react";
import { WorkflowBuilder, type WorkflowBuilderProps } from "./WorkflowBuilder";

/**
 * Shell for the workflow builder. Gates access behind `BuilderAccessGate` and
 * provides the React Flow context for the editable builder. The read-only
 * run/monitor canvas is intentionally untouched — this lives entirely under
 * `src/app/workflows/`.
 *
 * Props are the builder's own discriminated union: `workflowId` is required in
 * `edit` mode and disallowed in `new` mode (the `[id]` route param is really the
 * immutable workflow `key`).
 */
export function WorkflowBuilderShell(props: Readonly<WorkflowBuilderProps>) {
  return (
    <BuilderAccessGate
      resource="workflows"
      backHref="/workflows"
      backLabel="Back to workflows"
    >
      <ReactFlowProvider>
        <WorkflowBuilder {...props} />
      </ReactFlowProvider>
    </BuilderAccessGate>
  );
}
