/** Error surfaced by a resource-list hook/grid (agents, workflows, ...). */
export interface ResourceListError {
  type: "fetch" | null;
  message: string;
}

export type ResourceDeleteResult =
  | { ok: true }
  | {
      ok: false;
      errorCode: string | null;
      message: string;
      inUseAgentIds?: string[];
    };
