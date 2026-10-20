import { AgentFormValues } from "@/shared/lib/agent.types";
import { useMemo } from "react";
import type { DefaultValues } from "react-hook-form";
import type { Team } from "./sections/SecuritySection";

/**
 * Agent type the wizard starts on. This is a registry `key`, matching the values
 * the agent-type select emits and the `type` the backend stores.
 */
export const DEFAULT_AGENT_TYPE_KEY = "chat";

/** Shared default form state for both the create and edit agent wizards. */
export const agentFormDefaults: DefaultValues<AgentFormValues> = {
  name: "",
  type: DEFAULT_AGENT_TYPE_KEY,
  roleRegistry: "",
  prompt: "",
  personalityRegistry: "",
  tools: [],
  workflows: [],
  security: {
    visibility: "private",
    whitelisted_groups: [],
  },
  cognitive_modules: {
    llm: "",
    audio: "",
    image: "",
    video: "",
    db: "",
    cache: "",
    communication: "",
    knowledge_db: "",
    embedding: "",
    messaging: "",
  },
  rulepackRegistry: "",
};

/** Derive selectable admin groups from JWT role claim ids. */
export function useAdminGroups(adminGroupIds: string[]): Team[] {
  return useMemo(
    () =>
      adminGroupIds.map((id) => ({
        group_id: id,
        name: id
          .replaceAll("-", " ")
          .replaceAll(/\b\w/g, (c) => c.toUpperCase()),
      })),
    [adminGroupIds]
  );
}

export function WizardLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div
          className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
          role="status"
        >
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
        <p className="mt-4 text-lg">{label}</p>
      </div>
    </div>
  );
}
