"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { reasonText } from "@/shared/lib/enki/review";
import type { useCreationReview } from "./useCreationReview";

const STATUS: Record<string, string> = {
  idle: "Not yet reviewed by the server.",
  reviewing: "Server review in progress…",
  stale: "The draft changed after the server review. Validate again.",
  expired: "The server review expired. Validate again.",
  error: "The server review failed.",
};

function time(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "";
}

/** Authoritative server findings and explicit human approval; never creation. */
export function CreationReviewPanel({
  state,
}: {
  state: ReturnType<typeof useCreationReview>;
}) {
  const { status, review, approval } = state;
  // Confirmation belongs to one exact review; a new digest requires a new one.
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [createConfirmed, setCreateConfirmed] = useState<string | null>(null);
  const creation = state.creation;
  const approvalId = state.approvalId;
  const preview = review?.composition.preview as
    | Record<string, unknown>
    | null
    | undefined;
  const agentHref =
    creation?.state === "completed" && creation.agent_id
      ? preview?.type === "form"
        ? `/v2/forms/${encodeURIComponent(creation.agent_id)}`
        : `/v2/conversations?agent=${encodeURIComponent(creation.agent_id)}`
      : null;
  const digest = review?.review_digest ?? null;
  const findings = review
    ? [
        ...review.validation.issues.map(
          (issue) => `${issue.path || "draft"}: ${reasonText(issue.code)}`
        ),
        ...review.composition.issues.map(
          (issue) => `${issue.path || "composition"}: ${reasonText(issue.code)}`
        ),
        ...review.eligibility.reasons
          .filter(
            (code) =>
              !review.validation.issues.some((issue) => issue.code === code) &&
              !review.composition.issues.some((issue) => issue.code === code)
          )
          .map(reasonText),
      ]
    : [];
  return (
    <section aria-label="Server review" className="space-y-3">
      <h3 className="font-semibold">Server review</h3>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {status === "current" && review
          ? `Validated ${time(review.validated_at)}; this review expires ${time(review.expires_at)}.`
          : STATUS[status]}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={state.busy !== undefined}
        onClick={() => void state.validate()}
      >
        {review ? "Validate again" : "Validate on server"}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
          {state.retryable ? " Retrying is safe." : ""}
        </p>
      )}
      {review && (
        <>
          {findings.length > 0 ? (
            <ul
              aria-label="Server findings"
              className="text-sm text-destructive"
            >
              {[...new Set(findings)].map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">
              {review.eligibility.eligible
                ? "No server findings. This draft is eligible for approval."
                : "Not eligible for approval."}
            </p>
          )}
          {review.composition.preview && (
            <figure className="space-y-1">
              <figcaption className="text-xs text-muted-foreground">
                Exact reviewed composition
                {digest ? ` · review ${digest.slice(0, 12)}` : ""}
                {status !== "current" ? " (no longer current)" : ""}
              </figcaption>
              <pre
                aria-label="Reviewed composition preview"
                className="overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs"
              >
                {JSON.stringify(review.composition.preview, null, 2)}
              </pre>
            </figure>
          )}
        </>
      )}
      {review?.eligibility.eligible && digest && (
        <div className="space-y-2 rounded-md border border-border p-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed === digest}
              disabled={!state.canApprove}
              onChange={(event) =>
                setConfirmed(event.target.checked ? digest : null)
              }
            />
            <span>
              I approve this exact reviewed composition. Approval records my
              decision only; it does not create, provision or activate the
              Agent.
            </span>
          </label>
          <Button
            type="button"
            disabled={!state.canApprove || confirmed !== digest}
            onClick={() => void state.approve()}
          >
            Approve review
          </Button>
        </div>
      )}
      {approval && (
        <div aria-label="Approval" className="space-y-1 text-sm">
          <p>
            Approval {approval.state}
            {approval.state === "approved"
              ? ` · usable until ${time(approval.expires_at)}`
              : ""}
            {approval.state === "revoked"
              ? ` · ${time(approval.revoked_at)}`
              : ""}
            {!state.approvalCurrent && approval.state === "approved"
              ? " (for an earlier review)"
              : ""}
          </p>
          {approval.state === "approved" && !creation && !state.serverMode && (
            <Button
              type="button"
              variant="outline"
              disabled={state.busy !== undefined}
              onClick={() => void state.revoke()}
            >
              Revoke approval
            </Button>
          )}
        </div>
      )}
      <div
        aria-label="Agent creation"
        className="space-y-2 rounded-md border border-border p-3"
      >
        {!creation && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={approvalId !== null && createConfirmed === approvalId}
              disabled={!state.canCreate}
              onChange={(event) =>
                setCreateConfirmed(event.target.checked ? approvalId : null)
              }
            />
            <span>
              Create exactly this approved Agent through Genesis. It is created
              asleep; nothing is activated or granted.
            </span>
          </label>
        )}
        <Button
          type="button"
          disabled={
            !state.canCreate ||
            (!state.creationPending &&
              (approvalId === null || createConfirmed !== approvalId))
          }
          onClick={() => void state.create()}
        >
          {state.creationPending ? "Check creation status" : "Create Agent"}
        </Button>
        {!approvalId && !creation && (
          <p className="text-xs text-muted-foreground">
            Approve the current server review before creating.
          </p>
        )}
        {creation && (
          <div
            aria-label="Creation status"
            className="space-y-1 text-sm"
            aria-live="polite"
          >
            {state.creationPending && (
              <p>
                Creation in progress ({creation.state}). Checking again is safe.
              </p>
            )}
            {creation.state === "failed" && (
              <p className="text-destructive">
                Creation failed:{" "}
                {creation.issue_codes.map(reasonText).join("; ")}
              </p>
            )}
            {creation.state === "completed" && (
              <>
                <p>
                  Created {String(preview?.name ?? "Agent")} ·{" "}
                  {String(preview?.type ?? "")} ·{" "}
                  {String(preview?.role_name ?? "")} ·{" "}
                  {String(preview?.personality_key ?? "")} (asleep)
                </p>
                <p className="text-xs text-muted-foreground">
                  Agent {creation.agent_id}
                </p>
                {agentHref && (
                  <Link
                    className="underline underline-offset-4"
                    href={agentHref}
                  >
                    Open created Agent
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
