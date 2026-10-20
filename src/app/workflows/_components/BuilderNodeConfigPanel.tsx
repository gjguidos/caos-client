"use client";

import { DynamicFormRenderer } from "@/app/(workspace)/_tool-form/DynamicFormRenderer";
import type { FormValue } from "@/app/(workspace)/_tool-form/toolForm.types";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import { useToolRegistry } from "@/store/selectors";
import type {
  FileSlotSpec,
  ToolOutput,
} from "@/store/slices/registry/toolsSlice";
import type { Edge } from "@xyflow/react";
import { useMemo, type ReactNode } from "react";
import { collectDescendants } from "../_lib/collectDescendants";
import { collectPrefillableComponents } from "../_lib/collectPrefillableComponents";
import { nodeCommandToValues } from "../_lib/nodeCommand";
import { findByKey } from "@/store/slices/registry/registryEntry";
import { WorkflowInputsEditor } from "./WorkflowInputsEditor";
import { BoundReferenceControl } from "./binding/BoundReferenceControl";
import {
  createBuilderRenderField,
  type BindingContext,
} from "./binding/BuilderFieldRenderer";
import {
  fileBindableInputs,
  imageBindableSources,
} from "./binding/outputTypes";
import type { OutputSource } from "./binding/types";
import type { BuilderStepNodeType } from "./nodes/BuilderStepNode";

/** Inputs-editor wiring for the no-selection settings view. */
export interface WorkflowSettingsProps {
  inputs: WorkflowInputField[];
  onAddInput: () => void;
  onRemoveInput: (index: number) => void;
  onChangeInput: (index: number, patch: Partial<WorkflowInputField>) => void;
}

export interface BuilderNodeConfigPanelProps extends WorkflowSettingsProps {
  /** The single selected node, or null when nothing/many are selected. */
  selectedNode: BuilderStepNodeType | null;
  /** All graph nodes — used to offer eligible output-binding sources. */
  nodes: BuilderStepNodeType[];
  /** All graph edges — used to exclude cycle-creating output sources. */
  edges: Edge[];
  /** Auto-ensure a `depends_on` edge when a field binds to a step output. */
  ensureDependsOnEdge: (sourceId: string, targetId: string) => void;
  /** Write-back: update one field of the selected tool node's prefill values. */
  onChangeValue: (nodeId: string, key: string, value: FormValue) => void;
  /** Write-back: set/clear one file-input slot binding on the selected tool node. */
  onChangeFileBinding: (
    nodeId: string,
    slotName: string,
    value: string | undefined
  ) => void;
}

/**
 * Docked right-side config panel for the editable builder. Driven off React Flow
 * selection (resolved in `useWorkflowBuilder`, kept here purely presentational).
 *
 * Reuses the chat tool-form rendering stack (`DynamicFormRenderer`) to expose a
 * tool's serializable args for prefill. The node's `command` is the single source
 * of truth; values shown here are derived from it (not stored on the node or in
 * `toolFormSlice`), so there's no cached state to keep coherent.
 */
export function BuilderNodeConfigPanel({
  selectedNode,
  nodes,
  edges,
  ensureDependsOnEdge,
  onChangeValue,
  onChangeFileBinding,
  inputs,
  onAddInput,
  onRemoveInput,
  onChangeInput,
}: Readonly<BuilderNodeConfigPanelProps>) {
  const tools = useToolRegistry();

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-card p-3">
      {selectedNode && (
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Configuration
        </h2>
      )}
      <PanelBody
        selectedNode={selectedNode}
        nodes={nodes}
        edges={edges}
        ensureDependsOnEdge={ensureDependsOnEdge}
        tools={tools}
        onChangeValue={onChangeValue}
        onChangeFileBinding={onChangeFileBinding}
        inputs={inputs}
        onAddInput={onAddInput}
        onRemoveInput={onRemoveInput}
        onChangeInput={onChangeInput}
      />
    </aside>
  );
}

function Hint({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function PanelBody({
  selectedNode,
  nodes,
  edges,
  ensureDependsOnEdge,
  tools,
  onChangeValue,
  onChangeFileBinding,
  inputs,
  onAddInput,
  onRemoveInput,
  onChangeInput,
}: Readonly<
  BuilderNodeConfigPanelProps & {
    tools: ReturnType<typeof useToolRegistry>;
  }
>) {
  if (!selectedNode) {
    // No-selection state = the workflow-level settings view.
    return (
      <WorkflowInputsEditor
        inputs={inputs}
        onAdd={onAddInput}
        onRemove={onRemoveInput}
        onChange={onChangeInput}
      />
    );
  }

  const { data } = selectedNode;

  if (data.stepType !== "tool") {
    return <Hint>This step has no configurable properties.</Hint>;
  }

  const tool = findByKey(tools, data.toolName);
  if (!tool) {
    return (
      <Hint>
        Tool <strong>{data.toolName}</strong> is not available — its
        configuration can&apos;t be shown.
      </Hint>
    );
  }

  // Output sources: every node except this one and its descendants (binding to a
  // descendant's output would form a cycle).
  const descendants = collectDescendants(selectedNode.id, edges);
  const outputSources: OutputSource[] = nodes
    .filter((n) => n.id !== selectedNode.id && !descendants.has(n.id))
    .map((n) => ({
      stepId: n.id,
      label: n.data.label,
      outputs: findByKey(tools, n.data.toolName)?.outputs ?? [],
    }));

  return (
    <ToolConfigForm
      // Key by node id so the form remounts on selection change, resetting the
      // per-field ephemeral pick state (`forceBound` / `picking`) that isn't
      // derived from the command — otherwise it would bleed between steps.
      key={selectedNode.id}
      nodeId={selectedNode.id}
      label={data.label}
      tool={tool}
      command={data.command ?? ""}
      fileBindings={data.fileBindings}
      onChangeValue={onChangeValue}
      onChangeFileBinding={onChangeFileBinding}
      inputs={inputs}
      outputSources={outputSources}
      ensureDependsOnEdge={ensureDependsOnEdge}
    />
  );
}

/** Memoized prefill form for a resolved tool node (split out for hook safety). */
function ToolConfigForm({
  nodeId,
  label,
  tool,
  command,
  fileBindings,
  onChangeValue,
  onChangeFileBinding,
  inputs,
  outputSources,
  ensureDependsOnEdge,
}: Readonly<{
  nodeId: string;
  label: string;
  tool: ReturnType<typeof useToolRegistry>[number];
  command: string;
  fileBindings: Record<string, string> | undefined;
  onChangeValue: BuilderNodeConfigPanelProps["onChangeValue"];
  onChangeFileBinding: BuilderNodeConfigPanelProps["onChangeFileBinding"];
  inputs: WorkflowInputField[];
  outputSources: OutputSource[];
  ensureDependsOnEdge: (sourceId: string, targetId: string) => void;
}>) {
  const { components, groupLabelMap } = useMemo(
    () => collectPrefillableComponents(tool),
    [tool]
  );
  // Values are derived from the node's `command` (the source of truth), so the
  // panel reflects the saved command and edits round-trip without cached state.
  const values = useMemo(
    () => nodeCommandToValues(tool, command),
    [tool, command]
  );

  const renderField = useMemo(() => {
    const context: BindingContext = {
      inputs,
      outputSources,
      onBindOutput: (producerStepId) =>
        ensureDependsOnEdge(producerStepId, nodeId),
    };
    return createBuilderRenderField(context);
  }, [inputs, outputSources, ensureDependsOnEdge, nodeId]);

  return (
    <>
      <p className="truncate text-sm font-medium text-foreground" title={label}>
        {label}
      </p>
      <DynamicFormRenderer
        uiComponents={components}
        groupLabelMap={groupLabelMap}
        values={values}
        onChange={(key, value) => onChangeValue(nodeId, key, value)}
        renderField={renderField}
        defaultCollapsed
      />
      <FileBindings
        slots={tool.supports?.files?.slots ?? []}
        fileBindings={fileBindings}
        inputs={inputs}
        outputSources={outputSources}
        onChange={(slotName, value) =>
          onChangeFileBinding(nodeId, slotName, value)
        }
        onBindOutput={(producerStepId) =>
          ensureDependsOnEdge(producerStepId, nodeId)
        }
      />
      <StepOutputs outputs={tool.outputs ?? []} />
    </>
  );
}

/**
 * File-input slot bindings for a tool that declares `supports.files.slots`. One
 * `BoundReferenceControl` row per slot; valid feeds are upstream `image` outputs
 * (`${outputs.<id>.<key>}`, auto-ensuring the `depends_on` edge) and declared
 * `file`-kind workflow inputs (`${inputs.<key>}`). `required` and the mime
 * mismatch badge are advisory (the runtime doesn't enforce them). Renders
 * nothing when the tool declares no slots.
 */
function FileBindings({
  slots,
  fileBindings,
  inputs,
  outputSources,
  onChange,
  onBindOutput,
}: Readonly<{
  slots: FileSlotSpec[];
  fileBindings: Record<string, string> | undefined;
  inputs: WorkflowInputField[];
  outputSources: OutputSource[];
  onChange: (slotName: string, value: string | undefined) => void;
  onBindOutput: (producerStepId: string) => void;
}>) {
  if (slots.length === 0) return null;

  const imageSources = imageBindableSources(outputSources);
  const fileInputs = fileBindableInputs(inputs);

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        File inputs
      </h3>
      {slots.map((slot) => (
        <BoundReferenceControl
          key={slot.name}
          label={slot.label?.trim() || slot.name}
          value={fileBindings?.[slot.name]}
          inputs={fileInputs}
          outputSources={imageSources}
          expectedType="image"
          slotAcceptedMimes={slot.accepted_mimes ?? undefined}
          required={slot.required}
          emptyHint="No sources yet — connect a step that produces an image before this one, or declare a file workflow input."
          onChange={(value) => onChange(slot.name, value)}
          onBindOutput={onBindOutput}
        />
      ))}
    </div>
  );
}

/**
 * Read-only summary of the declared outputs this step returns — the sources a
 * downstream step can bind to (`${outputs.<id>.<key>}`). A tool that declares no
 * outputs can't be used as a binding source, so we say so explicitly.
 */
function StepOutputs({ outputs }: Readonly<{ outputs: ToolOutput[] }>) {
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Outputs
      </h3>
      {outputs.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          This step declares no outputs, so it can&apos;t be piped into a later
          step.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {outputs.map((output) => (
            <li
              key={output.key}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1"
            >
              <span className="truncate text-sm text-foreground" title={output.key}>
                {output.label?.trim() || output.key}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {output.type}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
