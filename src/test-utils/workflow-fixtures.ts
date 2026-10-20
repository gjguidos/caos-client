import type {
  DeclaredImageOutput,
  DeclaredOutput,
  DeclaredValueOutput,
  PresentedImage,
  PresentedStepOutput,
} from "@/shared/lib/workflow/workflow.types";

/**
 * Builders for run payloads.
 *
 * Tests used to hand-write step outputs as bare object literals, which let them
 * assert against a shape the backend never sends (an output keyed directly by
 * its declared keys, rather than a presented payload carrying
 * `declared_outputs`). Going through a builder that returns a real
 * `PresentedStepOutput` means a change to the contract breaks the tests instead
 * of passing beneath them.
 */

/** A declared `image` output referencing the payload's own `images` by index. */
export function declaredImage(
  label: string,
  imageIndexes: number[]
): DeclaredImageOutput {
  return { label, type: "image", image_indexes: imageIndexes };
}

/** A declared scalar/structured output carrying its resolved value. */
export function declaredValue(
  label: string,
  value: unknown,
  type: DeclaredValueOutput["type"] = "string"
): DeclaredValueOutput {
  return { label, type, value };
}

export interface PresentedOutputOverrides {
  ok?: boolean;
  tool?: string;
  text?: string | null;
  images?: PresentedImage[];
  error?: string | null;
  declared?: Record<string, DeclaredOutput>;
}

/** A step's presented output, exactly as the socket event and snapshot send it. */
export function presentedOutput(
  overrides: PresentedOutputOverrides = {}
): PresentedStepOutput {
  const { declared, ...rest } = overrides;
  return {
    ok: true,
    tool: "writer",
    images: [],
    declared_outputs: declared ?? {},
    ...rest,
  };
}

/** An image entry for a payload's `images` list. */
export function presentedImage(
  url = "data:image/png;base64,aaa",
  mimeType = "image/png"
): PresentedImage {
  return { url, mime_type: mimeType };
}
