"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import type { AgentFormValues } from "@/shared/lib/agent.types";
import { draftKey } from "@/shared/lib/enki/review";
import {
  baseCreation,
  comparableCreation,
  dirtyFields,
  draftPageSchema,
  draftRequest,
  DraftRequestError,
  formFromComparable,
  formFromCreation,
  proposalDecisionSchema,
  proposalPageSchema,
  rebase,
  savePayload,
  serverDraftSchema,
  type DraftField,
  type DraftProposal,
  type FieldConflict,
  type ServerDraft,
} from "@/shared/lib/enki/serverDraft";
import { DRAFT_CONTRACT } from "@/shared/lib/enki/draft";

type Busy = "load" | "save" | "refresh" | "decide" | "reopen" | "fork";

type State = {
  phase: "loading" | "ready" | "unavailable";
  draft?: ServerDraft;
  base?: Record<string, unknown>;
  conflicts: FieldConflict[];
  proposals: DraftProposal[];
  busy?: Busy;
  error?: string;
  notice?: string;
};

type Stored = {
  revision: number;
  base: Record<string, unknown>;
  local: Record<string, unknown>;
};

const POLL_MS = 15000;

function storage(): Storage | undefined {
  try {
    return globalThis.sessionStorage ?? undefined;
  } catch {
    return undefined;
  }
}

function persistentKey(agentId: string, renew = false): string {
  // One creation key per Agent across tabs, so concurrent tabs create one draft.
  const name = `caos:enki-draft-key:${agentId}`;
  let store: Storage | undefined;
  try {
    store = globalThis.localStorage ?? undefined;
  } catch {
    store = undefined;
  }
  let value = renew ? undefined : (store?.getItem(name) ?? undefined);
  if (!value) {
    value = globalThis.crypto.randomUUID();
    try {
      store?.setItem(name, value);
    } catch {
      /* Without storage the key still protects this tab's retries. */
    }
  }
  return value;
}

function readStored(draftId: string): Stored | undefined {
  try {
    const raw = storage()?.getItem(`caos:enki-draft-local:${draftId}`);
    return raw ? (JSON.parse(raw) as Stored) : undefined;
  } catch {
    return undefined;
  }
}

function writeStored(draftId: string, value: Stored | undefined) {
  try {
    const name = `caos:enki-draft-local:${draftId}`;
    if (value) storage()?.setItem(name, JSON.stringify(value));
    else storage()?.removeItem(name);
  } catch {
    /* Storage unavailable: unsaved edits live only in this page. */
  }
}

/**
 * One server-authoritative draft for the Enki form. The server owns content, revision
 * and lifecycle; the browser keeps only unsaved edits (also in this tab's session
 * storage, so a reload restores them). Every refresh rebases unsaved edits per field;
 * a field changed on both sides is an explicit conflict, never a silent overwrite.
 */
export function useServerDraft(
  agentId: string,
  form: UseFormReturn<AgentFormValues>,
  {
    enabled = true,
    pollMs = POLL_MS,
  }: { enabled?: boolean; pollMs?: number } = {}
) {
  const [state, setState] = useState<State>({
    phase: enabled ? "loading" : "unavailable",
    conflicts: [],
    proposals: [],
  });
  const values = useWatch({ control: form.control }) as AgentFormValues;
  const local = useMemo(() => comparableCreation(values), [values]);
  const localKey = draftKey(local);
  const stateRef = useRef(state);
  stateRef.current = state;
  const localRef = useRef(local);
  localRef.current = local;
  const alive = useRef(true);
  const url = `/api/caos/v2/agents/${encodeURIComponent(agentId)}/drafts`;

  const dirty = state.base ? dirtyFields(local, state.base) : [];

  /** Make ``server`` the authoritative base, rebasing any unsaved local edits onto it. */
  const adopt = useCallback(
    (server: ServerDraft, restore?: Stored) => {
      const previous = stateRef.current;
      const nextBase = baseCreation(server);
      const fromBase = restore?.base ?? previous.base;
      const mine = restore?.local ?? localRef.current;
      const edited = fromBase ? dirtyFields(mine, fromBase) : [];
      let conflicts: FieldConflict[] = [];
      if (fromBase && edited.length > 0 && server.status === "editing") {
        const result = rebase(fromBase, mine, nextBase);
        conflicts = result.conflicts;
        form.reset(formFromComparable(result.merged));
      } else if (
        !previous.draft ||
        previous.draft.draft_id !== server.draft_id ||
        previous.draft.revision !== server.revision ||
        restore
      ) {
        form.reset(formFromCreation(server.draft.creation));
      }
      const keep = previous.conflicts.filter(
        (item) => !conflicts.some((next) => next.field === item.field)
      );
      setState((current) => ({
        ...current,
        phase: "ready",
        draft: server,
        base: nextBase,
        conflicts:
          server.status === "editing"
            ? [...keep.filter(() => edited.length > 0), ...conflicts]
            : [],
      }));
    },
    [form]
  );

  const run = useCallback(async (busy: Busy, action: () => Promise<void>) => {
    setState((current) => ({
      ...current,
      busy,
      error: undefined,
      notice: undefined,
    }));
    try {
      await action();
      if (alive.current)
        setState((current) => ({ ...current, busy: undefined }));
    } catch (reason) {
      if (!alive.current) return;
      setState((current) => ({
        ...current,
        busy: undefined,
        error:
          reason instanceof Error ? reason.message : "Draft request failed",
      }));
    }
  }, []);

  const loadProposals = useCallback(
    async (draft: ServerDraft) => {
      if (draft.status !== "editing") {
        setState((current) => ({ ...current, proposals: [] }));
        return;
      }
      const page = await draftRequest(
        `${url}/${draft.draft_id}/proposals?state=open&limit=20`,
        proposalPageSchema
      );
      if (alive.current)
        setState((current) => ({ ...current, proposals: page.items }));
    },
    [url]
  );

  const create = useCallback(
    async (renew = false): Promise<ServerDraft> => {
      const draft = await draftRequest(url, serverDraftSchema, {
        method: "POST",
        body: {
          contract: DRAFT_CONTRACT,
          schema_version: 1,
          resource_type: "agent",
          creation: {},
        },
        headers: { "Idempotency-Key": persistentKey(agentId, renew) },
      });
      // A stored key may name a draft that already created an Agent: start a new one.
      return draft.status === "consumed" && !renew ? create(true) : draft;
    },
    [agentId, url]
  );

  // Create or resume the requester's newest open draft for this Agent.
  useEffect(() => {
    alive.current = true;
    if (!enabled) return;
    void (async () => {
      try {
        const page = await draftRequest(
          `${url}?status=open&limit=1`,
          draftPageSchema
        );
        const draft = page.items[0] ?? (await create());
        if (!alive.current) return;
        adopt(draft, readStored(draft.draft_id));
        await loadProposals(draft);
      } catch (reason) {
        if (!alive.current) return;
        setState((current) => ({
          ...current,
          phase: "unavailable",
          error:
            reason instanceof DraftRequestError
              ? reason.message
              : "Server drafts are unavailable; edits stay in this page.",
        }));
      }
    })();
    return () => {
      alive.current = false;
    };
  }, [adopt, create, enabled, loadProposals, url]);

  // Keep unsaved edits for a reload of this tab; clear them once saved.
  useEffect(() => {
    const { draft, base } = stateRef.current;
    if (!draft || !base) return;
    writeStored(
      draft.draft_id,
      dirtyFields(local, base).length > 0
        ? { revision: draft.revision, base, local }
        : undefined
    );
  }, [localKey, state.base, state.draft?.draft_id]);

  const refresh = useCallback(async () => {
    const draft = stateRef.current.draft;
    if (!draft) return;
    const server = await draftRequest(
      `${url}/${draft.draft_id}`,
      serverDraftSchema
    );
    if (!alive.current) return;
    adopt(server);
    await loadProposals(server);
  }, [adopt, loadProposals, url]);

  const conflictAware = useCallback(
    async (reason: unknown) => {
      if (
        reason instanceof DraftRequestError &&
        reason.status === 409 &&
        reason.code?.startsWith("draft.")
      )
        await refresh();
      throw reason;
    },
    [refresh]
  );

  // Other tabs, accepted proposals and lifecycle changes arrive by polling and focus.
  useEffect(() => {
    if (!enabled || state.phase !== "ready") return;
    const tick = () => {
      if (
        stateRef.current.busy === undefined &&
        document.visibilityState !== "hidden"
      )
        void run("refresh", refresh);
    };
    const timer = setInterval(tick, pollMs);
    globalThis.addEventListener?.("focus", tick);
    return () => {
      clearInterval(timer);
      globalThis.removeEventListener?.("focus", tick);
    };
  }, [enabled, pollMs, refresh, run, state.phase]);

  const save = useCallback(() => {
    const { draft, base, conflicts } = stateRef.current;
    if (!draft || !base || draft.status !== "editing") return;
    if (conflicts.length > 0) {
      setState((current) => ({
        ...current,
        error: "Resolve the conflicting fields first.",
      }));
      return;
    }
    const { changes, remove, unsaveable } = savePayload(localRef.current, base);
    return run("save", async () => {
      if (Object.keys(changes).length > 0 || remove.length > 0) {
        const server = await draftRequest(
          `${url}/${draft.draft_id}`,
          serverDraftSchema,
          {
            method: "PATCH",
            body: {
              contract: "caos.agent_draft_update",
              schema_version: 1,
              expected_revision: draft.revision,
              changes,
              remove,
            },
          }
        ).catch(conflictAware);
        adopt(server);
      }
      if (unsaveable.length > 0)
        setState((current) => ({
          ...current,
          notice: `Not saved until valid: ${unsaveable.join(", ")}.`,
        }));
    });
  }, [adopt, conflictAware, run, url]);

  const discard = useCallback(() => {
    const draft = stateRef.current.draft;
    if (!draft) return;
    form.reset(formFromCreation(draft.draft.creation));
    setState((current) => ({ ...current, conflicts: [] }));
  }, [form]);

  const resolve = useCallback(
    (field: DraftField, choice: "mine" | "theirs") => {
      const conflict = stateRef.current.conflicts.find(
        (item) => item.field === field
      );
      if (!conflict) return;
      if (choice === "theirs")
        form.reset(
          formFromComparable({ ...localRef.current, [field]: conflict.theirs })
        );
      setState((current) => ({
        ...current,
        conflicts: current.conflicts.filter((item) => item.field !== field),
      }));
    },
    [form]
  );

  const decide = useCallback(
    (
      proposal: DraftProposal,
      decision: "accept" | "reject",
      fields: string[] = []
    ) => {
      const draft = stateRef.current.draft;
      if (!draft) return;
      return run("decide", async () => {
        const result = await draftRequest(
          `${url}/${draft.draft_id}/proposals/${proposal.proposal_id}/decision`,
          proposalDecisionSchema,
          {
            method: "POST",
            body: {
              contract: "caos.agent_draft_proposal_decision",
              schema_version: 1,
              decision,
              confirmed: true,
              ...(decision === "accept"
                ? { expected_revision: draft.revision, fields }
                : {}),
            },
          }
        ).catch(async (reason) => {
          if (reason instanceof DraftRequestError && reason.status === 409)
            await refresh();
          throw reason;
        });
        adopt(result.draft);
        await loadProposals(result.draft);
      });
    },
    [adopt, loadProposals, refresh, run, url]
  );

  const reopen = useCallback(() => {
    const draft = stateRef.current.draft;
    if (!draft) return;
    return run("reopen", async () => {
      const server = await draftRequest(
        `${url}/${draft.draft_id}/reopen`,
        serverDraftSchema,
        {
          method: "POST",
          body: {
            contract: "caos.agent_draft_reopen",
            schema_version: 1,
            expected_revision: draft.revision,
          },
        }
      ).catch(conflictAware);
      adopt(server);
      await loadProposals(server);
    });
  }, [adopt, conflictAware, loadProposals, run, url]);

  const fork = useCallback(() => {
    const draft = stateRef.current.draft;
    if (!draft) return;
    return run("fork", async () => {
      const key = persistentKey(agentId, true);
      const server = await draftRequest(
        `${url}/${draft.draft_id}/fork`,
        serverDraftSchema,
        {
          method: "POST",
          body: {
            contract: "caos.agent_draft_fork",
            schema_version: 1,
            revision: draft.lifecycle?.reviewed_revision ?? draft.revision,
          },
          headers: { "Idempotency-Key": key },
        }
      );
      setState((current) => ({
        ...current,
        draft: undefined,
        base: undefined,
        conflicts: [],
      }));
      stateRef.current = {
        ...stateRef.current,
        draft: undefined,
        base: undefined,
      };
      adopt(server);
      await loadProposals(server);
    });
  }, [adopt, agentId, loadProposals, run, url]);

  return {
    enabled,
    phase: state.phase,
    draft: state.draft,
    dirty,
    conflicts: state.conflicts,
    proposals: state.proposals,
    busy: state.busy,
    error: state.error,
    notice: state.notice,
    readOnly: state.draft !== undefined && state.draft.status !== "editing",
    adopt,
    refresh: useCallback(() => run("refresh", refresh), [refresh, run]),
    save,
    discard,
    resolve,
    decide,
    reopen,
    fork,
  };
}
