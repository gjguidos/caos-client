
"use client";

import { useState } from "react";
import { Check, ClipboardCopy, Expand } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
} from "@/components/ui/accordion";

import { useClipboard } from "@/shared/hooks/useClipboard";
import { cn } from "@/shared/lib/utils";

import { GuidelinesSection } from "./_components/GuidelinesSection";
import { ProblematicWordsSection } from "./_components/ProblematicWordsSection";
import { ViolationAccordion } from "./_components/ViolationAccordion";
import { GreenClaimModal } from "./GreenClaimModal/GreenClaimModal";

import type { GreenClaimWidgetProps } from "./greenClaimWidget.types";

export default function GreenClaimWidget({
  data,
  className,
  sourceText,
}: GreenClaimWidgetProps) {
  const { copyAsPlainText, copied } = useClipboard();
  const [isTheaterOpen, setIsTheaterOpen] = useState(false);

  const hasViolations = data.green_claim_report.length > 0;
  const copyButtonLabel = copied ? "Copied!" : "Copy report";

  return (
    <>
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-6 shadow-sm",
          className
        )}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Green Claim Report
          </h2>

          <div className="flex shrink-0 items-center gap-2">
            {data.formatted_report && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() =>
                  copyAsPlainText(data.formatted_report ?? "")
                }
                aria-label={copyButtonLabel}
                title={copyButtonLabel}
              >
                {copied ? (
                  <Check
                    className="size-4"
                    aria-hidden="true"
                  />
                ) : (
                  <ClipboardCopy
                    className="size-4"
                    aria-hidden="true"
                  />
                )}
              </Button>
            )}

            {sourceText && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setIsTheaterOpen(true)}
                aria-label="Expand view"
                title="Expand view"
              >
                <Expand
                  className="size-4"
                  aria-hidden="true"
                />
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-[600px] space-y-6 overflow-y-auto">
          <ProblematicWordsSection
            problematicWords={data.problematic_words}
          />

          {hasViolations && (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Problematic statements
              </h3>

              <Accordion
                type="single"
                collapsible
                className="w-full"
              >
                {data.green_claim_report.map((statement, index) => (
                  <ViolationAccordion
                    key={index}
                    statement={statement}
                    index={index}
                  />
                ))}
              </Accordion>
            </section>
          )}

          {!hasViolations && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No violations detected. Your content appears to
                comply with green claim guidelines.
              </p>
            </div>
          )}

          <GuidelinesSection
            guidelines={data.guidelines}
          />
        </div>
      </div>

      {sourceText && (
        <GreenClaimModal
          isOpen={isTheaterOpen}
          onClose={() => setIsTheaterOpen(false)}
          sourceText={sourceText}
          data={data}
        />
      )}
    </>
  );
}
