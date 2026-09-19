import { NextResponse } from "next/server";
import type { ApiError } from "./types";

export function jsonError(message: string, status = 400, details?: string): NextResponse<ApiError> {
  return NextResponse.json({ error: message, details }, { status });
}

export function handleRouteError(err: unknown): NextResponse<ApiError> {
  const message = err instanceof Error ? err.message : "Unexpected error";
  console.error(message);
  return jsonError("Request failed", 502, message);
}
