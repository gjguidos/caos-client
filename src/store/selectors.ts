import { useAppSelector } from "@/store/hooks";
import { selectTools } from "@/store/slices/registry/toolsSlice";
import {
  selectSouls,
  type SoulProfile,
} from "@/store/slices/registry/soulSlice";
import { findByKey } from "@/store/slices/registry/registryEntry";
import { selectRoles } from "@/store/slices/registry/roleSlice";
import { selectRulePacks } from "@/store/slices/registry/rulePackSlice";
import { selectAgentTypes } from "@/store/slices/registry/agentTypeSlice";
import {
  selectToastQueue,
  type ToastItem,
} from "@/store/slices/toast/toastSlice";
import { shallowEqual } from "react-redux";

export const useToolRegistry = () => useAppSelector(selectTools, shallowEqual);

export const useSoulRegistry = () => useAppSelector(selectSouls, shallowEqual);

/** Resolve a single personality/soul registry entry by its `key`. */
export const useSoul = (key: string | undefined | null): SoulProfile | null =>
  findByKey(useSoulRegistry(), key);

export const useRoleRegistry = () => useAppSelector(selectRoles, shallowEqual);

export const useAgentTypeRegistry = () =>
  useAppSelector(selectAgentTypes, shallowEqual);

export const useRulePackRegistry = () =>
  useAppSelector(selectRulePacks, shallowEqual);

export const useToasts = (): ToastItem[] => useAppSelector(selectToastQueue);
