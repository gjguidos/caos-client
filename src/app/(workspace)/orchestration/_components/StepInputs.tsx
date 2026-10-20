"use client";

import { StatusLine } from "@/shared/components/StatusLine/StatusLine";
import { humanizeKey } from "@/shared/lib/humanizeKey";
import type { WorkflowStep } from "@/shared/lib/workflow/workflow.types";
import { ChevronDown } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import {
  resolveFileBindings,
  resolveStepInputs,
  type ArgSource,
  type ResolutionContext,
  type ResolvedArg,
  type UnresolvedReason,
} from "../_lib/resolveStepInputs";
import {
  isFileInput,
  runInputLabel,
  type RunInputLookup,
} from "../_lib/runInputDisplay";
import { Field, ImageValue, OutputDisplay } from "./StepOutput";

/**
 * Rows read in the order their values become known: what the run was handed,
 * then what the workflow produced on the way here, then what was fixed when the
 * workflow was written. That also puts the values a reader can still do
 * something about at the top and the ones they cannot at the bottom. Within a
 * group the command's own order survives, because the sort is stable.
 */
const SOURCE_RANK: Record<ArgSource["kind"], number> = {
  input: 0,
  output: 1,
  mixed: 2,
  unknown: 3,
  literal: 4,
};

export interface StepInputsProps {
  step: WorkflowStep;
  context: ResolutionContext;
  /** Resolves a producer step id to its display label. */
  getStepLabel: (stepId: string) => string | undefined;
  /**
   * The declared run input behind a `${inputs.<key>}` reference. It carries both
   * the label the run form gives that input and its declared `type`, which is
   * the only thing that says a value is a file rather than text.
   */
  getRunInput: RunInputLookup;
  onSelectStep: (stepId: string) => void;
}

/** A resolved argument alongside what the declaration says about it. */
interface InputRow {
  key: string;
  arg: ResolvedArg;
  /** The slot holds a file id, so its value renders as the file it names. */
  isFile: boolean;
}

/**
 * What went into this step.
 *
 * The backend doesn't report step inputs, so these are resolved from the step's
 * command against the run — see `resolveStepInputs`. Every parameter reads the
 * same three ways down: its name, the value it holds, and where that value came
 * from. Holding that shape for every row is the point: during debugging "wrong
 * value" and "wrong wiring" are different bugs, and you find the second one by
 * scanning one column rather than by reading each row's prose.
 *
 * The values themselves go through `OutputDisplay` like every other value on
 * the page, so an argument and the output it came from cannot render
 * differently.
 *
 * No `${…}` tokens appear here. They are the same text the command already
 * carries, and the command is one disclosure away at the bottom, so repeating
 * them per row only buries the two things a row is for.
 */
export function StepInputs({
  step,
  context,
  getStepLabel,
  getRunInput,
  onSelectStep,
}: Readonly<StepInputsProps>) {
  const args = useMemo(() => resolveStepInputs(step, context), [step, context]);
  const fileBindings = useMemo(
    () => resolveFileBindings(step, context),
    [step, context]
  );

  // File slots are arguments too and resolve the same way, so they join the same
  // list rather than sitting under a heading that only ever names a row or two.
  // Which rows hold files is read off the declaration: every `file_bindings`
  // slot by construction, and an `${inputs.…}` argument when the run input it
  // names is declared `file`.
  const rows = useMemo<InputRow[]>(() => {
    const all: InputRow[] = [
      ...args.map((arg) => ({
        key: `arg:${arg.name}`,
        arg,
        isFile:
          arg.source.kind === "input" &&
          isFileInput(getRunInput(arg.source.key)),
      })),
      ...fileBindings.map((arg) => ({
        key: `file:${arg.name}`,
        arg,
        isFile: true,
      })),
    ];
    return all.sort(
      (a, b) => SOURCE_RANK[a.arg.source.kind] - SOURCE_RANK[b.arg.source.kind]
    );
  }, [args, fileBindings, getRunInput]);

  const setValues = Object.entries(step.set ?? {});
  const hasAnything = rows.length > 0 || setValues.length > 0 || !!step.command;

  if (!hasAnything) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        This step takes no arguments.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {rows.length > 0 && (
        <ul>
          {rows.map((row) => (
            <ArgRow
              key={row.key}
              row={row}
              getStepLabel={getStepLabel}
              getRunInput={getRunInput}
              onSelectStep={onSelectStep}
            />
          ))}
        </ul>
      )}

      {setValues.length > 0 && (
        <div className="border-t border-border pt-3">
          <Field label="Also sets">
            <ul>
              {setValues.map(([key, value]) => (
                <Row key={key} name={key}>
                  <OutputDisplay value={value} />
                </Row>
              ))}
            </ul>
          </Field>
        </div>
      )}

      {step.command && <CommandDisclosure command={step.command} />}
    </div>
  );
}

/** The shared shape of every row: a heading, a value, and an optional origin. */
function Row({
  name,
  origin,
  children,
}: Readonly<{
  name: string;
  origin?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <li className="border-b border-border py-3 last:border-b-0">
      <p className="truncate text-xs font-semibold text-foreground" title={name}>
        {humanizeKey(name)}
      </p>
      <div className="mt-1">{children}</div>
      {origin}
    </li>
  );
}

function ArgRow({
  row,
  getStepLabel,
  getRunInput,
  onSelectStep,
}: Readonly<{
  row: InputRow;
  getStepLabel: (stepId: string) => string | undefined;
  getRunInput: RunInputLookup;
  onSelectStep: (stepId: string) => void;
}>) {
  const { arg, isFile } = row;

  return (
    <Row
      name={arg.name}
      origin={
        <ArgOrigin
          arg={arg}
          getStepLabel={getStepLabel}
          getRunInput={getRunInput}
          onSelectStep={onSelectStep}
        />
      }
    >
      {arg.images ? (
        <ImageValue images={arg.images} alt={arg.name} />
      ) : arg.value === undefined ? (
        <Absence reason={arg.unresolved ?? "pending"} />
      ) : (
        <OutputDisplay value={arg.value} isFile={isFile} />
      )}
    </Row>
  );
}

/**
 * Why a row holds nothing. Only a fault is painted as one: a value that has not
 * been produced yet is the ordinary state of every row before a run reaches the
 * step, and an unanswered run input is waiting on the reader rather than on the
 * run, so both read as absence and neither reads as a warning. A failed
 * upstream and a reference that names nothing are the two that will not come
 * good on their own.
 */
const ABSENCE: Record<UnresolvedReason, { text: string; isFault: boolean }> = {
  unset: { text: "Not set", isFault: false },
  pending: { text: "Waiting", isFault: false },
  failed: { text: "Upstream failed", isFault: true },
  undeclared: { text: "Nothing produced", isFault: false },
  unresolvable: { text: "Cannot resolve", isFault: true },
};

/** The empty state, marked by the same dot every other status uses. */
function Absence({ reason }: Readonly<{ reason: UnresolvedReason }>) {
  const { text, isFault } = ABSENCE[reason];

  return (
    <StatusLine
      dotClassName={
        isFault ? "bg-destructive" : "border border-muted-foreground/50"
      }
      textClassName={isFault ? "text-destructive" : "text-muted-foreground"}
    >
      {text}
    </StatusLine>
  );
}

/**
 * Where the value came from, in the same place on every row.
 *
 * Only the producing step is a control, because it is the only part of the line
 * that goes anywhere. Selecting it re-scopes this panel rather than navigating,
 * so it reads as the name of a place, not as a back button.
 */
function ArgOrigin({
  arg,
  getStepLabel,
  getRunInput,
  onSelectStep,
}: Readonly<{
  arg: ResolvedArg;
  getStepLabel: (stepId: string) => string | undefined;
  getRunInput: RunInputLookup;
  onSelectStep: (stepId: string) => void;
}>) {
  const { source } = arg;
  // A fallback did not come from the source, so it is named first and the wiring
  // it stood in for follows.
  const prefix = arg.usedFallback ? "Fallback · " : "";

  const line = (children: ReactNode, isFault = false) => (
    <p
      className={`mt-1 truncate text-xs ${isFault ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}
    >
      {children}
    </p>
  );

  if (source.kind === "output") {
    const stepLabel = getStepLabel(source.stepId) ?? source.stepId;
    // The producer's own label for the output once it has resolved, falling
    // back to the raw key while the step hasn't produced anything to name it.
    const outputLabel = source.label ?? source.outputKey;
    const suffix = [outputLabel, source.path].filter(Boolean).join(".");

    return line(
      <>
        {prefix}from{" "}
        <button
          type="button"
          onClick={() => onSelectStep(source.stepId)}
          className="rounded-sm text-foreground/80 underline-offset-2 transition-colors duration-150 ease-in-out hover:text-foreground hover:underline"
        >
          {stepLabel}
        </button>
        {suffix && ` · ${suffix}`}
      </>
    );
  }

  if (source.kind === "input") {
    const label = runInputLabel(source.key, getRunInput(source.key));
    return line(`${prefix}from run input ${label}`);
  }

  // A literal came from nowhere: it is the value, written into the workflow.
  // Saying so on every such row spends a line to report the absence of wiring,
  // and the ordering already collects them at the bottom.
  if (source.kind === "literal") return null;

  if (source.kind === "mixed") return line("Built from other values");

  return line(`Unrecognized reference ${source.expression}`, true);
}

/**
 * The command as written, tokens and all. This is the one place the raw
 * `${…}` references appear: the rows above say what each one resolved to, and
 * this says what was asked for.
 */
function CommandDisclosure({ command }: Readonly<{ command: string }>) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex items-center gap-2 text-xs text-muted-foreground underline-offset-2 transition-colors duration-150 ease-in-out hover:text-foreground hover:underline"
      >
        <ChevronDown
          className={`size-3 shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
        {open ? "Hide command" : "Show command"}
      </button>
      {open && (
        <pre id={contentId} className="mt-2 max-h-[140px] overflow-auto whitespace-pre-wrap rounded bg-muted px-2 py-2 font-mono text-xs text-foreground/80">
          {command}
        </pre>
      )}
    </div>
  );
}
