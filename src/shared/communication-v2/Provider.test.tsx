import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { V2CommunicationProvider, useV2Communication } from "./Provider";
const state = vi.hoisted(() => ({
  clients: [] as Array<{
    close: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    emit: (state: string) => void;
  }>,
}));
vi.mock("@/shared/websocket/caosV2", () => ({
  CaosV2Client: class {
    close = vi.fn();
    connect = vi.fn().mockResolvedValue(undefined);
    constructor(
      _url: string,
      public emit: (status: string) => void
    ) {
      state.clients.push(this);
    }
  },
}));
function Probe() {
  const value = useV2Communication();
  return (
    <>
      <p>{value.status}</p>
      <p>{value.owner || "signed-out"}</p>
      <button onClick={() => void value.connect()}>Connect probe</button>
      <a href="/api/auth/logout">Logout probe</a>
    </>
  );
}
function view(owner: string | null = "session-a", children = <Probe />) {
  return (
    <V2CommunicationProvider owner={owner} websocketBase="ws://localhost:8001">
      {children}
    </V2CommunicationProvider>
  );
}
beforeEach(() => {
  state.clients = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("uses one session client across conversation navigation and closes on replacement and unmount", async () => {
  const { rerender, unmount } = render(view());
  await waitFor(() => expect(state.clients).toHaveLength(1));
  fireEvent.click(screen.getByText("Connect probe"));
  rerender(
    view(
      "session-a",
      <div>
        <Probe />
        <span>Another conversation</span>
      </div>
    )
  );
  expect(state.clients).toHaveLength(1);
  rerender(view("session-b"));
  await waitFor(() => expect(state.clients).toHaveLength(2));
  expect(state.clients[0].close).toHaveBeenCalledOnce();
  unmount();
  expect(state.clients[1].close).toHaveBeenCalledOnce();
});
it("clears session ownership when socket policy rejects the connection", async () => {
  render(view());
  await waitFor(() => expect(state.clients).toHaveLength(1));
  act(() => state.clients[0].emit("denied"));
  expect(screen.getByText("signed-out")).toBeVisible();
});
it("detects logout or session replacement in another tab and closes the old client", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ owner: "session-b" }))
  );
  render(view());
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(state.clients[0].close).toHaveBeenCalled();
  expect(screen.getByText("signed-out")).toBeVisible();
});
it("disposes on pagehide", async () => {
  render(view());
  await waitFor(() => expect(state.clients).toHaveLength(1));
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(state.clients[0].close).toHaveBeenCalledOnce();
});
