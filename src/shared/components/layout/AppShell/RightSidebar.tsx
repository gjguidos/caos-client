import { cn } from "@/shared/lib/utils";
import type { SidebarProps } from "./appShell.types";

export function RightSidebar({
  children,
  header,
  footer,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        // No right padding here: the rail reaches the window edge so its
        // scrollbar sits against it. The gutter belongs inside the scroll
        // container, on the content.
        "flex h-full flex-col overflow-hidden border-l border-elevation-1-border bg-elevation-1",
        className
      )}
      aria-label="Properties panel"
    >
      {header && <div className="flex-shrink-0">{header}</div>}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {footer && <div className="flex-shrink-0">{footer}</div>}
    </aside>
  );
}
