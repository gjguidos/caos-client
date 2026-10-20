
import { cn } from "@/shared/lib/utils";

import type { GuidelinesSectionProps } from "../greenClaimWidget.types";

export function GuidelinesSection({
  guidelines,
  className,
}: GuidelinesSectionProps) {
  if (!guidelines) {
    return null;
  }

  return (
    <section
      className={cn(
        "space-y-2 border-t border-border pt-4",
        className
      )}
    >
      <h3 className="text-sm font-semibold text-foreground">
        Guidelines
      </h3>

      <p className="text-sm leading-relaxed text-muted-foreground">
        For more information, consult the{" "}
        <a
          href={guidelines}
          target="_blank"
          rel="noopener noreferrer"
          title={guidelines}
          className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          green claim guidelines
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        .
      </p>
    </section>
  );
}
