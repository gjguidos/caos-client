// src/app/(workspace)/_agent-runtime/api/operations.ts

import { getPublicApiBase } from "@/shared/lib/getApiClient";
import fetchData from "@/shared/lib/server-actions";

type OperationApiResponse<T> =
  | {
      success: boolean;
      data: T;
    }
  | null;

export interface CancelOperationResponse {
  run_id: string;
  status: string;
}

export type CancelOperationRequest = {
  runId: string;

  /**
   * Backend-provided endpoint template, for example:
   *
   * /v1/operations/{run_id}/cancel
   */
  endpoint: string;
};

export async function cancelOperationRequest({
  runId,
  endpoint,
}: CancelOperationRequest) {
  const BASE = getPublicApiBase();

  if (!BASE) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_BASE in environment"
    );
  }

  if (!endpoint) {
    throw new Error(
      "Missing operation cancellation endpoint"
    );
  }

  const resolvedEndpoint =
    endpoint.replace(
      "{run_id}",
      encodeURIComponent(runId)
    );

  if (
    resolvedEndpoint.includes("{run_id}")
  ) {
    throw new Error(
      "Could not resolve operation run_id in cancellation endpoint"
    );
  }

  const path =
    `${BASE.replace(/\/$/, "")}` +
    `${resolvedEndpoint.startsWith("/") ? "" : "/"}` +
    resolvedEndpoint;

  return await fetchData<
    OperationApiResponse<CancelOperationResponse>
  >({
    path,
    method: "POST",
  });
}