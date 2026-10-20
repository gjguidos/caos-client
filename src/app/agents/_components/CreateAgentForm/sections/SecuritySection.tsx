
"use client";

import { CheckCircle2, Globe2, LockKeyhole } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { InfoTooltipButton } from "@/shared/components/InfoTooltipButton/InfoTooltipButton";
import type { AgentFormValues } from "@/shared/lib/agent.types";
import { cn } from "@/shared/lib/utils";

export type Team = {
  group_id: string;
  name: string;
};

interface SecuritySectionProps {
  form: UseFormReturn<AgentFormValues>;
  className?: string;
  groups?: Team[];
  canEdit?: boolean;
}

const visibilityOptions = [
  {
    value: "public",
    label: "Public",
    description: "Visible to everyone. No group filter.",
    icon: Globe2,
  },
  {
    value: "private",
    label: "Private",
    description: "Only specific groups can access.",
    icon: LockKeyhole,
  },
] as const;

export default function SecuritySection({
  form,
  className,
  groups = [],
  canEdit = true,
}: SecuritySectionProps) {
  const { control, watch } = form;

  const currentVisibility = watch("security.visibility");

  const whitelistedGroups =
    watch("security.whitelisted_groups") ?? [];

  const toggleGroup = (groupId: string) => {
    if (!canEdit) return;

    const exists = whitelistedGroups.includes(groupId);

    form.setValue(
      "security.whitelisted_groups",
      exists
        ? whitelistedGroups.filter((id) => id !== groupId)
        : [...whitelistedGroups, groupId],
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      }
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      {!canEdit && (
        <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300">
          <AlertDescription>
            You need a group admin role or superadmin to change visibility.
            Selections are read-only.
          </AlertDescription>
        </Alert>
      )}

      <div className="agent-wizard-card space-y-6">
        <FormField
          control={control}
          name="security.visibility"
          render={({ field }) => (
            <FormItem data-field="security.visibility">
              <div className="flex items-center gap-2">
                <FormLabel>Visibility</FormLabel>

                <InfoTooltipButton
                  label="Visibility info"
                  description="Public agents are visible to all users. Private agents are filtered by group membership."
                />
              </div>

              <FormControl>
                <div className="grid gap-3 sm:grid-cols-2">
                  {visibilityOptions.map((option) => {
                    const active = field.value === option.value;
                    const Icon = option.icon;

                    return (
                      <div
                        key={option.value}
                        className={cn(
                          "rounded-xl border-2 p-3 transition-colors",
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border",
                          !canEdit && "opacity-60"
                        )}
                      >
                        <Button
                          type="button"
                          variant={active ? "default" : "outline"}
                          className="w-full justify-start gap-2"
                          onClick={() => field.onChange(option.value)}
                          disabled={!canEdit}
                          aria-pressed={active}
                        >
                          <Icon
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                          {option.label}
                        </Button>

                        <p className="mt-2 text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {currentVisibility === "private" && (
          <FormField
            control={control}
            name="security.whitelisted_groups"
            render={() => (
              <FormItem
                className="space-y-3"
                data-field="security.whitelisted_groups"
              >
                <div className="flex items-center gap-2">
                  <FormLabel>Allowed groups</FormLabel>

                  {whitelistedGroups.length > 0 && (
                    <Badge variant="outline">
                      {whitelistedGroups.length}
                    </Badge>
                  )}
                </div>

                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Limiting access needs a team admin role. Ask your team
                    admin for{" "}
                    <code className="font-mono text-xs">
                      team-name.admin
                    </code>
                    , or make this agent public.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {groups.map((group) => {
                      const checked = whitelistedGroups.includes(
                        group.group_id
                      );

                      return (
                        <div
                          key={group.group_id}
                          className={cn(
                            "flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors",
                            checked
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card",
                            !canEdit && "opacity-60"
                          )}
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <Checkbox
                              id={`group-${group.group_id}`}
                              checked={checked}
                              onCheckedChange={() =>
                                toggleGroup(group.group_id)
                              }
                              disabled={!canEdit}
                              className="mt-1"
                            />

                            <label
                              htmlFor={`group-${group.group_id}`}
                              className={cn(
                                "min-w-0",
                                canEdit
                                  ? "cursor-pointer"
                                  : "cursor-not-allowed"
                              )}
                            >
                              <span className="block font-medium text-foreground">
                                {group.name}
                              </span>

                              <span className="block break-all font-mono text-xs text-muted-foreground">
                                {group.group_id}
                              </span>
                            </label>
                          </div>

                          {checked && (
                            <CheckCircle2
                              className="size-4 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
}
