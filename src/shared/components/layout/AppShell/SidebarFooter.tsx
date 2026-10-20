interface SidebarFooterProps {
  children: React.ReactNode;
}

export function SidebarFooter({ children }: SidebarFooterProps) {
  return (
    <div>
      <div className="mx-100 border-t border-elevation-1-border" />
      <div className="flex items-center justify-between p-100">{children}</div>
    </div>
  );
}
