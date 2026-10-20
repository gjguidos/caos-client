import { unwrapData, type ApiEnvelope } from "@/shared/api/envelope";
import {
  COGNITIVE_MODULE_KEYS,
  type CognitiveModuleKey,
} from "@/shared/lib/agent.types";
import { getPublicApiBase } from "@/shared/lib/getApiClient";
import fetchData from "@/shared/lib/server-actions";

/** How the registry describes one cognitive module. */
export type ModuleDesc = {
  options: string[];
  default?: string;
  description?: string;
};

/**
 * The registry, narrowed to the modules the form can hold. Partial because the
 * backend decides which modules exist, and it ships fewer than the form models
 * for some agent types.
 */
export type CognitiveModuleMap = Partial<
  Record<CognitiveModuleKey, ModuleDesc>
>;

const isKnownModule = (key: string): key is CognitiveModuleKey =>
  (COGNITIVE_MODULE_KEYS as readonly string[]).includes(key);

export async function fetchCognitiveModules(): Promise<CognitiveModuleMap> {
  const base = getPublicApiBase();
  if (!base) throw new Error("Missing NEXT_PUBLIC_API_BASE in environment");
  const res = await fetchData<ApiEnvelope<Record<string, ModuleDesc>>>({
    path: `${base}/v1/agents/cognitive-modules/keys`,
    method: "GET",
  });
  const data = unwrapData<Record<string, ModuleDesc>>(res);
  if (!res?.success || !data) {
    throw new Error("Failed to fetch cognitive modules");
  }

  // Narrow here, once, so nothing downstream has to cast a registry key into a
  // form path and hope it lands.
  const known: CognitiveModuleMap = {};
  Object.entries(data).forEach(([key, desc]) => {
    if (isKnownModule(key)) known[key] = desc;
  });
  return known;
}

export async function fetchLLM(): Promise<unknown> {
  const base = getPublicApiBase();
  if (!base) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE in environment");
  }

  const res = await fetchData<ApiEnvelope<unknown>>({
    path: `${base}/v1/agents/cognitive-modules/llm`,
    method: "GET",
  });

  const data = unwrapData(res);
  if (!res?.success || !data) {
    throw new Error("Failed to fetch cognitive modules");
  }
  return data;
}
