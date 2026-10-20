
export type OperationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type OperationProgress = {
  phase?: string | null;
  current?: number | null;
  total?: number | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
};

export type OperationEventData = {
    type: string;
    run_id: string;
    kind: string;
    producer: string;
    status: OperationStatus;
  
    message?: string | null;
  
    user_id?: string | null;
    agent_id?: string | null;
    session_id?: string | null;
    progress?: OperationProgress | null;
    result?: Record<string, unknown> | null;
    error?: Record<string, unknown> | null;
    occurred_at?: string;
};

export type DomainEventEnvelope = {
  event_id: string;
  event_type: string;
  source: string;
  occurred_at: string;

  user_id?: string | null;
  tenant_id?: string | null;
  correlation_id?: string | null;

  data?: unknown;
};
  
  export type ParsedWSMessage =
    | {
        type: "chat";
        text: string | null;
        raw: unknown;
        payload: unknown;
      }
    | {
        type: "bridge";
        text: null;
        raw: unknown;
        payload: unknown;
      }
    | {
        type: "domain_event";
        text: null;
        raw: DomainEventEnvelope;
        payload: DomainEventEnvelope;
      }
    | {
        type: "other";
        text: string | null;
        raw: unknown;
        payload?: unknown;
      };

export function isDomainEventEnvelope(
    value: unknown
    ): value is DomainEventEnvelope {
    if (!value || typeof value !== "object") {
        return false;
    }
    
    const candidate = value as Record<string, unknown>;
    
    return (
        typeof candidate.event_id === "string" &&
        typeof candidate.event_type === "string" &&
        typeof candidate.source === "string" &&
        typeof candidate.occurred_at === "string"
    );
    }

export function parseOperationEvent(
    envelope: DomainEventEnvelope
    ): OperationEventData | null {
    if (!envelope.event_type.startsWith("operation.")) {
        return null;
    }
    
    if (!envelope.data || typeof envelope.data !== "object") {
        return null;
    }
    
    const data = envelope.data as Record<string, unknown>;
    
    if (
        typeof data.run_id !== "string" ||
        typeof data.status !== "string" ||
        typeof data.producer !== "string"
    ) {
        return null;
    }
    
    return envelope.data as OperationEventData;
    }