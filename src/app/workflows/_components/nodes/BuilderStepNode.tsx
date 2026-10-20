
"use client";

import { useMemo } from "react";
import { X } from "lucide-react";

import {
  Handle,
  Position,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";

import { cn } from "@/shared/lib/utils";
import { useToolRegistry } from "@/store/selectors";
import { findByKey } from "@/store/slices/registry/registryEntry";

import { resolveModeLabel } from "../../_lib/collectPrefillableComponents";
import { nodeCommandToValues } from "../../_lib/nodeCommand";
import { classifyStepArgs } from "../../_lib/stepArgs";
import type { BuilderNodeData } from "../../_lib/builderGraph";

export type BuilderStepNodeType = Node<
  BuilderNodeData,
  "builderStep"
>;

/**
 * Presentation metadata for a step's configuration status.
 *
 * Priority:
 * 1. Backend validation issues
 * 2. Missing required inputs
 * 3. Ready
 */
function deriveStepStatus(
  hasIssues: boolean,
  missingCount: number
): {
  label: string;
  textClass: string;
  dotClass: string;
} {
  if (hasIssues) {
    return {
      label: "Needs attention",
      textClass: "text-destructive",
      dotClass: "bg-destructive",
    };
  }

  if (missingCount > 0) {
    return {
      label: `${missingCount} input${
        missingCount > 1 ? "s" : ""
      } to set`,
      textClass: "text-amber-600 dark:text-amber-400",
      dotClass: "bg-amber-500",
    };
  }

  return {
    label: "Ready",
    textClass: "text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  };
}

/**
 * Editable workflow-builder node.
 *
 * Unlike the read-only workflow monitor node, this
 * component supports:
 *
 * - Connectable React Flow handles
 * - Selected node highlighting
 * - Deletion
 * - Tool mode labels
 * - Prefilled configuration indicators
 * - Missing required input indicators
 * - Backend validation issues
 *
 * Configuration state is derived from the node's
 * command rather than stored separately.
 */
export function BuilderStepNode({
  id,
  data,
  selected,
}: NodeProps<BuilderStepNodeType>) {
  const { deleteElements, getNode } = useReactFlow();
  const tools = useToolRegistry();

  const issues = data.issues ?? [];
  const hasIssues = issues.length > 0;

  const typeLabel =
    data.stepType === "tool"
      ? "Tool"
      : capitalize(data.stepType);

  /*
   * Resolve tool metadata and the selected mode.
   */
  const tool =
    data.stepType === "tool"
      ? findByKey(tools, data.toolName)
      : undefined;

  const command = data.command ?? "";

  const values = useMemo(() => {
    if (!tool || !data.command) {
      return undefined;
    }

    return nodeCommandToValues(
      tool,
      data.command
    );
  }, [tool, data.command]);

  const modeLabel = tool
    ? resolveModeLabel(tool, values)
    : undefined;

  const displayLabel = modeLabel
    ? `${data.label} · ${modeLabel}`
    : data.label;

  /*
   * Classify arguments once, using the node command.
   *
   * Required inputs, bound values and configured
   * indicators all derive from the same classification.
   */
  const args = useMemo(
    () =>
      tool
        ? classifyStepArgs(
            tool,
            command,
            (stepId) => {
              const node = getNode(
                stepId
              ) as BuilderStepNodeType | undefined;

              return node?.data.label;
            }
          )
        : [],
    [tool, command, getNode]
  );

  const missingCount = args.filter(
    (arg) =>
      arg.kind === "missingRequired"
  ).length;

  const isConfigured = args.some(
    (arg) =>
      arg.kind === "literal" ||
      arg.kind === "binding"
  );

  const status = deriveStepStatus(
    hasIssues,
    missingCount
  );

  return (
    <div
      className={cn(
        "group relative w-[220px] rounded-lg border bg-card px-3 py-2 shadow-sm transition-colors",
        hasIssues
          ? "border-destructive ring-1 ring-destructive"
          : selected
            ? "border-primary ring-1 ring-primary/30"
            : "border-border"
      )}
    >
      {/* Incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border-0 !bg-muted-foreground"
      />

      {/* Delete action */}
      <button
        type="button"
        aria-label="Delete step"
        title="Delete step"
        onClick={(event) => {
          event.stopPropagation();

          void deleteElements({
            nodes: [{ id }],
          });
        }}
        className={cn(
          "nodrag absolute -right-2 -top-2 z-10",
          "flex size-6 items-center justify-center",
          "rounded-full border border-border bg-card shadow-sm",
          "text-muted-foreground transition-colors",
          "hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "opacity-0 pointer-events-none",
          "group-hover:opacity-100 group-hover:pointer-events-auto",
          "group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
          selected && "opacity-100 pointer-events-auto"
        )}
      >
        <X
          className="size-3.5"
          aria-hidden="true"
        />
      </button>

      <div className="flex flex-col gap-1.5">
        {/* Step type and configured indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {typeLabel}
          </span>

          {isConfigured && (
            <span
              role="img"
              aria-label="Configured"
              title="Has prefilled values"
              className="size-1.5 rounded-full bg-primary"
            />
          )}
        </div>

        {/* Step label */}
        <p
          className="truncate text-sm font-medium text-foreground"
          title={displayLabel}
        >
          {displayLabel}
        </p>

        {/* Configuration status for tool steps */}
        {tool && (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                status.dotClass
              )}
              aria-hidden="true"
            />

            <span
              className={cn(
                "text-xs",
                status.textClass
              )}
            >
              {status.label}
            </span>
          </div>
        )}

        {/* Backend validation issues */}
        {hasIssues && (
          <div
            className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5"
            role="alert"
          >
            {issues.map((issue, index) => (
              <p
                key={`${issue.code}-${index}`}
                className="break-words text-xs text-destructive"
              >
                {issue.message}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing connections */}
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !border-0 !bg-muted-foreground"
      />
    </div>
  );
}

function capitalize(value: string): string {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1).replace(/_/g, " ")
  );
}
