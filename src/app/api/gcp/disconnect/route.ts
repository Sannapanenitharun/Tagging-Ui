import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { clearGcp } from "@/lib/session-store";

export async function POST() {
  const sessionId = await getSessionId();
  if (sessionId) clearGcp(sessionId);
  return NextResponse.json({ ok: true });
}
