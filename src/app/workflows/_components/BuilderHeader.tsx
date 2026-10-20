
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { useReturnTo } from "@/shared/lib/navigation/returnTo";

import type { SaveStatus } from "../_hooks/useWorkflowBuilder";
import { WorkflowDetailsModal } from "./WorkflowDetailsModal";

interface BuilderHeaderProps {
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  saveStatus: SaveStatus;
}

/**
 * Presentation metadata for the workflow's save state.
 */
const SAVE_STATUS_META: Record<
  SaveStatus,
  {
    label: string;
    dotClass: string;
  }
> = {
  saving: {
    label: "Saving…",
    dotClass: "bg-amber-500",
  },
  dirty: {
    label: "Unsaved changes",
    dotClass: "bg-amber-500",
  },
  clean: {
    label: "All changes saved",
    dotClass: "bg-emerald-500",
  },
};

/**
 * Compact indicator for the current save state.
 */
function SaveStatusPill({
  status,
}: Readonly<{
  status: SaveStatus;
}>) {
  const { label, dotClass } = SAVE_STATUS_META[status];

  return (
    <span
      className="inline-flex items-center gap-2"
      data-testid="save-status"
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          dotClass,
          status === "saving" && "animate-pulse"
        )}
        aria-hidden="true"
      />

      <span className="text-xs text-muted-foreground">
        {label}
      </span>
    </span>
  );
}

/**
 * Workflow builder toolbar.
 *
 * Contains:
 * - Back navigation
 * - Automation Studio heading
 * - Editable workflow name
 * - Save status
 * - Save action
 *
 * All workflow state remains owned by WorkflowBuilder.
 */
export function BuilderHeader({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  onSave,
  isSaving,
  saveStatus,
}: Readonly<BuilderHeaderProps>) {
  const [isEditingDetails, setIsEditingDetails] =
    useState(false);

  const returnTo = useReturnTo("/workflows");

  return (
    <header className="sticky top-0 z-10 w-full border-b border-border border-t-2 border-t-primary bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-4 px-4 py-3">
        {/* Back navigation */}
        <Button
          variant="ghost"
          size="sm"
          asChild
        >
          <Link href={returnTo}>
            <ArrowLeft
              className="size-4"
              aria-hidden="true"
            />
            Back to workflows
          </Link>
        </Button>

        {/* Builder identity */}
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Automation Studio
        </h1>

        {/* Editable workflow details */}
        <button
          type="button"
          onClick={() => setIsEditingDetails(true)}
          title={description || undefined}
          aria-label={`Edit workflow details — ${
            name || "Untitled workflow"
          }`}
          data-testid="edit-workflow-details"
          className={cn(
            "group flex min-w-0 items-center gap-2",
            "rounded-md px-2 py-1 text-sm font-medium",
            "text-muted-foreground transition-colors",
            "hover:text-foreground",
            "focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring",
            "focus-visible:ring-offset-2"
          )}
        >
          <span className="truncate">
            {name || "Untitled workflow"}
          </span>

          <Pencil
            className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden="true"
          />
        </button>

        {/* Save controls */}
        <div className="ml-auto flex items-center gap-3">
          <SaveStatusPill status={saveStatus} />

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving && (
              <Loader2
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            )}

            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Workflow name and description editor */}
      {isEditingDetails && (
        <WorkflowDetailsModal
          name={name}
          description={description}
          onClose={() => setIsEditingDetails(false)}
          onSave={(details) => {
            onNameChange(details.name);
            onDescriptionChange(details.description);
            setIsEditingDetails(false);
          }}
        />
      )}
    </header>
  );
}
