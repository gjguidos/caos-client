export interface AppShellProps {
  children: React.ReactNode;
  leftSidebar?: React.ReactNode;
  leftSidebarHeader?: React.ReactNode;
  leftSidebarFooter?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  rightSidebarHeader?: React.ReactNode;
  rightSidebarFooter?: React.ReactNode;
  fullWidth?: boolean; // If true, content uses full width without grid
  className?: string;
  leftSidebarClassName?: string;
  rightSidebarClassName?: string;
  workingAreaClassName?: string;
  gridClassName?: string;
}

export interface SidebarProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export interface WorkingAreaProps {
  children: React.ReactNode;
  className?: string;
}
