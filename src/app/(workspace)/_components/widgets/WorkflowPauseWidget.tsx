"use client";

import { Button } from "@/components/ui/button";
import type {
  WorkflowActionPayload,
  WorkflowPauseWidgetData,
} from "@/app/(workspace)/_types/chat.types";

type WorkflowPauseWidgetProps = {
  data: WorkflowPauseWidgetData;
  onAction?: (payload: WorkflowActionPayload) => void;
};

export function WorkflowPauseWidget({
  data,
  onAction,
}: WorkflowPauseWidgetProps) {
  return (
    <div className="my-4 flex justify-center">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-sm">
        <div className="mb-1 text-sm font-semibold">Workflow paused</div>

        <div className="mb-3 text-sm text-neutral-600">{data.prompt}</div>

        <div className="flex justify-center gap-2">
          <Button
            size="sm"
            onClick={() =>
              onAction?.({
                runId: data.runId,
                workflowKey: data.workflowKey,
                action: "continue",
                data: {
                  action: "continue",
                  pause_id: data.pauseId,
                  step_id: data.stepId,
                },
              })
            }
          >
            Continue
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              onAction?.({
                runId: data.runId,
                workflowKey: data.workflowKey,
                action: "cancel",
                data: {
                  action: "cancel",
                  pause_id: data.pauseId,
                  step_id: data.stepId,
                  pause_payload: { action: "cancel" },
                },
              })
            }
          >
            Cancel
          </Button>
        </div>

        <div className="mt-3 text-xs text-neutral-500">Step: {data.stepId}</div>
      </div>
    </div>
  );
}
