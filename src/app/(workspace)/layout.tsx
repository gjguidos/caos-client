"use client";

import { useRenderPath } from "@/app/(workspace)/_hooks/useRenderPath";
import { useToolForm } from "@/app/(workspace)/_tool-form/hooks/useToolForm";
import { PropertiesPanel } from "@/app/(workspace)/_tool-form/PropertiesPanel";
import RegistryBootstrap from "@/app/RegistryBootstrap";
import { WorkspaceChrome } from "@/shared/components/layout/WorkspaceChrome/WorkspaceChrome";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RegistryBootstrap>
      <WorkspaceChromeWithProperties>{children}</WorkspaceChromeWithProperties>
    </RegistryBootstrap>
  );
}

/**
 * The workspace's flavour of the shared chrome: the same shell every browsing
 * surface wears, plus the tool-form properties panel in the right rail. That
 * panel is a workspace concern, so it is resolved here rather than inside the
 * chrome, which the workflow catalog renders too.
 */
function WorkspaceChromeWithProperties({
  children,
}: {
  children: React.ReactNode;
}) {
  const { uiComponents } = useToolForm();
  const hasPropertiesPanel =
    useRenderPath("propertiesPanel", uiComponents).length > 0;

  return (
    <WorkspaceChrome
      rightSidebar={hasPropertiesPanel ? <PropertiesPanel /> : undefined}
    >
      {children}
    </WorkspaceChrome>
  );
}
