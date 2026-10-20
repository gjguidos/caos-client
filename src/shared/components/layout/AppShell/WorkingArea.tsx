import { cn } from "@/shared/lib/utils";
import type { WorkingAreaProps } from "./appShell.types";

export function WorkingArea({ children, className }: WorkingAreaProps) {
  return (
    <main
      className={cn(
        "flex w-full min-w-0 flex-col overflow-y-auto bg-neutral-1",
        className
      )}
      aria-label="Main content"
    >
      {children}
    </main>
  );
}
