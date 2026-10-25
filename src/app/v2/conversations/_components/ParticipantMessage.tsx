import type { ReactNode } from "react";

/** Identity is explicit for every contribution; no implied lead agent or coordination. */
export function ParticipantMessage({
  participant,
  participantId,
  kind,
  children,
  capability,
}: {
  participant: string;
  participantId?: string;
  kind: "user" | "context" | "response";
  capability?: string;
  children: ReactNode;
}) {
  return (
    <article className="space-y-2 rounded-lg border border-border bg-card p-4">
      <header className="flex flex-wrap items-center gap-2 text-sm">
        <strong>{participant}</strong>
        {participantId && (
          <code className="break-all text-xs text-muted-foreground">
            {participantId}
          </code>
        )}
        <span className="text-muted-foreground">
          {kind === "context"
            ? `Deterministic ${capability ?? "chat.context"} · not an LLM answer`
            : kind === "response"
              ? "LLM conversational response"
              : "User message"}
        </span>
      </header>
      {children}
    </article>
  );
}
