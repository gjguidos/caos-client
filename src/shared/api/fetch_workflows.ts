import { getPublicApiBase } from "@/shared/lib/getApiClient";
import type { ResourceDeleteResult } from "@/shared/lib/resourceListError";
import fetchData, { fetchDataResult } from "@/shared/lib/server-actions";
import { unwrapData, unwrapDataArray } from "@/shared/api/envelope";
import type {
  WorkflowDefinition,
  WorkflowInputField,
} from "@/shared/lib/workflow/workflow.types";

/** Built-in (seeded) vs user-created (db) workflow. */
export type WorkflowOrigin = "builtin" | "db";

/**
 * A persisted workflow row from the `coll_workflows` catalog. Mirrors the
 * backend `WorkflowDocument`: the former `WorkflowSpec` (`definition`/`inputs`/
 * `ui`) plus audit metadata, served flat (no `data.metadata` envelope).
 */
export interface WorkflowDocument {
  key: string;
  name: string;
  description: string | null;
  version: string;
  definition: WorkflowDefinition;
  /** Derived server-side from the definition's tool steps; never sent by the client. */
  required_tools?: string[];
  tags: string[];
  inputs: WorkflowInputField[];
  ui: Record<string, unknown>;
  origin: WorkflowOrigin;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** The configured API base, or throw if the environment is missing it. */
function requireApiBase(): string {
  const base = getPublicApiBase();
  if (!base) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE in environment");
  }
  return base;
}

/** List the persisted workflow catalog (USER role). */
export async function listWorkflows(): Promise<WorkflowDocument[]> {
  const response = await fetchData({
    path: `${requireApiBase()}/v1/workflows/list`,
    method: "GET",
  });

  return unwrapDataArray<WorkflowDocument>(response);
}

/** Fetch a single workflow by its immutable `key` (USER role). */
export async function getWorkflowByKey(
  key: string
): Promise<WorkflowDocument | null> {
  const response = await fetchData({
    path: `${requireApiBase()}/v1/workflows/key/${encodeURIComponent(key)}`,
    method: "GET",
  });

  return unwrapData<WorkflowDocument>(response) ?? null;
}

/**
 * A single structured validation issue from a `422 WORKFLOW_VALIDATION_ERROR`.
 * `step_id`/`tool_key` wire the issue back to the offending canvas node(s).
 */
export interface WorkflowValidationIssue {
  code: string;
  message: string;
  step_id?: string | null;
  tool_key?: string | null;
}

/** Body accepted by create/update - only the author-editable fields. */
export interface WorkflowMutationBody {
  name: string;
  description?: string | null;
  version?: string;
  definition: WorkflowDefinition;
  tags?: string[];
  /** Author-declared runtime inputs (`${inputs.<key>}` references). */
  inputs?: WorkflowInputField[];
}

/**
 * Result of a create/update. Returned (not thrown) so structured backend errors
 * survive the server-action boundary - thrown server-action errors are redacted
 * to a generic message in production, which would lose `errors[]`/`error_code`.
 */
export type WorkflowMutationResult =
  | { ok: true; document: WorkflowDocument }
  | {
      ok: false;
      errorCode: string | null;
      message: string;
      /** Per-step/tool validation issues (empty for non-validation errors). */
      issues: WorkflowValidationIssue[];
      /** For `409 WORKFLOW_IN_USE`: the agents pinning this workflow. */
      inUseAgentIds?: string[];
    };

/** Backend error envelope shape for workflow mutations. */
interface WorkflowErrorEnvelope {
  error_code?: string | null;
  message?: string;
  data?: {
    errors?: WorkflowValidationIssue[];
    agent_ids?: string[];
    key?: string;
  };
}

/** Map a non-OK envelope into a structured failure result. */
function toFailure(
  status: number,
  body: unknown
): Extract<WorkflowMutationResult, { ok: false }> {
  const envelope = (body ?? {}) as WorkflowErrorEnvelope;
  return {
    ok: false,
    errorCode: envelope.error_code ?? null,
    message: envelope.message ?? `Request failed with status ${status}`,
    issues: envelope.data?.errors ?? [],
    inUseAgentIds: envelope.data?.agent_ids,
  };
}

/** Send a create/update request and map its envelope into a structured result. */
async function mutateWorkflow(
  path: string,
  method: "POST" | "PATCH",
  body: Partial<WorkflowMutationBody>,
  emptyResultMessage: string
): Promise<WorkflowMutationResult> {
  const result = await fetchDataResult({ path, method, data: body });

  if (!result.ok) return toFailure(result.status, result.body);

  const document = unwrapData<WorkflowDocument>(result.body);
  if (!document) {
    return {
      ok: false,
      errorCode: null,
      message: emptyResultMessage,
      issues: [],
    };
  }
  return { ok: true, document };
}

/** Create a workflow (ADMIN). `key` is slugified server-side from `name`. */
export async function createWorkflow(
  body: WorkflowMutationBody
): Promise<WorkflowMutationResult> {
  return mutateWorkflow(
    `${requireApiBase()}/v1/workflows`,
    "POST",
    body,
    "Create succeeded but returned no workflow."
  );
}

/**
 * Update a workflow by immutable `key` (ADMIN). Send only changed fields - PATCH
 * is sparse and non-nulling (a `null` is dropped, not cleared).
 */
export async function updateWorkflow(
  key: string,
  body: Partial<WorkflowMutationBody>
): Promise<WorkflowMutationResult> {
  return mutateWorkflow(
    `${requireApiBase()}/v1/workflows/key/${encodeURIComponent(key)}`,
    "PATCH",
    body,
    "Update succeeded but returned no workflow."
  );
}

/**
 * Result of a delete. Returned (not thrown) so a `409 WORKFLOW_IN_USE` survives
 * the server-action boundary with the pinning agent ids intact.
 */
export type WorkflowDeleteResult = ResourceDeleteResult;

/** Delete a workflow by immutable `key` (ADMIN). Backend returns 204. */
export async function deleteWorkflow(
  key: string
): Promise<WorkflowDeleteResult> {
  const result = await fetchDataResult({
    path: `${requireApiBase()}/v1/workflows/key/${encodeURIComponent(key)}`,
    method: "DELETE",
  });

  if (result.ok) return { ok: true };

  const failure = toFailure(result.status, result.body);
  return {
    ok: false,
    errorCode: failure.errorCode,
    message: failure.message,
    inUseAgentIds: failure.inUseAgentIds,
  };
}
