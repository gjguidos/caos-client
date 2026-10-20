"use client";

import {
  deleteWorkflow,
  listWorkflows,
  type WorkflowDocument,
} from "@/shared/api/fetch_workflows";
import type { ResourceDeleteResult } from "@/shared/lib/resourceListError";
import {
  type ResourceListState,
  useResourceList,
} from "@/shared/hooks/useResourceList";

export interface UseWorkflowListReturn extends ResourceListState<WorkflowDocument> {
  workflows: WorkflowDocument[];
  filteredWorkflows: WorkflowDocument[];
  handleDelete: (key: string) => Promise<ResourceDeleteResult>;
  refreshWorkflows: () => Promise<void>;
}

const matchesWorkflowSearch = (workflow: WorkflowDocument, query: string) =>
  workflow.name.toLowerCase().includes(query) ||
  workflow.description?.toLowerCase().includes(query) ||
  workflow.tags.some((tag) => tag.toLowerCase().includes(query));

export function useWorkflowList(): UseWorkflowListReturn {
  const list = useResourceList<WorkflowDocument>({
    fetchItems: listWorkflows,
    getKey: (workflow) => workflow.key,
    matchesSearch: matchesWorkflowSearch,
    deleteItem: deleteWorkflow,
  });

  return {
    ...list,
    workflows: list.items,
    filteredWorkflows: list.filteredItems,
    refreshWorkflows: list.refresh,
  };
}
