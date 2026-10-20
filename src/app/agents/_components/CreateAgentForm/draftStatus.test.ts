import type { AgentFormValues } from "@/shared/lib/agent.types";
import { describe, expect, it } from "vitest";
import {
  changedModules,
  DraftContext,
  getDraftGaps,
  gapsForStep,
  isStepAnswered,
  provenanceOf,
} from "./draftStatus";
import { MenuSection } from "./sections/wizardSteps";

const ctx: DraftContext = {
  cognitiveModules: {
    llm: { default: "azure-gpt-4o", options: ["azure-gpt-4o", "azure-gpt-5"] },
    db: { default: "mongodb", options: ["mongodb"] },
    // No default, so genuinely optional.
    messaging: { default: "", options: ["kafka"] },
  },
};

function draft(overrides: Partial<AgentFormValues> = {}): AgentFormValues {
  return {
    name: "Nova Research",
    type: "chat",
    roleRegistry: "researcher",
    prompt: "",
    personalityRegistry: "social-chameleon",
    tools: [{ key: "rag", config: {} }],
    workflows: [],
    security: { visibility: "public", whitelisted_groups: [] },
    cognitive_modules: {
      llm: "azure-gpt-4o",
      image: "",
      video: "",
      audio: "",
      db: "mongodb",
      cache: "",
      communication: "",
      knowledge_db: "",
      embedding: "",
      messaging: "",
    },
    rulepackRegistry: "",
    ...overrides,
  };
}

describe("getDraftGaps", () => {
  it("reports nothing for a complete draft", () => {
    expect(getDraftGaps(draft(), ctx)).toEqual([]);
  });

  it("requires a name that is more than whitespace", () => {
    const gaps = getDraftGaps(draft({ name: "   " }), ctx);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      field: "name",
      step: MenuSection.Identity,
    });
  });

  it("requires an agent type and role", () => {
    const gaps = getDraftGaps(draft({ type: "", roleRegistry: "" }), ctx);
    expect(gaps.map((g) => g.field)).toEqual(["type", "roleRegistry"]);
  });

  it("requires every cognitive module that ships a default", () => {
    const values = draft();
    values.cognitive_modules.llm = "";
    const gaps = getDraftGaps(values, ctx);
    expect(gaps.map((g) => g.field)).toEqual(["cognitive_modules.llm"]);
  });

  it("leaves modules without a default alone", () => {
    const values = draft();
    values.cognitive_modules.messaging = "";
    expect(getDraftGaps(values, ctx)).toEqual([]);
  });

  it("accepts a private agent with no allowed groups", () => {
    const privateDraft = draft({
      security: { visibility: "private", whitelisted_groups: [] },
    });
    expect(getDraftGaps(privateDraft, ctx)).toEqual([]);
  });

  it("tolerates an empty module registry", () => {
    expect(getDraftGaps(draft(), { cognitiveModules: {} })).toEqual([]);
  });
});

describe("gapsForStep", () => {
  it("partitions gaps by the step that owns them", () => {
    const values = draft({ name: "", roleRegistry: "" });
    const gaps = getDraftGaps(values, ctx);
    expect(gapsForStep(gaps, MenuSection.Identity)).toHaveLength(2);
    expect(gapsForStep(gaps, MenuSection.Access)).toHaveLength(0);
    expect(gapsForStep(gaps, MenuSection.Capabilities)).toHaveLength(0);
  });
});

describe("isStepAnswered", () => {
  it("is false for a step that still has gaps", () => {
    const values = draft({ name: "" });
    const gaps = getDraftGaps(values, ctx);
    expect(isStepAnswered(values, MenuSection.Identity, gaps)).toBe(false);
  });

  it("needs a tool or a workflow before Capabilities counts", () => {
    const empty = draft({ tools: [], workflows: [] });
    expect(isStepAnswered(empty, MenuSection.Capabilities, [])).toBe(false);

    const withWorkflow = draft({ tools: [], workflows: ["mini"] });
    expect(isStepAnswered(withWorkflow, MenuSection.Capabilities, [])).toBe(
      true
    );
  });

  it("needs a personality before Behaviour counts, since nothing there is required", () => {
    expect(
      isStepAnswered(
        draft({ personalityRegistry: "" }),
        MenuSection.Behaviour,
        []
      )
    ).toBe(false);
    expect(isStepAnswered(draft(), MenuSection.Behaviour, [])).toBe(true);
  });
});

describe("changedModules", () => {
  it("lists only modules moved away from their default", () => {
    const values = draft();
    values.cognitive_modules.llm = "azure-gpt-5";
    expect(changedModules(values, ctx)).toEqual(["llm"]);
  });

  it("ignores blanks and untouched defaults", () => {
    const values = draft();
    values.cognitive_modules.llm = "";
    expect(changedModules(values, ctx)).toEqual([]);
  });
});

describe("provenanceOf", () => {
  it("distinguishes set, inherited and empty", () => {
    expect(provenanceOf("", "mongodb")).toBe("empty");
    expect(provenanceOf("mongodb", "mongodb")).toBe("inherited");
    expect(provenanceOf("postgres", "mongodb")).toBe("set");
    expect(provenanceOf("anything", "")).toBe("set");
  });
});
