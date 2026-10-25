import { V2CommunicationProvider } from "@/shared/communication-v2/Provider";
import {
  v2SessionOwner,
  v2WebsocketBase,
} from "@/shared/communication-v2/session-owner";
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
  const owner = v2SessionOwner(session);
  // Local Genesis retains a bearer server-side; it must not enter the RSC payload.
  const browserSession = session
    ? {
        sub: session.sub,
        name: session.name,
        preferred_username: session.preferred_username,
        homeAccountId: session.homeAccountId,
        roles: session.roles,
      }
    : null;

  return (
    <html
      lang="en"
      data-caos-theme="core"
      suppressHydrationWarning={true}
      data-css-scope
    >
      <head>
        {/* Runtime-injected public env values. Generated at container start as /public/env.js.
            Deliberately synchronous: client code reads these values during hydration, so
            deferring the script would let the app boot against an empty config. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/env.js" />
      </head>
      <body className="flex h-screen flex-col overflow-hidden bg-background antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SessionProvider session={browserSession}>
            <V2CommunicationProvider
              owner={owner}
              websocketBase={v2WebsocketBase()}
            >
              <ReduxProvider>
                <TooltipProvider delayDuration={200}>
                  {children}
                  <ToastContainer />
                </TooltipProvider>
              </ReduxProvider>
            </V2CommunicationProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
