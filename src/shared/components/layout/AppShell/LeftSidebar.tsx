import { cn } from "@/shared/lib/utils";
import type { SidebarProps } from "./appShell.types";

export function LeftSidebar({
  children,
  header,
  footer,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col overflow-hidden border-r border-elevation-1-border bg-elevation-1 xl:pl-100",
        className
      )}
      aria-label="Global navigation panel"
    >
      {header && <div className="flex-shrink-0">{header}</div>}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {footer && <div className="flex-shrink-0">{footer}</div>}
    </aside>
  );
}
