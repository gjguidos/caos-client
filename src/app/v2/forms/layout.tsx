import RegistryBootstrap from "@/app/RegistryBootstrap";

export default function FormAgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RegistryBootstrap>{children}</RegistryBootstrap>;
}
