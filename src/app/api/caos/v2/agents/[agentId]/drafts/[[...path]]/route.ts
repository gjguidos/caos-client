import { proxyAgentDrafts } from "@/shared/auth/lib/agent-drafts";
export const runtime = "nodejs";

type Context = { params: Promise<{ agentId: string; path?: string[] }> };

async function handle(
  req: Request,
  context: Context,
  method: "GET" | "POST" | "PATCH"
) {
  const { agentId, path = [] } = await context.params;
  return proxyAgentDrafts(req, agentId, path, method);
}

export function GET(req: Request, context: Context) {
  return handle(req, context, "GET");
}

export function POST(req: Request, context: Context) {
  return handle(req, context, "POST");
}

export function PATCH(req: Request, context: Context) {
  return handle(req, context, "PATCH");
}
