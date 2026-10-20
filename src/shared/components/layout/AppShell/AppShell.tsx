import { cn } from "@/shared/lib/utils";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { WorkingArea } from "./WorkingArea";
import type { AppShellProps } from "./appShell.types";

export function AppShell({
  children,
  leftSidebar,
  leftSidebarHeader,
  leftSidebarFooter,
  rightSidebar,
  rightSidebarHeader,
  rightSidebarFooter,
  fullWidth,
  className,
  leftSidebarClassName,
  rightSidebarClassName,
  workingAreaClassName,
  gridClassName,
}: AppShellProps) {
  // no grid, content uses entire width
  if (fullWidth) {
    return (
      <div className={cn("mx-auto w-full max-w-[1400px] px-100", className)}>
        <div className="h-screen w-full">{children}</div>
      </div>
    );
  }

  //  grid mode with dynamic columns based on which sidebars are present
  const getGridTemplateColumns = () => {
    const columns = [];
    if (leftSidebar) columns.push("280px");
    columns.push("minmax(600px, 1fr)"); // Working area always present
    if (rightSidebar) columns.push("320px");
    return columns.join(" ");
  };

  const gridTemplateColumns = getGridTemplateColumns();

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1400px] px-100 xl:max-w-none xl:px-0",
        className
      )}
    >
      <div
        className={cn("grid h-screen max-h-screen gap-skapa-md", gridClassName)}
        style={{ gridTemplateColumns }}
      >
        {leftSidebar && (
          <LeftSidebar
            header={leftSidebarHeader}
            footer={leftSidebarFooter}
            className={leftSidebarClassName}
          >
            {leftSidebar}
          </LeftSidebar>
        )}
        <WorkingArea className={workingAreaClassName}>{children}</WorkingArea>
        {rightSidebar && (
          <RightSidebar
            header={rightSidebarHeader}
            footer={rightSidebarFooter}
            className={rightSidebarClassName}
          >
            {rightSidebar}
          </RightSidebar>
        )}
      </div>
    </div>
  );
}
