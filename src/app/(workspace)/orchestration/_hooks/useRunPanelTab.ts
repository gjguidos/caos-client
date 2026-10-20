"use client";

import {
  TERMINAL_RUN_STATUSES,
  type RunStatus,
} from "@/shared/lib/workflow/workflow.types";
import { useEffect, useRef, useState } from "react";

export type RunTab = "inputs" | "events" | "outputs";

export interface UseRunPanelTabReturn {
  tab: RunTab;
  setTab: (tab: RunTab) => void;
}

/**
 * Which run-panel tab is showing, moved here from the panel because the panel is
 * unmounted while a step is selected and its local state would not survive.
 *
 * The tab follows the run's lifecycle: the chronology while it runs, the results
 * once it settles, the form again after a reset. Switches fire on transitions
 * only, and unconditionally — a manual pick does not suppress a later one, since
 * "the run just finished" is exactly when Outputs is the right thing to see.
 */
export function useRunPanelTab(
  runStatus: RunStatus | null,
  isStarting: boolean
): UseRunPanelTabReturn {
  const [tab, setTab] = useState<RunTab>("inputs");
  const previous = useRef({ runStatus, isStarting });

  useEffect(() => {
    const before = previous.current;
    previous.current = { runStatus, isStarting };

    // Settling is checked first: a run short enough that its first snapshot is
    // already terminal both starts and finishes in one transition, and finishing
    // is the more useful of the two to land on.
    if (
      runStatus !== null &&
      runStatus !== before.runStatus &&
      TERMINAL_RUN_STATUSES.has(runStatus)
    ) {
      setTab("outputs");
      return;
    }

    const started =
      (isStarting && !before.isStarting) ||
      (runStatus !== null && before.runStatus === null);
    if (started) {
      setTab("events");
      return;
    }

    const cleared =
      runStatus === null &&
      !isStarting &&
      (before.runStatus !== null || before.isStarting);
    if (cleared) setTab("inputs");
  }, [runStatus, isStarting]);

  return { tab, setTab };
}
