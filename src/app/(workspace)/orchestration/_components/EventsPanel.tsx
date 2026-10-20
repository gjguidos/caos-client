
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { RunEvent } from "@/shared/lib/workflow/workflow.types";
import { stepIdOf } from "@/shared/lib/workflow/runEvents";

import { EventRow } from "./EventRow";

export interface EventsPanelProps {
  events: RunEvent[];

  /** Resolves a step id to its display label; shared with the step panel. */
  getStepLabel: (stepId: string) => string | undefined;

  onSelectStep: (stepId: string) => void;
}

/**
 * The run's chronology, at run scope.
 *
 * The canvas describes step dependencies.
 * This panel shows what happened and in what order.
 *
 * Automatically follows new events only while
 * the reader is near the bottom of the list.
 */
export function EventsPanel({
  events,
  getStepLabel,
  onSelectStep,
}: Readonly<EventsPanelProps>) {
  const [pinnedToEnd, setPinnedToEnd] = useState(true);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!pinnedToEnd) return;

    const list = listRef.current;

    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [events.length, pinnedToEnd]);

  const handleScroll = useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const distanceFromEnd =
      list.scrollHeight -
      list.scrollTop -
      list.clientHeight;

    setPinnedToEnd(distanceFromEnd < 24);
  }, []);

  const jumpToLatest = useCallback(() => {
    const list = listRef.current;

    if (list) {
      list.scrollTop = list.scrollHeight;
    }

    setPinnedToEnd(true);
  }, []);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ol
        ref={listRef}
        onScroll={handleScroll}
        data-testid="events-panel-list"
        className="min-h-0 flex-1 divide-y divide-border overflow-y-auto py-1"
      >
        {events.length === 0 ? (
          <li className="px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Events appear here once the run starts.
            </p>
          </li>
        ) : (
          events.map((event) => {
            const stepId = stepIdOf(event);

            return (
              <EventRow
                key={event.id}
                event={event}
                stepLabel={
                  stepId
                    ? getStepLabel(stepId)
                    : undefined
                }
                onSelectStep={onSelectStep}
              />
            );
          })
        )}
      </ol>

      {!pinnedToEnd && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={jumpToLatest}
          className="absolute inset-x-0 bottom-2 mx-auto w-fit gap-2 shadow-md"
        >
          <ArrowDown
            className="size-4"
            aria-hidden="true"
          />
          Latest
        </Button>
      )}
    </div>
  );
}
