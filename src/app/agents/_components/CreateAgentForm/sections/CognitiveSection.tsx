
"use client";

import { Fragment } from "react";
import { X } from "lucide-react";
import type {
  FieldPath,
  UseFormReturn,
} from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";

import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";

import type { CognitiveModuleMap } from "@/app/agents/_api/fetch_cognitive_modules";
import type { AgentFormValues } from "@/shared/lib/agent.types";

import { GapMessage, useActiveGap } from "../activeGap";

interface CognitiveSectionProps {
  form: UseFormReturn<AgentFormValues>;
  cognitiveModules: CognitiveModuleMap;
  className?: string;
}

/**
 * Renders configurable cognitive modules.
 *
 * Each module displays:
 * - Name and description
 * - Available registry options
 * - Currently selected value
 * - Optional clear control
 * - Active gap indicator
 */
export default function CognitiveSection({
  form,
  cognitiveModules,
  className,
}: Readonly<CognitiveSectionProps>) {
  const activeGap = useActiveGap();

  if (Object.keys(cognitiveModules).length === 0) {
    return (
      <div
        className={cn(
          "flex h-32 items-center justify-center",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">
          No cognitive modules available
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-[max-content_1fr]">
        {Object.entries(cognitiveModules).map(([key, desc]) => {
          const label = key
            .split(/[_-]/)
            .map(
              (word) =>
                word[0]?.toUpperCase() + word.slice(1)
            )
            .join(" ");

          const hasDefault =
            typeof desc.default === "string" &&
            desc.default !== "";

          const fieldName =
            `cognitive_modules.${key}` as FieldPath<AgentFormValues>;

          const flagged =
            activeGap?.field === fieldName;

          const fieldId = `cognitive-module-${key}`;

          return (
            <Fragment key={key}>
              <dt className="space-y-1">
                <Label
                  htmlFor={fieldId}
                  className="text-sm font-medium text-foreground"
                >
                  {label}
                </Label>

                {desc.description && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {desc.description}
                  </p>
                )}
              </dt>

              <dd
                className="min-w-0 space-y-1"
                data-field={fieldName}
              >
                <FormField
                  control={form.control}
                  name={fieldName}
                  defaultValue={desc.default ?? ""}
                  render={({ field }) => {
                    const value =
                      typeof field.value === "string"
                        ? field.value
                        : "";

                    const showClear =
                      !hasDefault && value !== "";

                    return (
                      <FormItem className="relative space-y-0">
                        <Select
                          name={field.name}
                          value={value}
                          onValueChange={field.onChange}
                          onOpenChange={(open) => {
                            if (!open) {
                              field.onBlur();
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger
                              ref={field.ref}
                              id={fieldId}
                              className={cn(
                                "w-full",
                                showClear && "pr-10",
                                flagged && "border-destructive"
                              )}
                              aria-label={label}
                            >
                              <SelectValue
                                placeholder="Select an option..."
                              />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {desc.options.map((option) => (
                              <SelectItem
                                key={option}
                                value={option}
                              >
                                <span className="font-mono text-[13px]">
                                  {option}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {showClear && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Clear ${label} selection`}
                            title={`Clear ${label} selection`}
                            className="absolute inset-y-0 right-8 my-auto size-8"
                            onClick={(event) => {
                              event.stopPropagation();
                              field.onChange("");
                            }}
                          >
                            <X
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          </Button>
                        )}
                      </FormItem>
                    );
                  }}
                />

                <GapMessage field={fieldName} />
              </dd>
            </Fragment>
          );
        })}
      </dl>
    </div>
  );
}
