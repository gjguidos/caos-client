
"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { cn } from "@/shared/lib/utils";

import type { StructuredSoul } from "../CreateAgentForm/soul";

interface SoulInspectorDialogProps {
  open: boolean;
  onClose: () => void;
  soul: StructuredSoul | null;
}

type InspectorTab = "profile" | "json";

export default function SoulInspectorDialog({
  open,
  onClose,
  soul,
}: SoulInspectorDialogProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);

  const [activeTab, setActiveTab] =
    useState<InspectorTab>("profile");

  const [copied, setCopied] = useState(false);

  const displaySoul = soul ?? {};
  const categories = Object.keys(displaySoul);

  const activeCategory =
    selectedCategory &&
    categories.includes(selectedCategory)
      ? selectedCategory
      : (categories[0] ?? null);

  const jsonContent = JSON.stringify(displaySoul, null, 2);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonContent);

      setCopied(true);
    } catch (error) {
      console.error("Failed to copy soul JSON:", error);
      setCopied(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
          setCopied(false);
        }
      }}
    >
      <DialogContent className="flex h-[85dvh] w-[95vw] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="text-lg font-semibold">
            Soul Inspector
          </DialogTitle>

          <DialogDescription>
            View traits for this soul profile.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as InspectorTab);
            setCopied(false);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="shrink-0 border-b border-border px-6">
            <TabsList className="grid w-full grid-cols-2 bg-transparent p-0">
              <TabsTrigger
                value="profile"
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 py-3",
                  "data-[state=active]:border-primary",
                  "data-[state=active]:bg-transparent",
                  "data-[state=active]:text-primary",
                  "data-[state=active]:shadow-none"
                )}
              >
                Profile
              </TabsTrigger>

              <TabsTrigger
                value="json"
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 py-3",
                  "data-[state=active]:border-primary",
                  "data-[state=active]:bg-transparent",
                  "data-[state=active]:text-primary",
                  "data-[state=active]:shadow-none"
                )}
              >
                JSON
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Structured profile */}
          <TabsContent
            value="profile"
            className="mt-0 min-h-0 flex-1 overflow-hidden"
          >
            <div className="flex h-full min-h-0 flex-col md:grid md:grid-cols-[240px_minmax(0,1fr)]">
              {/* Category navigation */}
              <div className="shrink-0 border-b border-border p-3 md:min-h-0 md:border-b-0 md:border-r">
                <ScrollArea className="max-h-32 md:h-full md:max-h-none">
                  <nav
                    className="flex flex-col gap-1 pr-2"
                    aria-label="Soul profile categories"
                  >
                    {categories.map((category) => {
                      const isActive =
                        activeCategory === category;

                      const categoryData =
                        displaySoul[
                          category as keyof typeof displaySoul
                        ];

                      const count =
                        categoryData &&
                        typeof categoryData === "object"
                          ? Object.keys(categoryData).length
                          : 0;

                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() =>
                            setSelectedCategory(category)
                          }
                          aria-current={
                            isActive ? "true" : undefined
                          }
                          className={cn(
                            "group flex w-full items-center justify-between gap-3",
                            "rounded-md border-l-4 px-3 py-2 text-left",
                            "transition-colors",
                            "focus-visible:outline-none",
                            "focus-visible:ring-2 focus-visible:ring-ring",
                            isActive
                              ? "border-primary bg-primary/10"
                              : "border-transparent hover:bg-muted"
                          )}
                        >
                          <span
                            className={cn(
                              "min-w-0 truncate text-sm text-foreground",
                              isActive && "font-semibold"
                            )}
                          >
                            {humanize(category)}
                          </span>

                          <Badge
                            variant="secondary"
                            className="shrink-0"
                          >
                            {count}
                          </Badge>
                        </button>
                      );
                    })}
                  </nav>
                </ScrollArea>
              </div>

              {/* Category properties */}
              <div className="min-h-0 min-w-0 flex-1 p-4">
                {activeCategory ? (
                  <ScrollArea className="h-full w-full">
                    <div className="grid grid-cols-1 gap-4 py-2 pr-3 sm:grid-cols-2">
                      {Object.entries(
                        displaySoul[
                          activeCategory as keyof typeof displaySoul
                        ] ?? {}
                      ).map(([key, value]) => {
                        const displayValue =
                          formatSoulValue(value);

                        const fieldId =
                          `soul-${activeCategory}-${key}`;

                        return (
                          <div
                            key={key}
                            className="min-w-0 space-y-2"
                          >
                            <Label
                              htmlFor={fieldId}
                              className="text-sm font-medium"
                            >
                              {humanize(key)}
                            </Label>

                            {displayValue.length > 80 ? (
                              <Textarea
                                id={fieldId}
                                value={displayValue}
                                rows={4}
                                readOnly
                                className="resize-y font-mono text-xs"
                              />
                            ) : (
                              <Input
                                id={fieldId}
                                type="text"
                                value={displayValue}
                                readOnly
                                className="w-full"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      No soul profile data available.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* JSON inspector */}
          <TabsContent
            value="json"
            className="relative mt-0 min-h-0 flex-1 overflow-hidden"
          >
            <div className="absolute right-4 top-4 z-10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleCopyJson()}
                aria-label="Copy JSON to clipboard"
                className="gap-2"
              >
                {copied ? (
                  <Check
                    className="size-4"
                    aria-hidden="true"
                  />
                ) : (
                  <Copy
                    className="size-4"
                    aria-hidden="true"
                  />
                )}

                {copied ? "Copied" : "Copy JSON"}
              </Button>
            </div>

            <ScrollArea className="h-full w-full">
              <div className="p-4 pt-16">
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground">
                  <code>{jsonContent}</code>
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Converts structured soul values into readable text.
 */
function formatSoulValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (value !== null && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return value == null ? "" : String(value);
}

function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
