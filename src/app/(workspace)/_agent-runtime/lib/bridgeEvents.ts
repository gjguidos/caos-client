type AgentBridgeEventType =
  | "browser_session.authenticated"
  | "browser_session.failed"
  | "browser_session.expired"
  | "tool.started"
  | "tool.completed"
  | "tool.failed"
  | "workflow.started"
  | "workflow.step.started"
  | "workflow.step.completed"
  | "workflow.completed"
  | "workflow.failed"
  | "artifact.created"
  | "unknown";

export type BrowserSessionBridgeData = {
  browserSessionId: string;
  domain?: string;
  finalUrl?: string;
  ready: boolean;
  status?: string;
};

type ToolBridgeData = {
  toolKey?: string;
  toolName?: string;
  runId?: string;
  status?: string;
};

type WorkflowBridgeData = {
  workflowKey?: string;
  workflowRunId?: string;
  stepId?: string;
  stepName?: string;
  status?: string;
};

type ArtifactBridgeData = {
  artifactId?: string;
  artifactType?: string;
  filename?: string;
  url?: string;
};

export type AgentBridgeEvent = {
  type: AgentBridgeEventType;
  rawType?: string;
  raw: unknown;
  message?: string;
  data:
    | BrowserSessionBridgeData
    | ToolBridgeData
    | WorkflowBridgeData
    | ArtifactBridgeData
    | Record<string, unknown>
    | null;
};

export function parseAgentBridgeEvent(raw: unknown): AgentBridgeEvent | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const type = getBridgeEventType(record);

  if (!type) {
    return null;
  }

  if (type.startsWith("browser_session.")) {
    return parseBrowserSessionBridgeEvent(type, raw);
  }

  if (type.startsWith("tool.")) {
    return parseToolBridgeEvent(type, raw);
  }

  if (type.startsWith("workflow.")) {
    return parseWorkflowBridgeEvent(type, raw);
  }

  if (type.startsWith("artifact.")) {
    return parseArtifactBridgeEvent(type, raw);
  }

  return {
    type: "unknown",
    rawType: type,
    raw,
    message: getMessage(record),
    data: getPayloadData(record),
  };
}

function parseBrowserSessionBridgeEvent(
  rawType: string,
  raw: unknown
): AgentBridgeEvent {
  const data = getPayloadData(raw);
  const browserSessionId =
    stringOrUndefined(data.browser_session_id) ??
    stringOrUndefined(data.browserSessionId) ??
    stringOrUndefined(data.session_id) ??
    stringOrUndefined(data.sessionId);

  const normalizedData: BrowserSessionBridgeData | Record<string, unknown> =
    browserSessionId
      ? {
          browserSessionId,
          domain: stringOrUndefined(data.domain),
          finalUrl:
            stringOrUndefined(data.final_url) ??
            stringOrUndefined(data.finalUrl),
          ready:
            booleanOrUndefined(data.ready) ??
            rawType === "browser_session.authenticated",
          status: stringOrUndefined(data.status),
        }
      : data;

  return {
    type: normalizeKnownType(rawType),
    rawType,
    raw,
    message: getMessage(raw),
    data: normalizedData,
  };
}

function parseToolBridgeEvent(rawType: string, raw: unknown): AgentBridgeEvent {
  const data = getPayloadData(raw);

  return {
    type: normalizeKnownType(rawType),
    rawType,
    raw,
    message: getMessage(raw),
    data: {
      toolKey:
        stringOrUndefined(data.tool_key) ??
        stringOrUndefined(data.toolKey) ??
        stringOrUndefined(data.key),
      toolName:
        stringOrUndefined(data.tool_name) ??
        stringOrUndefined(data.toolName) ??
        stringOrUndefined(data.name),
      runId: stringOrUndefined(data.run_id) ?? stringOrUndefined(data.runId),
      status: stringOrUndefined(data.status),
    },
  };
}

function parseWorkflowBridgeEvent(
  rawType: string,
  raw: unknown
): AgentBridgeEvent {
  const data = getPayloadData(raw);

  return {
    type: normalizeKnownType(rawType),
    rawType,
    raw,
    message: getMessage(raw),
    data: {
      workflowKey:
        stringOrUndefined(data.workflow_key) ??
        stringOrUndefined(data.workflowKey),
      workflowRunId:
        stringOrUndefined(data.workflow_run_id) ??
        stringOrUndefined(data.workflowRunId),
      stepId: stringOrUndefined(data.step_id) ?? stringOrUndefined(data.stepId),
      stepName:
        stringOrUndefined(data.step_name) ?? stringOrUndefined(data.stepName),
      status: stringOrUndefined(data.status),
    },
  };
}

function parseArtifactBridgeEvent(
  rawType: string,
  raw: unknown
): AgentBridgeEvent {
  const data = getPayloadData(raw);

  return {
    type: normalizeKnownType(rawType),
    rawType,
    raw,
    message: getMessage(raw),
    data: {
      artifactId:
        stringOrUndefined(data.artifact_id) ??
        stringOrUndefined(data.artifactId),
      artifactType:
        stringOrUndefined(data.artifact_type) ??
        stringOrUndefined(data.artifactType),
      filename: stringOrUndefined(data.filename),
      url: stringOrUndefined(data.url),
    },
  };
}

function normalizeKnownType(rawType: string): AgentBridgeEventType {
  switch (rawType) {
    case "browser_session.authenticated":
    case "browser_session.failed":
    case "browser_session.expired":
    case "tool.started":
    case "tool.completed":
    case "tool.failed":
    case "workflow.started":
    case "workflow.step.started":
    case "workflow.step.completed":
    case "workflow.completed":
    case "workflow.failed":
    case "artifact.created":
      return rawType;
    default:
      return "unknown";
  }
}

/**
 * Bridge event type, resolving the aliases the backend emits it under. Single
 * source of alias precedence: transport-level detection and full parsing both
 * go through here, so they can never disagree about what an envelope is.
 */
function getBridgeEventType(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;

  return (
    stringOrUndefined(record.type) ??
    stringOrUndefined(record.event) ??
    stringOrUndefined(record.name) ??
    stringOrUndefined(record.event_type) ??
    null
  );
}

/**
 * Whether an envelope is routed out-of-band to the bridge handler instead of
 * being rendered as transcript content. Only browser-session events are today;
 * tool, workflow and artifact events still flow through the message path.
 */
export function isBridgeEventEnvelope(raw: unknown): boolean {
  return getBridgeEventType(raw)?.startsWith("browser_session.") ?? false;
}

function getPayloadData(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const record = raw as Record<string, unknown>;

  if (
    record.data &&
    typeof record.data === "object" &&
    !Array.isArray(record.data)
  ) {
    return record.data as Record<string, unknown>;
  }

  if (
    record.payload &&
    typeof record.payload === "object" &&
    !Array.isArray(record.payload)
  ) {
    return record.payload as Record<string, unknown>;
  }

  return record;
}

function getMessage(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }

  const record = raw as Record<string, unknown>;
  const data = getPayloadData(raw);

  return (
    stringOrUndefined(record.message) ??
    stringOrUndefined(record.text) ??
    stringOrUndefined(data.message) ??
    stringOrUndefined(data.text)
  );
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanOrUndefined(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function isBrowserSessionBridgeData(
  data: AgentBridgeEvent["data"]
): data is BrowserSessionBridgeData {
  return Boolean(
    data &&
    typeof data === "object" &&
    "browserSessionId" in data &&
    typeof data.browserSessionId === "string"
  );
}
