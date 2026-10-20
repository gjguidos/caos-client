"use client";

import { WorkspaceChrome } from "@/shared/components/layout/WorkspaceChrome/WorkspaceChrome";
import type { ReactNode } from "react";

/** The workflow catalog is a browsing surface, so it wears the same chrome as the agent catalog. */
export default function WorkflowCatalogLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <WorkspaceChrome>{children}</WorkspaceChrome>;
}
