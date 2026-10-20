"use client";

import { useState, type ReactNode } from "react";
import type {
  FormValue,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { isEmptyValue } from "@/app/(workspace)/_tool-form/lib/uiComponentSerializer";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import { isWholeReference } from "@/shared/lib/workflow/references";
import { BoundReferenceControl, RequiredMarker } from "./BoundReferenceControl";
import {
  argBindableInputs,
  argBindableSources,
  expectedOutputType,
} from "./outputTypes";
import type { OutputSource } from "./types";

/** Everything the builder field wrapper needs that's the same for every field. */
export interface BindingContext {
  inputs: ReadonlyArray<WorkflowInputField>;
  outputSources: ReadonlyArray<OutputSource>;
  /** Auto-ensure the `depends_on` edge when an output source is bound. */
  onBindOutput: (producerStepId: string) => void;
}

type FieldChange = (key: string, value: FormValue) => void;

interface BuilderFieldProps {
  component: UIComponent;
  value: FormValue;
  onChange: FieldChange;
  defaultField: ReactNode;
  context: BindingContext;
}

/**
 * Per-field builder wrapper (the `renderField` impl handed to
 * `DynamicFormRenderer`): a `Value | ⤵ Link` segmented toggle plus a body that is
 * either the typed literal widget (`defaultField`) or, in link mode, the
 * `BoundReferenceControl`. Owns all binding logic; `DynamicFormRenderer` stays
 * ignorant of references.
 *
 * The toggle only renders when there is something to link to (a declared input,
 * an eligible upstream step, or an already-bound value). A required field gets a
 * "Required" marker while it's still empty (visible in both Value and Link mode);
 * once a value or binding is set the marker clears. A field that is neither
 * linkable nor flagged-and-empty is just its literal widget.
 */
function BuilderField({
  component,
  value,
  onChange,
  defaultField,
  context,
}: Readonly<BuilderFieldProps>) {
  // Only a whole `${…}` token counts as bound; a mixed expression like
  // `Summarize: ${outputs.s1.text}` stays in the literal widget so it remains
  // editable (and "unlink" can't wipe it). Matches the stepArgs whole-vs-mixed split.
  const bound = isWholeReference(value);
  // When the author switches to Link before picking a source, the value is still
  // an empty literal — track the intent locally until a token is written.
  const [forceBound, setForceBound] = useState(false);
  const showLink = bound || forceBound;

  // File-kind inputs feed file slots only, so they don't make an arg linkable.
  const bindableInputs = argBindableInputs(context.inputs);
  // Command args can't bind `image` outputs; those feed file slots only. Narrow
  // once and gate the toggle on real choices, so a step whose only outputs are
  // images doesn't show a Link toggle that opens onto the empty-hint.
  const bindableSources = argBindableSources(context.outputSources);
  const hasBindableOutputs = bindableSources.some((s) => s.outputs.length > 0);
  const canLink = bindableInputs.length > 0 || hasBindableOutputs || bound;
  // Nudge a required field only while it's still unfilled (a binding counts as set).
  const showRequired =
    (component.flag_config?.required ?? false) && isEmptyValue(value);

  // No binding chrome and nothing to flag → the plain literal widget, untouched.
  if (!canLink && !showRequired) return <>{defaultField}</>;

  const label = (component.props?.label as string) ?? component.id;

  const setValueMode = () => {
    if (bound) onChange(component.id, "");
    setForceBound(false);
  };

  const setLinkMode = () => setForceBound(true);

  return (
    <div className="flex flex-col gap-25">
      <div className="flex items-center justify-between">
        {showRequired ? <RequiredMarker /> : <span />}
        {canLink && (
          <div className="inline-flex rounded-m bg-neutral-2 p-25">
            <SegmentButton active={!showLink} onClick={setValueMode}>
              Value
            </SegmentButton>
            <SegmentButton active={showLink} onClick={setLinkMode}>
              ⤵ Link
            </SegmentButton>
          </div>
        )}
      </div>

      {showLink ? (
        <BoundReferenceControl
          label={label}
          value={value}
          inputs={bindableInputs}
          outputSources={bindableSources}
          expectedType={expectedOutputType(component.type)}
          onChange={(next) => onChange(component.id, next)}
          onBindOutput={context.onBindOutput}
        />
      ) : (
        defaultField
      )}
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: Readonly<{
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "rounded-sm px-50 py-25 text-sm transition-colors",
        active
          ? "bg-neutral-1 text-interactive-emphasised-border-selected shadow-sm"
          : "text-text-2 hover:text-text-1",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/**
 * Build the `renderField` callback `DynamicFormRenderer` calls per field, closing
 * over the (field-independent) binding context.
 */
export function createBuilderRenderField(
  context: BindingContext
): (args: {
  component: UIComponent;
  value: FormValue;
  onChange: FieldChange;
  defaultField: ReactNode;
}) => ReactNode {
  return ({ component, value, onChange, defaultField }) => (
    <BuilderField
      component={component}
      value={value}
      onChange={onChange}
      defaultField={defaultField}
      context={context}
    />
  );
}
