
"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  useWorkflowBuilder,
  type WorkflowBuilderMode,
} from "../_hooks/useWorkflowBuilder";

import { BuilderCanvas } from "./BuilderCanvas";
import { BuilderHeader } from "./BuilderHeader";
import { BuilderNodeConfigPanel } from "./BuilderNodeConfigPanel";
import { BuilderPalette } from "./BuilderPalette";
import { DefinitionPreviewPanel } from "./DefinitionPreviewPanel";

export type WorkflowBuilderProps = WorkflowBuilderMode;

/**
 * Editable workflow builder.
 *
 * Presentational shell over useWorkflowBuilder, which owns:
 * - Live graph state
 * - Node and edge modifications
 * - Workflow persistence
 * - Edit-mode loading
 * - Workflow metadata and inputs
 *
 * Distinct from the read-only run/monitor canvas.
 */
export function WorkflowBuilder(
  props: Readonly<WorkflowBuilderProps>
) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    addNode,
    selectedNode,
    ensureDependsOnEdge,
    onChangeValue,
    onChangeFileBinding,
    name,
    setName,
    description,
    setDescription,
    saveStatus,
    inputs,
    addInput,
    removeInput,
    updateInput,
    isLoading,
    isSaving,
    handleSave,
  } = useWorkflowBuilder(props);

  const [showPreview, setShowPreview] =
    useState(false);

  return (
    <div className="flex h-screen w-full flex-col bg-muted/40">
      <BuilderHeader
        name={name}
        onNameChange={setName}
        description={description}
        onDescriptionChange={setDescription}
        onSave={handleSave}
        isSaving={isSaving}
        saveStatus={saveStatus}
      />

      {/* Palette + canvas + configuration panel */}
      <main className="flex min-h-0 w-full flex-1 overflow-hidden">
        <BuilderPalette
          onAdd={(kind) => addNode(kind)}
        />

        <div className="relative min-w-0 flex-1">
          {isLoading ? (
            <div
              className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Loading workflow…
            </div>
          ) : (
            <BuilderCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onAddNode={addNode}
            />
          )}

          {/* Floating definition preview */}
          <div className="pointer-events-none absolute bottom-0 right-0 z-10 m-2 flex max-h-full flex-col items-end gap-2">
            {showPreview && (
              <DefinitionPreviewPanel
                nodes={nodes}
                edges={edges}
              />
            )}

            <div className="pointer-events-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={showPreview}
                aria-label={
                  showPreview
                    ? "Hide step definition"
                    : "Show step definition"
                }
                onClick={() =>
                  setShowPreview((current) => !current)
                }
                className="gap-2 bg-card shadow-sm"
              >
                Step definition

                {showPreview ? (
                  <EyeOff
                    className="size-4"
                    aria-hidden="true"
                  />
                ) : (
                  <Eye
                    className="size-4"
                    aria-hidden="true"
                  />
                )}
              </Button>
            </div>
          </div>
        </div>

        <BuilderNodeConfigPanel
          selectedNode={selectedNode}
          nodes={nodes}
          edges={edges}
          ensureDependsOnEdge={ensureDependsOnEdge}
          onChangeValue={onChangeValue}
          onChangeFileBinding={onChangeFileBinding}
          inputs={inputs}
          onAddInput={addInput}
          onRemoveInput={removeInput}
          onChangeInput={updateInput}
        />
      </main>
    </div>
  );
}
