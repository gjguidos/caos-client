import RegistryBootstrap from "@/app/RegistryBootstrap";

/**
 * Registries for the whole workflows tree. Chrome is deliberately not applied
 * here: the catalog opts into the app shell via `(catalog)`, while the builder
 * routes stay full-screen.
 */
export default function WorkflowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RegistryBootstrap>{children}</RegistryBootstrap>;
}
