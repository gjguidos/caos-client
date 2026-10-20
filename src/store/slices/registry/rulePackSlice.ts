import type { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RegistryEntry } from "./registryEntry";

export type RulePackRule = {
  id: string;
  description?: string;
  severity?: string;
};

type RulePackMetadata = {
  name?: string;
  description?: string;
  rules?: RulePackRule[];
};

export type RulePack = RegistryEntry<RulePackMetadata>;

/**
 * A pack carries its display fields on `metadata` when the backend sent them
 * there and on the entry itself otherwise. Both readers below own that fallback
 * so the two rule-pack views cannot drift on which one wins.
 */
export function rulePackName(pack: RulePack): string {
  return pack.metadata?.name ?? pack.name;
}

export function rulePackDescription(pack: RulePack): string | undefined {
  return pack.metadata?.description ?? pack.description;
}

export function rulePackRules(pack: RulePack): RulePackRule[] {
  return pack.metadata?.rules ?? [];
}

type RulePackState = { list: RulePack[] };

const initialRulePacksState: RulePackState = { list: [] };

const RulePacksSlice = createSlice({
  name: "rulepacks",
  initialState: initialRulePacksState,
  reducers: {
    setRulePack(state, action: PayloadAction<RulePack[] | undefined>) {
      state.list = action.payload ?? [];
    },
  },
});

export const { setRulePack } = RulePacksSlice.actions;
export default RulePacksSlice.reducer;

export const selectRulePacks = (state: RootState) => state.rulepacks.list;
