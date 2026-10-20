
"use client";

import { useState } from "react";
import {
  Check,
  FileSearch,
  Filter,
  Pencil,
  Settings2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import type { EnrichedTool } from "@/app/(workspace)/_types/chat.types";
import { TOOL_KEYS } from "@/shared/lib/toolKeys";
import { MUTED_ACTION } from "../inputBarStyles";

interface ToolSelectorProps {
  tools: EnrichedTool[];
  /** The selected tool, or null for plain chat. */
  currentTool: EnrichedTool | null;
  onSelect: (key: string | null) => void;
  className?: string;
}

// Registry keys determine icons, but the registry
// remains the source of truth for tool labels.
const TOOL_ICONS = {
  [TOOL_KEYS.greenClaim]: FileSearch,
  [TOOL_KEYS.writer]: Pencil,
} as const;

function getToolIcon(key: string) {
  return TOOL_ICONS[key as keyof typeof TOOL_ICONS] ?? Settings2;
}

export function ToolSelector({
  tools,
  currentTool,
  onSelect,
  className,
}: ToolSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleToolSelect = (toolKey: string) => {
    if (!tools.some((tool) => tool.key === toolKey)) {
      return;
    }

    onSelect(toolKey);
    setOpen(false);
  };

  const CurrentToolIcon = currentTool
    ? getToolIcon(currentTool.key)
    : null;

  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${className ?? ""}`}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Choose tool"
            aria-expanded={open}
            className={`h-8 gap-2 rounded-full px-3 ${MUTED_ACTION} ${
              open ? "bg-muted" : ""
            }`}
          >
            <Filter
              className="size-4 shrink-0"
              aria-hidden="true"
            />
            <span>Tools</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          className="w-64 p-0"
        >
          <Command>
            <CommandInput placeholder="Search tools..." />

            <CommandList>
              <CommandEmpty>
                No tools found.
              </CommandEmpty>

              <CommandGroup>
                {tools.map((tool) => {
                  const ToolIcon = getToolIcon(tool.key);
                  const selected =
                    currentTool?.key === tool.key;

                  return (
                    <CommandItem
                      key={tool.key}
                      value={`${tool.label} ${tool.key}`}
                      onSelect={() =>
                        handleToolSelect(tool.key)
                      }
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <ToolIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />

                      <span className="min-w-0 flex-1 truncate">
                        {tool.label}
                      </span>

                      {selected && (
                        <Check
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {currentTool && CurrentToolIcon && (
        <div className="flex min-w-0 items-center gap-1 rounded-full border border-border bg-secondary py-1 pl-2.5 pr-1 text-xs text-secondary-foreground">
          <CurrentToolIcon
            className="size-3.5 shrink-0"
            aria-hidden="true"
          />

          <span
            className="min-w-0 max-w-40 truncate font-medium"
            title={currentTool.label}
          >
            {currentTool.label}
          </span>

          <button
            type="button"
            onClick={() => onSelect(null)}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Remove ${currentTool.label} tool`}
            title="Return to plain chat"
          >
            <X
              className="size-3.5"
              aria-hidden="true"
            />
          </button>
        </div>
      )}
    </div>
  );
}
