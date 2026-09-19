import type {
  ApiError,
  AwsConnectionSummary,
  BulkTagResult,
  CloudResource,
  GcpConnectionSummary,
  SessionStatus,
  TagMap,
} from "./types";

class ApiRequestError extends Error {
  details?: string;
  status: number;
  constructor(message: string, status: number, details?: string) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body as ApiError;
    throw new ApiRequestError(err.error ?? "Request failed", res.status, err.details);
  }
  return body as T;
}

export { ApiRequestError };

export function getSessionStatus() {
  return request<SessionStatus>("/api/session");
}

// --- AWS ---------------------------------------------------------------

export function connectAws(input: {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}) {
  return request<AwsConnectionSummary>("/api/aws/connect", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function disconnectAws() {
  return request<{ ok: true }>("/api/aws/disconnect", { method: "POST" });
}

export function listAwsResources(params: { tagKey?: string; tagValue?: string; nextToken?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.tagKey) qs.set("tagKey", params.tagKey);
  if (params.tagValue) qs.set("tagValue", params.tagValue);
  if (params.nextToken) qs.set("nextToken", params.nextToken);
  return request<{ resources: CloudResource[]; nextToken?: string }>(`/api/aws/resources?${qs.toString()}`);
}

export function tagAwsResources(resourceArns: string[], tags: TagMap) {
  return request<BulkTagResult>("/api/aws/tags", {
    method: "POST",
    body: JSON.stringify({ resourceArns, tags }),
  });
}

export function untagAwsResources(resourceArns: string[], tagKeys: string[]) {
  return request<BulkTagResult>("/api/aws/tags", {
    method: "DELETE",
    body: JSON.stringify({ resourceArns, tagKeys }),
  });
}

// --- GCP ---------------------------------------------------------------

export function connectGcp(input: { serviceAccountJson: string; projectId?: string }) {
  return request<GcpConnectionSummary>("/api/gcp/connect", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function disconnectGcp() {
  return request<{ ok: true }>("/api/gcp/disconnect", { method: "POST" });
}

export function listGcpResources(params: { query?: string; pageToken?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.query) qs.set("query", params.query);
  if (params.pageToken) qs.set("pageToken", params.pageToken);
  return request<{ resources: CloudResource[]; nextPageToken?: string }>(`/api/gcp/resources?${qs.toString()}`);
}

export interface GcpTagTarget {
  id: string;
  rawType: string;
}

export function tagGcpResources(targets: GcpTagTarget[], tags: TagMap) {
  return request<BulkTagResult>("/api/gcp/tags", {
    method: "POST",
    body: JSON.stringify({ targets, tags }),
  });
}

export function untagGcpResources(targets: GcpTagTarget[], tagKeys: string[]) {
  return request<BulkTagResult>("/api/gcp/tags", {
    method: "DELETE",
    body: JSON.stringify({ targets, tagKeys }),
  });
}
