import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getStatus } from "@/lib/session-store";
import type { SessionStatus } from "@/lib/types";

export async function GET() {
  const sessionId = await getSessionId();
  const status: SessionStatus = sessionId ? getStatus(sessionId) : { aws: null, gcp: null };
  return NextResponse.json(status);
}
