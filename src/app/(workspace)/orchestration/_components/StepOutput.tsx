"use client";

import Image from "next/image";
import { useState } from "react";
import {
  isPresentedStepOutput,
  resolveDeclaredImages,
} from "@/shared/lib/workflow/declaredOutputs";
import type {
  DeclaredOutput,
  PresentedImage,
  PresentedStepOutput,
} from "@/shared/lib/workflow/workflow.types";
import { CopyButton } from "@/shared/components/CopyButton/CopyButton";
import { formatForClipboard } from "@/shared/lib/clipboardValue";
import { FileValue } from "./FileValue";
import { ImageDownloadActions } from "./ImageDownloadActions";

/**
 * Shared presentation for a single run value and the labelled-field wrapper
 * around it. Shared so the step panel, the run's outputs list, the submitted
 * inputs and the resolved step inputs all render a value identically - every
 * one of them renders through `OutputDisplay`, and none of them decides for
 * itself what a value looks like.
 */
export function Field({
  label,
  action,
  children,
}: Readonly<{
  label: string;
  /** An affordance for the value itself, sitting opposite its label. */
  action?: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

/**
 * Thumbnails for a set of images, shared by outputs and resolved inputs.
 *
 * The index only joins the alt text when there is more than one image to tell
 * apart, matching how `ImageDownloadActions` names the same images - a lone
 * image called "Hero Image 1" just invites the reader to look for a second.
 */
function ImageGrid({
  images,
  alt,
}: Readonly<{ images: PresentedImage[]; alt: string }>) {
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((image, index) => (
        <Image
          key={`${image.url}-${index}`}
          src={image.url}
          alt={images.length > 1 ? `${alt} ${index + 1}` : alt}
          width={150}
          height={150}
          unoptimized
          className="max-h-[150px] w-auto rounded border border-border object-contain"
        />
      ))}
    </div>
  );
}

/**
 * A declared `image` value: its thumbnails, or the empty case stated in words.
 *
 * An image output that produced nothing is normal (the step ran, the tool
 * returned no image), so it reads as absent rather than as a broken thumbnail.
 */
export function ImageValue({
  images,
  alt,
}: Readonly<{ images: PresentedImage[]; alt: string }>) {
  if (images.length === 0) {
    return <span className="text-xs text-muted-foreground">No image produced</span>;
  }
  return <ImageGrid images={images} alt={alt} />;
}

/**
 * The affordance for a whole output value, or nothing when it carries its own.
 *
 * A presented output grows a button per declared value inside `OutputDisplay`,
 * each offering what that value's type actually needs, so a second button over
 * the top would only copy the same content again. Answering that here keeps the
 * test beside the render path it mirrors, instead of in every panel that
 * happens to show an output.
 */
export function OutputAction({
  value,
  label,
}: Readonly<{ value: unknown; label: string }>) {
  if (isPresentedStepOutput(value)) return null;
  return <CopyButton value={value} label={label} />;
}

/** Longest single-line string still shown whole rather than clamped. */
const INLINE_MAX = 90;

/** A value short enough to be read at a glance, set as itself. */
function InlineValue({ text }: Readonly<{ text: string }>) {
  return (
    <p className="break-words text-sm text-foreground">
      {text}
    </p>
  );
}

/**
 * A long text value — a prompt or a generated paragraph, usually — kept to the
 * height of a few lines until asked for.
 *
 * It is prose, so it is set as prose rather than as code, and it is clamped
 * rather than given its own scrollbar: a scrolling box inside a scrolling panel
 * leaves the reader with two ways to move and no way to see how much is left,
 * and it pushes whatever follows the value far from the label it belongs to.
 */
function LongTextValue({ text }: Readonly<{ text: string }>) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className="relative">
        <p
          className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground ${
            expanded ? "" : "max-h-[5.5rem] overflow-hidden"
          }`}
        >
          {text}
        </p>
        {!expanded && (
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent"
            aria-hidden
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="mt-1 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {expanded ? "Show less" : "Show all"}
      </button>
    </div>
  );
}

/**
 * Any value the run surfaces, rendered by what it is. The one dispatcher: the
 * step panel, the run's outputs list, the submitted-inputs list and the resolved
 * step inputs all come through here, so the same value cannot read one way on
 * one tab and another way on the next.
 *
 * The text of a value comes from `formatForClipboard`, the same function its
 * copy button uses, so what lands on the clipboard cannot drift from what the
 * pane shows.
 *
 * `isFile` is the one thing the value cannot answer for itself. A file rides
 * through the system as an opaque `file_id` string and is indistinguishable
 * from any other string by inspection, so whether a slot holds one is read off
 * the declaration - the input's `type`, or a `file_bindings` slot - and passed
 * in by the caller that holds it.
 */
export function OutputDisplay({
  value,
  isFile = false,
}: Readonly<{ value: unknown; isFile?: boolean }>) {
  if (isPresentedStepOutput(value)) {
    return <PresentedOutputDisplay value={value} />;
  }

  if (value === null) {
    return <span className="text-xs text-muted-foreground">null</span>;
  }

  if (typeof value === "string") {
    if (isFile && value !== "") return <FileValue fileId={value} />;
    return value.length <= INLINE_MAX && !value.includes("\n") ? (
      <InlineValue text={value} />
    ) : (
      <LongTextValue text={value} />
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <InlineValue text={formatForClipboard(value)} />;
  }

  return (
    <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-2 font-mono text-xs text-foreground/80">
      {formatForClipboard(value)}
    </pre>
  );
}

/**
 * A step's result, led by what it declared.
 *
 * `declared_outputs` names and types each value the step exposes, and is what a
 * downstream `${outputs.<id>.<key>}` can actually bind to. It replaces the
 * `text`/`images` view rather than sitting above it: those carry the same
 * content without the labels, so showing both only asks the reader to work out
 * that they are looking at one result twice.
 *
 * A step whose tool declares no outputs (`workflow`, `analyze`) has only the
 * raw fields, and shows them - an empty declared map is normal there, not a
 * failure.
 */
function PresentedOutputDisplay({
  value,
}: Readonly<{ value: PresentedStepOutput }>) {
  const declared = Object.entries(value.declared_outputs ?? {});
  const hasRaw = !!value.text || value.images.length > 0;

  return (
    <div className="space-y-3">
      {declared.map(([key, entry]) => (
        <DeclaredOutputField
          key={key}
          entry={entry}
          fallbackLabel={key}
          payload={value}
        />
      ))}

      {declared.length === 0 && hasRaw && <RawOutputFields value={value} />}

      {value.error && (
        <Field
          label="Error"
          action={<CopyButton value={value.error} label="Error" />}
        >
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2">
            <pre className="max-h-[150px] overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-destructive">
              {value.error}
            </pre>
          </div>
        </Field>
      )}
    </div>
  );
}

/**
 * One declared output, rendered under its author-facing label.
 *
 * The label row carries the way to take the value with you, which differs by
 * type: an image belongs in a file, everything else on the clipboard. An entry
 * declaring several images gets one download button per image.
 */
function DeclaredOutputField({
  entry,
  fallbackLabel,
  payload,
}: Readonly<{
  entry: DeclaredOutput;
  fallbackLabel: string;
  payload: PresentedStepOutput;
}>) {
  const label = entry.label || fallbackLabel;

  if (entry.type === "image") {
    const images = resolveDeclaredImages(payload, entry);
    return (
      <Field
        label={label}
        action={<ImageDownloadActions images={images} label={label} />}
      >
        <ImageValue images={images} alt={label} />
      </Field>
    );
  }

  const value = entry.value ?? null;

  return (
    <Field label={label} action={<CopyButton value={value} label={label} />}>
      <OutputDisplay value={value} />
    </Field>
  );
}

/** The generic display fields, unchanged by the declared-output view. */
function RawOutputFields({ value }: Readonly<{ value: PresentedStepOutput }>) {
  return (
    <>
      {value.text && (
        <Field
          label="Text"
          action={<CopyButton value={value.text} label="Text" />}
        >
          <OutputDisplay value={value.text} />
        </Field>
      )}

      {value.images.length > 0 && (
        <Field
          label="Images"
          action={
            <ImageDownloadActions
              images={value.images}
              label={`${value.tool} output`}
            />
          }
        >
          <ImageGrid images={value.images} alt={`${value.tool} output`} />
        </Field>
      )}
    </>
  );
}
