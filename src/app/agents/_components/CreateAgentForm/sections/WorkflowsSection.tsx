
"use client";

import { Loader2, X } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

import { CheckboxRow } from "@/app/agents/_components/CheckboxRow/CheckboxRow";

import { useWorkflowCatalog } from "@/shared/hooks/useWorkflowCatalog";
import type { AgentFormValues } from "@/shared/lib/agent.types";
import { TOOL_KEYS } from "@/shared/lib/toolKeys";
import { cn } from "@/shared/lib/utils";

import {
  resolveAttachedWorkflows,
  workflowLabel,
} from "@/shared/lib/workflow/attachedWorkflows";

import { PanelHeading } from "./StepHeading";

type FormValues = AgentFormValues;

interface WorkflowsSectionProps {
  form: UseFormReturn<FormValues>;
  className?: string;
}

/**
 * True when workflows are attached but the workflow
 * execution tool is not enabled on the agent.
 */
function needsWorkflowTool(
  workflows: readonly string[],
  tools: ReadonlyArray<{ key: string }>
): boolean {
  if (workflows.length === 0) {
    return false;
  }

  return !tools.some(
    (tool) => tool.key === TOOL_KEYS.workflow
  );
}

/**
 * Workflow attachment section.
 *
 * Handles:
 * - Available workflow selection
 * - Existing workflow attachments
 * - Missing workflow execution tool
 * - Stale workflow references
 * - Catalog loading and error states
 */
export default function WorkflowsSection({
  form,
  className,
}: Readonly<WorkflowsSectionProps>) {
  const tools =
    useWatch({
      control: form.control,
      name: "tools",
    }) ?? [];

  const catalog = useWorkflowCatalog();

  return (
    <div className={cn("space-y-3", className)}>
      <FormField
        control={form.control}
        name="workflows"
        render={({ field }) => {
          const attached: string[] =
            field.value ?? [];

          const toggle = (
            key: string,
            checked: boolean
          ) => {
            field.onChange(
              checked
                ? attached.includes(key)
                  ? attached
                  : [...attached, key]
                : attached.filter(
                    (workflowKey) =>
                      workflowKey !== key
                  )
            );
          };

          // Stale workflows should only be identified
          // after the catalog has loaded successfully.
          const staleKeys =
            catalog.status === "ready"
              ? resolveAttachedWorkflows(
                  attached,
                  catalog
                )
                  .filter((workflow) => workflow.stale)
                  .map((workflow) => workflow.key)
              : [];

          return (
            <FormItem
              className="space-y-3"
              data-field="workflows"
            >
              <PanelHeading
                title="Workflows"
                blurb="Programs this agent may launch. It can only run what is listed here."
                trailing={
                  attached.length > 0 ? (
                    <Badge variant="outline">
                      {attached.length} attached
                    </Badge>
                  ) : undefined
                }
              />

              {needsWorkflowTool(attached, tools) && (
                <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300">
                  <AlertDescription>
                    Attached workflows can&apos;t be
                    launched without the workflow tool.
                    Tick &ldquo;Workflow Tool&rdquo; above.
                  </AlertDescription>
                </Alert>
              )}

              {catalog.status === "unavailable" && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Could not load the workflow catalog.
                    Attached workflows are shown by key
                    and are left untouched.
                  </AlertDescription>
                </Alert>
              )}

              <FormControl>
                <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-card p-2.5 shadow-sm">
                  {catalog.status === "loading" && (
                    <div
                      className="flex items-center justify-center p-4"
                      role="status"
                      aria-label="Loading workflows"
                    >
                      <Loader2
                        className="size-5 animate-spin text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="sr-only">
                        Loading workflows
                      </span>
                    </div>
                  )}

                  {catalog.status === "ready" &&
                    catalog.entries.length === 0 && (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No workflows are available yet.
                        Build one first, then attach it
                        here.
                      </p>
                    )}

                  {catalog.status === "ready" &&
                    catalog.entries.map((workflow) => (
                      <CheckboxRow
                        key={workflow.key}
                        id={`workflow-${workflow.key}`}
                        checked={attached.includes(
                          workflow.key
                        )}
                        onCheckedChange={(checked) =>
                          toggle(
                            workflow.key,
                            checked
                          )
                        }
                        title={workflowLabel(
                          workflow
                        )}
                        info={workflow.description}
                      />
                    ))}
                </div>
              </FormControl>

              {staleKeys.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Attached but not in the catalog.
                    Kept until you remove them.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {staleKeys.map((key) => (
                      <Badge
                        key={key}
                        variant="outline"
                        className="flex max-w-full items-center gap-1.5 rounded-md border-amber-500/40 bg-amber-500/10 py-1 pl-3 pr-1 text-xs font-normal"
                      >
                        <span className="min-w-0 break-all font-mono">
                          {key}
                        </span>

                        <span className="shrink-0 text-muted-foreground">
                          not in catalog
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${key}`}
                          title={`Remove ${key}`}
                          className="size-6 shrink-0"
                          onClick={() =>
                            toggle(key, false)
                          }
                        >
                          <X
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <FormMessage />
            </FormItem>
          );
        }}
      />
    </div>
  );
}
