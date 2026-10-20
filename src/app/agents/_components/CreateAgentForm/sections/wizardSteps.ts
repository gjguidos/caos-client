/**
 * The wizard's step model. Single source of order and labelling: the rail, the
 * footer counter, the "Next: X" label and the gap model all read from here.
 *
 * Steps are grouped by the question they answer, not by which backend field
 * they write. Cognitive modules live inside Identity because the agent type
 * chooses them for you - they are a consequence of step 1, not a step.
 */
export enum MenuSection {
  Identity = "identity",
  Capabilities = "capabilities",
  Behaviour = "behaviour",
  Access = "access",
}

/** Per-step marker state on the rail. `attention` always wins over `done`. */
export type StepStatus = "attention" | "done" | "neutral";

export const MENU_ORDER: MenuSection[] = [
  MenuSection.Identity,
  MenuSection.Behaviour,
  MenuSection.Capabilities,
  MenuSection.Access,
];

export const MENU_META: Record<
  MenuSection,
  { label: string; sub: string; title: string; blurb: string }
> = {
  [MenuSection.Identity]: {
    label: "Identity",
    sub: "Name, type & role",
    title: "Identity",
    blurb:
      "Name your agent and pick what kind it is. The type decides which models and infrastructure it runs on.",
  },
  [MenuSection.Capabilities]: {
    label: "Capabilities",
    sub: "Tools & workflows",
    title: "Capabilities",
    blurb:
      "Choose what this agent can do. Tools are the actions it can take; workflows are the programs it can launch.",
  },
  [MenuSection.Behaviour]: {
    label: "Behaviour",
    sub: "Personality & rules",
    title: "Behaviour",
    blurb: "Shape how the agent talks and what it is not allowed to say.",
  },
  [MenuSection.Access]: {
    label: "Access",
    sub: "Visibility & groups",
    title: "Access",
    blurb: "Decide who can discover and use this agent once it goes live.",
  },
};
