import type { AwsConnectionSummary, GcpConnectionSummary } from "./types";

/**
 * Server-side-only credential store, keyed by an opaque session id that lives
 * in an httpOnly cookie. Credentials are NEVER sent to the browser — only the
 * non-secret summaries in `types.ts` are.
 *
 * This is an in-memory Map, which is the right tradeoff for a single-instance
 * deployment (local dev, a single container). It does NOT survive a process
 * restart and does NOT work across multiple instances behind a load balancer.
 * For a horizontally-scaled production deployment, swap this module for a
 * shared store (Redis, or your cloud's secrets manager keyed by session id)
 * behind the same `get`/`set`/`clear` interface — nothing else in the app
 * needs to change.
 */

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
  summary: AwsConnectionSummary;
}

export interface GcpCredentials {
  /** Parsed service account key JSON. */
  serviceAccountKey: Record<string, unknown>;
  projectId: string;
  summary: GcpConnectionSummary;
}

interface SessionRecord {
  aws?: AwsCredentials;
  gcp?: GcpCredentials;
  lastAccess: number;
}

const store = new Map<string, SessionRecord>();

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h idle timeout

function sweep() {
  const now = Date.now();
  for (const [id, record] of store) {
    if (now - record.lastAccess > SESSION_TTL_MS) store.delete(id);
  }
}

function getOrCreate(sessionId: string): SessionRecord {
  sweep();
  let record = store.get(sessionId);
  if (!record) {
    record = { lastAccess: Date.now() };
    store.set(sessionId, record);
  }
  record.lastAccess = Date.now();
  return record;
}

export function setAwsCredentials(sessionId: string, creds: AwsCredentials) {
  getOrCreate(sessionId).aws = creds;
}

export function setGcpCredentials(sessionId: string, creds: GcpCredentials) {
  getOrCreate(sessionId).gcp = creds;
}

export function getAwsCredentials(sessionId: string): AwsCredentials | null {
  return getOrCreate(sessionId).aws ?? null;
}

export function getGcpCredentials(sessionId: string): GcpCredentials | null {
  return getOrCreate(sessionId).gcp ?? null;
}

export function clearAws(sessionId: string) {
  const record = store.get(sessionId);
  if (record) delete record.aws;
}

export function clearGcp(sessionId: string) {
  const record = store.get(sessionId);
  if (record) delete record.gcp;
}

export function getStatus(sessionId: string) {
  const record = getOrCreate(sessionId);
  return {
    aws: record.aws?.summary ?? null,
    gcp: record.gcp?.summary ?? null,
  };
}
