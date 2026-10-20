"use client";

import type { FormValue } from "@/app/(workspace)/_tool-form/toolForm.types";
import { useToast } from "@/shared/hooks/useToast";
import { logger } from "@/shared/lib/logger";
import {
  createWorkflow,
  getWorkflowByKey,
  updateWorkflow,
  type WorkflowMutationResult,
} from "@/shared/api/fetch_workflows";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Edge,
  type IsValidConnection,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildWorkflowGraph } from "@/app/(workspace)/orchestration/_lib/workflowGraph";
import { layoutWorkflowGraph } from "@/app/(workspace)/orchestration/_lib/layoutAdapter";
import {
  buildDefinitionFromGraph,
  graphToBuilderEdges,
  graphToBuilderNodes,
  mapIssuesToNodes,
  type BuilderNodeData,
} from "../_lib/builderGraph";
import { canConnect } from "../_lib/graphGuardrails";
import { makeStepId, type PaletteKind } from "../_lib/stepKinds";
import type { BuilderStepNodeType } from "../_components/nodes/BuilderStepNode";
import { useToolRegistry } from "@/store/selectors";
import { setNodeCommandValue } from "../_lib/nodeCommand";
import { findByKey } from "@/store/slices/registry/registryEntry";
import { collectDanglingReferences } from "../_lib/references";
import { validateRequiredInputs } from "../_lib/validateRequiredInputs";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";

/** A fresh, blank input row appended by the inputs editor. */
function makeBlankInput(index: number): WorkflowInputField {
  return { key: `input_${index + 1}`, label: "", input: "text" };
}

export type WorkflowBuilderMode =
  | { mode: "new"; workflowId?: never }
  | { mode: "edit"; workflowId: string };

/** Drives the toolbar status pill. */
export type SaveStatus = "clean" | "dirty" | "saving";

/**
 * Serialize everything that gets persisted (the definition omits positions/
 * selection by design) into a stable string. "Dirty" is then just
 * `snapshot !== lastSavedSnapshot` — no per-mutation bookkeeping, and cosmetic
 * canvas churn (drag/select/measure) can't flip it because none of it survives
 * serialization.
 */
function builderSnapshot(
  name: string,
  description: string,
  inputs: WorkflowInputField[],
  nodes: ReadonlyArray<{ id: string; data: BuilderNodeData }>,
  edges: ReadonlyArray<{ source: string; target: string }>
): string {
  return JSON.stringify({
    name,
    description,
    inputs,
    definition: buildDefinitionFromGraph(nodes, edges),
  });
}

/** Build a builder node from a palette kind at a flow-space position. */
function nodeFromKind(
  kind: PaletteKind,
  position: { x: number; y: number }
): BuilderStepNodeType {
  const data: BuilderNodeData =
    kind.stepType === "tool"
      ? {
          stepType: "tool",
          label: kind.label,
          command: `@${kind.toolName}`,
          toolName: kind.toolName,
        }
      : { stepType: kind.stepType, label: kind.label };

  return { id: makeStepId(kind.stepType), type: "builderStep", position, data };
}

export interface UseWorkflowBuilder {
  nodes: BuilderStepNodeType[];
  edges: Edge[];
  onNodesChange: OnNodesChange<BuilderStepNodeType>;
  onEdgesChange: OnEdgesChange<Edge>;
  onConnect: OnConnect;
  isValidConnection: IsValidConnection<Edge>;
  /** Append a node from a palette kind; click-to-add staggers placement. */
  addNode: (kind: PaletteKind, position?: { x: number; y: number }) => void;
  /** The single selected tool/structural node, or null (none / multi-select). */
  selectedNode: BuilderStepNodeType | null;
  /**
   * Idempotently ensure a `depends_on` edge `sourceId → targetId`. Called when a
   * field is bound to a step's output: a data dependency *is* an execution
   * dependency, so the edge must exist or strict-mode runs fail.
   */
  ensureDependsOnEdge: (sourceId: string, targetId: string) => void;
  /**
   * Write-back for the config panel: set one prefill value on a tool node and
   * keep its `command` in sync via `serializeUIComponents`.
   */
  onChangeValue: (nodeId: string, key: string, value: FormValue) => void;
  /**
   * Set a tool node's file-input slot binding. Passing an empty/undefined value
   * clears the slot. The slot key is the tool's declared `FileSlotSpec.name`.
   */
  onChangeFileBinding: (
    nodeId: string,
    slotName: string,
    value: string | undefined
  ) => void;
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  /** Toolbar save-status: clean / unsaved / saving. */
  saveStatus: SaveStatus;
  /** Author-declared, workflow-global runtime inputs. */
  inputs: WorkflowInputField[];
  /** Append a fresh blank input row. */
  addInput: () => void;
  /** Remove the input at `index`. */
  removeInput: (index: number) => void;
  /** Merge a partial patch into the input at `index`. */
  updateInput: (index: number, patch: Partial<WorkflowInputField>) => void;
  isLoading: boolean;
  isSaving: boolean;
  handleSave: () => void;
}

/**
 * All orchestration for the editable workflow builder: React Flow owns the live
 * graph (`useNodesState`/`useEdgesState` — transient canvas state, not Redux); the
 * `WorkflowDefinition` is serialized on demand at Save. Handles add/connect,
 * client guardrails, persistence (POST/PATCH), edit-mode load, and surfacing
 * backend `422` errors onto nodes. Mirrors `useWorkflowRun` for the read path —
 * `WorkflowBuilder` stays purely presentational.
 */
export function useWorkflowBuilder(
  props: Readonly<WorkflowBuilderMode>
): UseWorkflowBuilder {
  const { mode } = props;
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const tools = useToolRegistry();

  const [nodes, setNodes, onNodesChange] = useNodesState<BuilderStepNodeType>(
    []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inputs, setInputs] = useState<WorkflowInputField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(mode === "edit");

  // Dirty = the live graph no longer matches what we last persisted. The baseline
  // is the empty "new" canvas, re-based on edit-load and after each save. Derived,
  // not tracked, so no mutation path can forget to flag a change.
  const savedSnapshot = useRef(builderSnapshot("", "", [], [], []));
  const snapshot = useMemo(
    () => builderSnapshot(name, description, inputs, nodes, edges),
    [name, description, inputs, nodes, edges]
  );
  const isDirty = snapshot !== savedSnapshot.current;

  const saveStatus: SaveStatus = isSaving
    ? "saving"
    : isDirty
      ? "dirty"
      : "clean";

  // ---- Edit-mode load: reuse the read path to seed the canvas once. ----
  const editKey = props.mode === "edit" ? props.workflowId : undefined;
  useEffect(() => {
    if (!editKey) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const doc = await getWorkflowByKey(editKey);
        if (cancelled) return;
        if (!doc) {
          showError("Workflow not found", { description: editKey });
          return;
        }
        const description = doc.description ?? "";
        const inputs = doc.inputs ?? [];
        const graph = layoutWorkflowGraph(buildWorkflowGraph(doc.definition));
        const loadedNodes = graphToBuilderNodes(graph);
        const loadedEdges = graphToBuilderEdges(graph);
        setName(doc.name);
        setDescription(description);
        setInputs(inputs);
        setNodes(loadedNodes);
        setEdges(loadedEdges);
        // Re-base "saved" onto the loaded doc so it doesn't read as dirty.
        savedSnapshot.current = builderSnapshot(
          doc.name,
          description,
          inputs,
          loadedNodes,
          loadedEdges
        );
      } catch (err) {
        if (cancelled) return;
        logger.error("Failed to load workflow for editing", err);
        showError("Failed to load workflow");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editKey, setNodes, setEdges, showError]);

  // ---- Interactions ----
  const addNode = useCallback(
    (kind: PaletteKind, position?: { x: number; y: number }) => {
      setNodes((prev) => {
        // Click-to-add fallback: stagger placement so nodes don't stack exactly.
        const fallback = {
          x: 80 + (prev.length % 6) * 48,
          y: 80 + (prev.length % 6) * 48,
        };
        return [...prev, nodeFromKind(kind, position ?? fallback)];
      });
    },
    [setNodes]
  );

  // ---- Workflow inputs (workflow-global builder state) ----
  const addInput = useCallback(() => {
    setInputs((prev) => [...prev, makeBlankInput(prev.length)]);
  }, []);

  const removeInput = useCallback((index: number) => {
    setInputs((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateInput = useCallback(
    (index: number, patch: Partial<WorkflowInputField>) => {
      setInputs((prev) =>
        prev.map((field, i) => (i === index ? { ...field, ...patch } : field))
      );
    },
    []
  );

  const onConnect = useCallback<OnConnect>(
    (connection) => {
      if (!canConnect(edges, connection)) return;
      setEdges((prev) => addEdge(connection, prev));
      showSuccess("Steps connected");
    },
    [edges, setEdges, showSuccess]
  );

  const isValidConnection = useCallback<IsValidConnection<Edge>>(
    (connection) => canConnect(edges, connection),
    [edges]
  );

  const ensureDependsOnEdge = useCallback<
    UseWorkflowBuilder["ensureDependsOnEdge"]
  >(
    (sourceId, targetId) => {
      if (sourceId === targetId) return;
      setEdges((prev) =>
        prev.some((e) => e.source === sourceId && e.target === targetId)
          ? prev
          : addEdge(
              {
                source: sourceId,
                target: targetId,
                sourceHandle: null,
                targetHandle: null,
              },
              prev
            )
      );
    },
    [setEdges]
  );

  // ---- Config panel: selection + per-node prefill write-back ----
  const selected = nodes.filter((n) => n.selected);
  const selectedNode = selected.length === 1 ? selected[0] : null;

  // Derive client-side dangling-reference issues and merge them (non-destructively
  // — never written back to state) onto the nodes handed to the canvas, alongside
  // any backend `422` issues already on `data.issues`. The error ring is driven by
  // this merged view; the backend stays authoritative on save.
  const danglingByNode = useMemo(
    () =>
      collectDanglingReferences(
        nodes,
        edges,
        inputs,
        (toolName) => findByKey(tools, toolName)?.outputs
      ),
    [nodes, edges, inputs, tools]
  );
  const displayNodes = useMemo(
    () =>
      nodes.map((n) => {
        const dangling = danglingByNode.get(n.id);
        if (!dangling || dangling.length === 0) return n;
        const existing = n.data.issues ?? [];
        return {
          ...n,
          data: { ...n.data, issues: [...existing, ...dangling] },
        };
      }),
    [nodes, danglingByNode]
  );

  const onChangeValue = useCallback<UseWorkflowBuilder["onChangeValue"]>(
    (nodeId, key, value) => {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== nodeId || n.data.stepType !== "tool") return n;

          // The panel only renders (and so only calls this) once the tool is
          // resolvable, so `tool` is always present here.
          const tool = findByKey(tools, n.data.toolName);
          if (!tool) return n;

          const command = setNodeCommandValue(
            tool,
            n.data.command ?? "",
            key,
            value
          );
          return { ...n, data: { ...n.data, command } };
        })
      );
    },
    [setNodes, tools]
  );

  const onChangeFileBinding = useCallback<
    UseWorkflowBuilder["onChangeFileBinding"]
  >(
    (nodeId, slotName, value) => {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== nodeId || n.data.stepType !== "tool") return n;
          const next = { ...(n.data.fileBindings ?? {}) };
          if (value?.trim()) next[slotName] = value;
          else delete next[slotName];
          return { ...n, data: { ...n.data, fileBindings: next } };
        })
      );
    },
    [setNodes]
  );

  // ---- Persistence ----
  const applyBackendErrors = useCallback(
    (result: Extract<WorkflowMutationResult, { ok: false }>) => {
      const { byNode, globalIssues } = mapIssuesToNodes(nodes, result.issues);

      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          data: { ...n.data, issues: byNode.get(n.id) },
        }))
      );

      const description =
        globalIssues.length > 0
          ? globalIssues.map((i) => i.message).join("; ")
          : byNode.size > 0
            ? "Some steps need fixing."
            : undefined;
      showError(result.message, description ? { description } : undefined);
    },
    [nodes, setNodes, showError]
  );

  const isNew = mode === "new";
  const editWorkflowId = props.mode === "edit" ? props.workflowId : undefined;
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      showError("Name is required");
      return;
    }

    // Clear any prior error rings before re-validating.
    setNodes((prev) =>
      prev.map((n) =>
        n.data.issues ? { ...n, data: { ...n.data, issues: undefined } } : n
      )
    );

    // Client guard: block on tool steps with unset required inputs before the
    // POST. The backend `422` mapping stays authoritative for everything else.
    const missingByNode = validateRequiredInputs(nodes, tools);
    if (missingByNode.size > 0) {
      setNodes((prev) =>
        prev.map((n) =>
          missingByNode.has(n.id)
            ? { ...n, data: { ...n.data, issues: missingByNode.get(n.id) } }
            : n
        )
      );
      const count = missingByNode.size;
      showError(`${count} step${count > 1 ? "s" : ""} need attention`, {
        description: "Set the required inputs highlighted in red.",
      });
      return;
    }

    setIsSaving(true);
    try {
      // `version` is intentionally omitted — the backend owns versioning.
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        definition: buildDefinitionFromGraph(nodes, edges),
        inputs,
      };

      const result =
        isNew || !editWorkflowId
          ? await createWorkflow(body)
          : await updateWorkflow(editWorkflowId, body);

      if (result.ok) {
        // What we just sent is now the persisted baseline.
        savedSnapshot.current = snapshot;
        showSuccess(`Workflow "${result.document.name}" saved`);
        if (isNew) {
          router.replace(`/workflows/${result.document.key}`);
        }
      } else {
        applyBackendErrors(result);
      }
    } catch (err) {
      logger.error("Failed to save workflow", err);
      showError("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    description,
    inputs,
    nodes,
    edges,
    snapshot,
    tools,
    isNew,
    editWorkflowId,
    router,
    showError,
    showSuccess,
    setNodes,
    applyBackendErrors,
  ]);

  return {
    nodes: displayNodes,
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
  };
}
