import type { CreatePhase, LogEntry, LogStage } from "./logContract";

export type AgentDetail = {
  agent_id?: string;
  agent_system_name?: string;
  status?: string;
  response?: string;
};

export type CreateResult = {
  ok: boolean;
  message: string;
  agent?: { agent_id?: string; agent_system_name?: string } | null;
};

type AgentRef = { agent_id?: string; agent_system_name?: string } | null;

// One decoded socket frame. Vocabulary is declared in the backend
// log_contract.py; `response` is the CreateResult payload on terminal events
// and free-form on emitter.error() frames.
type RawFrame = {
  type?: string;
  event?: string;
  level?: LogEntry["level"];
  stage?: LogStage | null;
  message?: unknown;
  ts?: string;
  response?:
    | string
    | { status?: string; response?: string; agent?: AgentRef }
    | null;
};

// The terminal creation result: a structured "joshu-a.create" event whose
// nested `response.status` is "OK" on success or "ERROR" on failure.
export function parseCreateResult(json: RawFrame): CreateResult | null {
  if (json.type !== "event" || json.event !== "joshu-a.create") return null;

  const result =
    typeof json.response === "object" && json.response ? json.response : {};
  const ok = result.status === "OK" && Boolean(result.agent?.agent_id);

  return {
    ok,
    message:
      result.response ?? (ok ? "Agent created." : "Agent creation failed."),
    agent: result.agent ?? null,
  };
}

export type FrameAction =
  | { kind: "log"; entry: LogEntry }
  | { kind: "resolve"; result: CreateResult }
  | { kind: "ignore" };

// Pure translation of one raw socket frame into an action. Kept free of React
// so it can be unit-tested against real backend samples. Frame vocabulary is
// declared in the backend log_contract.py.
export function classifyFrame(text: string): FrameAction {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Non-JSON frame: surface the raw text so nothing is silently lost.
    return { kind: "log", entry: { message: text } };
  }

  if (!parsed || typeof parsed !== "object") return { kind: "ignore" };

  const json = parsed as RawFrame;

  const result = parseCreateResult(json);
  if (result) return { kind: "resolve", result };

  if (json.type === "error") {
    // Non-terminal error frame from emitter.error(). Terminal failure arrives
    // separately as a joshu-a.create ERROR event, so this only surfaces in the
    // log list. The payload shape is undeclared, hence the fallbacks.
    const raw = json.response;
    const message =
      typeof raw === "string"
        ? raw
        : (raw?.response ?? json.message ?? "An error occurred.");
    return {
      kind: "log",
      entry: { level: "error", stage: null, message: String(message) },
    };
  }

  // Trailing no-op marker ({ type: "chat", event: "joshu-a.create", ... }).
  if (json.event === "joshu-a.create") return { kind: "ignore" };

  if (json.type === "log") {
    return {
      kind: "log",
      entry: {
        level: json.level,
        stage: json.stage ?? null,
        message: String(json.message ?? ""),
        ts: json.ts,
      },
    };
  }

  return { kind: "ignore" };
}

export type CreateState = {
  phase: CreatePhase;
  logs: LogEntry[];
  agentDetail: AgentDetail | null;
  creatingName: string;
  message: string;
};

export const initialCreateState: CreateState = {
  phase: "idle",
  logs: [],
  agentDetail: null,
  creatingName: "",
  message: "",
};

export type CreateEvent =
  | { type: "begin"; name: string }
  | { type: "frame"; action: FrameAction }
  | { type: "reset" };

export function createReducer(
  state: CreateState,
  event: CreateEvent
): CreateState {
  switch (event.type) {
    case "begin":
      return {
        phase: "creating",
        logs: [],
        agentDetail: null,
        creatingName: event.name,
        message: "",
      };
    case "reset":
      return { ...state, phase: "idle" };
    case "frame":
      return applyFrame(state, event.action);
  }
}

function applyFrame(state: CreateState, action: FrameAction): CreateState {
  switch (action.kind) {
    case "ignore":
      return state;
    case "log":
      return { ...state, logs: [...state.logs, action.entry] };
    case "resolve": {
      // Terminal outcome is only meaningful while a creation is in flight; this
      // guard replaces the old creatingRef by reading current reducer state.
      if (state.phase !== "creating") return state;

      const { result } = action;
      if (result.ok) {
        return {
          ...state,
          phase: "success",
          message: result.message,
          agentDetail: {
            agent_id: result.agent?.agent_id,
            agent_system_name: result.agent?.agent_system_name,
            status: "OK",
            response: result.message,
          },
        };
      }
      return { ...state, phase: "error", message: result.message };
    }
  }
}
