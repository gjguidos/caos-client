
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";

import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";

import { WorkflowInputFields } from "./WorkflowInputFields";

/**
 * Shift expanded-row indices when an input is removed.
 *
 * Rows before the removed index stay unchanged.
 * Rows after it shift down by one.
 */
function remapOpenRows(
  open: ReadonlySet<number>,
  removed: number
): Set<number> {
  const next = new Set<number>();

  for (const index of open) {
    if (index < removed) {
      next.add(index);
    } else if (index > removed) {
      next.add(index - 1);
    }
  }

  return next;
}

export interface WorkflowInputsEditorProps {
  inputs: WorkflowInputField[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (
    index: number,
    patch: Partial<WorkflowInputField>
  ) => void;
}

/**
 * Author-facing editor for workflow input definitions.
 *
 * This defines the inputs a workflow accepts when
 * a user starts a run. It does not collect run values.
 *
 * WorkflowInputFields owns the field definition form,
 * while this component owns:
 *
 * - Input list
 * - Expand/collapse state
 * - Add/remove actions
 * - Per-row presentation
 */
export function WorkflowInputsEditor({
  inputs,
  onAdd,
  onRemove,
  onChange,
}: Readonly<WorkflowInputsEditorProps>) {
  const [openRows, setOpenRows] = useState<ReadonlySet<number>>(
    () => new Set([0])
  );

  const toggleRow = (index: number) => {
    setOpenRows((previous) => {
      const next = new Set(previous);

      if (!next.delete(index)) {
        next.add(index);
      }

      return next;
    });
  };

  const handleRemove = (index: number) => {
    setOpenRows((previous) =>
      remapOpenRows(previous, index)
    );

    onRemove(index);
  };

  const handleAdd = () => {
    // New inputs are appended at the current list length.
    setOpenRows((previous) => {
      const next = new Set(previous);
      next.add(inputs.length);
      return next;
    });

    onAdd();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Workflow inputs ({inputs.length})
        </h3>

        <p className="text-sm text-muted-foreground">
          Add inputs that a user can supply when starting a run.
        </p>
      </div>

      {inputs.length > 0 && (
        <ul className="divide-y divide-border border-y border-border">
          {inputs.map((field, index) => (
            <li key={index} className="py-3">
              <InputRow
                field={field}
                index={index}
                open={openRows.has(index)}
                onToggle={() => toggleRow(index)}
                onChange={(patch) =>
                  onChange(index, patch)
                }
                onRemove={() =>
                  handleRemove(index)
                }
              />
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="default"
        size="sm"
        className="w-full"
        onClick={handleAdd}
      >
        <Plus
          className="size-4"
          aria-hidden="true"
        />
        Add more inputs
      </Button>
    </div>
  );
}

function InputRow({
  field,
  index,
  open,
  onToggle,
  onChange,
  onRemove,
}: Readonly<{
  field: WorkflowInputField;
  index: number;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<WorkflowInputField>) => void;
  onRemove: () => void;
}>) {
  const title =
    field.key?.trim() ||
    field.label?.trim() ||
    "Untitled input";

  const panelId = `workflow-input-fields-${index}`;
  const triggerId = `workflow-input-trigger-${index}`;

  return (
    <div className="flex flex-col gap-2">
      {/* Row header */}
      <div className="flex items-center justify-between gap-2">
        <button
          id={triggerId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md",
            "py-1 text-left text-sm text-muted-foreground",
            "transition-colors hover:text-foreground",
            "focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring",
            "focus-visible:ring-offset-2"
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {title}
          </span>

          {open ? (
            <ChevronUp
              className="size-4 shrink-0"
              aria-hidden="true"
            />
          ) : (
            <ChevronDown
              className="size-4 shrink-0"
              aria-hidden="true"
            />
          )}
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
          title={`Remove ${title}`}
          className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2
            className="size-4"
            aria-hidden="true"
          />
        </Button>
      </div>

      {/* Expanded input definition */}
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="flex flex-col gap-3 pb-2"
        >
          <WorkflowInputFields
            field={field}
            idPrefix={`workflow-input-${index}`}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
}
