import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { setGcpCredentials } from "@/lib/session-store";
import { verifyGcpCredentials } from "@/lib/providers/gcp";
import { jsonError } from "@/lib/api-utils";
import type { GcpConnectionSummary } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.serviceAccountJson) {
    return jsonError("serviceAccountJson is required.");
  }

  let key: Record<string, unknown>;
  try {
    key = JSON.parse(body.serviceAccountJson);
  } catch {
    return jsonError("serviceAccountJson is not valid JSON.");
  }

  const projectId = (body.projectId as string | undefined) || (key.project_id as string | undefined);
  if (!projectId) {
    return jsonError("projectId is required (or must be present in the service account JSON as project_id).");
  }

  try {
    const { serviceAccountEmail } = await verifyGcpCredentials(key, projectId);

    const summary: GcpConnectionSummary = {
      provider: "gcp",
      projectId,
      serviceAccountEmail,
      connectedAt: new Date().toISOString(),
    };

    const sessionId = await getOrCreateSessionId();
    setGcpCredentials(sessionId, { serviceAccountKey: key, projectId, summary });

    return NextResponse.json(summary);
  } catch (err) {
    return jsonError("Could not verify GCP credentials.", 401, (err as Error).message);
  }
}
