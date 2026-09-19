import {
  ResourceGroupsTaggingAPIClient,
  GetResourcesCommand,
  TagResourcesCommand,
  UntagResourcesCommand,
  GetTagKeysCommand,
  type TagFilter,
} from "@aws-sdk/client-resource-groups-tagging-api";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import type { AwsCredentials } from "../session-store";
import type { BulkTagResult, CloudResource, TagMap } from "../types";

export const AWS_REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-north-1",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2", "ap-south-1",
  "sa-east-1", "ca-central-1",
];

/** Friendly labels for the most commonly-tagged AWS resource types; unlisted types fall back to their raw "service:type" string. */
const AWS_TYPE_LABELS: Record<string, string> = {
  "ec2:instance": "EC2 Instance",
  "ec2:volume": "EBS Volume",
  "ec2:security-group": "Security Group",
  "ec2:vpc": "VPC",
  "ec2:subnet": "Subnet",
  "ec2:snapshot": "EBS Snapshot",
  "ec2:image": "AMI",
  "ec2:natgateway": "NAT Gateway",
  "s3:bucket": "S3 Bucket",
  "rds:db": "RDS Database Instance",
  "rds:cluster": "RDS Cluster",
  "rds:snapshot": "RDS Snapshot",
  "lambda:function": "Lambda Function",
  "dynamodb:table": "DynamoDB Table",
  "elasticloadbalancing:loadbalancer": "Load Balancer",
  "elasticloadbalancing:targetgroup": "Target Group",
  "sns:sns": "SNS Topic",
  "cloudfront:distribution": "CloudFront Distribution",
  "iam:role": "IAM Role",
  "iam:user": "IAM User",
  "kms:key": "KMS Key",
  "ecs:cluster": "ECS Cluster",
  "ecs:service": "ECS Service",
  "eks:cluster": "EKS Cluster",
  "secretsmanager:secret": "Secrets Manager Secret",
  "logs:log-group": "CloudWatch Log Group",
};

interface ConnectArgs {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

function toSdkCredentials(args: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }) {
  return {
    accessKeyId: args.accessKeyId,
    secretAccessKey: args.secretAccessKey,
    sessionToken: args.sessionToken,
  };
}

export async function verifyAwsCredentials(args: ConnectArgs): Promise<{ accountId: string; arn: string }> {
  const client = new STSClient({ region: args.region, credentials: toSdkCredentials(args) });
  const result = await client.send(new GetCallerIdentityCommand({}));
  if (!result.Account || !result.Arn) {
    throw new Error("AWS did not return caller identity details.");
  }
  return { accountId: result.Account, arn: result.Arn };
}

function taggingClient(c: AwsCredentials) {
  return new ResourceGroupsTaggingAPIClient({ region: c.region, credentials: toSdkCredentials(c) });
}

function parseArn(arn: string, fallbackRegion: string) {
  // arn:partition:service:region:account-id:resourcetype/resource-id
  // arn:partition:service:region:account-id:resource-id
  const [, , service = "aws", region, , ...rest] = arn.split(":");
  const joined = rest.join(":");
  const slashIdx = joined.indexOf("/");
  const hasType = slashIdx !== -1;
  const rawTypeSuffix = hasType ? joined.slice(0, slashIdx) : service;
  const name = hasType ? joined.slice(slashIdx + 1) : joined;
  const rawType = hasType ? `${service}:${rawTypeSuffix}` : service;
  return {
    rawType,
    resourceType: AWS_TYPE_LABELS[rawType] ?? rawType,
    name: name || arn,
    location: region || fallbackRegion || "global",
  };
}

export interface ListAwsResourcesOptions {
  resourceTypeFilters?: string[];
  tagFilters?: TagFilter[];
  nextToken?: string;
}

export async function listAwsResources(
  c: AwsCredentials,
  opts: ListAwsResourcesOptions = {}
): Promise<{ resources: CloudResource[]; nextToken?: string }> {
  const result = await taggingClient(c).send(
    new GetResourcesCommand({
      ResourceTypeFilters: opts.resourceTypeFilters?.length ? opts.resourceTypeFilters : undefined,
      TagFilters: opts.tagFilters?.length ? opts.tagFilters : undefined,
      PaginationToken: opts.nextToken,
      ResourcesPerPage: 100,
    })
  );

  const resources: CloudResource[] = (result.ResourceTagMappingList ?? []).map((mapping) => {
    const arn = mapping.ResourceARN!;
    const parsed = parseArn(arn, c.region);
    const tags: TagMap = {};
    for (const t of mapping.Tags ?? []) if (t.Key) tags[t.Key] = t.Value ?? "";
    return {
      id: arn,
      provider: "aws" as const,
      resourceType: parsed.resourceType,
      rawType: parsed.rawType,
      name: parsed.name,
      location: parsed.location,
      tags,
      taggable: true,
    };
  });

  return { resources, nextToken: result.PaginationToken || undefined };
}

function toBulkResult(
  ids: string[],
  failedMap?: Record<string, { ErrorMessage?: string; ErrorCode?: string }>
): BulkTagResult {
  const failed = Object.entries(failedMap ?? {}).map(([id, v]) => ({
    id,
    error: v.ErrorMessage ?? v.ErrorCode ?? "Unknown error",
  }));
  const failedIds = new Set(failed.map((f) => f.id));
  return { succeeded: ids.filter((id) => !failedIds.has(id)), failed };
}

export async function tagAwsResources(c: AwsCredentials, resourceArns: string[], tags: TagMap): Promise<BulkTagResult> {
  const result = await taggingClient(c).send(
    new TagResourcesCommand({ ResourceARNList: resourceArns, Tags: tags })
  );
  return toBulkResult(resourceArns, result.FailedResourcesMap as Record<string, { ErrorMessage?: string; ErrorCode?: string }>);
}

export async function untagAwsResources(c: AwsCredentials, resourceArns: string[], tagKeys: string[]): Promise<BulkTagResult> {
  const result = await taggingClient(c).send(
    new UntagResourcesCommand({ ResourceARNList: resourceArns, TagKeys: tagKeys })
  );
  return toBulkResult(resourceArns, result.FailedResourcesMap as Record<string, { ErrorMessage?: string; ErrorCode?: string }>);
}

/** Best-effort tag key suggestions for autocomplete; first page only. */
export async function listAwsTagKeys(c: AwsCredentials): Promise<string[]> {
  const result = await taggingClient(c).send(new GetTagKeysCommand({}));
  return (result.TagKeys ?? []).filter((k): k is string => Boolean(k));
}
