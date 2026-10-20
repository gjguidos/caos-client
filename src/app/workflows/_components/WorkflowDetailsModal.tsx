
"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WorkflowDetailsModalProps {
  name: string;
  description: string;
  onSave: (details: {
    name: string;
    description: string;
  }) => void;
  onClose: () => void;
}

/**
 * Edit dialog for a workflow's name and description.
 *
 * Edits are held locally until Save is submitted.
 * Canceling or closing leaves the workflow unchanged.
 *
 * The dialog is mounted only while open, so its draft
 * state is initialized from the current workflow values
 * without requiring an effect.
 */
export function WorkflowDetailsModal({
  name,
  description,
  onSave,
  onClose,
}: Readonly<WorkflowDetailsModalProps>) {
  const [draftName, setDraftName] = useState(name);
  const [draftDescription, setDraftDescription] =
    useState(description);

  const trimmedName = draftName.trim();
  const canSave = trimmedName.length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSave) return;

    onSave({
      name: trimmedName,
      description: draftDescription.trim(),
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle id="workflow-details-title">
            Workflow details
          </DialogTitle>

          <DialogDescription>
            Update the name and description of your workflow.
          </DialogDescription>
        </DialogHeader>

        <form
          id="workflow-details-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="workflow-name">
              Name <span className="text-destructive">*</span>
            </Label>

            <Input
              id="workflow-name"
              name="name"
              type="text"
              value={draftName}
              onChange={(event) =>
                setDraftName(event.target.value)
              }
              autoFocus
              required
              aria-required="true"
              placeholder="Workflow name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workflow-description">
              Description (optional)
            </Label>

            <Input
              id="workflow-description"
              name="description"
              type="text"
              value={draftDescription}
              onChange={(event) =>
                setDraftDescription(event.target.value)
              }
              placeholder="Describe what this workflow does"
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form="workflow-details-form"
            disabled={!canSave}
            data-testid="workflow-details-save"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
