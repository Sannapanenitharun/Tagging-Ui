export type Provider = "aws" | "gcp";

export type TagMap = Record<string, string>;

export interface CloudResource {
  /** Fully-qualified provider identifier (ARN for AWS, asset full name for GCP). */
  id: string;
  provider: Provider;
  /** Human-friendly resource type, e.g. "EC2 Instance", "Storage Bucket". */
  resourceType: string;
  /** Raw provider resource type string, e.g. "ec2:instance", "compute.googleapis.com/Instance". */
  rawType: string;
  name: string;
  /** Region or location string; "global" for non-regional resources. */
  location: string;
  tags: TagMap;
  /** True when the adapter knows how to write tags/labels back to this resource. */
  taggable: boolean;
  /** Present when `taggable` is false, explains why. */
  readOnlyReason?: string;
  /** Console/self link for the resource, when known. */
  consoleUrl?: string;
}

export interface TagValidationError {
  key: string;
  message: string;
}

export interface TagValidationResult {
  valid: boolean;
  errors: TagValidationError[];
}

export interface AwsConnectionSummary {
  provider: "aws";
  accountId: string;
  arn: string;
  region: string;
  connectedAt: string;
}

export interface GcpConnectionSummary {
  provider: "gcp";
  projectId: string;
  serviceAccountEmail: string;
  connectedAt: string;
}

export type ConnectionSummary = AwsConnectionSummary | GcpConnectionSummary;

export interface SessionStatus {
  aws: AwsConnectionSummary | null;
  gcp: GcpConnectionSummary | null;
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface BulkTagResult {
  succeeded: string[];
  failed: { id: string; error: string }[];
}
