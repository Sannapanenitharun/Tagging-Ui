import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const COOKIE_NAME = "tagging_ui_session";

/**
 * Returns the current session id, creating and persisting a new one (via an
 * httpOnly cookie) if none exists yet. Route Handlers may set cookies, so
 * this is safe to call from any `route.ts`.
 */
export async function getOrCreateSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const id = randomUUID();
  jar.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return id;
}

/** Read-only lookup for handlers that should not create a session as a side effect. */
export async function getSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}
