
"use client";

import type { Edge } from "@xyflow/react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { cn } from "@/shared/lib/utils";
import { useToolRegistry } from "@/store/selectors";
import { findByKey } from "@/store/slices/registry/registryEntry";

import { buildDefinitionFromGraph } from "../_lib/builderGraph";
import { classifyStepArgs, type StepArg } from "../_lib/stepArgs";
import type { BuilderStepNodeType } from "./nodes/BuilderStepNode";

interface DefinitionPreviewPanelProps {
  nodes: BuilderStepNodeType[];
  edges: Edge[];
}

type PreviewTab = "visual" | "json";

/**
 * Floating preview for the workflow builder.
 *
 * Visual:
 * - Steps and their configured inputs
 * - References to upstream outputs
 * - Missing required inputs
 *
 * JSON:
 * - Serialized workflow definition derived from the live graph
 *
 * Nothing is persisted by this component.
 */
export function DefinitionPreviewPanel({
  nodes,
  edges,
}: Readonly<DefinitionPreviewPanelProps>) {
  const tools = useToolRegistry();

  const labelOf = (stepId: string) =>
    nodes.find((node) => node.id === stepId)?.data.label;

  return (
    <Tabs
      defaultValue="visual"
      data-testid="definition-preview"
      className="pointer-events-auto flex max-h-[60vh] min-h-0 w-[28rem] max-w-[90vw] flex-col gap-0 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
    >
      <div className="shrink-0 border-b border-border px-2 py-1">
        <TabsList className="h-8 bg-muted/60 p-0.5">
          <TabsTrigger
            value="visual"
            className="px-3 text-xs"
          >
            Visual
          </TabsTrigger>
          <TabsTrigger
            value="json"
            className="px-3 text-xs"
          >
            JSON
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="visual"
        className="mt-0 min-h-0 flex-1 overflow-y-auto p-2"
      >
        {nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No steps yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {nodes.map((node) => (
              <StepCard
                key={node.id}
                node={node}
                tools={tools}
                getLabel={labelOf}
              />
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent
        value="json"
        className="mt-0 min-h-0 flex-1 overflow-auto p-2"
      >
        <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
          <code>
            {JSON.stringify(
              buildDefinitionFromGraph(nodes, edges),
              null,
              2
            )}
          </code>
        </pre>
      </TabsContent>
    </Tabs>
  );
}

/**
 * Render a classified argument in the visual preview.
 */
function previewDisplay(arg: StepArg): string {
  if (arg.kind === "binding") {
    return `← ${arg.source}`;
  }

  if (arg.kind === "missingRequired") {
    return "(required)";
  }

  return arg.value ?? "";
}

function StepCard({
  node,
  tools,
  getLabel,
}: Readonly<{
  node: BuilderStepNodeType;
  tools: ReturnType<typeof useToolRegistry>;
  getLabel: (stepId: string) => string | undefined;
}>) {
  const { data } = node;

  const tool =
    data.stepType === "tool"
      ? findByKey(tools, data.toolName)
      : undefined;

  // Preserve spec ordering, omitting unset optional arguments.
  const rows = tool
    ? classifyStepArgs(
        tool,
        data.command ?? "",
        getLabel
      ).filter((arg) => arg.kind !== "optionalUnset")
    : [];

  return (
    <li className="rounded-md border border-border bg-background p-2">
      <div className="flex items-center justify-between gap-2">
        <p
          className="min-w-0 truncate text-sm font-medium text-foreground"
          title={data.label}
        >
          {data.label}
        </p>

        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {data.stepType}
        </span>
      </div>

      {data.stepType !== "tool" ? null : rows.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          No inputs set.
        </p>
      ) : (
        <dl className="mt-2 flex flex-col gap-1">
          {rows.map((row) => {
            const display = previewDisplay(row);

            return (
              <div
                key={row.field}
                className="flex items-baseline justify-between gap-2"
              >
                <dt className="shrink-0 text-xs text-muted-foreground">
                  {row.field}
                </dt>

                <dd
                  className={cn(
                    "min-w-0 truncate text-right text-xs",
                    row.kind === "missingRequired"
                      ? "text-amber-600 dark:text-amber-400"
                      : row.kind === "binding"
                        ? "text-primary"
                        : "text-foreground"
                  )}
                  title={display}
                >
                  {display}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </li>
  );
}
