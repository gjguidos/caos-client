import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CaosV2Client } from "./caosV2";

class Socket {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 1;
  bufferedAmount = 0;
  onopen?: () => void;
  onmessage?: (message: { data: string }) => void;
  onclose?: (event?: { code: number }) => void;
  onerror?: () => void;
  sent: string[] = [];
  constructor(public url: string) {
    Socket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  emit(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

async function connected() {
  const client = new CaosV2Client("ws://localhost:8001");
  const promise = client.connect();
  expect(client.connect()).toBe(promise);
  await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
  const socket = Socket.instances[0];
  socket.onopen?.();
  socket.emit({ type: "session.ready" });
  await promise;
  return { client, socket };
}

beforeEach(() => {
  Socket.instances = [];
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ticket: "one-use-ticket" }),
    })
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("CaosV2Client", () => {
  it("exchanges server ticket and authenticates in a frame without URL credentials", async () => {
    const { client, socket } = await connected();
    expect(fetch).toHaveBeenCalledWith(
      "/api/caos/v2/ticket",
      expect.objectContaining({ method: "POST" })
    );
    expect(socket.url).toBe("ws://localhost:8001/ws/api/v2/caos");
    expect(JSON.parse(socket.sent[0])).toEqual({
      type: "authenticate",
      ticket: "one-use-ticket",
    });
    client.close();
  });

  it("correlates conversations and targets over one connection", async () => {
    const { client, socket } = await connected();
    const a = client.sendChat("a", ["adam", "eve"], "hello", "one");
    const b = client.sendChat("b", ["adam"], "hello", "two");
    socket.emit({
      type: "chat.context",
      conversation_id: "wrong",
      correlation_id: "one",
    });
    socket.emit({
      type: "chat.context",
      conversation_id: "b",
      correlation_id: "two",
    });
    socket.emit({
      type: "chat.context",
      conversation_id: "a",
      correlation_id: "one",
    });
    expect((await a).conversation_id).toBe("a");
    expect((await b).conversation_id).toBe("b");
    expect(JSON.parse(socket.sent[1]).agent_ids).toEqual(["adam", "eve"]);
    expect(JSON.parse(socket.sent[1]).response_mode).toBe("llm");
    expect(Socket.instances).toHaveLength(1);
    client.close();
  });

  it("bounds submissions and rejects all pending work on disconnect", async () => {
    const { client, socket } = await connected();
    const pending = Array.from({ length: 8 }, (_, i) =>
      client.sendChat("c", ["adam"], "hello", `${i}`)
    );
    const settled = Promise.allSettled(pending);
    await expect(
      client.sendChat("c", ["adam"], "hello", "overflow")
    ).rejects.toThrow("backpressure");
    socket.close();
    expect(
      (await settled).every((result) => result.status === "rejected")
    ).toBe(true);
  });

  it("settles queued cancellation as well as its correlated acknowledgement", async () => {
    const { client, socket } = await connected();
    const original = client.sendChat("c", ["adam"], "hello", "original");
    const cancel = client.cancel("c", "original");
    const control = JSON.parse(socket.sent[2]);
    socket.emit({
      type: "event.cancelled",
      conversation_id: "c",
      correlation_id: control.event_id,
      cancel_event_id: "original",
    });
    expect((await original).code).toBe("cancelled");
    expect((await cancel).type).toBe("event.cancelled");
    client.close();
  });

  it("requires a fresh ticket after disconnect without silently replaying work", async () => {
    const { client, socket } = await connected();
    socket.close();
    const reconnect = client.connect();
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(2));
    const fresh = Socket.instances[1];
    fresh.onopen?.();
    fresh.emit({ type: "session.ready" });
    await reconnect;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fresh.sent).toHaveLength(1);
    client.close();
  });
});

it("keeps cancellation available when the chat submission limit is full", async () => {
  const { client, socket } = await connected();
  const chats = Array.from({ length: 8 }, (_, i) =>
    client.sendChat("c", ["adam"], "hello", `full-${i}`)
  );
  const outcomes = Promise.allSettled(chats);
  const cancel = client.cancel("c", "full-0");
  const envelope = JSON.parse(socket.sent[socket.sent.length - 1]);
  socket.emit({
    type: "event.cancelled",
    conversation_id: "c",
    correlation_id: envelope.event_id,
    cancel_event_id: "full-0",
  });
  expect((await cancel).type).toBe("event.cancelled");
  expect((await chats[0]).code).toBe("cancelled");
  client.close();
  await outcomes;
});

it("reports idle socket revocation so the session provider can clear private UI", async () => {
  const changes: string[] = [];
  const client = new CaosV2Client("ws://localhost:8001", (state) =>
    changes.push(state)
  );
  const opening = client.connect();
  await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
  Socket.instances[0].emit({ type: "session.ready" });
  await opening;
  Socket.instances[0].onclose?.({ code: 1008 });
  expect(changes).toEqual(["connecting", "ready", "denied"]);
  client.close();
});
it("disposes a half-open handshake without allowing its old timeout to close a new connection", async () => {
  vi.useFakeTimers();
  const client = new CaosV2Client("ws://localhost:8001");
  const first = client.connect();
  const outcome = expect(first).rejects.toThrow("disposed");
  await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
  client.close();
  await outcome;
  const next = client.connect();
  await vi.waitFor(() => expect(Socket.instances).toHaveLength(2));
  Socket.instances[1].emit({ type: "session.ready" });
  await next;
  await vi.advanceTimersByTimeAsync(6100);
  expect(Socket.instances[1].readyState).toBe(1);
  client.close();
});
it("rejects oversized serialized frames before closing the backend socket", async () => {
  const { client, socket } = await connected();
  await expect(
    client.sendChat("c", ["adam"], "\u0001".repeat(8192))
  ).rejects.toThrow("16 KiB");
  expect(socket.sent).toHaveLength(1);
  client.close();
});
