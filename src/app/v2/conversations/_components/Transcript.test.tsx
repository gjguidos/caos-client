import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Transcript } from "./Transcript";
const message = (
  sequence: number,
  kind = "user_message",
  participant = "owner"
) => ({
  id: `m-${sequence}`,
  sequence,
  event_id: "e",
  participant_id: participant,
  kind,
  content: `persisted-${sequence}`,
  capability: kind === "capability_contribution" ? "chat.context" : null,
  outcome: "completed",
});
afterEach(() => vi.unstubAllGlobals());
it("renders actual mixed participants and paginates without duplicate rows", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementationOnce(async () =>
        Response.json({
          messages: [message(1), message(2, "capability_contribution", "adam")],
          next_cursor: "cursor",
        })
      )
      .mockImplementationOnce(async () =>
        Response.json({
          messages: [
            message(2, "capability_contribution", "adam"),
            message(3, "agent_response", "eve"),
          ],
          next_cursor: null,
        })
      )
  );
  render(<Transcript conversationId="c" revision={0} />);
  expect(await screen.findByText("persisted-1")).toBeVisible();
  expect(
    screen.getByText("Deterministic chat.context · not an LLM answer")
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Load more history" }));
  expect(await screen.findByText("persisted-3")).toBeVisible();
  expect(screen.getByText("LLM conversational response")).toBeVisible();
  expect(screen.getAllByText("persisted-2")).toHaveLength(1);
  expect(fetch).toHaveBeenLastCalledWith(
    "/api/caos/v2/conversations/c/history?cursor=cursor",
    expect.objectContaining({ cache: "no-store" })
  );
});
it("clears stored rows when refresh denies current access", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementationOnce(async () =>
        Response.json({ messages: [message(1)], next_cursor: null })
      )
      .mockImplementationOnce(async () => Response.json({}, { status: 403 }))
  );
  render(<Transcript conversationId="c" revision={0} />);
  await screen.findByText("persisted-1");
  fireEvent.click(screen.getByRole("button", { name: "Refresh history" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("HTTP 403");
  expect(screen.queryByText("persisted-1")).not.toBeInTheDocument();
});
it("ignores a delayed history response from the previous conversation", async () => {
  let finish!: (value: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          })
      )
      .mockImplementationOnce(async () =>
        Response.json({ messages: [message(2)], next_cursor: null })
      )
  );
  const { rerender } = render(
    <Transcript conversationId="first" revision={0} />
  );
  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  rerender(<Transcript conversationId="second" revision={0} />);
  await screen.findByText("persisted-2");
  await act(async () =>
    finish(Response.json({ messages: [message(1)], next_cursor: null }))
  );
  expect(screen.queryByText("persisted-1")).not.toBeInTheDocument();
});
it("refetches on turn completion and reloads on remount without socket fabrication", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async () =>
        Response.json({ messages: [message(1)], next_cursor: null })
      )
  );
  const first = render(<Transcript conversationId="c" revision={0} />);
  await screen.findByText("persisted-1");
  first.rerender(<Transcript conversationId="c" revision={1} />);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  first.unmount();
  render(<Transcript conversationId="c" revision={0} />);
  await screen.findByText("persisted-1");
  expect(fetch).toHaveBeenCalledTimes(3);
});
