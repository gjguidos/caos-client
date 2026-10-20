
import { cn } from "@/shared/lib/utils";

import type { ProblematicWordMatch } from "../../../../_api/greenClaim.types";
import type { ProblematicWordsSectionProps } from "../greenClaimWidget.types";

import { WordMatchList } from "./WordMatchList";

interface MatchSectionProps {
  title: string;
  matches: ProblematicWordMatch[];
  type: "exact" | "close";
}

function MatchSection({
  title,
  matches,
  type,
}: MatchSectionProps) {
  if (matches.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">
        {title}
      </h4>

      <WordMatchList
        matches={matches}
        type={type}
      />
    </div>
  );
}

export function ProblematicWordsSection({
  problematicWords,
  className,
}: ProblematicWordsSectionProps) {
  const hasExactMatches =
    problematicWords.exact_matches.length > 0;

  const hasCloseMatches =
    problematicWords.close_matches.length > 0;

  if (!hasExactMatches && !hasCloseMatches) {
    return null;
  }

  return (
    <section className={cn("space-y-4", className)}>
      <h3 className="text-lg font-semibold text-foreground">
        Problematic Words Found
      </h3>

      <MatchSection
        title="Exact Matches"
        matches={problematicWords.exact_matches}
        type="exact"
      />

      <MatchSection
        title="Close Matches"
        matches={problematicWords.close_matches}
        type="close"
      />
    </section>
  );
}
