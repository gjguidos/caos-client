import {
  fireEvent,
  render,
  screen,
  userEvent,
  within,
} from "@/test-utils/test-utils";
import type {
  RunEvent,
  StepStatus,
} from "@/shared/lib/workflow/workflow.types";
import { describe, expect, it, vi } from "vitest";
import { EventsPanel } from "./EventsPanel";

const LABELS: Record<string, string> = {
  research: "Research",
  write: "Write draft",
};

const TS = Date.parse("2026-01-01T12:00:00Z");

function step(id: string, stepId: string, status: StepStatus): RunEvent {
  return { id, ts: TS, kind: "step", stepId, status };
}

const EVENTS: RunEvent[] = [
  step("0", "research", "RUNNING"),
  step("1", "research", "COMPLETED"),
  step("2", "write", "RUNNING"),
  { id: "3", ts: TS, kind: "log", message: "fetching sources" },
];

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof EventsPanel>> = {}
) {
  const onSelectStep = vi.fn();
  render(
    <EventsPanel
      events={EVENTS}
      getStepLabel={(id) => LABELS[id]}
      onSelectStep={onSelectStep}
      {...overrides}
    />
  );
  return { onSelectStep };
}

/**
 * jsdom reports every element as zero-sized, so the pinned-to-tail check always
 * sees distance 0. Stub the three metrics the handler reads to simulate a reader
 * who has scrolled away.
 */
function scrollAwayFromTail(list: HTMLElement) {
  for (const [prop, value] of [
    ["scrollHeight", 1000],
    ["clientHeight", 200],
    ["scrollTop", 0],
  ] as const) {
    Object.defineProperty(list, prop, { value, configurable: true });
  }
  fireEvent.scroll(list);
}

describe("EventsPanel", () => {
  it("renders every event in order with its step label", () => {
    renderPanel();
    const rows = screen.getAllByRole("listitem");

    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText("Research")).toBeInTheDocument();
    expect(within(rows[0]).getByText("RUNNING")).toBeInTheDocument();
    expect(within(rows[3]).getByText("fetching sources")).toBeInTheDocument();
  });

  it("selects a step when its row is clicked", async () => {
    const user = userEvent.setup();
    const { onSelectStep } = renderPanel();

    await user.click(screen.getAllByRole("button", { name: "Research" })[0]);

    expect(onSelectStep).toHaveBeenCalledWith("research");
  });

  it("invites the first run when there is nothing to show", () => {
    renderPanel({ events: [] });
    expect(
      screen.getByText("Events appear here once the run starts.")
    ).toBeInTheDocument();
  });

  it("marks an inferred step attribution", () => {
    renderPanel({
      events: [
        {
          id: "9",
          ts: TS,
          kind: "log",
          stepId: "write",
          inferredStep: true,
          message: "x",
        },
      ],
    });

    expect(
      screen.getByTitle(/inferred from the running step/)
    ).toHaveTextContent("Write draft*");
  });

  it("offers a jump to the tail only once the reader has scrolled away", () => {
    renderPanel();
    expect(
      screen.queryByRole("button", { name: "Latest" })
    ).not.toBeInTheDocument();

    scrollAwayFromTail(screen.getByTestId("events-panel-list"));

    expect(screen.getByRole("button", { name: "Latest" })).toBeInTheDocument();
  });
});
