/** @type {import('next').NextConfig} */
// Treat the environment as "local" only when APP_ENV is explicitly set to 'local'
const isLocal = process.env.APP_ENV === "local";

const nextConfig = {
  // Produce a standalone output suitable for Docker standalone runtime
  output: "standalone",

  // Ensure /env.js is not cached by browsers or CDNs so runtime public envs are always fresh
  async headers() {
    return [
      {
        source: "/env.js",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
  // Show dev indicators only in local developer environment
  devIndicators: isLocal
    ? {
        position: "bottom-right",
      }
    : false,
  // The admin section was folded into the workspace; keep old bookmarks working.
  // Non-permanent so the mapping stays ours to change.
  async redirects() {
    return [
      { source: "/admin", destination: "/", permanent: false },
      { source: "/admin/agents", destination: "/", permanent: false },
      {
        source: "/admin/create-agent",
        destination: "/agents/new",
        permanent: false,
      },
      {
        source: "/admin/edit-agent/:agentId",
        destination: "/agents/:agentId/edit",
        permanent: false,
      },
      {
        source: "/admin/workflows",
        destination: "/workflows",
        permanent: false,
      },
      // Listed before `:id` so the literal segment wins.
      {
        source: "/admin/workflows/new",
        destination: "/workflows/new",
        permanent: false,
      },
      {
        source: "/admin/workflows/:id",
        destination: "/workflows/:id",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const serverBase =
      process.env.NEXT_SERVER_BASE_URL || "http://agentverse:8000"; // production should set NEXT_SERVER_BASE_URL

    // TEMP DEBUG: print which server base is being used during build/start (remove after verification)
    try {
      // Only print a short, non-sensitive value

      console.log(
        "[next.config] NEXT_SERVER_BASE_URL:",
        process.env.NEXT_SERVER_BASE_URL
          ? "(set)"
          : "(not set, using agentverse)"
      );
    } catch (e) {}
    // If NEXT_SERVER_BASE_URL is set (production), do not add a Docker-only rewrite.
    // This prevents baking the Docker service name `agentverse` into production builds.
    if (serverBase) {
      // No rewrite in production — server code should use NEXT_SERVER_BASE_URL directly.
      return [];
    }

    // Local/dev fallback for docker-compose where service name 'agentverse' is resolvable
    return [
      {
        source: "/api/:path*",
        destination: "http://agentverse:8000/:path*",
      },
    ];
  },

  turbopack: {},

  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
