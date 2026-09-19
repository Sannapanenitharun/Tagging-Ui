import { NextRequest, NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getAwsCredentials } from "@/lib/session-store";
import { tagAwsResources, untagAwsResources } from "@/lib/providers/aws";
import { validateTagSet } from "@/lib/validation";
import { jsonError, handleRouteError } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  const sessionId = await getSessionId();
  const creds = sessionId ? getAwsCredentials(sessionId) : null;
  if (!creds) return jsonError("Not connected to AWS.", 401);

  const body = await req.json().catch(() => null);
  const resourceArns: string[] = body?.resourceArns;
  const tags: Record<string, string> = body?.tags;
  if (!Array.isArray(resourceArns) || resourceArns.length === 0 || !tags || Object.keys(tags).length === 0) {
    return jsonError("resourceArns (non-empty array) and tags (non-empty object) are required.");
  }

  const validation = validateTagSet("aws", tags);
  if (!validation.valid) {
    return jsonError("Tag validation failed.", 422, JSON.stringify(validation.errors));
  }

  try {
    const result = await tagAwsResources(creds, resourceArns, tags);
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: NextRequest) {
  const sessionId = await getSessionId();
  const creds = sessionId ? getAwsCredentials(sessionId) : null;
  if (!creds) return jsonError("Not connected to AWS.", 401);

  const body = await req.json().catch(() => null);
  const resourceArns: string[] = body?.resourceArns;
  const tagKeys: string[] = body?.tagKeys;
  if (!Array.isArray(resourceArns) || resourceArns.length === 0 || !Array.isArray(tagKeys) || tagKeys.length === 0) {
    return jsonError("resourceArns and tagKeys (non-empty arrays) are required.");
  }

  try {
    const result = await untagAwsResources(creds, resourceArns, tagKeys);
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
