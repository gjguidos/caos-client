"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  draftApprovalSchema,
  revisionReviewSchema,
} from "@/shared/lib/enki/serverDraft";
import {
  approvalSchema,
  creationSchema,
  draftKey,
  postReview,
  reviewSchema,
  APPROVAL_CONTRACT,
  CREATION_REQUEST_CONTRACT,
  type AgentCreation,
  type CreationApproval,
  type CreationReview,
} from "@/shared/lib/enki/review";

export type ReviewStatus =
  | "idle"
  | "reviewing"
  | "current"
  | "stale"
  | "expired"
  | "error";

type State = {
  review?: CreationReview;
  reviewedKey?: string;
  reviewedDraft?: unknown;
  approval?: CreationApproval;
  creation?: AgentCreation;
  busy?: "review" | "approve" | "revoke" | "create";
  error?: string;
  retryable?: boolean;
};

function newKey(): string {
  return globalThis.crypto.randomUUID();
}

const PENDING = new Set(["accepted", "provisioning"]);
const RECHECKS = 5;

/** One idempotency key per approval, kept for the tab so a reload reconciles. */
function creationKey(cache: Map<string, string>, approvalId: string): string {
  const storageKey = `caos:agent-creation:${approvalId}`;
  let value = cache.get(approvalId);
  if (!value) {
    try {
      value = globalThis.sessionStorage?.getItem(storageKey) ?? undefined;
    } catch {
      value = undefined;
    }
  }
  if (!value) value = newKey();
  cache.set(approvalId, value);
  try {
    globalThis.sessionStorage?.setItem(storageKey, value);
  } catch {
    /* Storage unavailable: the in-memory key still protects this page. */
  }
  return value;
}

/**
 * Server-draft mode (DRAFT-0.2B): review the exact saved revision, approve it by
 * reference (which freezes the draft) and create from the draft's recorded approval.
 */
export type ServerReviewTarget = {
  draftsUrl: string;
  draftId: string;
  /** The content revision under review: current while editing, the reviewed one once frozen. */
  revision: number;
  /** Unsaved local edits: a saved revision is all that can be reviewed or approved. */
  dirty: boolean;
  /** The approval that froze the draft, if any (survives reloads). */
  approved?: { approval_id: string; review_digest: string };
  onDraft: (draft: unknown) => void;
  onCreated?: () => void;
};

/**
 * Authoritative review state for one draft. Each request captures the exact draft it
 * sent; later responses for superseded requests are dropped, and any edit makes the
 * held review stale. Approval is possible only for the current, unexpired review.
 */
export function useCreationReview(
  agentId: string,
  draft: unknown,
  now: () => number = Date.now,
  server?: ServerReviewTarget
) {
  const key = server
    ? `server:${server.draftId}:${server.revision}${server.dirty ? ":dirty" : ""}`
    : draftKey(draft);
  const [state, setState] = useState<State>({});
  const [clock, setClock] = useState(() => now());
  const operation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const alive = useRef(true);
  // One idempotency key per reviewed digest, reused for every retry of it.
  const keys = useRef(new Map<string, string>());
  const creationKeys = useRef(new Map<string, string>());
  const rechecks = useRef(0);
  const base = `/api/caos/v2/agents/${encodeURIComponent(agentId)}/creation-review`;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);

  const expiresAt = state.review ? Date.parse(state.review.expires_at) : NaN;
  useEffect(() => {
    if (!Number.isFinite(expiresAt)) return;
    const delay = expiresAt - now();
    if (delay <= 0) return;
    const timer = setTimeout(() => setClock(now()), delay + 50);
    return () => clearTimeout(timer);
  }, [expiresAt, now]);

  const run = useCallback(
    async (
      busy: NonNullable<State["busy"]>,
      action: (signal: AbortSignal) => Promise<Partial<State>>
    ) => {
      const sequence = ++operation.current;
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setState((previous) => ({
        ...previous,
        busy,
        error: undefined,
        retryable: undefined,
      }));
      try {
        const patch = await action(current.signal);
        if (!alive.current || sequence !== operation.current) return;
        setClock(now());
        setState((previous) => ({ ...previous, ...patch, busy: undefined }));
      } catch (reason) {
        if (
          !alive.current ||
          sequence !== operation.current ||
          current.signal.aborted
        )
          return;
        setState((previous) => ({
          ...previous,
          busy: undefined,
          error: reason instanceof Error ? reason.message : "Review failed",
          retryable:
            typeof reason === "object" &&
            reason !== null &&
            "retryable" in reason &&
            reason.retryable === true,
        }));
      }
    },
    [now]
  );

  const validate = useCallback(() => {
    const sent = draft;
    const sentKey = key;
    if (server?.dirty) return;
    return run("review", async (signal) => {
      const review = server
        ? await postReview(
            `${server.draftsUrl}/${encodeURIComponent(server.draftId)}/revisions/${server.revision}/review`,
            undefined,
            revisionReviewSchema,
            signal
          )
        : await postReview(base, sent, reviewSchema, signal);
      return {
        review,
        reviewedKey: sentKey,
        reviewedDraft: sent,
        approval: undefined,
        creation: undefined,
      };
    });
  }, [base, draft, key, run, server]);

  const stale = state.review !== undefined && state.reviewedKey !== key;
  const expired =
    state.review !== undefined &&
    Number.isFinite(expiresAt) &&
    clock >= expiresAt;
  const status: ReviewStatus =
    state.busy === "review"
      ? "reviewing"
      : !state.review
        ? state.error
          ? "error"
          : "idle"
        : stale
          ? "stale"
          : expired
            ? "expired"
            : "current";
  const digest = state.review?.review_digest ?? null;
  const canApprove =
    status === "current" &&
    state.busy === undefined &&
    !server?.dirty &&
    !server?.approved &&
    state.review?.eligibility.eligible === true &&
    digest !== null &&
    state.approval?.review_digest !== digest;

  const approve = useCallback(() => {
    if (!canApprove || digest === null) return;
    const sent = state.reviewedDraft;
    let idempotency = keys.current.get(digest);
    if (!idempotency) {
      idempotency = newKey();
      keys.current.set(digest, idempotency);
    }
    if (server) {
      const target = server;
      const body = {
        contract: "caos.agent_draft_approval",
        schema_version: 1,
        revision: target.revision,
        review_digest: digest,
        decision: "approve",
        confirmed: true,
        idempotency_key: idempotency,
      };
      return run("approve", async (signal) => {
        const result = await postReview(
          `${target.draftsUrl}/${encodeURIComponent(target.draftId)}/approval`,
          body,
          draftApprovalSchema,
          signal
        );
        target.onDraft(result.draft);
        return { approval: result.approval };
      });
    }
    const body = {
      contract: APPROVAL_CONTRACT,
      schema_version: 1,
      draft: sent,
      review_digest: digest,
      decision: "approve",
      confirmed: true,
      idempotency_key: idempotency,
    };
    return run("approve", async (signal) => ({
      approval: await postReview(
        `${base}/approvals`,
        body,
        approvalSchema,
        signal
      ),
    }));
  }, [base, canApprove, digest, run, server, state.reviewedDraft]);

  const revoke = useCallback(() => {
    const id = state.approval?.approval_id;
    if (!id || state.approval?.state === "revoked") return;
    return run("revoke", async (signal) => ({
      approval: await postReview(
        `${base}/approvals/${encodeURIComponent(id)}/revoke`,
        undefined,
        approvalSchema,
        signal
      ),
    }));
  }, [base, run, state.approval]);

  const approvalCurrent =
    state.approval !== undefined &&
    status === "current" &&
    state.approval.review_digest === digest;

  const pending =
    state.creation !== undefined && PENDING.has(state.creation.state);
  const finished =
    state.creation !== undefined && !PENDING.has(state.creation.state);
  // A pending creation is bound to its approval, not to the editor: it can always be
  // checked again. A new one needs the current, approved review.
  // Server drafts: the frozen draft names its approval, so creation survives reloads.
  const frozen = server?.approved;
  const canCreate =
    state.busy === undefined &&
    !finished &&
    (frozen !== undefined ||
      (state.approval?.state === "approved" && (pending || approvalCurrent)));

  const create = useCallback(() => {
    const approval = frozen ?? state.approval;
    if (!canCreate || !approval) return;
    const body = {
      contract: CREATION_REQUEST_CONTRACT,
      schema_version: 1,
      approval_id: approval.approval_id,
      expected_review_digest: approval.review_digest,
    };
    const headers = {
      "Idempotency-Key": creationKey(
        creationKeys.current,
        approval.approval_id
      ),
    };
    return run("create", async (signal) => {
      const creation = await postReview(
        `${base}/create`,
        body,
        creationSchema,
        signal,
        headers
      );
      if (creation.state === "completed") server?.onCreated?.();
      return { creation };
    });
  }, [base, canCreate, frozen, run, server, state.approval]);

  // Bounded automatic reconciliation while Genesis is still provisioning.
  useEffect(() => {
    if (!pending) {
      rechecks.current = 0;
      return;
    }
    if (state.busy !== undefined || rechecks.current >= RECHECKS) return;
    const delay = 1500 * 2 ** rechecks.current;
    const timer = setTimeout(() => {
      rechecks.current += 1;
      void create();
    }, delay);
    return () => clearTimeout(timer);
  }, [create, pending, state.busy]);

  return {
    serverMode: server !== undefined,
    approvalId:
      frozen?.approval_id ??
      (state.approval?.state === "approved"
        ? state.approval.approval_id
        : null),
    status,
    review: state.review,
    approval: state.approval,
    approvalCurrent,
    creation: state.creation,
    canCreate,
    creationPending: pending,
    create,
    busy: state.busy,
    error: state.error,
    retryable: state.retryable === true,
    canApprove,
    validate,
    approve,
    revoke,
  };
}
