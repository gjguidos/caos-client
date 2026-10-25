"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/shared/components/PageHeader/PageHeader";
import { useSession } from "@/shared/auth/SessionProvider";
import { useV2Communication } from "@/shared/communication-v2/Provider";
import type { CaosResponseV2 } from "@/shared/websocket/caosV2";
import { Transcript } from "./Transcript";
import { ParticipantMessage } from "./ParticipantMessage";
import {
  readConversation,
  readRecent,
  remember,
  validId,
  type Conversation,
} from "./model";

type Turn = {
  id: string;
  text: string;
  status: string;
  response?: CaosResponseV2;
  error?: string;
  cancelling?: boolean;
};
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Request failed";

export function ConversationWorkspace({
  initialId = "",
  initialAgentId = "",
}: {
  initialId?: string;
  initialAgentId?: string;
}) {
  const { owner } = useV2Communication();
  return (
    <Workspace
      key={`${owner ?? "signed-out"}:${initialAgentId}`}
      initialId={initialId}
      initialAgentId={initialAgentId}
    />
  );
}

function Workspace({
  initialId,
  initialAgentId,
}: {
  initialId: string;
  initialAgentId: string;
}) {
  const {
    client,
    owner,
    status,
    error: connectionError,
    connect,
    disconnect,
  } = useV2Communication();
  const session = useSession();
  const router = useRouter();
  const [recent, setRecent] = useState<string[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  // A route preselects a participant only; creation still requires UTU approval.
  const [agentInput, setAgentInput] = useState(
    validId(initialAgentId) ? initialAgentId : ""
  );
  const [openId, setOpenId] = useState(initialId);
  const [targets, setTargets] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Record<string, Turn[]>>({});
  const [historyRevision, setHistoryRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const operation = useRef(0);
  const http = useRef<AbortController | null>(null);
  const submitting = useRef(new Set<string>());

  useEffect(() => {
    alive.current = true;
    if (session?.sub) setRecent(readRecent(session.sub));
    return () => {
      alive.current = false;
      ++operation.current;
      http.current?.abort();
    };
  }, [session?.sub]);

  useEffect(() => {
    const sequence = ++operation.current;
    http.current?.abort();
    setOpenId(initialId);
    setConversation(null);
    setTargets([]);
    setError("");
    if (!initialId || !owner) {
      setBusy(false);
      return;
    }
    if (!validId(initialId)) {
      setError("Invalid conversation ID");
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    http.current = controller;
    setBusy(true);
    void (async () => {
      try {
        const response = await fetch(
          `/api/caos/v2/conversations/${encodeURIComponent(initialId)}`,
          { cache: "no-store", signal: controller.signal }
        );
        if (!response.ok)
          throw new Error(
            `Open denied or unavailable (HTTP ${response.status}). Membership and agent permissions must still be valid.`
          );
        const value = readConversation(await response.json());
        if (value.id !== initialId) throw new Error("Conversation ID mismatch");
        if (!alive.current || sequence !== operation.current) return;
        setConversation(value);
        setTargets(value.agent_ids.slice(0, 4));
        if (session?.sub) setRecent(remember(session.sub, value.id));
      } catch (reason) {
        if (
          alive.current &&
          sequence === operation.current &&
          !controller.signal.aborted
        )
          setError(errorText(reason));
      } finally {
        if (alive.current && sequence === operation.current) setBusy(false);
      }
    })();
    return () => controller.abort();
  }, [initialId, owner, session?.sub]);

  const create = async () => {
    const agent_ids = agentInput
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (
      !agent_ids.length ||
      agent_ids.length > 8 ||
      new Set(agent_ids).size !== agent_ids.length ||
      !agent_ids.every(validId)
    ) {
      setError("Enter one to eight distinct authorized agent IDs.");
      return;
    }
    const sequence = ++operation.current;
    http.current?.abort();
    const controller = new AbortController();
    http.current = controller;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/caos/v2/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_ids }),
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(
          `Creation denied or unavailable (HTTP ${response.status}). UTU must authorize every participant.`
        );
      const value = readConversation(await response.json());
      if (!alive.current || sequence !== operation.current) return;
      if (session?.sub) setRecent(remember(session.sub, value.id));
      router.push(
        `/v2/conversations?conversation=${encodeURIComponent(value.id)}`
      );
    } catch (reason) {
      if (
        alive.current &&
        sequence === operation.current &&
        !controller.signal.aborted
      )
        setError(errorText(reason));
    } finally {
      if (alive.current && sequence === operation.current) setBusy(false);
    }
  };
  const updateTurn = (
    conversationId: string,
    id: string,
    patch: Partial<Turn>
  ) => {
    if (alive.current)
      setTurns((previous) => ({
        ...previous,
        [conversationId]: (previous[conversationId] || []).map((turn) =>
          turn.id === id ? { ...turn, ...patch } : turn
        ),
      }));
  };
  const send = async () => {
    if (
      !client ||
      !conversation ||
      status !== "ready" ||
      !text.trim() ||
      !targets.length ||
      targets.length > 4 ||
      submitting.current.has(conversation.id)
    )
      return;
    if (new TextEncoder().encode(text).length > 8192) {
      setError("Message exceeds the 8 KiB UTF-8 limit.");
      return;
    }
    const id = globalThis.crypto.randomUUID();
    const conversationId = conversation.id;
    const message = text;
    submitting.current.add(conversationId);
    setTurns((previous) => ({
      ...previous,
      [conversationId]: [
        ...(previous[conversationId] || []),
        { id, text: message, status: "pending" },
      ],
    }));
    setText("");
    setError("");
    try {
      const response = await client.sendChat(
        conversationId,
        targets,
        message,
        id
      );
      updateTurn(conversationId, id, {
        response,
        status: ["chat.context", "chat.response"].includes(response.type)
          ? "completed"
          : "error",
        error: ["chat.context", "chat.response"].includes(response.type)
          ? undefined
          : response.code || response.type,
      });
    } catch (reason) {
      updateTurn(conversationId, id, {
        status: "indeterminate",
        error: errorText(reason),
      });
    } finally {
      submitting.current.delete(conversationId);
      if (alive.current) setHistoryRevision((value) => value + 1);
    }
  };
  const cancel = async (conversationId: string, id: string) => {
    if (!client) return;
    updateTurn(conversationId, id, { cancelling: true });
    try {
      const response = await client.cancel(conversationId, id);
      if (response.type !== "event.cancelled")
        throw new Error(response.code || "Cancellation not acknowledged");
    } catch (reason) {
      if (alive.current) setError(`Cancel ${id}: ${errorText(reason)}`);
    } finally {
      updateTurn(conversationId, id, { cancelling: false });
    }
  };
  const currentTurns = conversation ? turns[conversation.id] || [] : [];
  const pending = currentTurns.some((turn) => turn.status === "pending");

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 overflow-y-auto p-6">
      <PageHeader
        eyebrow="Genesis 0.2.1 · opt-in"
        title="V2 conversations"
        actions={
          <Button variant="outline" asChild>
            <Link href="/">Back to CAOS</Link>
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground">
        Chat with authorized V2 agents. Agent replies are labeled separately
        from deterministic context contributions. Conversation history reloads
        from authorized durable storage. Only recent IDs are saved in this
        browser.
      </p>
      {!owner && (
        <p role="alert">
          Session unavailable or revoked.{" "}
          <Link className="underline" href="/api/auth/login">
            Sign in
          </Link>{" "}
          to use V2.
        </p>
      )}
      {owner && !client && (
        <p role="alert">
          V2 communication is disabled or not configured. Configure
          GENESIS_COMMUNICATION_URL on the server.
        </p>
      )}
      <section
        aria-label="Session connection"
        className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-4"
      >
        <p role="status">
          Connection: {status === "ready" ? "session.ready" : status}
        </p>
        <Button
          type="button"
          onClick={() => void connect()}
          disabled={!client || status === "ready" || status === "connecting"}
        >
          {status === "disconnected" ? "Reconnect" : "Connect"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={disconnect}
          disabled={status !== "ready" && status !== "connecting"}
        >
          Disconnect
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/api/auth/logout">Log out</Link>
        </Button>
      </section>
      {(error || connectionError) && (
        <p role="alert" className="break-words text-sm text-destructive">
          {error || connectionError}
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <aside className="space-y-6">
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <h2 className="font-semibold">Create conversation</h2>
            <label htmlFor="v2-agents" className="block text-sm">
              Authorized agent IDs
            </label>
            <Input
              id="v2-agents"
              value={agentInput}
              onChange={(event) => setAgentInput(event.target.value)}
              placeholder="Adam agent ID"
              disabled={!client || busy}
            />
            <p className="text-xs text-muted-foreground">
              Use Adam’s provisioned ID, or comma-separated authorized
              participants. Participation never grants access.
            </p>
            <Button
              type="submit"
              disabled={!client || busy || !agentInput.trim()}
            >
              Create conversation
            </Button>
          </form>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (validId(openId.trim()))
                router.push(
                  `/v2/conversations?conversation=${encodeURIComponent(openId.trim())}`
                );
              else setError("Invalid conversation ID");
            }}
          >
            <label htmlFor="v2-open" className="block text-sm font-semibold">
              Open conversation ID
            </label>
            <Input
              id="v2-open"
              value={openId}
              onChange={(event) => setOpenId(event.target.value)}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={!client || busy || !openId.trim()}
            >
              Open conversation
            </Button>
          </form>
          <section aria-label="Recent conversations" className="space-y-2">
            <h2 className="font-semibold">Recent IDs on this browser</h2>
            {recent.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No locally saved IDs.
              </p>
            )}
            <ul className="space-y-2">
              {recent.map((id) => (
                <li key={id}>
                  <Link
                    className="break-all text-sm underline"
                    href={`/v2/conversations?conversation=${encodeURIComponent(id)}`}
                  >
                    {id}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
        <section aria-label="Conversation" className="min-w-0 space-y-4">
          {busy && <p role="status">Loading conversation…</p>}
          {!conversation && !busy && (
            <p>Create a conversation or open an authorized ID to begin.</p>
          )}
          {conversation && (
            <>
              <h2 className="break-all font-semibold">
                Conversation {conversation.id}
              </h2>
              <p className="text-sm text-muted-foreground">
                Refreshing reopens this ID and rechecks authorization before
                loading history.
              </p>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  Targets (up to four authorized participants)
                </legend>
                {conversation.agent_ids.map((id) => (
                  <label
                    key={id}
                    className="flex items-center gap-2 break-all text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={targets.includes(id)}
                      onChange={(event) =>
                        setTargets((previous) =>
                          event.target.checked
                            ? [...previous, id]
                            : previous.filter((value) => value !== id)
                        )
                      }
                      disabled={
                        pending ||
                        (!targets.includes(id) && targets.length >= 4)
                      }
                    />
                    Agent {id}
                  </label>
                ))}
              </fieldset>
              <Transcript
                key={conversation.id}
                conversationId={conversation.id}
                revision={historyRevision}
              />
              <div aria-label="Messages" className="space-y-4">
                {currentTurns.map((turn) => (
                  <section
                    key={turn.id}
                    className="space-y-2"
                    aria-label={`Turn ${turn.id}`}
                  >
                    {(turn.status === "pending" ||
                      turn.status === "indeterminate") && (
                      <ParticipantMessage
                        participant={session?.name || "You"}
                        kind="user"
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {turn.text}
                        </p>
                      </ParticipantMessage>
                    )}
                    <p
                      role="status"
                      className="break-all text-xs text-muted-foreground"
                    >
                      {turn.status === "pending" ||
                      turn.status === "indeterminate"
                        ? `Local request: ${turn.status}`
                        : turn.status}{" "}
                      · event {turn.id}
                      {turn.response?.correlation_id &&
                        ` · correlation ${turn.response.correlation_id}`}
                    </p>
                    {turn.error && (
                      <p role="alert" className="text-sm text-destructive">
                        {turn.error}
                        {turn.status === "indeterminate" &&
                          ". Reconnect explicitly; this request will not be replayed."}
                      </p>
                    )}
                    {turn.status === "pending" && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={turn.cancelling || status !== "ready"}
                        onClick={() => void cancel(conversation.id, turn.id)}
                      >
                        {turn.cancelling ? "Cancelling…" : "Cancel request"}
                      </Button>
                    )}
                  </section>
                ))}
              </div>
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
              >
                <label
                  htmlFor="v2-message"
                  className="block text-sm font-medium"
                >
                  Message to selected agents
                </label>
                <Textarea
                  id="v2-message"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  maxLength={8192}
                  disabled={!client || status !== "ready" || pending}
                />
                <Button
                  type="submit"
                  disabled={
                    !client ||
                    status !== "ready" ||
                    pending ||
                    !targets.length ||
                    !text.trim()
                  }
                >
                  Send message
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
