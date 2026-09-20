# Tagging Console

A multi-cloud **resource tagging** console for AWS and GCP. It does one job:
find resources across your connected clouds and let you view, add, edit,
remove, and bulk-apply tags/labels on them — with real provider APIs, tag
validation matched to each cloud's actual limits, and a UI built for that
single workflow.

This is intentionally *not* a general cloud management console. There's no
resource creation, no cost data, no IAM management — just tagging.

## Stack

- Next.js 16 (App Router) + TypeScript + React 19
- Tailwind CSS v4 for styling, hand-built UI primitives (no component kit
  dependency)
- `@aws-sdk/client-resource-groups-tagging-api` + `@aws-sdk/client-sts` for AWS
- `@google-cloud/asset`, `@google-cloud/compute`, `@google-cloud/storage`,
  `@google-cloud/resource-manager` for GCP

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000, go to **Connections**, and connect an AWS account
and/or a GCP project. No `.env` file or server-side secrets are required —
credentials are supplied through the UI per session (see **Credential
handling** below).

## Architecture

```
src/
  lib/
    types.ts               Provider-agnostic domain model (CloudResource, TagMap, ...)
    validation.ts           Tag key/value rules matched to each provider's real API limits
    session.ts               httpOnly session-id cookie
    session-store.ts         Server-side in-memory credential store, keyed by session id
    api-client.ts             Typed fetch wrappers used by the UI
    resource-actions.ts       Groups a mixed AWS+GCP selection and dispatches per-provider calls
    providers/
      aws.ts                  AWS adapter (Resource Groups Tagging API)
      gcp.ts                  GCP adapter (Cloud Asset Inventory + per-service label writers)
  app/
    api/aws/...               Route handlers: connect, disconnect, resources, tags
    api/gcp/...               Same shape for GCP
    connect/, tagging/        Pages
  components/                 UI (resource table, tag editor drawer, bulk drawer, forms, ...)
```

The two provider adapters are the only cloud-specific code in the app; every
route, component, and validation rule above them speaks the shared
`CloudResource` / `TagMap` model. Adding a third cloud means writing one more
adapter plus a thin set of route handlers — the UI does not change.

### Why AWS and GCP are asymmetric

**AWS** has a genuinely universal tagging API — Resource Groups Tagging API's
`GetResources` / `TagResources` / `UntagResources` work across the large
majority of taggable resource types with no per-service code. `lib/providers/aws.ts`
is a thin wrapper around it.

**GCP has no equivalent.** Cloud Asset Inventory's `searchAllResources` gives
broad **read** coverage (used for listing resources and their existing
labels across almost every resource type), but there is no universal
**write** API — each service exposes its own `setLabels`-style RPC. So
`lib/providers/gcp.ts` splits the two paths:

- **Read**: Cloud Asset Inventory, broad coverage, listed via `DEFAULT_GCP_ASSET_TYPES`.
- **Write**: a `LABEL_WRITERS` registry, currently covering Compute Engine
  instances, zonal Persistent Disks, Cloud Storage buckets, and Projects.
  Resources of a type without a registered writer are shown **read-only** in
  the UI with an explanation, rather than silently failing.

To add another writable GCP resource type (e.g. BigQuery datasets, Cloud SQL,
GKE clusters — all of which have their own labels + setLabels-equivalent
RPC), add an entry to `LABEL_WRITERS` in `lib/providers/gcp.ts` following the
existing pattern (`getCurrentLabels` + `applyLabels`) and add its asset type
to `DEFAULT_GCP_ASSET_TYPES`.

### Credential handling

Credentials are POSTed once to `/api/{aws,gcp}/connect`, verified against the
real API (`sts:GetCallerIdentity` for AWS, a project read for GCP), and then
held **server-side only**, in an in-memory `Map` keyed by an opaque session id
in an httpOnly cookie (`lib/session-store.ts`). They are never written to
disk and never sent back to the browser — the client only ever sees the
non-secret `ConnectionSummary` (account id / project id, not keys).

This is the right tradeoff for local dev or a single-instance deployment. It
does **not** survive a process restart, and it does **not** work behind a
load balancer with multiple instances — the module is small and isolated
specifically so it can be swapped for a shared store (Redis, or your cloud's
secrets manager keyed by session id) without touching any route handler.

### Tag validation

`lib/validation.ts` mirrors each provider's real constraints (AWS: 128-char
keys, 256-char values, 50 tags/resource, reserved `aws:` prefix; GCP: 63-char
lowercase-only keys/values, 64 labels/resource) so invalid input is rejected
in the UI before a request round-trips to the provider and fails there.

## Tag governance

The **Governance** page adds the tagging practices common to FinOps platforms
(CloudHealth, Vantage, CloudZero, Finout, Yotascale, Harness CCM). It is
tagging-only: nothing here reads cost data.

- **Required tags**: per-key policies (optional allowed values, optional
  per-cloud scope). The **Compliance** tab scores every loaded resource and
  breaks the result down by tag, cloud, and resource type, and lists offenders.
  The Tagging view gets a "Non-compliant only" filter.
- **Virtual tags**: rules (`name contains "payments"`, `tag env equals prod`, ...
  all conditions must match) that derive a tag without changing the cloud.
  They render dashed in the Tagging view, are searchable, and count toward
  compliance. "Apply as real tags" writes a rule's result to AWS/GCP in bulk,
  skipping read-only resources and values invalid for that cloud. This is the
  same idea as Vantage/Finout virtual tags and CloudZero dimensions, scoped to
  tag keys.
- **Normalization**: alias mappings (`env`, `Env`, `stage` -> `environment`) so
  policies, rules, and compliance treat differently-spelled keys as one.
  Only affects how this console reads tags; nothing is renamed in the cloud.

"Apply as real tags" opens a **preview first**: it lists what will be written and
what will be skipped and why (read-only resource, value invalid for that cloud,
resource already at the provider's tag limit). Nothing is written until you
confirm. The Compliance tab can **export offenders to CSV** (formula-injection
safe), and approved values can be imported from a `.csv`/`.txt` list.

Policies, rules, and aliases are stored in this browser's `localStorage`
(`src/lib/governance-store.ts`), so they are per-browser, not shared across
users. Compliance is computed over the resources loaded (first page per cloud).

## Tests

```bash
npm test
```

Unit tests cover the governance engine (alias normalization, virtual-tag
precedence, compliance scoring, write planning) and CSV handling. They run
against pure functions, so no cloud credentials are needed.

## Required permissions

**AWS** — attach a policy like:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "tag:GetResources",
        "tag:GetTagKeys",
        "tag:GetTagValues",
        "tag:TagResources",
        "tag:UntagResources",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

**GCP** — grant the service account, on the target project:

- `roles/viewer` and `roles/cloudasset.viewer` (list resources + read labels)
- `roles/compute.instanceAdmin.v1` (label Compute Engine instances/disks)
- `roles/storage.admin` (label Cloud Storage buckets)
- `roles/resourcemanager.projectIamAdmin` or a custom role with
  `resourcemanager.projects.update` (label the project itself)

Grant only what you need for the resource types you intend to edit; read-only
access still lets you browse and audit tags.

## Known limitations

- GCP label writes cover Compute Engine instances, zonal disks, Storage
  buckets, and Projects — other resource types are listed and shown
  read-only until a writer is added (see above).
- Regional Persistent Disks are read-only (only zonal disks are supported).
- AWS resource listing is scoped to the connected region; global-service
  resources (S3, IAM, CloudFront, Route 53) appear regardless of region, but
  other regional resources require switching regions to see.
- Session storage is in-memory and single-instance (see **Credential
  handling**).
