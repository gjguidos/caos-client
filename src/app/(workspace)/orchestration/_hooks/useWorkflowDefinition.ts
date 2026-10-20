"use client";

import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";
import { getWorkflowByKey } from "@/shared/api/fetch_workflows";
import { useWorkflowCatalog } from "@/shared/hooks/useWorkflowCatalog";
import { logger } from "@/shared/lib/logger";
import {
  resolveAttachedWorkflows,
  type AttachedWorkflow,
} from "@/shared/lib/workflow/attachedWorkflows";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  extractWorkflowDefinition,
  extractWorkflowInputs,
  getWorkflowKeysFromAgent,
} from "../_lib/parseWorkflowDefinition";
import {
  loadActiveWorkflowKey,
  saveActiveWorkflowKey,
} from "../_lib/activeWorkflowStorage";
import type { WorkflowDefinition } from "@/shared/lib/workflow/workflow.types";

export interface UseWorkflowDefinitionReturn {
  /** Attached keys resolved against the catalog (name + stale flag). */
  catalogEntries: AttachedWorkflow[];
  /** The key the workspace is currently pointed at, or null. */
  activeKey: string | null;
  setActiveKey: (key: string) => void;
  definition: WorkflowDefinition | null;
  /** Declared run inputs (UIComponents) for the Run form; empty when none. */
  inputs: UIComponent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Resolves the workflows attached to an agent (`Agent.workflows`) against the
 * catalog, owns which one the workspace is pointed at, and fetches that one's
 * definition (`getWorkflowByKey(key)` → `GET /v1/workflows/key/{key}`).
 *
 * The active key survives a reload via localStorage, falling back to the first
 * attached key. A persisted key the agent no longer carries is ignored.
 */
export function useWorkflowDefinition(
  agentData: { workflows?: string[] } | null,
  agentId: string
): UseWorkflowDefinitionReturn {
  const workflowKeys = useMemo(
    () => getWorkflowKeysFromAgent(agentData),
    [agentData]
  );

  const catalog = useWorkflowCatalog();
  const [activeKey, setActiveKeyState] = useState<string | null>(null);
  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null);
  const [inputs, setInputs] = useState<UIComponent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the selection once the agent's keys arrive, and drop a selection the
  // agent no longer carries. Storage is read here rather than during render so
  // the first client render matches the server's.
  useEffect(() => {
    setActiveKeyState((current) => {
      if (current && workflowKeys.includes(current)) return current;
      if (workflowKeys.length === 0) return null;
      const persisted = loadActiveWorkflowKey(agentId);
      return persisted && workflowKeys.includes(persisted)
        ? persisted
        : workflowKeys[0];
    });
  }, [workflowKeys, agentId]);

  const setActiveKey = useCallback(
    (key: string) => {
      setActiveKeyState(key);
      saveActiveWorkflowKey(agentId, key);
    },
    [agentId]
  );

  const load = useCallback(async () => {
    if (!activeKey) {
      setDefinition(null);
      setInputs([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getWorkflowByKey(activeKey);
      const parsed = extractWorkflowDefinition(response);
      setInputs(extractWorkflowInputs(response));
      if (parsed) {
        setDefinition(parsed);
      } else {
        setDefinition(null);
        setError("Workflow definition could not be read from the catalog.");
      }
    } catch (err) {
      logger.error("Failed to fetch workflow definition", err);
      setDefinition(null);
      setInputs([]);
      setError("Failed to load the workflow definition.");
    } finally {
      setIsLoading(false);
    }
  }, [activeKey]);

  useEffect(() => {
    load();
  }, [load]);

  const catalogEntries = useMemo(
    () => resolveAttachedWorkflows(workflowKeys, catalog),
    [workflowKeys, catalog]
  );

  return {
    catalogEntries,
    activeKey,
    setActiveKey,
    definition,
    inputs,
    isLoading,
    error,
    refetch: load,
  };
}
