"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  readHistory,
  type TranscriptMessage,
} from "@/shared/communication-v2/history";
import { ParticipantMessage } from "./ParticipantMessage";

export function Transcript({
  conversationId,
  revision,
}: {
  conversationId: string;
  revision: number;
}) {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const load = async (after?: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const current = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/caos/v2/conversations/${encodeURIComponent(conversationId)}/history${after ? `?cursor=${encodeURIComponent(after)}` : ""}`,
        {
          cache: "no-store",
          signal: controller.signal,
        }
      );
      if (!response.ok)
        throw new Error(
          `History denied or unavailable (HTTP ${response.status})`
        );
      const page = readHistory(await response.json());
      if (current !== generation.current || controller.signal.aborted) return;
      setMessages((previous) => {
        const rows = after ? [...previous, ...page.messages] : page.messages;
        return [...new Map(rows.map((m) => [m.id, m])).values()].sort(
          (a, b) => a.sequence - b.sequence
        );
      });
      setCursor(page.next_cursor);
    } catch (reason) {
      if (current !== generation.current || controller.signal.aborted) return;
      setMessages([]);
      setCursor(null);
      setError(
        reason instanceof Error ? reason.message : "History unavailable"
      );
    } finally {
      if (current === generation.current && !controller.signal.aborted)
        setBusy(false);
    }
  };
  useEffect(() => {
    setMessages([]);
    setCursor(null);
    void load();
    return () => {
      ++generation.current;
      request.current?.abort();
    };
    // Each revision rereads canonical storage; no socket response is a transcript row.
  }, [conversationId, revision, refresh]);
  return (
    <section aria-label="Durable transcript" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold">Conversation history</h3>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => setRefresh((v) => v + 1)}
        >
          Refresh history
        </Button>
      </div>
      {busy && <p role="status">Loading history…</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!busy && !error && !messages.length && (
        <p className="text-sm text-muted-foreground">No visible messages.</p>
      )}
      {messages
        .filter((m) => m.kind !== "internal_event")
        .map((m) => (
          <ParticipantMessage
            key={m.id}
            participant={m.kind === "user_message" ? "User" : "Agent"}
            participantId={m.participant_id}
            kind={
              m.kind === "capability_contribution"
                ? "context"
                : m.kind === "user_message"
                  ? "user"
                  : "response"
            }
            capability={m.capability ?? undefined}
          >
            {m.kind === "capability_contribution" ? (
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs">
                {m.content}
              </pre>
            ) : (
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
            )}
            <p className="break-all text-xs text-muted-foreground">
              Message {m.id} · sequence {m.sequence} · event {m.event_id}
            </p>
          </ParticipantMessage>
        ))}
      {cursor && (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void load(cursor)}
        >
          Load more history
        </Button>
      )}
    </section>
  );
}
