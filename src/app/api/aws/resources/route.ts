import { NextRequest, NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getAwsCredentials } from "@/lib/session-store";
import { listAwsResources, listAwsTagKeys } from "@/lib/providers/aws";
import { jsonError, handleRouteError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const sessionId = await getSessionId();
  const creds = sessionId ? getAwsCredentials(sessionId) : null;
  if (!creds) return jsonError("Not connected to AWS.", 401);

  const params = req.nextUrl.searchParams;
  const nextToken = params.get("nextToken") ?? undefined;
  const resourceTypeFilters = params.get("resourceTypeFilters")?.split(",").filter(Boolean);
  const tagKey = params.get("tagKey") ?? undefined;
  const tagValue = params.get("tagValue") ?? undefined;

  try {
    const { resources, nextToken: newToken } = await listAwsResources(creds, {
      resourceTypeFilters,
      nextToken,
      tagFilters: tagKey ? [{ Key: tagKey, Values: tagValue ? [tagValue] : undefined }] : undefined,
    });

    const tagKeys = await listAwsTagKeys(creds).catch(() => []);

    return NextResponse.json({ resources, nextToken: newToken, tagKeys });
  } catch (err) {
    return handleRouteError(err);
  }
}
