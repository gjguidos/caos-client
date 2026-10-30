import { expect, it } from "vitest";
import {
  baseCreation,
  comparableCreation,
  dirtyFields,
  formFromComparable,
  formFromCreation,
  rebase,
  savePayload,
  serverDraftSchema,
} from "./serverDraft";

export function serverDraft(
  overrides: Record<string, unknown> = {},
  creation = {}
) {
  return serverDraftSchema.parse({
    contract: "caos.agent_draft",
    schema_version: 1,
    draft_id: "0b5c2d4e-1f00-5a00-8000-000000000001",
    source_agent_id: "enki",
    revision: 1,
    status: "editing",
    draft: {
      contract: "caos.agent_creation_draft",
      schema_version: 1,
      resource_type: "agent",
      creation,
    },
    provenance: {},
    content_digest: "a".repeat(64),
    lifecycle: null,
    forked_from: null,
    created_at: "2026-10-30T09:00:00.000Z",
    updated_at: "2026-10-30T09:00:00.000Z",
    authorizes: {
      review: false,
      approval: false,
      creation: false,
      activation: false,
    },
    ...overrides,
  });
}

it("round-trips server content through the existing editor values", () => {
  const creation = {
    name: "Summarizer",
    type: "chat",
    role_name: "general",
    personality_key: "empty_eva",
    prompt: "Summarize.",
    visibility: "public",
    tools: [{ key: "search", config: { limit: 3 } }],
    gui_components: [
      {
        type: "chat",
        key: "conversation",
        version: 1,
        default: true,
        config: {},
      },
    ],
  };
  const values = formFromCreation(creation);
  expect(values.roleRegistry).toBe("general");
  expect(values.security.visibility).toBe("public");
  const comparable = comparableCreation(values);
  expect(comparable).toMatchObject(creation);
  expect(
    dirtyFields(comparable, baseCreation(serverDraft({}, creation)))
  ).toEqual([]);
  expect(comparableCreation(formFromComparable(comparable))).toEqual(
    comparable
  );
});

it("sends only dirty, storable fields and keeps invalid interface JSON local", () => {
  const base = baseCreation(serverDraft({}, { name: "A" }));
  const local = comparableCreation({
    ...formFromCreation({ name: "B" }),
    guiComponents: "{broken",
  });
  expect(dirtyFields(local, base)).toEqual(["name", "gui_components"]);
  expect(savePayload(local, base)).toEqual({
    changes: { name: "B" },
    remove: [],
    unsaveable: ["gui_components"],
  });
  const cleared = comparableCreation(formFromCreation({ name: "A" }));
  expect(
    savePayload(
      cleared,
      baseCreation(serverDraft({}, { name: "A", gui_components: [] }))
    )
  ).toEqual({
    changes: {},
    remove: ["gui_components"],
    unsaveable: [],
  });
});

it("rebases unsaved edits per field and surfaces only true conflicts", () => {
  const base = { name: "A", prompt: "P", type: "chat" };
  const local = { name: "Mine", prompt: "P", type: "chat" };
  // Another tab changed the prompt: merged without touching my name edit.
  expect(
    rebase(base, local, { name: "A", prompt: "Theirs", type: "chat" })
  ).toEqual({
    merged: { name: "Mine", prompt: "Theirs", type: "chat" },
    conflicts: [],
  });
  // Both changed the name differently: an explicit conflict, mine kept until chosen.
  expect(
    rebase(base, local, { name: "Theirs", prompt: "P", type: "chat" })
  ).toEqual({
    merged: { name: "Mine", prompt: "P", type: "chat" },
    conflicts: [{ field: "name", mine: "Mine", theirs: "Theirs" }],
  });
  // Both made the same change: no conflict.
  expect(
    rebase(base, local, { name: "Mine", prompt: "P", type: "chat" }).conflicts
  ).toEqual([]);
});

it("rejects server responses that claim authority", () => {
  expect(() =>
    serverDraft({
      authorizes: {
        review: false,
        approval: true,
        creation: false,
        activation: false,
      },
    })
  ).toThrow();
});
