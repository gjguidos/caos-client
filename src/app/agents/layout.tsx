import RegistryBootstrap from "@/app/RegistryBootstrap";

/**
 * Registries for the agent editors. These routes are full-screen build mode -
 * you enter to do one job and leave - so they deliberately skip the app chrome.
 */
export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RegistryBootstrap>{children}</RegistryBootstrap>;
}
