export type PublicEnv = Readonly<{
  NEXT_PUBLIC_API_BASE: string;
  NEXT_PUBLIC_APP_VERSION: string;
}>;

export function readPublicEnv(): PublicEnv {
  const e = (globalThis as any).__ENV__ ?? {};
  // Prefer runtime-injected value, fall back to build-time NEXT_PUBLIC_API_BASE, then empty string
  const runtimeVal = e.NEXT_PUBLIC_API_BASE;
  const buildVal =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE
      : undefined;
  const runtimeValVersion = e.NEXT_PUBLIC_APP_VERSION;
  const buildValVersion =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_APP_VERSION
      : undefined;
  return {
    NEXT_PUBLIC_API_BASE: runtimeVal ?? buildVal ?? "",
    NEXT_PUBLIC_APP_VERSION: runtimeValVersion ?? buildValVersion ?? "",
  };
}

export default readPublicEnv;
