"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CaosV2Client,
  type V2ConnectionState,
} from "@/shared/websocket/caosV2";

type Communication = {
  client: CaosV2Client | null;
  owner: string | null;
  status: V2ConnectionState;
  error: string;
  connect: () => Promise<void>;
  disconnect: () => void;
};
const Context = createContext<Communication | null>(null);

/** Mounted once under SessionProvider. Navigation never creates a second socket. */
export function V2CommunicationProvider({
  owner,
  websocketBase,
  children,
}: {
  owner: string | null;
  websocketBase: string | null;
  children: ReactNode;
}) {
  return (
    <SessionCommunication
      key={owner ?? "signed-out"}
      owner={owner}
      websocketBase={websocketBase}
    >
      {children}
    </SessionCommunication>
  );
}

function SessionCommunication({
  owner,
  websocketBase,
  children,
}: {
  owner: string | null;
  websocketBase: string | null;
  children: ReactNode;
}) {
  const [client, setClient] = useState<CaosV2Client | null>(null);
  const [status, setStatus] = useState<V2ConnectionState>("idle");
  const [error, setError] = useState("");
  const [valid, setValid] = useState(true);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    let disposed = false;
    setClient(null);
    setStatus("idle");
    if (!owner || !websocketBase) return;
    const connection = new CaosV2Client(websocketBase, (state) => {
      if (disposed) return;
      setStatus(state);
      if (state === "denied") {
        setValid(false);
        setError(
          "Session revoked or connection denied. Sign in again; no requests were replayed."
        );
      }
    });
    setClient(connection);
    const dispose = () => {
      connection.close();
    };
    const logout = (event: MouseEvent) => {
      if ((event.target as Element)?.closest?.('a[href*="/api/auth/logout"]')) {
        setValid(false);
        dispose();
      }
    };
    // Detect logout/session replacement in another tab and expired cookies even when idle.
    let checking = false;
    const checkSession = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch("/api/caos/v2/session", {
          cache: "no-store",
          signal: AbortSignal.timeout(4000),
        });
        const data = response.ok ? await response.json() : null;
        if (!disposed && data?.owner !== owner) {
          dispose();
          setValid(false);
          setError("Session changed or expired. Sign in again.");
        }
      } catch {
        if (!disposed) {
          dispose();
          setError("Session check unavailable. Reconnect when available.");
        }
      } finally {
        checking = false;
      }
    };
    const interval = setInterval(() => void checkSession(), 5000);
    const visibility = () => {
      if (document.visibilityState === "visible") void checkSession();
    };
    window.addEventListener("pagehide", dispose);
    document.addEventListener("click", logout, true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      active.current = false;
      clearInterval(interval);
      window.removeEventListener("pagehide", dispose);
      document.removeEventListener("click", logout, true);
      document.removeEventListener("visibilitychange", visibility);
      connection.close();
    };
  }, [owner, websocketBase]);

  const connect = async () => {
    if (!valid || !client) return;
    setError("");
    try {
      await client.connect();
    } catch (reason) {
      if (active.current)
        setError(
          reason instanceof Error ? reason.message : "Connection failed"
        );
    }
  };
  return (
    <Context.Provider
      value={{
        client: valid ? client : null,
        owner: valid ? owner : null,
        status,
        error,
        connect,
        disconnect: () => client?.close(),
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useV2Communication() {
  const context = useContext(Context);
  if (!context) throw new Error("V2CommunicationProvider required");
  return context;
}
