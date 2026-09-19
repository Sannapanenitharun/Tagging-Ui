import { AssetServiceClient } from "@google-cloud/asset";
import { InstancesClient, DisksClient, ZoneOperationsClient } from "@google-cloud/compute";
import { Storage } from "@google-cloud/storage";
import { ProjectsClient } from "@google-cloud/resource-manager";
import { GoogleAuth } from "google-auth-library";
import type { GcpCredentials } from "../session-store";
import type { BulkTagResult, CloudResource, TagMap } from "../types";

/** Friendly labels for supported/known asset types; unlisted types fall back to a shortened raw type. */
const GCP_TYPE_LABELS: Record<string, string> = {
  "compute.googleapis.com/Instance": "Compute Engine VM",
  "compute.googleapis.com/Disk": "Persistent Disk",
  "compute.googleapis.com/Network": "VPC Network",
  "compute.googleapis.com/Subnetwork": "Subnet",
  "compute.googleapis.com/Image": "Compute Image",
  "storage.googleapis.com/Bucket": "Cloud Storage Bucket",
  "cloudresourcemanager.googleapis.com/Project": "Project",
  "sqladmin.googleapis.com/Instance": "Cloud SQL Instance",
  "bigquery.googleapis.com/Dataset": "BigQuery Dataset",
  "bigquery.googleapis.com/Table": "BigQuery Table",
  "container.googleapis.com/Cluster": "GKE Cluster",
  "pubsub.googleapis.com/Topic": "Pub/Sub Topic",
  "cloudfunctions.googleapis.com/CloudFunction": "Cloud Function",
  "run.googleapis.com/Service": "Cloud Run Service",
};

/** Asset types requested by default so the first resource list is fast and relevant, not every asset in the project. */
export const DEFAULT_GCP_ASSET_TYPES = Object.keys(GCP_TYPE_LABELS);

function friendlyType(assetType: string): string {
  return GCP_TYPE_LABELS[assetType] ?? assetType.split("/").pop() ?? assetType;
}

function authOptions(c: { serviceAccountKey: Record<string, unknown>; projectId: string }) {
  return {
    credentials: c.serviceAccountKey as { client_email: string; private_key: string },
    projectId: c.projectId,
  };
}

export async function verifyGcpCredentials(
  serviceAccountKey: Record<string, unknown>,
  projectId: string
): Promise<{ serviceAccountEmail: string }> {
  const email = String(serviceAccountKey.client_email ?? "");
  if (!email || !serviceAccountKey.private_key) {
    throw new Error("Service account JSON is missing client_email or private_key.");
  }
  const auth = new GoogleAuth({
    credentials: serviceAccountKey as { client_email: string; private_key: string },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  await client.getAccessToken();

  const projects = new ProjectsClient(authOptions({ serviceAccountKey, projectId }));
  try {
    await projects.getProject({ name: `projects/${projectId}` });
  } catch (err) {
    throw new Error(
      `Authenticated, but could not read project "${projectId}". Grant the service account at least "Viewer" (roles/viewer) on the project. (${(err as Error).message})`
    );
  }
  return { serviceAccountEmail: email };
}

// --- Resource name parsing -------------------------------------------------
// Cloud Asset Inventory returns full resource names like:
//   //compute.googleapis.com/projects/P/zones/Z/instances/I
//   //compute.googleapis.com/projects/P/regions/R/disks/D
//   //storage.googleapis.com/projects/_/buckets/B
//   //cloudresourcemanager.googleapis.com/projects/P

interface ParsedGcpName {
  project: string;
  zone?: string;
  region?: string;
  resourceId: string;
}

function parseResourceName(name: string): ParsedGcpName {
  const path = name.replace(/^\/\/[^/]+\//, ""); // strip //host/
  const segments = path.split("/");
  const idx = (key: string) => segments.indexOf(key);
  const projectIdx = idx("projects");
  const project = projectIdx !== -1 ? segments[projectIdx + 1] : "";
  const zoneIdx = idx("zones");
  const regionIdx = idx("regions");
  const zone = zoneIdx !== -1 ? segments[zoneIdx + 1] : undefined;
  const region = regionIdx !== -1 ? segments[regionIdx + 1] : undefined;
  const resourceId = segments[segments.length - 1];
  return { project, zone, region, resourceId };
}

// --- Listing (read path via Cloud Asset Inventory, broad coverage) --------

export interface ListGcpResourcesOptions {
  assetTypes?: string[];
  query?: string;
  pageToken?: string;
}

export async function listGcpResources(
  c: GcpCredentials,
  opts: ListGcpResourcesOptions = {}
): Promise<{ resources: CloudResource[]; nextPageToken?: string }> {
  const client = new AssetServiceClient(authOptions(c));
  const [response] = await client.searchAllResources({
    scope: `projects/${c.projectId}`,
    assetTypes: opts.assetTypes?.length ? opts.assetTypes : DEFAULT_GCP_ASSET_TYPES,
    query: opts.query || undefined,
    pageSize: 200,
    pageToken: opts.pageToken,
  });

  const resources: CloudResource[] = response.map((asset) => {
    const assetType = asset.assetType ?? "unknown";
    const name = asset.name ?? "";
    let taggable = Boolean(LABEL_WRITERS[assetType]);
    let readOnlyReason: string | undefined = taggable
      ? undefined
      : "Label editing isn't implemented for this resource type yet; shown read-only.";

    if (assetType === "compute.googleapis.com/Disk" && !parseResourceName(name).zone) {
      taggable = false;
      readOnlyReason = "Regional disks aren't supported yet; only zonal disks can be labeled.";
    }

    return {
      id: name,
      provider: "gcp" as const,
      resourceType: friendlyType(assetType),
      rawType: assetType,
      name: asset.displayName || parseResourceName(name).resourceId,
      location: asset.location || "global",
      tags: asset.labels ?? {},
      taggable,
      readOnlyReason,
    };
  });

  return { resources, nextPageToken: undefined };
}

// --- Label mutation (write path, per resource type) ------------------------
// GCP has no universal "set label" API, unlike AWS's Resource Groups Tagging
// API, so each resource type needs its own writer. Coverage is intentionally
// scoped to the most common labelable resources; extend LABEL_WRITERS below
// to support more (Cloud SQL, BigQuery, GKE, Pub/Sub all have setLabels-style
// RPCs and follow the same pattern).

interface LabelWriter {
  getCurrentLabels(c: GcpCredentials, resourceName: string): Promise<TagMap>;
  applyLabels(c: GcpCredentials, resourceName: string, labels: TagMap): Promise<void>;
}

const computeInstanceWriter: LabelWriter = {
  async getCurrentLabels(c, resourceName) {
    const { project, zone, resourceId } = parseResourceName(resourceName);
    const client = new InstancesClient(authOptions(c));
    const [instance] = await client.get({ project, zone, instance: resourceId });
    return instance.labels ?? {};
  },
  async applyLabels(c, resourceName, labels) {
    const { project, zone, resourceId } = parseResourceName(resourceName);
    const client = new InstancesClient(authOptions(c));
    const [instance] = await client.get({ project, zone, instance: resourceId });
    const [operation] = await client.setLabels({
      project,
      zone,
      instance: resourceId,
      instancesSetLabelsRequestResource: { labels, labelFingerprint: instance.labelFingerprint },
    });
    await waitZoneOperation(c, project, zone!, operation.name!);
  },
};

const computeDiskWriter: LabelWriter = {
  async getCurrentLabels(c, resourceName) {
    const { project, zone, resourceId } = parseResourceName(resourceName);
    const client = new DisksClient(authOptions(c));
    const [disk] = await client.get({ project, zone, disk: resourceId });
    return disk.labels ?? {};
  },
  async applyLabels(c, resourceName, labels) {
    const { project, zone, resourceId } = parseResourceName(resourceName);
    const client = new DisksClient(authOptions(c));
    const [disk] = await client.get({ project, zone, disk: resourceId });
    const [operation] = await client.setLabels({
      project,
      zone,
      resource: resourceId,
      zoneSetLabelsRequestResource: { labels, labelFingerprint: disk.labelFingerprint },
    });
    await waitZoneOperation(c, project, zone!, operation.name!);
  },
};

const storageBucketWriter: LabelWriter = {
  async getCurrentLabels(c, resourceName) {
    const { resourceId } = parseResourceName(resourceName);
    const storage = new Storage(authOptions(c));
    const [metadata] = await storage.bucket(resourceId).getMetadata();
    return (metadata.labels as TagMap) ?? {};
  },
  async applyLabels(c, resourceName, labels) {
    const { resourceId } = parseResourceName(resourceName);
    const storage = new Storage(authOptions(c));
    await storage.bucket(resourceId).setMetadata({ labels });
  },
};

const projectWriter: LabelWriter = {
  async getCurrentLabels(c, resourceName) {
    const { project } = parseResourceName(resourceName);
    const client = new ProjectsClient(authOptions(c));
    const [proj] = await client.getProject({ name: `projects/${project}` });
    return (proj.labels as TagMap) ?? {};
  },
  async applyLabels(c, resourceName, labels) {
    const { project } = parseResourceName(resourceName);
    const client = new ProjectsClient(authOptions(c));
    const [proj] = await client.getProject({ name: `projects/${project}` });
    const [operation] = await client.updateProject({
      project: { ...proj, labels },
      updateMask: { paths: ["labels"] },
    });
    await operation.promise();
  },
};

const LABEL_WRITERS: Record<string, LabelWriter> = {
  "compute.googleapis.com/Instance": computeInstanceWriter,
  "compute.googleapis.com/Disk": computeDiskWriter,
  "storage.googleapis.com/Bucket": storageBucketWriter,
  "cloudresourcemanager.googleapis.com/Project": projectWriter,
};

async function waitZoneOperation(c: GcpCredentials, project: string, zone: string, operationName: string) {
  const opsClient = new ZoneOperationsClient(authOptions(c));
  let done = false;
  let guard = 0;
  while (!done && guard < 30) {
    const [op] = await opsClient.wait({ project, zone, operation: operationName });
    done = op.status === "DONE";
    guard += 1;
  }
}

export function getLabelWriter(assetType: string): LabelWriter | undefined {
  return LABEL_WRITERS[assetType];
}

export async function applyGcpLabels(
  c: GcpCredentials,
  targets: { id: string; rawType: string }[],
  tagsToApply: TagMap
): Promise<BulkTagResult> {
  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const target of targets) {
    const writer = getLabelWriter(target.rawType);
    if (!writer) {
      failed.push({ id: target.id, error: `No label writer registered for ${target.rawType}` });
      continue;
    }
    try {
      const current = await writer.getCurrentLabels(c, target.id);
      await writer.applyLabels(c, target.id, { ...current, ...tagsToApply });
      succeeded.push(target.id);
    } catch (err) {
      failed.push({ id: target.id, error: (err as Error).message });
    }
  }
  return { succeeded, failed };
}

export async function removeGcpLabels(
  c: GcpCredentials,
  targets: { id: string; rawType: string }[],
  keysToRemove: string[]
): Promise<BulkTagResult> {
  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const target of targets) {
    const writer = getLabelWriter(target.rawType);
    if (!writer) {
      failed.push({ id: target.id, error: `No label writer registered for ${target.rawType}` });
      continue;
    }
    try {
      const current = await writer.getCurrentLabels(c, target.id);
      const next = { ...current };
      for (const key of keysToRemove) delete next[key];
      await writer.applyLabels(c, target.id, next);
      succeeded.push(target.id);
    } catch (err) {
      failed.push({ id: target.id, error: (err as Error).message });
    }
  }
  return { succeeded, failed };
}
