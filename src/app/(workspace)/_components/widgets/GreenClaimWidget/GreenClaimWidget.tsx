
"use client";

import { useState } from "react";
import { Check, Clipboard, Expand } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useClipboard } from "@/shared/hooks/useClipboard";
import { cn } from "@/shared/lib/utils";

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
      <Card className={cn("w-full", className)}>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-xl font-semibold">
            Green Claim Report
          </CardTitle>

          <div className="flex shrink-0 items-center gap-2">
            {data.formatted_report && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  copyAsPlainText(data.formatted_report ?? "")
                }
                aria-label={copyButtonLabel}
                title={copyButtonLabel}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Clipboard className="size-4" />
                )}
              </Button>
            )}

            {sourceText && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsTheaterOpen(true)}
                aria-label="Expand view"
                title="Expand view"
              >
                <Expand className="size-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="max-h-[600px] space-y-6 overflow-y-auto">
          <ProblematicWordsSection
            problematicWords={data.problematic_words}
          />

          {hasViolations ? (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold tracking-tight">
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
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No violations detected. Your content appears
                to comply with green claim guidelines.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
