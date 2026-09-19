import { NextRequest, NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getGcpCredentials } from "@/lib/session-store";
import { listGcpResources } from "@/lib/providers/gcp";
import { jsonError, handleRouteError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const sessionId = await getSessionId();
  const creds = sessionId ? getGcpCredentials(sessionId) : null;
  if (!creds) return jsonError("Not connected to GCP.", 401);

  const params = req.nextUrl.searchParams;
  const assetTypes = params.get("assetTypes")?.split(",").filter(Boolean);
  const query = params.get("query") ?? undefined;
  const pageToken = params.get("pageToken") ?? undefined;

  try {
    const { resources, nextPageToken } = await listGcpResources(creds, { assetTypes, query, pageToken });
    return NextResponse.json({ resources, nextPageToken });
  } catch (err) {
    return handleRouteError(err);
  }
}
