import { getPublicApiBase } from "@/shared/lib/getApiClient";
import fetchData from "@/shared/lib/server-actions";
import type { DefaultToolRef } from "@/store/slices/registry/registryEntry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConfigMap = Record<string, any>;

type RegistryEntryResponse = {
  data?: {
    metadata?: {
      config?: ConfigMap;
    };
  };
  metadata?: {
    config?: ConfigMap;
    default_tools?: DefaultToolRef[];
  };
  default_config?: ConfigMap;
  default_tools?: DefaultToolRef[];
};

export async function fetchRegistries(type: string) {
  const BASE = getPublicApiBase();
  if (!BASE) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE in environment");
  }

  const response = await fetchData({
    path: `${BASE}/v1/agents/registry/${encodeURIComponent(type)}`,
    method: "GET",
  });

  return response;
}

export async function fetchRegistryEntry(type: string, entry: string) {
  const BASE = getPublicApiBase();
  if (!BASE) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE in environment");
  }

  const response = await fetchData<RegistryEntryResponse>({
    path: `${BASE}/v1/agents/registries/${encodeURIComponent(type)}/entry/${encodeURIComponent(entry)}`,
    method: "GET",
  });

  return response;
}
