import { NextRequest, NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getGcpCredentials } from "@/lib/session-store";
import { applyGcpLabels, removeGcpLabels } from "@/lib/providers/gcp";
import { validateTagSet } from "@/lib/validation";
import { jsonError, handleRouteError } from "@/lib/api-utils";

interface Target {
  id: string;
  rawType: string;
}

export async function POST(req: NextRequest) {
  const sessionId = await getSessionId();
  const creds = sessionId ? getGcpCredentials(sessionId) : null;
  if (!creds) return jsonError("Not connected to GCP.", 401);

  const body = await req.json().catch(() => null);
  const targets: Target[] = body?.targets;
  const tags: Record<string, string> = body?.tags;
  if (!Array.isArray(targets) || targets.length === 0 || !tags || Object.keys(tags).length === 0) {
    return jsonError("targets (non-empty array of {id, rawType}) and tags (non-empty object) are required.");
  }

  const validation = validateTagSet("gcp", tags);
  if (!validation.valid) {
    return jsonError("Label validation failed.", 422, JSON.stringify(validation.errors));
  }

  try {
    const result = await applyGcpLabels(creds, targets, tags);
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: NextRequest) {
  const sessionId = await getSessionId();
  const creds = sessionId ? getGcpCredentials(sessionId) : null;
  if (!creds) return jsonError("Not connected to GCP.", 401);

  const body = await req.json().catch(() => null);
  const targets: Target[] = body?.targets;
  const tagKeys: string[] = body?.tagKeys;
  if (!Array.isArray(targets) || targets.length === 0 || !Array.isArray(tagKeys) || tagKeys.length === 0) {
    return jsonError("targets and tagKeys (non-empty arrays) are required.");
  }

  try {
    const result = await removeGcpLabels(creds, targets, tagKeys);
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
