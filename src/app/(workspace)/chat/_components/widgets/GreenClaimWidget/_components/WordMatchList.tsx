
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

  const groupedMatches = matches.reduce(
    (acc, match) => {
      const key = match.text;

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(match);

      return acc;
    },
    {} as Record<string, ProblematicWordMatch[]>
  );

  return (
    <ul className={cn("space-y-1", className)}>
      {Object.entries(groupedMatches).map(
        ([word, wordMatches]) => {
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
              data-word={word}
              data-match-count={count}
              data-positions={JSON.stringify(positions)}
              className="text-sm leading-relaxed text-foreground"
            >
              <span className="font-medium">
                &quot;{word}&quot;
              </span>

              {count > 1 && (
                <span className="text-muted-foreground">
                  {" "}({count} occurrences)
                </span>
              )}

              {firstMatch.matched_against !== firstMatch.text && (
                <span className="text-muted-foreground">
                  {" "}(matched: {firstMatch.matched_against})
                </span>
              )}
            </li>
          );
        }
      )}
    </ul>
  );
}
