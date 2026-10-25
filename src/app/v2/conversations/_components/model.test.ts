import { expect, it } from "vitest";
import { readConversation, readRecent, remember, recentKey } from "./model";
it("keeps only valid recent IDs bounded and scoped by user; never stores messages", () => {
  localStorage.clear();
  for (let i = 0; i < 22; ++i) remember("user", `conversation-${i}`);
  expect(readRecent("user")).toHaveLength(20);
  expect(readRecent("other")).toEqual([]);
  expect(remember("user", "conversation-21")).toHaveLength(20);
  localStorage.setItem(recentKey("user"), '["valid", "../bad", null]');
  expect(readRecent("user")).toEqual(["valid"]);
});
it("rejects malformed conversation responses rather than inventing participation", () => {
  for (const data of [
    {},
    { id: "x", agent_ids: [] },
    { id: "../bad", agent_ids: ["adam"] },
    { id: "x", agent_ids: [null] },
  ])
    expect(() => readConversation(data)).toThrow();
});
