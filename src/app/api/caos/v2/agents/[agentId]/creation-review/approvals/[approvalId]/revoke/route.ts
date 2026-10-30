import { proxyCreationReview } from "@/shared/auth/lib/agent-creation-review";
export const runtime = "nodejs";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ agentId: string; approvalId: string }> }
) {
  const { agentId, approvalId } = await params;
  return proxyCreationReview(req, agentId, "revoke", approvalId);
}
