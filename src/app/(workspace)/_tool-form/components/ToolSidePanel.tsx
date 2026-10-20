
"use client";

import type { ReactElement, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ToolSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: string;
  description?: string;

  children: ReactNode;

  footer?: ReactElement | null;
};

export function ToolSidePanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: ToolSidePanelProps) {
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <SheetTitle>{title}</SheetTitle>

          {description && (
            <SheetDescription>
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        <SheetFooter className="shrink-0 border-t px-5 py-4">
          {footer ?? (
            <Button
              type="button"
              onClick={close}
              className="w-full"
            >
              Done
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
