/**
 * Narrowing an untyped run payload into a step's presented output.
 *
 * Step outputs travel as `unknown` (the socket event and the run snapshot both
 * hand the payload through verbatim), so a read needs this guard first. Callers
 * narrow once and then work with `PresentedStepOutput` directly - reading
 * `declared_outputs` off it needs no helper beyond that.
 */

import type {
  DeclaredImageOutput,
  PresentedImage,
  PresentedStepOutput,
} from "./workflow.types";

/** True when the value carries the presented-output shape a run payload has. */
export function isPresentedStepOutput(
  value: unknown
): value is PresentedStepOutput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const output = value as Partial<PresentedStepOutput>;
  return (
    typeof output.ok === "boolean" &&
    typeof output.tool === "string" &&
    Array.isArray(output.images)
  );
}

/**
 * The images an `image` entry points at, in declaration order.
 *
 * Indexes that fall outside the payload's `images` are dropped rather than
 * yielding holes: a truncated payload should show what it does have. An empty
 * result means "declared an image, produced none" - render it as absent, not as
 * a broken image.
 */
export function resolveDeclaredImages(
  payload: PresentedStepOutput,
  entry: DeclaredImageOutput
): PresentedImage[] {
  return (entry.image_indexes ?? [])
    .map((index) => payload.images[index])
    .filter((image): image is PresentedImage => image !== undefined);
}
