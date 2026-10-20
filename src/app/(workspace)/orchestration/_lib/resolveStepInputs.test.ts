import type { WorkflowStep } from "@/shared/lib/workflow/workflow.types";
import {
  declaredImage,
  declaredValue,
  presentedImage,
  presentedOutput,
} from "@/test-utils/workflow-fixtures";
import { describe, expect, it } from "vitest";
import {
  resolveFileBindings,
  resolveStepInputs,
  type ResolutionContext,
} from "./resolveStepInputs";

function step(command?: string): WorkflowStep {
  return { id: "write", type: "tool", ...(command ? { command } : {}) };
}

function ctx(overrides: Partial<ResolutionContext> = {}): ResolutionContext {
  return { inputs: {}, stepOutputs: {}, ...overrides };
}

/** A completed `research` step declaring one string output. */
function researchProduced(value: unknown = "Sales are up") {
  return {
    research: presentedOutput({
      text: typeof value === "string" ? value : null,
      declared: { answer: declaredValue("Answer", value) },
    }),
  };
}

describe("resolveStepInputs", () => {
  it("returns nothing for a step with no command", () => {
    expect(resolveStepInputs(step(), ctx())).toEqual([]);
  });

  it("reports a plain literal", () => {
    expect(resolveStepInputs(step("@writer --topic=bikes"), ctx())).toEqual([
      {
        name: "topic",
        source: { kind: "literal" },
        value: "bikes",
      },
    ]);
  });

  it("keeps a quoted literal intact", () => {
    const args = resolveStepInputs(
      step('@writer --topic="Q3 launch plan"'),
      ctx()
    );
    expect(args[0].value).toBe("Q3 launch plan");
  });

  it("resolves an input reference against the run's inputs", () => {
    const args = resolveStepInputs(
      step("@writer --topic=${inputs.topic}"),
      ctx({ inputs: { topic: "Q3 launch" } })
    );

    expect(args).toEqual([
      {
        name: "topic",
        source: { kind: "input", key: "topic" },
        value: "Q3 launch",
      },
    ]);
  });

  it("reports an unanswered run input as unset, not pending", () => {
    const args = resolveStepInputs(
      step("@writer --topic=${inputs.topic}"),
      ctx()
    );

    expect(args[0].unresolved).toBe("unset");
  });

  // Whether those inputs are a recorded run's or the run form's draft is the
  // page's call (`run.runInputs ?? draftInputs`), not this module's, so there is
  // nothing here that could tell the two apart. The draft preview itself is
  // covered end-to-end in `StepPanel.test`.

  it("reports a reference the grammar does not recognize as unresolvable", () => {
    const args = resolveStepInputs(
      step("@writer --topic=${env.SECRET}"),
      ctx()
    );

    expect(args[0].unresolved).toBe("unresolvable");
  });

  it("resolves an output reference through the producer's declared outputs", () => {
    const args = resolveStepInputs(
      step("@writer --brief=${outputs.research.answer}"),
      ctx({ stepOutputs: researchProduced() })
    );

    expect(args[0]).toMatchObject({
      source: {
        kind: "output",
        stepId: "research",
        outputKey: "answer",
        label: "Answer",
      },
      value: "Sales are up",
    });
  });

  it("does not resolve a declared key against the payload's display fields", () => {
    const args = resolveStepInputs(
      step("@writer --brief=${outputs.research.text}"),
      ctx({ stepOutputs: researchProduced() })
    );

    expect(args[0].value).toBeUndefined();
    expect(args[0].unresolved).toBe("undeclared");
  });

  it("carries a non-string declared type through", () => {
    const args = resolveStepInputs(
      step("@writer --score=${outputs.audit.score}"),
      ctx({
        stepOutputs: {
          audit: presentedOutput({
            declared: { score: declaredValue("Score", 42, "number") },
          }),
        },
      })
    );

    expect(args[0]).toMatchObject({ value: 42 });
  });

  it("drills into an object output beyond the declared key", () => {
    const args = resolveStepInputs(
      step("@writer --score=${outputs.audit.data.score}"),
      ctx({
        stepOutputs: {
          audit: presentedOutput({
            declared: {
              data: declaredValue("Data", { score: 7 }, "object"),
            },
          }),
        },
      })
    );

    expect(args[0]).toMatchObject({
      source: { kind: "output", outputKey: "data", path: "score" },
      value: 7,
    });
  });

  it("reports a drill-down into a key the value does not have", () => {
    const args = resolveStepInputs(
      step("@writer --score=${outputs.audit.data.missing}"),
      ctx({
        stepOutputs: {
          audit: presentedOutput({
            declared: { data: declaredValue("Data", { score: 7 }, "object") },
          }),
        },
      })
    );

    expect(args[0].unresolved).toBe("undeclared");
  });

  it("resolves an image output to the payload's images", () => {
    const first = presentedImage("data:image/png;base64,one");
    const second = presentedImage("data:image/png;base64,two");
    const args = resolveStepInputs(
      step("@draw --ref=${outputs.shoot.hero}"),
      ctx({
        stepOutputs: {
          shoot: presentedOutput({
            tool: "draw",
            images: [first, second],
            declared: { hero: declaredImage("Hero Image", [1]) },
          }),
        },
      })
    );

    expect(args[0]).toMatchObject({ images: [second] });
  });

  it("resolves an image output that produced nothing to an empty list", () => {
    const args = resolveStepInputs(
      step("@draw --ref=${outputs.shoot.hero}"),
      ctx({
        stepOutputs: {
          shoot: presentedOutput({
            tool: "draw",
            declared: { hero: declaredImage("Hero Image", []) },
          }),
        },
      })
    );

    expect(args[0]).toMatchObject({ images: [] });
    expect(args[0].unresolved).toBeUndefined();
  });

  it("drops image indexes that fall outside the payload's images", () => {
    const only = presentedImage();
    const args = resolveStepInputs(
      step("@draw --ref=${outputs.shoot.hero}"),
      ctx({
        stepOutputs: {
          shoot: presentedOutput({
            tool: "draw",
            images: [only],
            declared: { hero: declaredImage("Hero Image", [0, 5]) },
          }),
        },
      })
    );

    expect(args[0].images).toEqual([only]);
  });

  it("reports a drill-down into an image entry as undeclared", () => {
    const args = resolveStepInputs(
      step("@draw --ref=${outputs.shoot.hero.url}"),
      ctx({
        stepOutputs: {
          shoot: presentedOutput({
            tool: "draw",
            images: [presentedImage()],
            declared: { hero: declaredImage("Hero Image", [0]) },
          }),
        },
      })
    );

    expect(args[0].unresolved).toBe("undeclared");
  });

  it("reports a reference to a step that has not produced anything as pending", () => {
    const args = resolveStepInputs(
      step("@writer --brief=${outputs.research.answer}"),
      ctx()
    );

    expect(args[0]).toEqual({
      name: "brief",
      source: { kind: "output", stepId: "research", outputKey: "answer" },
      unresolved: "pending",
    });
  });

  it("reports a reference into a failed step as failed", () => {
    const args = resolveStepInputs(
      step("@writer --brief=${outputs.research.answer}"),
      ctx({
        stepOutputs: {
          research: presentedOutput({ ok: false, error: "boom" }),
        },
      })
    );

    expect(args[0].unresolved).toBe("failed");
  });

  it("reports a key a successful step never declared as undeclared", () => {
    const args = resolveStepInputs(
      step("@writer --brief=${outputs.nested.answer}"),
      ctx({
        stepOutputs: {
          nested: presentedOutput({ tool: "workflow", text: "ran" }),
        },
      })
    );

    expect(args[0].unresolved).toBe("undeclared");
  });

  it("prefers a real value over the failure copy when the payload has one", () => {
    const args = resolveStepInputs(
      step("@writer --brief=${outputs.research.answer}"),
      ctx({
        stepOutputs: {
          research: presentedOutput({
            ok: false,
            error: "partial",
            declared: { answer: declaredValue("Answer", "salvaged") },
          }),
        },
      })
    );

    expect(args[0].value).toBe("salvaged");
  });

  it("uses an inline default when the source is missing", () => {
    const args = resolveStepInputs(
      step("@writer --topic=${inputs.topic|Untitled}"),
      ctx()
    );

    expect(args[0]).toMatchObject({ value: "Untitled", usedFallback: true });
    expect(args[0].unresolved).toBeUndefined();
  });

  it("prefers a real value over the inline default", () => {
    const args = resolveStepInputs(
      step("@writer --topic=${inputs.topic|Untitled}"),
      ctx({ inputs: { topic: "Real" } })
    );

    expect(args[0].value).toBe("Real");
    expect(args[0].usedFallback).toBeUndefined();
  });

  it("reports a mixed literal-and-reference value without substituting", () => {
    const args = resolveStepInputs(
      step('@writer --prompt="Summarize: ${outputs.s1.answer}"'),
      ctx({ stepOutputs: researchProduced() })
    );

    expect(args[0]).toEqual({
      name: "prompt",
      source: { kind: "mixed" },
      value: "Summarize: ${outputs.s1.answer}",
    });
  });

  it("classifies a reference the grammar does not recognize", () => {
    const args = resolveStepInputs(
      step("@writer --topic=${env.SECRET}"),
      ctx()
    );

    expect(args[0].source).toEqual({
      kind: "unknown",
      expression: "env.SECRET",
    });
    expect(args[0].value).toBeUndefined();
  });

  it("treats an unterminated ${ as a literal", () => {
    const args = resolveStepInputs(step("@writer --topic=${broken"), ctx());

    expect(args[0]).toMatchObject({
      source: { kind: "mixed" },
      value: "${broken",
    });
  });

  it("resolves a falsy resolved value rather than reporting it unresolved", () => {
    const args = resolveStepInputs(
      step("@writer --count=${inputs.count}"),
      ctx({ inputs: { count: 0 } })
    );

    expect(args[0].value).toBe(0);
  });

  it("keeps command order across several flags", () => {
    const args = resolveStepInputs(
      step(
        "@writer --topic=${inputs.topic} --tone=formal --brief=${outputs.research.answer}"
      ),
      ctx({ inputs: { topic: "T" }, stepOutputs: researchProduced("A") })
    );

    expect(args.map((a) => a.name)).toEqual(["topic", "tone", "brief"]);
    expect(args.map((a) => a.value)).toEqual(["T", "formal", "A"]);
  });
});

describe("resolveFileBindings", () => {
  function bound(bindings: Record<string, string>): WorkflowStep {
    return { id: "draw", type: "tool", file_bindings: bindings };
  }

  it("returns nothing when the step binds no files", () => {
    expect(resolveFileBindings(step(), ctx())).toEqual([]);
  });

  it("resolves a slot to the upstream images", () => {
    const image = presentedImage();
    const bindings = resolveFileBindings(
      bound({ reference: "${outputs.shoot.hero}" }),
      ctx({
        stepOutputs: {
          shoot: presentedOutput({
            tool: "draw",
            images: [image],
            declared: { hero: declaredImage("Hero Image", [0]) },
          }),
        },
      })
    );

    expect(bindings).toHaveLength(1);
    expect(bindings[0]).toMatchObject({
      name: "reference",
      images: [image],
      source: { kind: "output", stepId: "shoot", label: "Hero Image" },
    });
  });

  it("resolves a slot bound to a run file input", () => {
    const bindings = resolveFileBindings(
      bound({ reference: "${inputs.sketch}" }),
      ctx({ inputs: { sketch: "file_abc123" } })
    );

    expect(bindings[0]).toMatchObject({
      name: "reference",
      source: { kind: "input", key: "sketch" },
      value: "file_abc123",
    });
  });

  it("reports a slot whose producer has not run", () => {
    const bindings = resolveFileBindings(
      bound({ reference: "${outputs.shoot.hero}" }),
      ctx()
    );

    expect(bindings[0].unresolved).toBe("pending");
  });
});
