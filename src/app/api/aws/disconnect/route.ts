import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { clearAws } from "@/lib/session-store";

export async function POST() {
  const sessionId = await getSessionId();
  if (sessionId) clearAws(sessionId);
  return NextResponse.json({ ok: true });
}
