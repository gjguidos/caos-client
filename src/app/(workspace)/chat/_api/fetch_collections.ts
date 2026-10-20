import { getPublicApiBase } from "@/shared/lib/getApiClient";
import fetchData from "@/shared/lib/server-actions";
import { unwrapDataArray } from "@/shared/api/envelope";

export async function getUserCollections<T = unknown>(): Promise<T[]> {
  try {
    const base = getPublicApiBase();
    const res = await fetchData({
      path: `${base}/v1/agents/collections`,
      method: "GET",
    });

    return unwrapDataArray<T>(res);
  } catch (err) {
    console.error("Fetch failed in getUserCollections:", err);
    throw err;
  }
}
