import "@/design-system/globals.css";
import { ThemeProvider } from "@/shared/components/theme/ThemeProvider";
import { ToastContainer } from "@/shared/components/Toast/ToastContainer";
import { TooltipProvider } from "@/shared/components/Tooltip/Tooltip";
import { getServerSession } from "@/shared/auth/lib/session";
import ReduxProvider from "@/providers/ReduxProvider";
import { SessionProvider } from "@/shared/auth/SessionProvider";
export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props;

  const session = await getServerSession();

  return (
    <html lang="en" data-caos-theme="core" suppressHydrationWarning={true} data-css-scope>
      <head>
        {/* Runtime-injected public env values. Generated at container start as /public/env.js.
            Deliberately synchronous: client code reads these values during hydration, so
            deferring the script would let the app boot against an empty config. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/env.js" />
      </head>
      <body className="flex h-screen flex-col overflow-hidden bg-background antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SessionProvider session={session}>
            <ReduxProvider>
              <TooltipProvider delayDuration={200}>
                {children}
                <ToastContainer />
              </TooltipProvider>
            </ReduxProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
