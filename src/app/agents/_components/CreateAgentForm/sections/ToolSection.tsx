
"use client";

import { useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { Search, Settings2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { CheckboxRow } from "@/app/agents/_components/CheckboxRow/CheckboxRow";

import type { AgentFormValues } from "@/shared/lib/agent.types";
import { TOOL_KEYS } from "@/shared/lib/toolKeys";
import { cn } from "@/shared/lib/utils";

import { labelForKey } from "@/store/slices/registry/registryEntry";
import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";

import BaseToolConfigDialog from "../../dialogs/tool/BaseToolDialog";
import { TOOL_CONFIG_COMPONENTS } from "../../dialogs/tool/toolConfigComponentMap";
import { ToolConfigDialog } from "../../dialogs/ToolConfigDialog";

import { PanelHeading } from "./StepHeading";

const NON_CONFIGURABLE: string[] = [TOOL_KEYS.rag];

type FormValues = AgentFormValues;
type ToolConfig = FormValues["tools"][number]["config"];

interface ToolsSectionProps {
  form: UseFormReturn<FormValues>;
  toolRegs: ToolDefinition[];
  className?: string;
}

/**
 * Available tools and per-tool configuration.
 *
 * Selected tools are stored in the agent form.
 * Registry entries provide names and descriptions.
 * Each selected tool starts with an empty config.
 */
export default function ToolsSection({
  form,
  toolRegs,
  className,
}: ToolsSectionProps) {
  const selectedTools =
    useWatch({
      control: form.control,
      name: "tools",
    }) ?? [];

  const [query, setQuery] = useState("");

  const [toolDialogOpen, setToolDialogOpen] =
    useState(false);

  const [editingTool, setEditingTool] = useState<{
    key: string;
    config: ToolConfig;
  } | null>(null);

  const showToolConfig = (toolId: string) => {
    const selected = selectedTools.find(
      (tool) => tool.key === toolId
    );

    setEditingTool({
      key: toolId,
      config: selected?.config ?? {},
    });

    setToolDialogOpen(true);
  };

  const handleDialogConfigChange = (
    newConfig: ToolConfig
  ) => {
    setEditingTool((previous) =>
      previous
        ? {
            ...previous,
            config: newConfig,
          }
        : null
    );
  };

  const saveToolConfig = () => {
    if (editingTool) {
      form.setValue(
        "tools",
        selectedTools.map((tool) =>
          tool.key === editingTool.key
            ? {
                ...tool,
                config: editingTool.config,
              }
            : tool
        ),
        {
          shouldDirty: true,
          shouldValidate: true,
        }
      );
    }

    setToolDialogOpen(false);
  };

  /**
   * Tools start with no configuration.
   *
   * The backend merges per-tool config into
   * the tool's runtime flags.
   */
  const handleToolToggle = (
    toolId: string,
    checked: boolean
  ) => {
    const current = form.getValues("tools") ?? [];

    if (checked) {
      if (
        current.some((tool) => tool.key === toolId)
      ) {
        return;
      }

      form.setValue(
        "tools",
        [
          ...current,
          {
            key: toolId,
            config: {},
          },
        ],
        {
          shouldDirty: true,
          shouldValidate: true,
        }
      );
    } else {
      form.setValue(
        "tools",
        current.filter(
          (tool) => tool.key !== toolId
        ),
        {
          shouldDirty: true,
          shouldValidate: true,
        }
      );
    }
  };

  const selectedCount = selectedTools.length;

  /**
   * Keep alphabetical ordering stable.
   *
   * Selecting tools must not reorder the list.
   */
  const visibleTools = useMemo(() => {
    const sorted = [...toolRegs].sort(
      (a, b) => a.name.localeCompare(b.name)
    );

    const normalizedQuery = query
      .trim()
      .toLowerCase();

    if (!normalizedQuery) {
      return sorted;
    }

    return sorted.filter(
      (tool) =>
        tool.name
          .toLowerCase()
          .includes(normalizedQuery) ||
        tool.description
          ?.toLowerCase()
          .includes(normalizedQuery)
    );
  }, [toolRegs, query]);

  if (toolRegs.length === 0) {
    return (
      <div className={cn("space-y-2", className)}>
        <FormLabel>Tools</FormLabel>

        <p className="text-sm text-muted-foreground">
          No tools available
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <PanelHeading
        title="Tools"
        blurb="What the agent can do. Tools with a gear can be configured once enabled."
        trailing={
          selectedCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                form.setValue("tools", [], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              Clear all
            </Button>
          ) : null
        }
      />

      <FormField
        control={form.control}
        name="tools"
        render={() => (
          <FormItem data-field="tools">
            <FormControl>
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                {/* Search */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-3.5 py-3">
                  <div className="relative min-w-[220px] flex-1">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />

                    <Input
                      id="tool-search"
                      type="search"
                      value={query}
                      onChange={(event) =>
                        setQuery(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                        }
                      }}
                      placeholder="Search tools"
                      aria-label="Search tools"
                      className="h-9 pl-9 pr-9"
                    />

                    {query && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Clear search"
                        className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                        onClick={() => setQuery("")}
                      >
                        <X
                          className="size-3.5"
                          aria-hidden="true"
                        />
                      </Button>
                    )}
                  </div>

                  <p
                    className="shrink-0 text-xs text-muted-foreground"
                    aria-live="polite"
                  >
                    {selectedCount} of {toolRegs.length} selected
                    {query.trim() &&
                      ` · ${visibleTools.length} matching`}
                  </p>
                </div>

                {/* Scrollable tool list */}
                <div className="agent-wizard-scroll flex max-h-[min(420px,42vh)] flex-col gap-0.5 overflow-y-auto p-2.5">
                  {visibleTools.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No tools match &ldquo;{query.trim()}&rdquo;.
                      Try a shorter search.
                    </p>
                  ) : (
                    visibleTools.map((tool) => {
                      const selected = selectedTools.find(
                        (item) => item.key === tool.key
                      );

                      const isChecked = Boolean(selected);

                      const canConfigure =
                        Boolean(
                          TOOL_CONFIG_COMPONENTS[tool.key]
                        ) &&
                        !NON_CONFIGURABLE.includes(
                          tool.key
                        );

                      return (
                        <CheckboxRow
                          key={tool.key}
                          id={`tool-${tool.key}`}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleToolToggle(
                              tool.key,
                              checked
                            )
                          }
                          title={tool.name}
                          trailing={
                            isChecked && canConfigure ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  showToolConfig(tool.key)
                                }
                                aria-label={`Configure ${tool.name}`}
                                className="shrink-0 gap-1.5"
                              >
                                <Settings2
                                  className="size-4"
                                  aria-hidden="true"
                                />
                                Configure
                              </Button>
                            ) : null
                          }
                        >
                          {tool.description && (
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {tool.description}
                            </span>
                          )}
                        </CheckboxRow>
                      );
                    })
                  )}
                </div>
              </div>
            </FormControl>

            <FormMessage />
          </FormItem>
        )}
      />

      {/* Tool configuration dialog */}
      {editingTool && (
        <BaseToolConfigDialog
          open={toolDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              saveToolConfig();
            }

            setToolDialogOpen(open);
          }}
          title={`${labelForKey(
            toolRegs,
            editingTool.key
          )} Configuration`}
        >
          <ToolConfigDialog
            toolKey={editingTool.key}
            config={editingTool.config}
            onChange={handleDialogConfigChange}
          />
        </BaseToolConfigDialog>
      )}
    </div>
  );
}
