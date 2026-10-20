
"use client";

import { cn } from "@/shared/lib/utils";
import { slugifyString } from "@/shared/lib/slugifyString";

import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

import type { ViolationAccordionProps } from "../greenClaimWidget.types";
import { ViolationDetails } from "./ViolationDetails";

export function ViolationAccordion({
  statement,
  index,
  className,
  onStatementHover,
  onStatementClick,
  statementId,
}: ViolationAccordionProps) {
  const accordionId = `violation-${slugifyString(
    statement.statement.substring(0, 30)
  )}-${index}`;

  const handleMouseEnter = () => {
    if (onStatementHover && statementId) {
      onStatementHover(statementId);
    }
  };

  const handleMouseLeave = () => {
    onStatementHover?.(null);
  };

  const handleClick = () => {
    if (onStatementClick && statementId) {
      onStatementClick(statementId);
    }
  };

  return (
    <AccordionItem
      value={accordionId}
      className={cn("border-b", className)}
    >
      <AccordionTrigger
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="text-left text-sm font-medium hover:no-underline"
      >
        {statement.statement}
      </AccordionTrigger>

      <AccordionContent>
        <div className="flex flex-col gap-6 pt-4">
          {statement.principles_violated.map((violation, idx) => (
            <ViolationDetails
              key={idx}
              violation={violation}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
