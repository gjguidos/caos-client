"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { useServerDraft } from "./useServerDraft";

const LABELS: Record<string, string> = {
  name: "Name",
  type: "Agent type",
  role_name: "Role",
  personality_key: "Soul",
  prompt: "Prompt",
  visibility: "Visibility",
  whitelisted_groups: "Groups",
  tools: "Tools",
  workflows: "Workflows",
  rule_pack_ids: "RulePacks",
  gui_components: "Interfaces",
};

export function fieldLabel(field: string): string {
  return LABELS[field] ?? field;
}

function preview(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text === undefined
    ? "(empty)"
    : text.length > 120
      ? `${text.slice(0, 117)}…`
      : text;
}

/** Server draft state: revision, unsaved fields, conflicts and lifecycle. */
export function ServerDraftBar({
  state,
  agentHref,
}: {
  state: ReturnType<typeof useServerDraft>;
  agentHref?: string | null;
}) {
  const { draft, dirty, conflicts } = state;
  if (state.phase === "loading")
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Loading your server draft…
      </p>
    );
  if (state.phase === "unavailable" || !draft)
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error ?? "Server drafts are unavailable."} Edits stay in this
        page and are not saved.
      </p>
    );
  const busy = state.busy !== undefined;
  return (
    <section
      aria-label="Server draft"
      className="space-y-2 rounded-md border border-border p-3"
    >
      <p className="text-sm" aria-live="polite">
        Server draft · revision {draft.revision} ·{" "}
        {draft.status === "editing"
          ? dirty.length > 0
            ? `Unsaved changes: ${dirty.map(fieldLabel).join(", ")}`
            : "All changes saved"
          : draft.status === "approved"
            ? `Approved (revision ${draft.lifecycle?.reviewed_revision}); editing is frozen`
            : "Created an Agent; read-only"}
      </p>
      {draft.status === "editing" && (
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={busy || dirty.length === 0 || conflicts.length > 0}
            onClick={() => void state.save()}
          >
            Save draft
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || dirty.length === 0}
            onClick={state.discard}
          >
            Discard unsaved changes
          </Button>
        </div>
      )}
      {conflicts.length > 0 && (
        <div aria-label="Draft conflicts" className="space-y-2 text-sm">
          <p className="text-destructive">
            These fields changed elsewhere while you were editing. Choose which
            value to keep; nothing is overwritten automatically.
          </p>
          {conflicts.map((conflict) => (
            <div
              key={conflict.field}
              className="rounded border border-destructive/40 p-2"
            >
              <p className="font-medium">{fieldLabel(conflict.field)}</p>
              <p>Yours: {preview(conflict.mine)}</p>
              <p>Saved elsewhere: {preview(conflict.theirs)}</p>
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => state.resolve(conflict.field, "mine")}
                >
                  Keep mine
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => state.resolve(conflict.field, "theirs")}
                >
                  Use saved value
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {draft.status === "approved" && (
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            Reopening withdraws the approval when no creation is using it; a new
            review and approval are then required.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void state.reopen()}
          >
            Reopen editing
          </Button>
        </div>
      )}
      {draft.status === "consumed" && (
        <div className="space-y-1 text-sm">
          <p>
            This draft created Agent {draft.lifecycle?.agent_id} (asleep). It is
            kept read-only.
          </p>
          {agentHref && (
            <Link className="underline underline-offset-4" href={agentHref}>
              Open created Agent
            </Link>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void state.fork()}
          >
            Start a new draft from this one
          </Button>
        </div>
      )}
      {draft.forked_from && (
        <p className="text-xs text-muted-foreground">
          Started from draft {draft.forked_from.draft_id.slice(0, 8)} (revision{" "}
          {draft.forked_from.revision}).
        </p>
      )}
      {(state.error || state.notice) && (
        <p role="alert" className="text-sm text-destructive">
          {state.error ?? state.notice}
        </p>
      )}
    </section>
  );
}
