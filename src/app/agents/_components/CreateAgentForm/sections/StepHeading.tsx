
import type { ReactNode } from "react";

/**
 * The main heading at the top of a wizard step.
 *
 * Sub-panels use h3 via PanelHeading, preserving
 * the heading hierarchy.
 */
export function StepHeading({
  title,
  blurb,
}: Readonly<{
  title: string;
  blurb: string;
}>) {
  return (
    <div className="mb-6">
      <h2 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {blurb}
      </p>
    </div>
  );
}

/** Heading for a sub-panel within a wizard step. */
export function PanelHeading({
  title,
  blurb,
  trailing,
}: Readonly<{
  title: string;
  blurb?: string;
  trailing?: ReactNode;
}>) {
  return (
    <div className="mb-3 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-foreground">
          {title}
        </h3>

        {blurb && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {blurb}
          </p>
        )}
      </div>

      {trailing && (
        <div className="shrink-0">{trailing}</div>
      )}
    </div>
  );
}
