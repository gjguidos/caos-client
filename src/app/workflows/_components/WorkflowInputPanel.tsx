
"use client";

import { useMemo } from "react";
import { Trash2, X } from "lucide-react";
import { useReactFlow } from "@xyflow/react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { buildInputReference } from "@/shared/lib/workflow/references";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";

import { findByKey } from "@/store/slices/registry/registryEntry";
import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";

import { fileSlotLabel } from "../_lib/fileSlots";
import { inputEdgeId, type CanvasFocus } from "../_lib/inputNodes";
import type { InputUsage } from "../_lib/inputUsage";
import { classifyStepArgs } from "../_lib/stepArgs";

import type { BuilderStepNodeType } from "./nodes/BuilderStepNode";
import { WorkflowInputFields } from "./WorkflowInputFields";

export interface WorkflowInputPanelProps {
  /** Declaration index — the selected input's identity. */
  index: number;

  field: WorkflowInputField;

  /** Every consumption of field.key, in graph order. */
  usages: ReadonlyArray<InputUsage>;

  /** All step nodes, used by the binding picker. */
  nodes: ReadonlyArray<BuilderStepNodeType>;

  tools: ReadonlyArray<ToolDefinition>;

  onChangeInput: (
    index: number,
    patch: Partial<WorkflowInputField>
  ) => void;

  onRemoveInput: (index: number) => void;

  onChangeValue: (
    nodeId: string,
    key: string,
    value: string | number | string[] | undefined
  ) => void;

  onChangeFileBinding: (
    nodeId: string,
    slotName: string,
    value: string | undefined
  ) => void;

  /** Select the step referenced by a Used-by row. */
  onSelectStep: (stepId: string) => void;

  /** Highlight one usage edge while hovering a row. */
  onFocusChange: (focus: CanvasFocus | null) => void;
}

/** One possible destination for a workflow input binding. */
interface BindTarget {
  id: string;
  stepId: string;
  stepLabel: string;
  label: string;

  /** Whether the destination already holds a value. */
  set: boolean;

  apply: () => void;
}

/**
 * Configuration panel for a declared workflow input.
 *
 * Shows:
 * - Input definition
 * - Steps consuming this input
 * - Available destinations for new bindings
 *
 * Input bindings deliberately do not modify depends_on.
 * Workflow inputs exist at the beginning of execution
 * and therefore do not create step dependencies.
 */
export function WorkflowInputPanel({
  index,
  field,
  usages,
  nodes,
  tools,
  onChangeInput,
  onRemoveInput,
  onChangeValue,
  onChangeFileBinding,
  onSelectStep,
  onFocusChange,
}: Readonly<WorkflowInputPanelProps>) {
  const { fitView } = useReactFlow();

  const unbind = (usage: InputUsage) => {
    if (usage.target.kind === "arg") {
      onChangeValue(
        usage.stepId,
        usage.target.componentId,
        undefined
      );
    } else {
      onChangeFileBinding(
        usage.stepId,
        usage.target.slotName,
        undefined
      );
    }
  };

  const revealStep = (stepId: string) => {
    onSelectStep(stepId);

    void fitView({
      nodes: [{ id: stepId }],
      duration: 200,
      maxZoom: 1.2,
    });
  };

  const targets = useMemo(
    () =>
      collectBindTargets(
        field,
        nodes,
        tools,
        usages,
        onChangeValue,
        onChangeFileBinding
      ),
    [
      field,
      nodes,
      tools,
      usages,
      onChangeValue,
      onChangeFileBinding,
    ]
  );

  const keyless = field.key.trim().length === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Workflow input definition */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Workflow input
        </h3>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemoveInput(index)}
          aria-label="Remove input"
          title="Remove input"
          className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2
            className="size-4"
            aria-hidden="true"
          />
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <WorkflowInputFields
          field={field}
          idPrefix={`panel-input-${index}`}
          onChange={(patch) =>
            onChangeInput(index, patch)
          }
        />
      </div>

      {/* Existing input bindings */}
      <section className="flex flex-col gap-2 border-t border-border pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Used by ({usages.length})
        </h3>

        {usages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Not used by any step yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {usages.map((usage) => (
              <li
                key={fieldId(
                  usage.stepId,
                  usage.target
                )}
                className="flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1.5"
                onMouseEnter={() =>
                  onFocusChange({
                    kind: "edge",
                    id: inputEdgeId(
                      index,
                      usage.stepId
                    ),
                  })
                }
                onMouseLeave={() =>
                  onFocusChange(null)
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    revealStep(usage.stepId)
                  }
                  className="min-w-0 flex-1 truncate rounded-sm text-left text-sm text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title={`${usage.stepLabel} · ${usage.fieldLabel}`}
                >
                  {usage.stepLabel} · {usage.fieldLabel}
                </button>

                {usage.whole ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Unbind ${usage.stepLabel} · ${usage.fieldLabel}`}
                    title="Remove binding"
                    onClick={() => unbind(usage)}
                    className="size-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X
                      className="size-3.5"
                      aria-hidden="true"
                    />
                  </Button>
                ) : (
                  // Partial references cannot safely be removed
                  // without also erasing surrounding literal text.
                  <span className="shrink-0 text-xs text-muted-foreground">
                    in text
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* New input binding */}
      <section className="flex flex-col gap-2 border-t border-border pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Use in a step
        </h3>

        {keyless ? (
          <p className="text-xs text-muted-foreground">
            Give this input an identifier before binding it
            into a step.
          </p>
        ) : targets.length > 0 ? (
          <div className="space-y-2">
            <Label
              htmlFor={`bind-input-${index}`}
              className="text-xs text-muted-foreground"
            >
              Bind this input to a step field
            </Label>

            <Select
              value=""
              onValueChange={(targetId) => {
                targets
                  .find(
                    (target) =>
                      target.id === targetId
                  )
                  ?.apply();
              }}
            >
              <SelectTrigger
                id={`bind-input-${index}`}
                className="w-full"
              >
                <SelectValue placeholder="Select a field…" />
              </SelectTrigger>

              <SelectContent>
                {groupByStep(targets).map(
                  (group) => (
                    <SelectGroup key={group.stepId}>
                      <SelectLabel>
                        {group.stepLabel}
                      </SelectLabel>

                      {group.targets.map(
                        (target) => (
                          <SelectItem
                            key={target.id}
                            value={target.id}
                          >
                            {target.label}
                            {target.set
                              ? " · set"
                              : ""}
                          </SelectItem>
                        )
                      )}
                    </SelectGroup>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {field.input === "file"
              ? "No step declares a file slot yet — add a tool that takes a file input."
              : "No step has a field to fill yet — add a tool step first."}
          </p>
        )}
      </section>
    </div>
  );
}

/**
 * Identity of a bindable destination.
 *
 * Used consistently across:
 * - Existing usages
 * - Binding picker options
 * - Already-bound exclusion
 */
function fieldId(
  stepId: string,
  target: InputUsage["target"]
): string {
  return target.kind === "arg"
    ? `${stepId}:arg:${target.componentId}`
    : `${stepId}:slot:${target.slotName}`;
}

/**
 * Group available binding destinations by step.
 * Preserve the order in which steps first appear.
 */
function groupByStep(
  targets: ReadonlyArray<BindTarget>
): Array<{
  stepId: string;
  stepLabel: string;
  targets: BindTarget[];
}> {
  const groups = new Map<
    string,
    {
      stepId: string;
      stepLabel: string;
      targets: BindTarget[];
    }
  >();

  for (const target of targets) {
    const group = groups.get(target.stepId);

    if (group) {
      group.targets.push(target);
    } else {
      groups.set(target.stepId, {
        stepId: target.stepId,
        stepLabel: target.stepLabel,
        targets: [target],
      });
    }
  }

  return [...groups.values()];
}

/**
 * Collect eligible destinations for this workflow input.
 *
 * A file input binds only to tool file slots.
 * Other workflow inputs bind to command arguments.
 *
 * Fields already bound to this input are excluded.
 * Fields containing another value remain pickable,
 * marked "set" because binding will overwrite them.
 */
function collectBindTargets(
  field: WorkflowInputField,
  nodes: ReadonlyArray<BuilderStepNodeType>,
  tools: ReadonlyArray<ToolDefinition>,
  usages: ReadonlyArray<InputUsage>,
  onChangeValue: WorkflowInputPanelProps["onChangeValue"],
  onChangeFileBinding: WorkflowInputPanelProps["onChangeFileBinding"]
): BindTarget[] {
  const token = buildInputReference(field.key);

  const alreadyBound = new Set(
    usages.map((usage) =>
      fieldId(usage.stepId, usage.target)
    )
  );

  const targets: BindTarget[] = [];

  for (const node of nodes) {
    if (node.data.stepType !== "tool") {
      continue;
    }

    const tool = findByKey(
      tools,
      node.data.toolName
    );

    if (!tool) {
      continue;
    }

    const stepLabel = node.data.label;

    if (field.input === "file") {
      for (
        const slot of
        tool.supports?.files?.slots ?? []
      ) {
        const id = fieldId(node.id, {
          kind: "slot",
          slotName: slot.name,
        });

        if (alreadyBound.has(id)) {
          continue;
        }

        targets.push({
          id,
          stepId: node.id,
          stepLabel,
          label: fileSlotLabel(slot),
          set: Boolean(
            node.data.fileBindings?.[slot.name]
          ),
          apply: () =>
            onChangeFileBinding(
              node.id,
              slot.name,
              token
            ),
        });
      }

      continue;
    }

    // Use the same argument classification as
    // the Used-by list to keep labels consistent.
    for (
      const arg of classifyStepArgs(
        tool,
        node.data.command ?? ""
      )
    ) {
      const id = fieldId(node.id, {
        kind: "arg",
        componentId: arg.componentId,
      });

      if (alreadyBound.has(id)) {
        continue;
      }

      targets.push({
        id,
        stepId: node.id,
        stepLabel,
        label: arg.field,
        set:
          arg.kind === "binding" ||
          arg.kind === "literal",
        apply: () =>
          onChangeValue(
            node.id,
            arg.componentId,
            token
          ),
      });
    }
  }

  return targets;
}
