
import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/lib/utils";

import type { ProblematicWordMatch } from "../../../../_api/greenClaim.types";
import type { WordMatchListProps } from "../greenClaimWidget.types";

export function WordMatchList({
  matches,
  type,
  className,
}: WordMatchListProps) {
  if (!matches || matches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No {type} matches found
      </p>
    );
  }

  const groupedMatches = matches.reduce<
    Record<string, ProblematicWordMatch[]>
  >((acc, match) => {
    const key = match.text;

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(match);
    return acc;
  }, {});

  return (
    <ul className={cn("space-y-2", className)}>
      {Object.entries(groupedMatches).map(([word, wordMatches]) => {
        const firstMatch = wordMatches[0];
        const count = wordMatches.length;

        const positions = wordMatches.map((match) => ({
          start: match.start,
          end: match.end,
          type: match.type,
        }));

        return (
          <li
            key={word}
            className="flex flex-wrap items-center gap-2"
            data-word={word}
            data-match-count={count}
            data-positions={JSON.stringify(positions)}
          >
            <Badge
              variant={type === "exact" ? "destructive" : "secondary"}
              className="font-medium"
            >
              {word}
            </Badge>

            {count > 1 && (
              <span className="text-xs text-muted-foreground">
                {count} occurrences
              </span>
            )}

            {firstMatch.matched_against !== firstMatch.text && (
              <span className="text-xs text-muted-foreground">
                Matched against: {firstMatch.matched_against}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
