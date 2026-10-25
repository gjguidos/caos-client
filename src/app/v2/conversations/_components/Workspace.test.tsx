import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { ConversationWorkspace } from "./Workspace";
import { SessionProvider } from "@/shared/auth/SessionProvider";
import type { CaosResponseV2 } from "@/shared/websocket/caosV2";
import { getCurrentNavigationMocks } from "@/test-utils/test-utils";
const connection = vi.hoisted(() => ({
  owner: "session-one" as string | null,
  status: "ready",
  error: "",
  connect: vi.fn(),
  disconnect: vi.fn(),
  client: { sendChat: vi.fn(), cancel: vi.fn() },
}));
vi.mock("@/shared/communication-v2/Provider", () => ({
  useV2Communication: () => connection,
}));
const histories = new Map<string, unknown[]>();
const conversation = { id: "conversation-one", agent_ids: ["adam", "eve"] };
function view(initialId = conversation.id) {
  return (
    <SessionProvider session={{ sub: "owner", name: "User" }}>
      <ConversationWorkspace initialId={initialId} />
    </SessionProvider>
  );
}
beforeEach(() => {
  localStorage.clear();
  histories.clear();
  connection.owner = "session-one";
  connection.status = "ready";
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) => {
      const id = url.includes("/conversations/")
        ? url.split("/conversations/")[1].split("/")[0]
        : conversation.id;
      return Response.json(
        url.endsWith("/history")
          ? { messages: histories.get(id) || [], next_cursor: null }
          : { ...conversation, id }
      );
    })
  );
  connection.client.sendChat.mockImplementation(
    async (id, _agents, text, eventId) => {
      const rows = histories.get(id) || [];
      rows.push({
        id: eventId,
        event_id: eventId,
        sequence: rows.length + 1,
        participant_id: "owner",
        kind: "user_message",
        content: text,
        capability: null,
        outcome: "completed",
      });
      for (const agent of ["adam", "eve"])
        rows.push({
          id: `${eventId}-${agent}`,
          event_id: eventId,
          sequence: rows.length + 1,
          participant_id: agent,
          kind: "capability_contribution",
          content: JSON.stringify({ hints: {}, usage_meta: {} }),
          capability: "chat.context",
          outcome: "completed",
        });
      histories.set(id, rows);
      return { type: "chat.context", correlation_id: eventId };
    }
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("reopens the persisted ID with fresh authorization and labels each deterministic participant", async () => {
  render(view());
  await screen.findByRole("heading", {
    name: `Conversation ${conversation.id}`,
  });
  expect(fetch).toHaveBeenCalledWith(
    `/api/caos/v2/conversations/${conversation.id}`,
    expect.objectContaining({ cache: "no-store" })
  );
  fireEvent.change(screen.getByLabelText("Message to selected agents"), {
    target: { value: "Hello Adam" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await screen.findAllByText("Deterministic chat.context · not an LLM answer");
  expect(screen.getByText("Hello Adam")).toBeVisible();
  expect(screen.getAllByText(/usage_meta/)).toHaveLength(2);
  expect(screen.getAllByText("Agent", { exact: true })).toHaveLength(2);
  expect(connection.client.sendChat).toHaveBeenCalledWith(
    conversation.id,
    ["adam", "eve"],
    "Hello Adam",
    expect.any(String)
  );
  expect(localStorage.getItem("caos:v2:recent:owner")).toContain(
    conversation.id
  );
});

it("creates with participant IDs only and navigates to a reusable conversation URL", async () => {
  render(view(""));
  fireEvent.change(screen.getByLabelText("Authorized agent IDs"), {
    target: { value: "adam, eve" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create conversation" }));
  await waitFor(() =>
    expect(getCurrentNavigationMocks().push).toHaveBeenCalledWith(
      "/v2/conversations?conversation=conversation-one"
    )
  );
  expect(fetch).toHaveBeenCalledWith(
    "/api/caos/v2/conversations",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ agent_ids: ["adam", "eve"] }),
    })
  );
});

it("shows backend denial and never enables send for an unauthorized conversation", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({}, { status: 403 }));
  render(view());
  expect(await screen.findByRole("alert")).toHaveTextContent("HTTP 403");
  expect(
    screen.queryByRole("button", { name: "Send message" })
  ).not.toBeInTheDocument();
});

it("keeps cancel tied to its original request and surfaces correlated errors", async () => {
  let finish!: (value: CaosResponseV2) => void;
  connection.client.sendChat.mockReturnValue(
    new Promise<CaosResponseV2>((resolve) => {
      finish = resolve;
    })
  );
  connection.client.cancel.mockResolvedValue({ type: "event.cancelled" });
  render(view());
  await screen.findByLabelText("Message to selected agents");
  fireEvent.change(screen.getByLabelText("Message to selected agents"), {
    target: { value: "Cancel me" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Cancel request" })
  );
  const id = connection.client.sendChat.mock.calls[0][3];
  expect(connection.client.cancel).toHaveBeenCalledWith(conversation.id, id);
  await act(async () =>
    finish({ type: "event.error", code: "cancelled", correlation_id: id })
  );
  expect(screen.getByRole("alert")).toHaveTextContent("cancelled");
  expect(screen.getByText(new RegExp(`correlation ${id}`))).toBeVisible();
});

it("does not replay indeterminate requests on reconnect and clears messages on session loss", async () => {
  connection.client.sendChat.mockRejectedValue(new Error("Disconnected"));
  const { rerender } = render(view());
  await screen.findByLabelText("Message to selected agents");
  fireEvent.change(screen.getByLabelText("Message to selected agents"), {
    target: { value: "Private text" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "will not be replayed"
  );
  connection.status = "disconnected";
  rerender(view());
  fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));
  expect(connection.connect).toHaveBeenCalledOnce();
  expect(connection.client.sendChat).toHaveBeenCalledOnce();
  connection.owner = null;
  rerender(view());
  expect(screen.queryByText("Private text")).not.toBeInTheDocument();
  expect(screen.getByText(/Session unavailable or revoked/)).toBeVisible();
});

it("retains separate turns when switching conversations without extra connections", async () => {
  const { rerender } = render(view());
  await screen.findByLabelText("Message to selected agents");
  fireEvent.change(screen.getByLabelText("Message to selected agents"), {
    target: { value: "First conversation" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await screen.findAllByText("Deterministic chat.context · not an LLM answer");
  rerender(view("second"));
  await screen.findByRole("heading", { name: "Conversation second" });
  expect(screen.queryByText("First conversation")).not.toBeInTheDocument();
  rerender(view());
  expect(await screen.findByText("First conversation")).toBeVisible();
  expect(connection.connect).not.toHaveBeenCalled();
});

it("preselects the discovered V2 agent without granting or creating until requested", async () => {
  render(
    <SessionProvider session={{ sub: "owner", name: "User" }}>
      <ConversationWorkspace initialAgentId="selected-v2-agent" />
    </SessionProvider>
  );
  expect(screen.getByLabelText("Authorized agent IDs")).toHaveValue(
    "selected-v2-agent"
  );
  expect(fetch).not.toHaveBeenCalled();
  vi.mocked(fetch).mockResolvedValue(Response.json({}, { status: 403 }));
  fireEvent.click(screen.getByRole("button", { name: "Create conversation" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("HTTP 403");
  expect(fetch).toHaveBeenCalledWith(
    "/api/caos/v2/conversations",
    expect.objectContaining({
      body: JSON.stringify({ agent_ids: ["selected-v2-agent"] }),
    })
  );
  expect(connection.client.sendChat).not.toHaveBeenCalled();
});

it("settles a governed LLM response and reloads its attributed canonical transcript", async () => {
  connection.client.sendChat.mockImplementationOnce(
    async (id, _agents, text, eventId) => {
      histories.set(id, [
        {
          id: eventId,
          event_id: eventId,
          sequence: 1,
          participant_id: "owner",
          kind: "user_message",
          content: text,
          capability: null,
          outcome: "completed",
        },
        {
          id: `${eventId}-adam`,
          event_id: eventId,
          sequence: 2,
          participant_id: "adam",
          kind: "agent_response",
          content: "Hello from Adam",
          capability: null,
          outcome: "completed",
        },
      ]);
      return { type: "chat.response", correlation_id: eventId };
    }
  );
  render(view());
  await screen.findByRole("heading", {
    name: `Conversation ${conversation.id}`,
  });
  fireEvent.change(screen.getByLabelText("Message to selected agents"), {
    target: { value: "Hello" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(await screen.findByText("Hello from Adam")).toBeVisible();
  expect(screen.getByText("LLM conversational response")).toBeVisible();
  expect(screen.getByText(/completed/)).toBeVisible();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
