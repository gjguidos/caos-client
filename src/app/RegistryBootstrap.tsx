"use client";

import { fetchRegistries } from "@/shared/api/fetch_registries";
import { unwrapDataArray } from "@/shared/api/envelope";
import { useAuth } from "@/shared/auth/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setAgentTypes,
  type AgentTypeProfile,
} from "@/store/slices/registry/agentTypeSlice";
import { setRoles, type RoleProfile } from "@/store/slices/registry/roleSlice";
import {
  setRulePack,
  type RulePack,
} from "@/store/slices/registry/rulePackSlice";
import { withValidKeys } from "@/store/slices/registry/registryEntry";
import { setSouls, type SoulProfile } from "@/store/slices/registry/soulSlice";
import {
  setTools,
  type ToolDefinition,
} from "@/store/slices/registry/toolsSlice";
import { useEffect, useRef, useState } from "react";
import type { AppDispatch } from "@/store";

/**
 * Unwrap a registry response into typed entries. The response is unvalidated
 * JSON; only the `key` invariant is enforced here, because `key` is what every
 * lookup, React key and `@<key>` token depends on. The remaining fields are
 * trusted as declared.
 */
const registryEntries = <T extends { key: string }>(
  body: unknown,
  registryType: string
): T[] => withValidKeys(unwrapDataArray<T>(body), registryType);

const bootstrapRegistry = () => async (dispatch: AppDispatch) => {
  try {
    const [tools, souls, roles, rulepacks, agentTypes] = await Promise.all([
      fetchRegistries("tool"),
      fetchRegistries("personality"),
      fetchRegistries("role"),
      fetchRegistries("rulepack"),
      fetchRegistries("agent"),
    ]);

    dispatch(setTools(registryEntries<ToolDefinition>(tools, "tool")));
    dispatch(setSouls(registryEntries<SoulProfile>(souls, "personality")));
    dispatch(setRoles(registryEntries<RoleProfile>(roles, "role")));
    dispatch(setRulePack(registryEntries<RulePack>(rulepacks, "rulepack")));
    dispatch(
      setAgentTypes(registryEntries<AgentTypeProfile>(agentTypes, "agent"))
    );
  } catch (err) {
    console.error("Failed to bootstrap registry:", err);
    dispatch(setTools([]));
    dispatch(setSouls([]));
    dispatch(setRoles([]));
    dispatch(setRulePack([]));
    dispatch(setAgentTypes([]));
  }
};

/**
 * RegistryBootstrap - Bootstrap global registries for authenticated users.
 *
 * Only bootstraps when user is authenticated - fails fast with error if used on public pages.
 */
const RegistryBootstrap = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const isBootstrapping = useRef(false);
  const { userId } = useAuth();

  // Wait for runtime-injected public env (window.__ENV__) to be available in the browser.
  // Some routes/layouts can hydrate before /env.js executes, so wait briefly before bootstrapping.
  const [envAvailable, setEnvAvailable] = useState<boolean>(
    typeof window === "undefined"
      ? true
      : Boolean(
          (globalThis as { __ENV__?: { NEXT_PUBLIC_API_BASE?: string } })
            .__ENV__?.NEXT_PUBLIC_API_BASE
        )
  );

  useEffect(() => {
    if (envAvailable) return;

    let cancelled = false;
    const start = Date.now();

    const check = () => {
      if (
        (globalThis as { __ENV__?: { NEXT_PUBLIC_API_BASE?: string } }).__ENV__
          ?.NEXT_PUBLIC_API_BASE
      ) {
        if (!cancelled) setEnvAvailable(true);
        return true;
      }
      return false;
    };

    if (check()) return;

    const onEnvReady = () => {
      if (!cancelled) setEnvAvailable(true);
    };
    window.addEventListener("env-ready", onEnvReady);

    const iv = setInterval(() => {
      if (check()) {
        clearInterval(iv);
        window.removeEventListener("env-ready", onEnvReady);
      } else if (Date.now() - start > 1000) {
        clearInterval(iv);
        window.removeEventListener("env-ready", onEnvReady);
        if (!cancelled) setEnvAvailable(true);
      }
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(iv);
      window.removeEventListener("env-ready", onEnvReady);
    };
  }, [envAvailable]);

  const toolRegistry = useAppSelector((state) => state.tools.list);
  const soulRegistry = useAppSelector((state) => state.souls.list);
  const roleRegistry = useAppSelector((state) => state.roles.list);
  const agentTypeRegistry = useAppSelector((state) => state.agentTypes.list);

  useEffect(() => {
    if (!userId) return;
    if (!envAvailable) return;
    if (isBootstrapping.current) return;

    const hasData =
      toolRegistry.length > 0 ||
      soulRegistry.length > 0 ||
      roleRegistry.length > 0 ||
      agentTypeRegistry.length > 0;
    if (hasData) return;

    isBootstrapping.current = true;
    dispatch(bootstrapRegistry());
  }, [
    dispatch,
    userId,
    envAvailable,
    toolRegistry.length,
    soulRegistry.length,
    roleRegistry.length,
    agentTypeRegistry.length,
  ]);

  return <>{children}</>;
};

export default RegistryBootstrap;
