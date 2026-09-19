import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { setAwsCredentials } from "@/lib/session-store";
import { verifyAwsCredentials, AWS_REGIONS } from "@/lib/providers/aws";
import { jsonError } from "@/lib/api-utils";
import type { AwsConnectionSummary } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.accessKeyId || !body?.secretAccessKey || !body?.region) {
    return jsonError("accessKeyId, secretAccessKey, and region are required.");
  }
  if (!AWS_REGIONS.includes(body.region)) {
    return jsonError(`Unknown region "${body.region}".`);
  }

  try {
    const identity = await verifyAwsCredentials({
      accessKeyId: body.accessKeyId,
      secretAccessKey: body.secretAccessKey,
      sessionToken: body.sessionToken || undefined,
      region: body.region,
    });

    const summary: AwsConnectionSummary = {
      provider: "aws",
      accountId: identity.accountId,
      arn: identity.arn,
      region: body.region,
      connectedAt: new Date().toISOString(),
    };

    const sessionId = await getOrCreateSessionId();
    setAwsCredentials(sessionId, {
      accessKeyId: body.accessKeyId,
      secretAccessKey: body.secretAccessKey,
      sessionToken: body.sessionToken || undefined,
      region: body.region,
      summary,
    });

    return NextResponse.json(summary);
  } catch (err) {
    return jsonError("Could not verify AWS credentials.", 401, (err as Error).message);
  }
}
