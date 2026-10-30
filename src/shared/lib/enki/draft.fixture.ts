/** Test fixture for the server-owned v1 presentation, not a runtime fallback. */
import { MenuSection } from "@/app/agents/_components/CreateAgentForm/sections/wizardSteps";
import { DRAFT_CONTRACT, type Presentation } from "./draft";

export const presentationFixture: Presentation = {
  contract: DRAFT_CONTRACT,
  schema_version: 1,
  presentation_version: 1,
  inputs: [
    {
      key: "name",
      label: "Agent name",
      input: "text",
      required: true,
      section: MenuSection.Identity,
    },
    {
      key: "type",
      label: "Agent type",
      input: "select",
      required: true,
      section: MenuSection.Identity,
      source: { kind: "registry", registry: "agent" },
    },
    {
      key: "role_name",
      label: "Role",
      input: "select",
      required: true,
      section: MenuSection.Identity,
      source: { kind: "registry", registry: "role" },
    },
    {
      key: "personality_key",
      label: "Agent Soul",
      input: "select",
      required: true,
      section: MenuSection.Behaviour,
      source: { kind: "registry", registry: "personality" },
    },
    {
      key: "prompt",
      label: "Instructions",
      input: "textarea",
      required: true,
      section: MenuSection.Behaviour,
    },
    {
      key: "rule_pack_ids",
      label: "RulePacks",
      input: "multiselect",
      required: false,
      section: MenuSection.Behaviour,
      source: { kind: "registry", registry: "rulepack" },
    },
    {
      key: "tools",
      label: "Tools",
      input: "multiselect",
      required: false,
      section: MenuSection.Capabilities,
      source: { kind: "registry", registry: "tool" },
    },
    {
      key: "workflows",
      label: "Workflows",
      input: "multiselect",
      required: false,
      section: MenuSection.Capabilities,
      source: { kind: "registry", registry: "workflow" },
    },
    {
      key: "visibility",
      label: "Visibility",
      input: "select",
      required: false,
      section: MenuSection.Access,
      options: [
        { value: "private", label: "Private" },
        { value: "public", label: "Public" },
      ],
    },
    {
      key: "whitelisted_groups",
      label: "Allowed groups",
      input: "multiselect",
      required: false,
      section: MenuSection.Access,
      source: { kind: "requester_groups" },
    },
  ],
};
