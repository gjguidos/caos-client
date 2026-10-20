
"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

import { downloadUrl, extensionForMime } from "@/shared/lib/download";
import type { PresentedImage } from "@/shared/lib/workflow/workflow.types";

import { useStepArtifactName } from "./RunArtifactContext";

/**
 * Downloads an individual image as a file.
 */
function ImageDownloadButton({
  url,
  filename,
  ariaLabel,
}: Readonly<{
  url: string;
  filename: string;
  ariaLabel: string;
}>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => downloadUrl(url, filename)}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="size-8 shrink-0"
    >
      <Download
        className="size-4"
        aria-hidden="true"
      />
    </Button>
  );
}

/**
 * Renders a download button for each image in a step output.
 *
 * Multiple images receive numbered filenames.
 * A single image retains the original label.
 *
 * Download controls are only available inside a
 * StepArtifactProvider.
 */
export function ImageDownloadActions({
  images,
  label,
}: Readonly<{
  images: PresentedImage[];
  label: string;
}>) {
  const artifactName = useStepArtifactName();

  if (!artifactName || images.length === 0) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {images.map((image, index) => {
        const name = `${label}${
          images.length > 1 ? ` ${index + 1}` : ""
        }`;

        return (
          <ImageDownloadButton
            key={`${image.url}-${index}`}
            url={image.url}
            filename={artifactName(
              [name],
              extensionForMime(image.mime_type)
            )}
            ariaLabel={`Download ${name}`}
          />
        );
      })}
    </div>
  );
}
