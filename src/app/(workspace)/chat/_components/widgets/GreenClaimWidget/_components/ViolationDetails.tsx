
import { cn } from "@/shared/lib/utils";

import type { ViolationDetailsProps } from "../greenClaimWidget.types";

export function ViolationDetails({
  violation,
  className,
}: ViolationDetailsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">
          {violation.principle}
        </h4>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {violation.explanation}
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Improvement Recommendation
          </h5>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {violation.improvement_recommendation}
          </p>
        </div>

        <div className="space-y-1">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Guidelines Reference
          </h5>

          <ul className="list-disc space-y-1 pl-5">
            {violation.guidelines_reference.map((ref, index) => (
              <li
                key={index}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                {ref}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
