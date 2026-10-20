import type {
  CognitiveModuleMap,
  ModuleDesc,
} from "@/app/agents/_api/fetch_cognitive_modules";
import type {
  AgentFormValues,
  CognitiveModuleKey,
} from "@/shared/lib/agent.types";
import { humanizeKey } from "@/shared/lib/humanizeKey";
import type { FieldPath } from "react-hook-form";
import { MenuSection } from "./sections/wizardSteps";

/**
 * One thing standing between the draft and a working agent. Carries enough to
 * both explain the problem and take the reader to it.
 */
export type Gap = {
  step: MenuSection;
  field: FieldPath<AgentFormValues>;
  /** The field's own name, for inline messages. */
  label: string;
  /** Reader-facing sentence, used in the "Before you create" list. */
  message: string;
};

export type DraftContext = {
  cognitiveModules: CognitiveModuleMap;
};

const isBlank = (value: string | undefined | null) => !value?.trim();

/**
 * The registry map is already narrowed to keys the form holds
 * (`fetchCognitiveModules`), which is what makes `cognitive_modules.${key}` a
 * real form path rather than a hopeful cast.
 */
function moduleEntries(modules: CognitiveModuleMap) {
  return Object.entries(modules ?? {}) as [CognitiveModuleKey, ModuleDesc][];
}

/** Form path for a module, typed because the key is known to be one of ours. */
export function moduleField(
  key: CognitiveModuleKey
): FieldPath<AgentFormValues> {
  return `cognitive_modules.${key}`;
}

/**
 * Everything missing from the draft, in the order the reader would meet it.
 *
 * Deliberately narrow: these are the fields the backend genuinely needs. The
 * wizard never blocks navigation on them - they gate submit and mark the rail,
 * so someone can fill the form in whatever order suits them.
 */
export function getDraftGaps(
  values: AgentFormValues,
  ctx: DraftContext
): Gap[] {
  const gaps: Gap[] = [];

  if (isBlank(values.name)) {
    gaps.push({
      step: MenuSection.Identity,
      field: "name",
      label: "Name",
      message: "Give the agent a name",
    });
  }

  if (isBlank(values.type)) {
    gaps.push({
      step: MenuSection.Identity,
      field: "type",
      label: "Agent type",
      message: "Pick an agent type",
    });
  }

  if (isBlank(values.roleRegistry)) {
    gaps.push({
      step: MenuSection.Identity,
      field: "roleRegistry",
      label: "Agent role",
      message: "Pick an agent role",
    });
  }

  // A module the registry ships a default for is one the agent cannot run
  // without. Modules with no default are genuinely optional.
  moduleEntries(ctx.cognitiveModules).forEach(([key, desc]) => {
    if (isBlank(desc?.default)) return;
    const current = values.cognitive_modules?.[key];
    if (!isBlank(current)) return;
    gaps.push({
      step: MenuSection.Identity,
      field: moduleField(key),
      label: humanizeKey(key),
      message: `Choose a ${humanizeKey(key).toLowerCase()} module`,
    });
  });

  // Access is never a gap: a private agent with no allowed groups is a valid
  // agent that only its owner can reach.

  return gaps;
}

export function gapsForStep(gaps: Gap[], step: MenuSection): Gap[] {
  return gaps.filter((gap) => gap.step === step);
}

/**
 * Whether a step has been meaningfully answered, as opposed to merely having
 * no errors. Behaviour has no required fields, so "no gaps" alone would mark it
 * done before it had been visited.
 */
export function isStepAnswered(
  values: AgentFormValues,
  step: MenuSection,
  gaps: Gap[]
): boolean {
  if (gapsForStep(gaps, step).length > 0) return false;

  switch (step) {
    case MenuSection.Identity:
      return true;
    case MenuSection.Capabilities:
      return (
        (values.tools?.length ?? 0) > 0 || (values.workflows?.length ?? 0) > 0
      );
    case MenuSection.Behaviour:
      return !isBlank(values.personalityRegistry);
    case MenuSection.Access:
      return Boolean(values.security?.visibility);
    default:
      return false;
  }
}

/**
 * Which cognitive modules the reader changed away from the type's default.
 * Drives the "default vs set by you" distinction across the wizard.
 */
export function changedModules(
  values: AgentFormValues,
  ctx: DraftContext
): CognitiveModuleKey[] {
  return moduleEntries(ctx.cognitiveModules)
    .filter(([key, desc]) => {
      const current = values.cognitive_modules?.[key] ?? "";
      return !isBlank(current) && current !== (desc?.default ?? "");
    })
    .map(([key]) => key);
}

export type Provenance = "set" | "inherited" | "empty";

/** Provenance of a single value against the default it would otherwise take. */
export function provenanceOf(
  value: string | undefined | null,
  defaultValue?: string | null
): Provenance {
  if (isBlank(value)) return "empty";
  if (!isBlank(defaultValue) && value === defaultValue) return "inherited";
  return "set";
}
