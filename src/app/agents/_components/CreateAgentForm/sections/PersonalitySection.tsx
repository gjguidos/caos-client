
"use client";

import { useState, type ReactNode } from "react";
import { Eye } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { AgentFormValues } from "@/shared/lib/agent.types";
import type { SoulProfile } from "@/store/slices/registry/soulSlice";

import SoulInspectorDialog from "../../dialogs/SoulInspectorDialog";
import type { StructuredSoul } from "../soul";

type FormValues = AgentFormValues;

interface SectionProps {
  form: UseFormReturn<FormValues>;
  personalityRegs: SoulProfile[];
  soul: StructuredSoul | null;
  loading: boolean;
}

/**
 * Personality archetype selection and soul preview.
 *
 * The selected registry entry determines the
 * soul profile displayed below the selector.
 */
export default function PersonalitySection({
  form,
  personalityRegs,
  soul,
  loading,
}: SectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  let personalityContent: ReactNode;

  if (loading) {
    personalityContent = (
      <Skeleton className="h-40 w-full rounded-lg" />
    );
  } else if (soul) {
    personalityContent = (
      <>
        <div className="space-y-2 rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold text-foreground">
            Description
          </h3>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {soul.basic_profile?.description}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
          <Eye
            className="size-4"
            aria-hidden="true"
          />
          View soul profile
        </Button>

        <SoulInspectorDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          soul={soul}
        />
      </>
    );
  } else {
    personalityContent = (
      <p className="text-sm text-muted-foreground">
        Select an archetype to preview its soul profile.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="agent-wizard-card space-y-6">
        <FormField
          control={form.control}
          name="personalityRegistry"
          render={({ field }) => (
            <FormItem data-field="personalityRegistry">
              <FormLabel>Personality archetype</FormLabel>

              <FormControl>
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a personality" />
                  </SelectTrigger>

                  <SelectContent>
                    {personalityRegs.map((personality) => (
                      <SelectItem
                        key={personality.key}
                        value={personality.key}
                      >
                        {personality.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {personalityContent}
      </div>
    </div>
  );
}
