export interface CaosResponseV2 {
  type: string;
  event_id?: string;
  conversation_id?: string;
  correlation_id?: string;
  code?: string;
  cancel_event_id?: string;
  results?: Array<{
    agent_id: string;
    context?: Record<string, unknown>;
    response?: {
      kind: "agent_response";
      agent_id: string;
      turn_id: string;
      content: string;
    };
    llm?: { key: string; provider: string | null; model: string | null };
  }>;
}
type Pending = {
  conversation: string;
  resolve: (value: CaosResponseV2) => void;
  reject: (reason: Error) => void;
};

/** Own one instance at user-session scope, shared by all conversations/agents.
 * Explicit connect/reconnect only. Never automatically replay messages.
 */
export type V2ConnectionState =
  | "idle"
  | "connecting"
  | "ready"
  | "disconnected"
  | "denied";

export class CaosV2Client {
  private socket?: WebSocket;
  private ready = false;
  private abortHandshake?: () => void;
  private connecting?: Promise<void>;
  private generation = 0;
  private pending = new Map<string, Pending>();

  constructor(
    private readonly websocketBase: string,
    private readonly onState: (state: V2ConnectionState) => void = () =>
      undefined
  ) {}

  connect(): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (this.connecting) return this.connecting;
    this.onState("connecting");
    const generation = ++this.generation;
    const attempt = this.open(generation).catch((error: unknown) => {
      if (generation === this.generation) this.onState("disconnected");
      throw error;
    });
    this.connecting = attempt;
    void attempt
      .finally(() => {
        if (this.connecting === attempt) this.connecting = undefined;
      })
      .catch(() => undefined);
    return attempt;
  }

  private async open(generation: number): Promise<void> {
    const response = await fetch("/api/caos/v2/ticket", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Genesis ticket unavailable");
    const { ticket } = await response.json();
    if (typeof ticket !== "string" || !ticket)
      throw new Error("Invalid Genesis ticket");
    if (generation !== this.generation) throw new Error("Connection disposed");
    const url = new URL("/ws/api/v2/caos", this.websocketBase);
    if (
      !["ws:", "wss:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      throw new Error("Invalid WebSocket base URL");
    }
    const socket = new WebSocket(url.toString());
    this.socket = socket;
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        if (this.abortHandshake === abort) this.abortHandshake = undefined;
      };
      const abort = () => {
        cleanup();
        reject(new Error("Genesis connection disposed"));
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Genesis handshake timeout"));
        if (this.socket === socket) this.close();
      }, 6000);
      this.abortHandshake = abort;
      socket.onopen = () => {
        if (generation !== this.generation || this.socket !== socket) {
          socket.close();
          return;
        }
        socket.send(JSON.stringify({ type: "authenticate", ticket }));
      };
      socket.onmessage = ({ data }) => {
        if (generation !== this.generation || this.socket !== socket) return;
        let message: CaosResponseV2;
        try {
          message = JSON.parse(data);
        } catch {
          this.close();
          return;
        }
        if (
          !message ||
          typeof message !== "object" ||
          typeof message.type !== "string"
        ) {
          this.close();
          return;
        }
        if (message.type === "session.ready") {
          if (generation !== this.generation) {
            socket.close();
            return;
          }
          cleanup();
          this.ready = true;
          this.onState("ready");
          resolve();
          return;
        }
        if (message.type === "event.cancelled" && message.cancel_event_id) {
          const original = this.pending.get(message.cancel_event_id);
          if (original && original.conversation === message.conversation_id) {
            this.pending.delete(message.cancel_event_id);
            original.resolve({
              ...message,
              type: "event.error",
              code: "cancelled",
              correlation_id: message.cancel_event_id,
            });
          }
        }
        const id = message.correlation_id;
        const entry = id ? this.pending.get(id) : undefined;
        if (!id || !entry || entry.conversation !== message.conversation_id)
          return;
        // pending/backpressure/conflict settle this submission without hidden retries.
        this.pending.delete(id);
        entry.resolve(message);
      };
      const disconnected = (event?: CloseEvent) => {
        cleanup();
        const error = new Error(
          "Genesis disconnected; request outcome may be indeterminate"
        );
        reject(error);
        if (this.socket === socket) {
          this.ready = false;
          this.onState(event?.code === 1008 ? "denied" : "disconnected");
          this.socket = undefined;
          for (const entry of this.pending.values()) entry.reject(error);
          this.pending.clear();
        }
      };
      socket.onclose = disconnected;
      socket.onerror = () => {
        disconnected();
        socket.close();
      };
    });
  }

  sendChat(
    conversation: string,
    agentIds: string[],
    message: string,
    eventId = globalThis.crypto.randomUUID()
  ): Promise<CaosResponseV2> {
    return this.send(conversation, eventId, {
      type: "chat.message",
      response_mode: "llm",
      conversation_id: conversation,
      event_id: eventId,
      agent_ids: agentIds,
      message,
    });
  }

  cancel(conversation: string, eventId: string): Promise<CaosResponseV2> {
    const cancelId = globalThis.crypto.randomUUID();
    return this.send(conversation, cancelId, {
      type: "event.cancel",
      conversation_id: conversation,
      event_id: cancelId,
      cancel_event_id: eventId,
    });
  }

  private send(
    conversation: string,
    id: string,
    envelope: Record<string, unknown>
  ): Promise<CaosResponseV2> {
    const socket = this.socket;
    if (!this.ready || !socket || socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("Genesis is not connected"));
    }
    if (
      this.pending.size >= (envelope.type === "event.cancel" ? 16 : 8) ||
      this.pending.has(id) ||
      socket.bufferedAmount > 65536
    ) {
      return Promise.reject(
        new Error("Genesis backpressure or duplicate event ID")
      );
    }
    const serialized = JSON.stringify(envelope);
    if (new TextEncoder().encode(serialized).length > 16384) {
      return Promise.reject(new Error("Genesis frame exceeds 16 KiB"));
    }
    return new Promise((resolve, reject) => {
      this.pending.set(id, { conversation, resolve, reject });
      try {
        socket.send(serialized);
      } catch {
        this.pending.delete(id);
        reject(new Error("Genesis send failed"));
      }
    });
  }

  /** Call on logout/session replacement and owner disposal. */
  close(): void {
    ++this.generation;
    this.abortHandshake?.();
    this.ready = false;
    const socket = this.socket;
    this.socket = undefined;
    this.connecting = undefined;
    socket?.close();
    this.onState("idle");
    const error = new Error("Genesis connection disposed");
    for (const entry of this.pending.values()) entry.reject(error);
    this.pending.clear();
  }
}
