"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/Dialog/Dialog";
import {
  rulePackDescription,
  rulePackName,
  rulePackRules,
  type RulePack,
} from "@/store/slices/registry/rulePackSlice";

interface RulePackPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  rulepackName?: string; // string key used in the registry (for fallback label)
  details?: RulePack | null;
  isLoading?: boolean;
  error?: string | null;
}

export default function RulePackPreviewDialog({
  open,
  onClose,
  rulepackName,
  details,
  isLoading = false,
  error = null,
}: RulePackPreviewDialogProps) {
  const title = details
    ? rulePackName(details)
    : (rulepackName ?? "Unknown rule pack");

  const description = details
    ? (rulePackDescription(details) ?? "No description available.")
    : "No description available.";

  const rules = details ? rulePackRules(details) : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="max-w-6xl bg-white">
        <DialogHeader>
          <DialogTitle>Rule Pack: {title}</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading rule pack…</p>
        )}

        {error && !isLoading && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!isLoading && !error && details && (
          <div className="max-h-80 space-y-3 overflow-y-auto">
            <p className="text-sm text-muted-foreground">{description}</p>

            <div className="space-y-2">
              {rules.length > 0 ? (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="rounded-md bg-muted/60 p-2 text-sm"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-xs">{rule.id}</span>
                      {rule.severity && (
                        <span className="rounded bg-background px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                          {rule.severity}
                        </span>
                      )}
                    </div>
                    <p>{rule.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  This rule pack has no rules attached.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
