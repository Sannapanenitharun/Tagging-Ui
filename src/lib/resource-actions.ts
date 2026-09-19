import * as api from "./api-client";
import type { BulkTagResult, CloudResource, TagMap } from "./types";

function groupByProvider(resources: CloudResource[]) {
  const aws = resources.filter((r) => r.provider === "aws");
  const gcp = resources.filter((r) => r.provider === "gcp");
  return { aws, gcp };
}

export interface CombinedBulkResult {
  aws?: BulkTagResult;
  gcp?: BulkTagResult;
}

/** Applies the same tag key/value pairs to a set of resources, dispatching to the right provider API for each. */
export async function applyTagsToResources(resources: CloudResource[], tags: TagMap): Promise<CombinedBulkResult> {
  const { aws, gcp } = groupByProvider(resources);
  const result: CombinedBulkResult = {};
  if (aws.length) result.aws = await api.tagAwsResources(aws.map((r) => r.id), tags);
  if (gcp.length) result.gcp = await api.tagGcpResources(gcp.map((r) => ({ id: r.id, rawType: r.rawType })), tags);
  return result;
}

/** Removes the given tag keys from a set of resources, dispatching to the right provider API for each. */
export async function removeTagsFromResources(resources: CloudResource[], tagKeys: string[]): Promise<CombinedBulkResult> {
  const { aws, gcp } = groupByProvider(resources);
  const result: CombinedBulkResult = {};
  if (aws.length) result.aws = await api.untagAwsResources(aws.map((r) => r.id), tagKeys);
  if (gcp.length)
    result.gcp = await api.untagGcpResources(gcp.map((r) => ({ id: r.id, rawType: r.rawType })), tagKeys);
  return result;
}

export function combinedFailures(result: CombinedBulkResult) {
  return [...(result.aws?.failed ?? []), ...(result.gcp?.failed ?? [])];
}

export function combinedSuccesses(result: CombinedBulkResult) {
  return [...(result.aws?.succeeded ?? []), ...(result.gcp?.succeeded ?? [])];
}
