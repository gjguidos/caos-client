
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  GitBranch,
  LockKeyhole,
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { cn } from "@/shared/lib/utils";

import type { AttachedWorkflow } from "@/shared/lib/workflow/attachedWorkflows";

export const LOCKED_HINT =
  "Can't switch workflow while a run is in progress. Open a new tab to run another.";

export interface WorkflowPickerProps {
  agentName: string;
  workflows: AttachedWorkflow[];
  workflowKey?: string | null;
  onWorkflowChange: (key: string) => void;

  /** Prevent switching workflows during an active run. */
  locked: boolean;
}

/**
 * The workflow title doubles as the selector.
 *
 * The agent name provides context, while the selected
 * workflow remains the primary heading.
 */
export function WorkflowPicker({
  agentName,
  workflows,
  workflowKey,
  onWorkflowChange,
  locked,
}: Readonly<WorkflowPickerProps>) {
  const [open, setOpen] = useState(false);

  const active = workflows.find(
    (workflow) => workflow.key === workflowKey
  );

  const title = active?.name ?? "No workflow";
  const canSwitch = workflows.length > 1;

  // Close the menu if a run starts while it is open.
  useEffect(() => {
    if (locked) {
      setOpen(false);
    }
  }, [locked]);

  const handleSelect = useCallback(
    (key: string) => {
      if (locked) return;

      const target = workflows.find(
        (workflow) => workflow.key === key
      );

      if (!target || target.stale) return;

      onWorkflowChange(key);
      setOpen(false);
    },
    [workflows, onWorkflowChange, locked]
  );

  const heading = (
    <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight text-foreground">
      {title}
    </h1>
  );

  return (
    <div className="flex min-w-0 flex-col items-start">
      <p className="max-w-full truncate text-xs text-muted-foreground">
        {agentName}
      </p>

      {canSwitch ? (
        <Popover
          open={open && !locked}
          onOpenChange={(nextOpen) => {
            if (!locked) {
              setOpen(nextOpen);
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Select workflow, current: ${title}`}
              aria-disabled={locked || undefined}
              title={locked ? LOCKED_HINT : undefined}
              onClick={
                locked
                  ? (event) => event.preventDefault()
                  : undefined
              }
              className={cn(
                "-mx-2 flex min-w-0 max-w-full items-center gap-2",
                "rounded-md px-2 py-1 text-left",
                "transition-colors hover:bg-muted",
                "focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring",
                locked &&
                  "cursor-not-allowed hover:bg-transparent"
              )}
            >
              {heading}

              {locked ? (
                <LockKeyhole
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground",
                    "transition-transform",
                    open && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={8}
            className="w-80 p-0"
          >
            <Command>
              <CommandInput placeholder="Search workflows..." />

              <CommandList>
                <CommandEmpty>
                  No workflows found.
                </CommandEmpty>

                <CommandGroup>
                  {workflows.map((workflow) => {
                    const selected =
                      workflow.key === workflowKey;

                    return (
                      <CommandItem
                        key={workflow.key}
                        value={`${workflow.name} ${workflow.key} ${workflow.description ?? ""}`}
                        disabled={workflow.stale}
                        onSelect={() =>
                          handleSelect(workflow.key)
                        }
                        className="flex cursor-pointer items-center gap-3 py-3"
                      >
                        <GitBranch
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />

                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="truncate text-sm font-medium text-foreground">
                            {workflow.name}
                          </span>

                          <span className="truncate text-xs text-muted-foreground">
                            {workflow.stale
                              ? "Unavailable — this workflow was deleted"
                              : workflow.description ||
                                workflow.key}
                          </span>
                        </span>

                        {selected && (
                          <Check
                            className="size-4 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        heading
      )}
    </div>
  );
}
