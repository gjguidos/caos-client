import { describe, expect, it } from "vitest";
import {
  creationDraftSchema,
  DRAFT_CONTRACT,
  DRAFT_VERSION,
  initialDraftValues,
  presentationSchema,
  requiredDraftGaps,
} from "./draft";
import { presentationFixture } from "./draft.fixture";
import type { AgentFormValues } from "@/shared/lib/agent.types";

const valid = () => ({
  contract: DRAFT_CONTRACT,
  schema_version: DRAFT_VERSION,
  resource_type: "agent",
  creation: {
    ...initialDraftValues,
    name: "New Agent",
    role_name: "general",
    personality_key: "empty_eva",
    prompt: "Help the user.",
  },
});

describe("Agent creation draft v1", () => {
  it("resolves only presentation v1 and requires the five creation-contract fields", () => {
    expect(presentationSchema.safeParse(presentationFixture).success).toBe(
      true
    );
    expect(
      presentationSchema.safeParse({
        ...presentationFixture,
        presentation_version: 2,
      }).success
    ).toBe(false);
    expect(
      presentationSchema.safeParse({
        ...presentationFixture,
        schema_version: 2,
      }).success
    ).toBe(false);
    const draft: AgentFormValues = {
      name: "",
      type: "",
      roleRegistry: "",
      personalityRegistry: "",
      prompt: "",
      tools: [],
      workflows: [],
      rulepackRegistry: "",
      rulePackIds: [],
      security: { visibility: "private", whitelisted_groups: [] },
      cognitive_modules: {} as AgentFormValues["cognitive_modules"],
    };
    expect(
      requiredDraftGaps(draft, presentationFixture).map((gap) => gap.field)
    ).toEqual([
      "name",
      "type",
      "roleRegistry",
      "personalityRegistry",
      "prompt",
    ]);
    expect(
      requiredDraftGaps(
        {
          ...draft,
          name: "Draft",
          type: "chat",
          roleRegistry: "general",
          personalityRegistry: "empty_eva",
          prompt: "Help",
        },
        presentationFixture
      )
    ).toEqual([]);
  });
  it("retains optional Tool configurations, Workflows, RulePacks and group references", () => {
    const input = valid();
    const creation = {
      ...input.creation,
      tools: [{ key: "tool", config: { limit: 7 } }],
      workflows: ["flow"],
      rule_pack_ids: ["safe"],
      whitelisted_groups: ["team"],
    };
    expect(
      creationDraftSchema.parse({ ...input, creation }).creation
    ).toMatchObject(creation);
    expect(
      creationDraftSchema.safeParse({
        ...input,
        creation: { ...creation, tools: [{ key: "tool", config: [] }] },
      }).success
    ).toBe(false);
  });
  it("normalizes a structured creation input without identity or grants", () => {
    const input = valid();
    input.creation.name = "  New   Agent  ";
    const result = creationDraftSchema.parse(input);
    expect(result.creation.name).toBe("New Agent");
    expect(result.creation).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("authorization");
  });
  it.each([
    "id",
    "creator",
    "tenant_id",
    "runtime_version",
    "permit",
    "authorization",
    "grants",
  ])("rejects server-owned or unknown creation field %s", (key) => {
    const input = valid();
    expect(
      creationDraftSchema.safeParse({
        ...input,
        creation: { ...input.creation, [key]: "forged" },
      }).success
    ).toBe(false);
  });
  it("rejects unsupported versions and envelope fields", () => {
    expect(
      creationDraftSchema.safeParse({ ...valid(), schema_version: 2 }).success
    ).toBe(false);
    expect(
      creationDraftSchema.safeParse({ ...valid(), permit: {} }).success
    ).toBe(false);
  });
  it.each(["", "admin", "-bad", "x".repeat(101)])(
    "rejects invalid names %s",
    (name) => {
      const input = valid();
      input.creation.name = name;
      expect(creationDraftSchema.safeParse(input).success).toBe(false);
    }
  );
});
