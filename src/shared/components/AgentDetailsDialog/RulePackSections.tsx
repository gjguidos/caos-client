
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  rulePackDescription,
  rulePackName,
  rulePackRules,
  type RulePack,
} from "@/store/slices/registry/rulePackSlice";

interface RulePackSectionsProps {
  rulePacks: RulePack[];
}

/**
 * Agent rule packs, displayed as collapsible sections.
 *
 * Each rule pack starts collapsed because its rules
 * table may contain substantial content.
 *
 * Multiple rule packs can be expanded independently.
 */
export function RulePackSections({
  rulePacks,
}: Readonly<RulePackSectionsProps>) {
  return (
    <Accordion
      type="multiple"
      className="w-full"
    >
      {rulePacks.map((rulePack) => {
        const rules = rulePackRules(rulePack);
        const description = rulePackDescription(rulePack);

        return (
          <AccordionItem
            key={rulePack.key}
            value={rulePack.key}
            className="border-border"
          >
            <AccordionTrigger className="py-3 text-left text-sm font-medium text-foreground hover:no-underline hover:text-primary">
              {rulePackName(rulePack)}
            </AccordionTrigger>

            <AccordionContent>
              <div className="flex flex-col gap-4 pb-2">
                {description && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                )}

                {rules.length > 0 ? (
                  <div className="overflow-hidden rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="w-[140px]">
                            ID
                          </TableHead>

                          <TableHead>
                            Description
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {rules.map((rule) => (
                          <TableRow
                            key={rule.id}
                            className="even:bg-muted/30"
                          >
                            <TableCell className="align-top font-mono text-xs text-muted-foreground">
                              {rule.id}
                            </TableCell>

                            <TableCell className="whitespace-normal break-words text-sm text-foreground">
                              {rule.description}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No rules attached to this rule pack.
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
