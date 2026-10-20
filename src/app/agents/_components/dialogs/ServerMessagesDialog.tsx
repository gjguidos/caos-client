"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/Dialog/Dialog";
import { cn } from "@/shared/lib/utils";
import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import type {
  CreatePhase,
  LogEntry,
  LogLevel,
  LogStage,
} from "../../_hooks/logContract";

// The stage order/labels below mirror the backend log_contract.py stages. The
// contract types themselves live in ./logContract, owned by the domain layer.

const STAGE_ORDER: LogStage[] = [
  "parse",
  "validate",
  "configure",
  "register",
  "test",
  "finalize",
];

const STAGE_LABELS: Record<LogStage, string> = {
  parse: "Parse",
  validate: "Validate",
  configure: "Configure",
  register: "Register",
  test: "Test",
  finalize: "Finalize",
};

const LEVEL_TEXT: Record<LogLevel, string> = {
  info: "text-zinc-700",
  success: "text-green-700",
  warning: "text-amber-700",
  error: "font-medium text-red-700",
};

export default function ServerMessagesDialog({
  open,
  onClose,
  logs,
  phase = "idle",
  agentName,
  message,
  onDone,
  onBackToEditing,
}: {
  open: boolean;
  onClose: () => void;
  logs: LogEntry[];
  phase?: CreatePhase;
  agentName?: string;
  message?: string;
  /** Leaves the wizard for wherever the user came from. */
  onDone: () => void;
  onBackToEditing: () => void;
}) {
  const banner = getBanner(phase, agentName, message);
  const showStepper = phase !== "idle";
  // Once creation settles there is exactly one way forward, so the dialog can
  // no longer be dismissed via the X, Esc or a click outside.
  const isTerminal = phase === "success" || phase === "error";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl bg-white" dismissable={!isTerminal}>
        <DialogHeader>
          <DialogTitle>
            {phase === "idle" ? "Server messages" : "Agent creation"}
          </DialogTitle>
        </DialogHeader>

        {banner && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-md border px-4 py-3 text-sm",
              banner.className
            )}
          >
            {banner.icon}
            <div>
              <p className="font-medium">{banner.title}</p>
              {banner.description && (
                <p className="text-zinc-600">{banner.description}</p>
              )}
            </div>
          </div>
        )}

        {showStepper && <StageStepper logs={logs} phase={phase} />}

        <div className="max-h-[60vh] space-y-1 overflow-y-auto bg-background text-sm">
          {logs.length === 0 ? (
            <p className="py-6 text-center text-zinc-400">
              Waiting for server messages…
            </p>
          ) : (
            logs.map((log, idx) => (
              <pre
                key={idx}
                className={cn(
                  "whitespace-pre-wrap",
                  LEVEL_TEXT[log.level ?? "info"]
                )}
              >
                {log.message}
              </pre>
            ))
          )}
        </div>

        <DialogFooter>
          {phase === "success" ? (
            <Button onClick={onDone}>Done</Button>
          ) : phase === "error" ? (
            <Button onClick={onBackToEditing}>Back to editing</Button>
          ) : (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StageStepper({
  logs,
  phase,
}: {
  logs: LogEntry[];
  phase: CreatePhase;
}) {
  // The active stage is the last one the backend reported via a log line.
  let activeIdx = -1;
  for (const log of logs) {
    if (log.stage) {
      const i = STAGE_ORDER.indexOf(log.stage);
      if (i > activeIdx) activeIdx = i;
    }
  }
  if (phase === "success") activeIdx = STAGE_ORDER.length - 1;

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {STAGE_ORDER.map((stage, i) => {
        const state =
          phase === "success" || i < activeIdx
            ? "done"
            : i === activeIdx
              ? phase === "error"
                ? "error"
                : "current"
              : "pending";

        return (
          <li key={stage} className="flex items-center gap-2">
            {i > 0 && <span className="text-zinc-300">›</span>}
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2 py-0.5",
                state === "done" && "text-green-700",
                state === "current" && "bg-blue-50 font-medium text-blue-700",
                state === "error" && "bg-red-50 font-medium text-red-700",
                state === "pending" && "text-zinc-400"
              )}
            >
              <StageDot state={state} />
              {STAGE_LABELS[stage]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StageDot({
  state,
}: {
  state: "done" | "current" | "error" | "pending";
}) {
  if (state === "done")
    return <CheckCircledIcon className="h-3.5 w-3.5 text-green-700" />;
  if (state === "error")
    return <CrossCircledIcon className="h-3.5 w-3.5 text-red-700" />;
  if (state === "current")
    return (
      <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
    );
  return <span className="h-2.5 w-2.5 rounded-full border border-zinc-300" />;
}

function getBanner(phase: CreatePhase, agentName?: string, message?: string) {
  const name = agentName ? `"${agentName}"` : "your agent";

  if (phase === "creating") {
    return {
      className: "border-blue-200 bg-blue-50 text-blue-900",
      icon: (
        <span className="h-4 w-4 flex-none animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
      ),
      title: `Creating ${name}…`,
      description:
        message || "Follow the live logs below. This can take a moment.",
    };
  }

  if (phase === "success") {
    return {
      className: "border-green-200 bg-green-50 text-green-900",
      icon: <CheckCircledIcon className="h-5 w-5 flex-none text-green-700" />,
      title: `Agent ${name} created successfully`,
      description: message || "You can head back now.",
    };
  }

  if (phase === "error") {
    return {
      className: "border-red-200 bg-red-50 text-red-900",
      icon: <CrossCircledIcon className="h-5 w-5 flex-none text-red-700" />,
      title: `Creating ${name} failed`,
      description:
        message || "Review the logs below, then go back to fix the details.",
    };
  }

  return null;
}
