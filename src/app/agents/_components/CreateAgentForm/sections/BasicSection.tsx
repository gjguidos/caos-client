
"use client";

import { useCallback, useEffect, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { AlertTriangle } from "lucide-react";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { fetchRegistryEntry } from "@/shared/api/fetch_registries";
import { InfoTooltipButton } from "@/shared/components/InfoTooltipButton/InfoTooltipButton";

import type { AgentFormValues } from "@/shared/lib/agent.types";

import {
  useAgentTypeRegistry,
  useRoleRegistry,
  useRulePackRegistry,
} from "@/store/selectors";

import { GapMessage } from "../activeGap";

type FormValues = AgentFormValues;

interface BasicSectionProps {
  form: UseFormReturn<FormValues>;
  isLoading?: boolean;
}

type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

/**
 * Shared registry selector.
 *
 * Displays labels and descriptions in the dropdown,
 * but only the selected label in the trigger.
 */
function RegistrySelect({
  value,
  onValueChange,
  placeholder,
  options,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: SelectOption[];
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        className="
          flex h-10 min-w-[200px] items-center justify-between
          gap-2 px-3 text-left
          [&>svg]:size-4
          [&_[data-select-description]]:hidden
        "
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate">
                {option.label}
              </span>

              {option.description && (
                <span
                  data-select-description
                  className="text-xs font-normal text-muted-foreground"
                >
                  {option.description}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function BasicSection({
  form,
  isLoading = false,
}: BasicSectionProps) {
  const roleRegs = useRoleRegistry();
  const agentTypeRegs = useAgentTypeRegistry();

  const [loadingStates, setLoadingStates] = useState({
    agentConfig: false,
  });

  const [error, setError] = useState<{
    agentConfig?: string;
  }>({});

  const selectedAgentType = useWatch({
    control: form.control,
    name: "type",
  });

  const loadAgentTypeConfig = useCallback(async () => {
    if (!selectedAgentType) return;

    setLoadingStates((prev) => ({
      ...prev,
      agentConfig: true,
    }));

    setError((prev) => ({
      ...prev,
      agentConfig: undefined,
    }));

    try {
      const agentTypeEntry = await fetchRegistryEntry(
        "agent",
        selectedAgentType
      );

      // Agent types define which tools are enabled,
      // not the individual tools' runtime configuration.
      const toolsMeta =
        agentTypeEntry?.metadata?.default_tools ||
        agentTypeEntry?.default_tools ||
        [];

      if (!form.getValues("tools")?.length) {
        form.setValue(
          "tools",
          toolsMeta.map((tool) => ({
            key: tool.key,
            config: {},
          }))
        );
      }
    } catch (err) {
      setError((prev) => ({
        ...prev,
        agentConfig: "Failed to load agent configuration",
      }));

      console.error("Agent config load error:", err);
    } finally {
      setLoadingStates((prev) => ({
        ...prev,
        agentConfig: false,
      }));
    }
  }, [selectedAgentType, form]);

  useEffect(() => {
    void loadAgentTypeConfig();
  }, [loadAgentTypeConfig]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="space-y-2"
          >
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error.agentConfig && (
        <Alert variant="destructive">
          <AlertTriangle
            className="size-4"
            aria-hidden="true"
          />

          <AlertDescription>
            {error.agentConfig}
          </AlertDescription>
        </Alert>
      )}

      <div className="agent-wizard-card space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem data-field="name">
              <FormLabel>Name</FormLabel>

              <FormControl>
                <Input
                  placeholder="e.g. Nova Research"
                  {...field}
                  disabled={loadingStates.agentConfig}
                />
              </FormControl>

              <FormMessage />
              <GapMessage field="name" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem data-field="type">
              <FormLabel>Agent type</FormLabel>

              <FormControl>
                <RegistrySelect
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  placeholder="Select agent type"
                  disabled={loadingStates.agentConfig}
                  options={agentTypeRegs.map((type) => ({
                    value: type.key,
                    label: type.name,
                    description: type.description,
                  }))}
                />
              </FormControl>

              <FormMessage />
              <GapMessage field="type" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="roleRegistry"
          render={({ field }) => (
            <FormItem data-field="roleRegistry">
              <div className="flex items-center gap-2">
                <FormLabel>Agent role</FormLabel>

                {loadingStates.agentConfig && (
                  <span className="text-xs text-muted-foreground">
                    Loading config...
                  </span>
                )}
              </div>

              <FormControl>
                <RegistrySelect
                  value={field.value ?? ""}
                  onValueChange={(value) =>
                    field.onChange(value || "")
                  }
                  placeholder="Select role"
                  disabled={loadingStates.agentConfig}
                  options={roleRegs.map((role) => ({
                    value: role.key,
                    label: role.name,
                    description: role.description,
                  }))}
                />
              </FormControl>

              <FormMessage />
              <GapMessage field="roleRegistry" />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

/**
 * Rule packs are configured in the Behaviour step,
 * alongside personality and other behaviour settings.
 */
export function RulePackField({
  form,
}: Readonly<{
  form: UseFormReturn<FormValues>;
}>) {
  const rulePackRegs = useRulePackRegistry();

  return (
    <FormField
      control={form.control}
      name="rulepackRegistry"
      render={({ field }) => (
        <FormItem data-field="rulepackRegistry">
          <div className="flex items-center gap-2">
            <FormLabel>Rule pack</FormLabel>

            <Badge
              variant="secondary"
              className="rounded-full px-2 py-0.5 text-xs font-normal text-muted-foreground"
            >
              Optional
            </Badge>

            <InfoTooltipButton
              label="Rule pack info"
              description="Attach predefined behaviour constraints."
            />
          </div>

          <FormControl>
            <RegistrySelect
              value={field.value ?? ""}
              onValueChange={(value) =>
                field.onChange(value || "")
              }
              placeholder="Select rule pack"
              options={rulePackRegs.map((rulePack) => ({
                value: rulePack.key,
                label: rulePack.name,
                description: rulePack.description,
              }))}
            />
          </FormControl>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}
