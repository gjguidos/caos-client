
"use client";

import { useId, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";

import type { CognitiveModuleMap } from "@/app/agents/_api/fetch_cognitive_modules";
import type { AgentFormValues } from "@/shared/lib/agent.types";
import { humanizeKey } from "@/shared/lib/humanizeKey";

import { useActiveGap } from "../activeGap";
import { changedModules, type Gap } from "../draftStatus";
import CognitiveSection from "./CognitiveSection";

interface CognitiveDefaultsProps {
  form: UseFormReturn<AgentFormValues>;
  cognitiveModules: CognitiveModuleMap;

  /** Human name of the selected agent type, e.g. "Chat". */
  typeLabel: string;
}

/**
 * Cognitive modules arrive with sensible defaults.
 *
 * They are presented as a single adjustable section
 * rather than a collection of required questions.
 *
 * Navigating to a cognitive-module gap automatically
 * opens the section containing the affected field.
 */
export default function CognitiveDefaults({
  form,
  cognitiveModules,
  typeLabel,
}: Readonly<CognitiveDefaultsProps>) {
  const panelId = useId();

  const gap = useActiveGap();

  const targetsModule =
    gap?.field.startsWith("cognitive_modules.") ?? false;

  /**
   * Override applies only to the current gap visit.
   *
   * Navigating to another gap resets the effective
   * open state without requiring an additional effect.
   */
  const [override, setOverride] = useState<{
    forVisit: Gap | null;
    open: boolean;
  } | null>(null);

  const open =
    override?.forVisit === gap
      ? override.open
      : targetsModule;

  const modules = useWatch({
    control: form.control,
    name: "cognitive_modules",
  });

  const keys = Object.keys(cognitiveModules);

  if (keys.length === 0) {
    return null;
  }

  const changed = changedModules(
    {
      cognitive_modules: modules,
    } as AgentFormValues,
    {
      cognitiveModules,
    }
  );

  const count = `${keys.length} ${
    keys.length === 1 ? "module" : "modules"
  }`;

  const summary =
    changed.length > 0
      ? `${count} · ${changed.length} changed: ${changed
          .map(humanizeKey)
          .join(", ")
          .toLowerCase()}`
      : `${count} · defaults for ${typeLabel}`;

  const toggleOpen = () => {
    setOverride({
      forVisit: gap,
      open: !open,
    });
  };

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            Cognitive modules
          </h3>

          <p className="text-xs leading-relaxed text-muted-foreground">
            {summary}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 gap-2"
          onClick={toggleOpen}
          aria-expanded={open}
          aria-controls={panelId}
        >
          {open ? "Done" : "Adjust"}

          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </Button>
      </div>

      {open && (
        <div
          id={panelId}
          className="border-t border-border p-5"
        >
          <CognitiveSection
            form={form}
            cognitiveModules={cognitiveModules}
          />
        </div>
      )}
    </section>
  );
}
