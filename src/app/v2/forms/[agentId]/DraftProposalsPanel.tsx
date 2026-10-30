"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DraftProposal } from "@/shared/lib/enki/serverDraft";
import { fieldLabel } from "./ServerDraftBar";
import type { useServerDraft } from "./useServerDraft";

function value(proposal: DraftProposal, field: string): string {
  if (proposal.remove.includes(field)) return "(remove)";
  const item = proposal.changes[field];
  const text = typeof item === "string" ? item : JSON.stringify(item);
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

/** Pending proposals; the human accepts selected applicable fields or rejects. */
export function DraftProposalsPanel({
  state,
}: {
  state: ReturnType<typeof useServerDraft>;
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const open = state.proposals.filter((proposal) =>
    ["pending", "deciding"].includes(proposal.state)
  );
  if (!state.draft || state.draft.status !== "editing" || open.length === 0)
    return null;
  const busy = state.busy !== undefined;
  const unsaved = state.dirty.length > 0;
  return (
    <section
      aria-label="Proposals"
      className="space-y-3 rounded-md border border-border p-3"
    >
      <h3 className="font-semibold">Proposed changes</h3>
      <p className="text-xs text-muted-foreground">
        Proposals never change your draft by themselves. Accepting applies only
        the fields you select, as a new saved revision.
        {unsaved
          ? " Save or discard your unsaved changes before accepting."
          : ""}
      </p>
      {open.map((proposal) => {
        const chosen = (selected[proposal.proposal_id] ?? []).filter((field) =>
          proposal.applicable_fields.includes(field)
        );
        return (
          <article
            key={proposal.proposal_id}
            aria-label={`Proposal from ${proposal.origin}`}
            className="space-y-2 rounded border border-border p-2 text-sm"
          >
            <p className="text-muted-foreground">
              From {proposal.origin} · based on revision{" "}
              {proposal.base_revision}
            </p>
            {proposal.rationale && (
              <p className="italic">{proposal.rationale}</p>
            )}
            <ul className="space-y-1">
              {proposal.fields.map((field) => {
                const conflicting = proposal.conflicting_fields.includes(field);
                return (
                  <li key={field}>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        disabled={conflicting || busy}
                        checked={chosen.includes(field)}
                        onChange={(event) =>
                          setSelected((current) => ({
                            ...current,
                            [proposal.proposal_id]: event.target.checked
                              ? [...chosen, field]
                              : chosen.filter((item) => item !== field),
                          }))
                        }
                      />
                      <span>
                        <strong>{fieldLabel(field)}</strong>:{" "}
                        {value(proposal, field)}
                        {conflicting && (
                          <span className="text-destructive">
                            {" "}
                            (changed since this proposal; cannot be applied)
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy || unsaved || chosen.length === 0}
                onClick={() => void state.decide(proposal, "accept", chosen)}
              >
                Accept selected
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void state.decide(proposal, "reject")}
              >
                Reject
              </Button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
