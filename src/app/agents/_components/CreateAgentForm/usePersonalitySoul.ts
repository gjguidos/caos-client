import { fetchSoul, fetchSoulSchema } from "@/shared/api/fetch_souls";
import { AgentFormValues } from "@/shared/lib/agent.types";
import { useEffect, useState } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { StructuredSoul, structureSoul } from "./soul";

interface PersonalitySoulState {
  soul: StructuredSoul | null;
  loading: boolean;
  error: string | null;
}

/**
 * Single owner for loading a personality soul. Watches `personalityRegistry`,
 * fetches the soul + schema, writes `prompt` back into the form, and returns the
 * structured soul for display.
 */
export function usePersonalitySoul(
  form: UseFormReturn<AgentFormValues>
): PersonalitySoulState {
  const selectedPersonality = useWatch({
    control: form.control,
    name: "personalityRegistry",
  });
  const [soul, setSoul] = useState<StructuredSoul | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPersonality) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [soulRes, schemaRes] = await Promise.all([
          fetchSoul(selectedPersonality),
          fetchSoulSchema(),
        ]);
        if (cancelled) return;

        if (soulRes?.success && schemaRes?.success) {
          form.setValue(
            "prompt",
            soulRes.data.basic_profile?.description ?? ""
          );
          setSoul(structureSoul(soulRes.data, schemaRes.data));
        } else {
          throw new Error("Failed to load personality data");
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load personality configuration");
          console.error("Personality load error:", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // form is stable across renders; re-run only when the selection changes.
  }, [selectedPersonality]);

  return { soul, loading, error };
}
