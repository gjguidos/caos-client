"use client";

import {
  listWorkflows,
  type WorkflowDocument,
} from "@/shared/api/fetch_workflows";
import { logger } from "@/shared/lib/logger";
import type { WorkflowCatalog } from "@/shared/lib/workflow/attachedWorkflows";
import { useEffect, useState } from "react";

/**
 * Fetch the workflow catalog once as a `WorkflowCatalog`, so callers can tell
 * "still loading" and "fetch failed" apart from "the catalog is empty".
 *
 * Read-only on purpose: `useWorkflowList` is the hook for the admin list page
 * (search + delete), this one is for anything that just needs to resolve keys
 * to names.
 */
export function useWorkflowCatalog(): WorkflowCatalog<WorkflowDocument> {
  const [catalog, setCatalog] = useState<WorkflowCatalog<WorkflowDocument>>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = await listWorkflows();
        if (!cancelled) setCatalog({ status: "ready", entries });
      } catch (err) {
        logger.error("Failed to load workflow catalog", err);
        if (!cancelled) setCatalog({ status: "unavailable" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return catalog;
}
