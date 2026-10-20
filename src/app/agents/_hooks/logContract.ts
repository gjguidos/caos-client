// Domain vocabulary for the agent-creation socket. These mirror the backend
// log_contract.py (LogLevel / LogStage); the backend is the source of truth,
// keep these in sync when new levels or stages are added there.
//
// Owned here (the domain layer) so the pure state machine and the presentational
// dialog both consume the contract without the machine depending on the dialog.

export type CreatePhase = "idle" | "creating" | "success" | "error";

export type LogLevel = "info" | "success" | "warning" | "error";

export type LogStage =
  | "parse"
  | "validate"
  | "configure"
  | "register"
  | "test"
  | "finalize";

export type LogEntry = {
  level?: LogLevel;
  stage?: LogStage | null;
  message: string;
  ts?: string;
};
