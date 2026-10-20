"use client";

import { fetchSoul } from "@/shared/api/fetch_souls";
import { logger } from "@/shared/lib/logger";
import { useEffect, useState } from "react";

/**
 * The one-line description of the personality an agent runs on.
 *
 * Agents carry no description of their own - only a `personality_key` into the
 * personality registry - so this is the closest thing to "what is this agent
 * like" that the API can answer. Two agents on the same personality therefore
 * describe themselves identically.
 *
 * Returns `""` while loading and on failure: the empty conversation reads
 * perfectly well without this line, so a missing description is not worth an
 * error state.
 */
export function usePersonalityDescription(
  personalityKey: string | undefined
): string {
  const [description, setDescription] = useState("");

  useEffect(() => {
    setDescription("");
    if (!personalityKey) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetchSoul(personalityKey);
        if (cancelled) return;
        if (res?.success) {
          setDescription(res.data.basic_profile?.description ?? "");
        }
      } catch (err) {
        logger.error("Failed to load personality description", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [personalityKey]);

  return description;
}
