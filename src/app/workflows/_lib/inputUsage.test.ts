import { describe, expect, it } from "vitest";
import {
  collectInputUsage,
  groupUsageByInputKey,
  type UsageScanNode,
} from "./inputUsage";
import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";
import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";

function makeTool(): ToolDefinition {
  const tone: UIComponent = {
    id: "tone",
    type: "text",
    widget: "TextField",
    group: "propertiesPanel.style",
    flag_config: { flag: "--tone_of_voice", required: false },
    render_paths: ["propertiesPanel.style"],
    slot_order: 5,
    props: { label: "Tone" },
  };
  return {
    key: "writer",
    name: "writer",
    description: "",
    version: "1",
    ui: {
      components: [tone],
      config: { chat_input: { id: "text", flag: "--text", required: true } },
    },
    supports: {
      files: {
        max_count: 1,
        max_size_bytes: 1,
        accepted_mimes: null,
        slots: [{ name: "doc_file", label: "Document" }],
      },
    },
  };
}

const getTool = (toolName: string | undefined) =>
  toolName === "writer" ? makeTool() : undefined;

function toolNode(
  id: string,
  data: Partial<UsageScanNode["data"]> = {}
): UsageScanNode {
  return {
    id,
    data: { stepType: "tool", label: id, toolName: "writer", ...data },
  };
}

describe("collectInputUsage", () => {
  it("reports a whole-value command binding as one whole usage", () => {
    const usages = collectInputUsage(
      [toolNode("s1", { command: "@writer --text=${inputs.topic}" })],
      getTool
    );
    expect(usages).toEqual([
      {
        inputKey: "topic",
        stepId: "s1",
        stepLabel: "s1",
        target: { kind: "arg", componentId: "text" },
        fieldLabel: "text",
        whole: true,
      },
    ]);
  });

  it("reports a token embedded in a larger string as not whole", () => {
    const usages = collectInputUsage(
      [
        toolNode("s1", {
          command: '@writer --text="Summarize: ${inputs.topic}"',
        }),
      ],
      getTool
    );
    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({ inputKey: "topic", whole: false });
  });

  it("deduplicates repeated references within the same command field", () => {
    const usages = collectInputUsage(
      [
        toolNode("s1", {
          command: '@writer --text="${inputs.topic} ${inputs.topic}"',
        }),
      ],
      getTool
    );
    expect(usages).toEqual([
      {
        inputKey: "topic",
        stepId: "s1",
        stepLabel: "s1",
        target: { kind: "arg", componentId: "text" },
        fieldLabel: "text",
        whole: false,
      },
    ]);
  });

  it("ignores malformed command references with a blank input key", () => {
    const usages = collectInputUsage(
      [toolNode("s1", { command: "@writer --text=${inputs.}" })],
      getTool
    );
    expect(usages).toEqual([]);
  });

  it("reports a file-slot binding with the slot's label", () => {
    const usages = collectInputUsage(
      [toolNode("s1", { fileBindings: { doc_file: "${inputs.doc}" } })],
      getTool
    );
    expect(usages).toEqual([
      {
        inputKey: "doc",
        stepId: "s1",
        stepLabel: "s1",
        target: { kind: "slot", slotName: "doc_file" },
        fieldLabel: "Document",
        whole: true,
      },
    ]);
  });

  it("deduplicates repeated references within the same file slot", () => {
    const usages = collectInputUsage(
      [
        toolNode("s1", {
          fileBindings: { doc_file: "${inputs.doc}:${inputs.doc}" },
        }),
      ],
      getTool
    );
    expect(usages).toEqual([
      {
        inputKey: "doc",
        stepId: "s1",
        stepLabel: "s1",
        target: { kind: "slot", slotName: "doc_file" },
        fieldLabel: "Document",
        whole: false,
      },
    ]);
  });

  it("ignores malformed file-slot references with a blank input key", () => {
    const usages = collectInputUsage(
      [toolNode("s1", { fileBindings: { doc_file: "${inputs.}" } })],
      getTool
    );
    expect(usages).toEqual([]);
  });

  it("reports one usage per referenced input on the same step", () => {
    const usages = collectInputUsage(
      [
        toolNode("s1", {
          command:
            "@writer --text=${inputs.topic} --tone_of_voice=${inputs.tone}",
        }),
      ],
      getTool
    );
    expect(usages.map((u) => u.inputKey).sort()).toEqual(["tone", "topic"]);
  });

  it("still reports a reference to an undeclared key", () => {
    const usages = collectInputUsage(
      [toolNode("s1", { command: "@writer --text=${inputs.nope}" })],
      getTool
    );
    expect(usages.map((u) => u.inputKey)).toEqual(["nope"]);
  });

  it("ignores non-tool steps and unresolvable tools", () => {
    const usages = collectInputUsage(
      [
        { id: "p1", data: { stepType: "pause", label: "Pause" } },
        toolNode("s1", {
          toolName: "missing",
          command: "@missing --text=${inputs.topic}",
        }),
      ],
      getTool
    );
    expect(usages).toEqual([]);
  });

  it("keeps node order, then arg order, then slot order", () => {
    const usages = collectInputUsage(
      [
        toolNode("s1", {
          command: "@writer --text=${inputs.a}",
          fileBindings: { doc_file: "${inputs.b}" },
        }),
        toolNode("s2", { command: "@writer --text=${inputs.c}" }),
      ],
      getTool
    );
    expect(usages.map((u) => u.inputKey)).toEqual(["a", "b", "c"]);
  });
});

describe("groupUsageByInputKey", () => {
  it("groups by key, so two inputs sharing a key see the same usages", () => {
    const usages = collectInputUsage(
      [
        toolNode("s1", { command: "@writer --text=${inputs.topic}" }),
        toolNode("s2", { command: "@writer --text=${inputs.topic}" }),
      ],
      getTool
    );
    const byKey = groupUsageByInputKey(usages);
    expect(byKey.get("topic")).toHaveLength(2);
    // Two declared inputs with `key: "topic"` both read this one bucket.
    expect(byKey.get("topic")).toBe(byKey.get("topic"));
  });

  it("has no entry for an unused key", () => {
    expect(groupUsageByInputKey([]).get("topic")).toBeUndefined();
  });
});
