
"use client";

import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Accordion } from "@/components/ui/accordion";

import type { GreenClaimResponse } from "../../../../_api/greenClaim.types";

import { GuidelinesSection } from "../_components/GuidelinesSection";
import { ProblematicWordsSection } from "../_components/ProblematicWordsSection";
import { ViolationAccordion } from "../_components/ViolationAccordion";

import {
  SourceTextHighlighter,
  type HighlightRange,
} from "./SourceTextHighlighter";

export interface GreenClaimModalProps {
  isOpen: boolean;
  onClose: () => void;

  /**
   * Original analyzed text.
   * Statements are matched against this exact source.
   */
  sourceText: string;

  data: GreenClaimResponse;
}

function generateStatementId(
  statement: string,
  index: number
): string {
  const slug = statement
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 30);

  return `statement-${slug}-${index}`;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds a statement within source text.
 *
 * Match priority:
 * 1. Exact match
 * 2. Case-insensitive match
 * 3. Flexible whitespace match
 */
function findStatementInSource(
  statement: string,
  sourceText: string,
  startFrom = 0
): { start: number; end: number } | null {
  const searchText =
    startFrom > 0
      ? sourceText.slice(startFrom)
      : sourceText;

  let index = searchText.indexOf(statement);

  if (index !== -1) {
    return {
      start: startFrom + index,
      end: startFrom + index + statement.length,
    };
  }

  const lowerSource = searchText.toLowerCase();
  const lowerStatement = statement.toLowerCase();

  index = lowerSource.indexOf(lowerStatement);

  if (index !== -1) {
    return {
      start: startFrom + index,
      end: startFrom + index + statement.length,
    };
  }

  const trimmedStatement = statement.trim();

  if (!trimmedStatement) {
    return null;
  }

  const flexiblePattern = escapeRegex(
    trimmedStatement
  ).replace(/\s+/g, "\\s+");

  const regex = new RegExp(flexiblePattern, "i");
  const match = searchText.match(regex);

  if (match && match.index !== undefined) {
    return {
      start: startFrom + match.index,
      end: startFrom + match.index + match[0].length,
    };
  }

  return null;
}

export function GreenClaimModal({
  isOpen,
  onClose,
  sourceText,
  data,
}: GreenClaimModalProps) {
  const [hoveredStatementId, setHoveredStatementId] =
    useState<string | null>(null);

  const [clickedStatementId, setClickedStatementId] =
    useState<string | null>(null);

  const activeStatementId =
    clickedStatementId ?? hoveredStatementId;

  // Keep statement IDs consistent between the
  // source highlighter and accordion entries.
  const statementsWithIds = useMemo(
    () =>
      data.green_claim_report.map((item, index) => ({
        item,
        id: generateStatementId(item.statement, index),
      })),
    [data.green_claim_report]
  );

  // Duplicate statements must match successive
  // occurrences rather than repeatedly matching
  // the first occurrence in the source.
  const statementHighlights = useMemo(() => {
    const lastEndByStatement = new Map<string, number>();

    return statementsWithIds.reduce<HighlightRange[]>(
      (acc, { item, id }) => {
        const startFrom =
          lastEndByStatement.get(item.statement) ?? 0;

        const position = findStatementInSource(
          item.statement,
          sourceText,
          startFrom
        );

        if (position) {
          lastEndByStatement.set(
            item.statement,
            position.end
          );

          acc.push({
            start: position.start,
            end: position.end,
            statementId: id,
          });
        }

        return acc;
      },
      []
    );
  }, [statementsWithIds, sourceText]);

  const hasViolations =
    data.green_claim_report.length > 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="
          flex h-[90dvh] w-[95vw] max-w-[75em]
          flex-col gap-0 overflow-hidden p-0
          sm:max-w-[75em]
        "
        aria-describedby="green-claim-theater-description"
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="text-xl font-semibold">
            Green Claim Analysis
          </DialogTitle>

          <DialogDescription
            id="green-claim-theater-description"
            className="sr-only"
          >
            Compare the original source text with the
            green claim analysis and highlighted statements.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-2">
          {/* Left: original source text */}
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-border md:border-b-0 md:border-r">
            <div className="shrink-0 space-y-2 px-6 py-4">
              <h3 className="text-lg font-semibold text-foreground">
                Original Text
              </h3>

              <p className="text-sm leading-relaxed text-muted-foreground">
                Click or hover over statements on the right
                to highlight and scroll to them here.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
              <div className="min-h-full rounded-lg bg-muted/50 p-4">
                {sourceText ? (
                  <SourceTextHighlighter
                    text={sourceText}
                    highlights={statementHighlights}
                    activeStatementId={activeStatementId}
                    scrollToStatementId={clickedStatementId}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Source text not available
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Right: analysis */}
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="shrink-0 px-6 py-4">
              <h3 className="text-lg font-semibold text-foreground">
                Analysis
              </h3>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pb-6">
              <ProblematicWordsSection
                problematicWords={data.problematic_words}
              />

              {hasViolations && (
                <section className="space-y-4">
                  <h4 className="text-base font-semibold text-foreground">
                    Problematic statements
                  </h4>

                  <Accordion
                    type="single"
                    collapsible
                    className="w-full"
                  >
                    {statementsWithIds.map(
                      ({ item, id }, index) => (
                        <ViolationAccordion
                          key={id}
                          statement={item}
                          index={index}
                          onStatementHover={
                            setHoveredStatementId
                          }
                          onStatementClick={
                            setClickedStatementId
                          }
                          statementId={id}
                        />
                      )
                    )}
                  </Accordion>
                </section>
              )}

              {!hasViolations && (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No violations detected. Your content
                    appears to comply with green claim
                    guidelines.
                  </p>
                </div>
              )}

              <GuidelinesSection
                guidelines={data.guidelines}
              />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
