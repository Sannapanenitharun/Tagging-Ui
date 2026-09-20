import type { CloudResource, Provider, TagMap } from "./types";

export type ConditionField = "name" | "type" | "location" | "provider" | "tag";
export type ConditionOp = "equals" | "contains" | "startsWith" | "exists" | "missing";

export interface Condition {
  field: ConditionField;
  /** Only used when field === "tag". */
  tagKey?: string;
  op: ConditionOp;
  value: string;
}

/** A tag that resources must carry. Empty `providers` means all providers; empty `allowedValues` means any value. */
export interface RequiredTagPolicy {
  id: string;
  key: string;
  allowedValues: string[];
  providers: Provider[];
}

/** Derived tag: assigned to every resource matching ALL conditions, without touching the cloud. */
export interface VirtualTagRule {
  id: string;
  key: string;
  value: string;
  conditions: Condition[];
}

/** Treat `aliases` (case-insensitive) as the same tag key as `canonical`. */
export interface TagAlias {
  id: string;
  canonical: string;
  aliases: string[];
}

export interface GovernanceConfig {
  policies: RequiredTagPolicy[];
  rules: VirtualTagRule[];
  aliases: TagAlias[];
}

export const EMPTY_GOVERNANCE: GovernanceConfig = { policies: [], rules: [], aliases: [] };

export function canonicalKey(key: string, aliases: TagAlias[]): string {
  const lower = key.toLowerCase();
  for (const a of aliases) {
    if (a.canonical.toLowerCase() === lower || a.aliases.some((x) => x.toLowerCase() === lower)) {
      return a.canonical;
    }
  }
  return key;
}

function normalizedNativeTags(resource: CloudResource, aliases: TagAlias[]): TagMap {
  const out: TagMap = {};
  for (const [k, v] of Object.entries(resource.tags)) {
    const ck = canonicalKey(k, aliases);
    if (!(ck in out)) out[ck] = v;
  }
  return out;
}

function subject(c: Condition, resource: CloudResource, native: TagMap, aliases: TagAlias[]): string | undefined {
  switch (c.field) {
    case "name":
      return resource.name;
    case "type":
      return resource.resourceType;
    case "location":
      return resource.location;
    case "provider":
      return resource.provider;
    case "tag":
      return c.tagKey ? native[canonicalKey(c.tagKey, aliases)] : undefined;
  }
}

export function conditionMatches(c: Condition, resource: CloudResource, native: TagMap, aliases: TagAlias[]): boolean {
  const s = subject(c, resource, native, aliases);
  const present = s !== undefined && s !== "";
  if (c.op === "exists") return present;
  if (c.op === "missing") return !present;
  if (!present) return false;
  const a = s.toLowerCase();
  const b = c.value.toLowerCase();
  if (c.op === "equals") return a === b;
  if (c.op === "contains") return a.includes(b);
  return a.startsWith(b);
}

export function ruleMatches(rule: VirtualTagRule, resource: CloudResource, aliases: TagAlias[]): boolean {
  if (rule.conditions.length === 0) return false;
  const native = normalizedNativeTags(resource, aliases);
  return rule.conditions.every((c) => conditionMatches(c, resource, native, aliases));
}

export interface EffectiveTag {
  value: string;
  source: "native" | "virtual";
}

/** Native tags (keys normalized through aliases) plus virtual tags for keys the resource doesn't natively have. First matching rule wins. */
export function effectiveTags(resource: CloudResource, config: GovernanceConfig): Record<string, EffectiveTag> {
  const native = normalizedNativeTags(resource, config.aliases);
  const out: Record<string, EffectiveTag> = {};
  for (const [k, v] of Object.entries(native)) out[k] = { value: v, source: "native" };
  for (const rule of config.rules) {
    const key = canonicalKey(rule.key, config.aliases);
    if (key in out) continue;
    if (ruleMatches(rule, resource, config.aliases)) out[key] = { value: rule.value, source: "virtual" };
  }
  return out;
}

export function virtualTagsFor(resource: CloudResource, config: GovernanceConfig): TagMap {
  const out: TagMap = {};
  for (const [k, t] of Object.entries(effectiveTags(resource, config))) {
    if (t.source === "virtual") out[k] = t.value;
  }
  return out;
}

export interface Violation {
  policyId: string;
  key: string;
  kind: "missing" | "invalid-value";
  actual?: string;
}

export function evaluateResource(resource: CloudResource, config: GovernanceConfig) {
  const eff = effectiveTags(resource, config);
  const violations: Violation[] = [];
  let viaVirtual = 0;
  for (const p of config.policies) {
    if (p.providers.length > 0 && !p.providers.includes(resource.provider)) continue;
    const tag = eff[canonicalKey(p.key, config.aliases)];
    if (!tag) {
      violations.push({ policyId: p.id, key: p.key, kind: "missing" });
    } else if (
      p.allowedValues.length > 0 &&
      !p.allowedValues.some((v) => v.toLowerCase() === tag.value.toLowerCase())
    ) {
      violations.push({ policyId: p.id, key: p.key, kind: "invalid-value", actual: tag.value });
    } else if (tag.source === "virtual") {
      viaVirtual += 1;
    }
  }
  return { violations, viaVirtual };
}

export interface ComplianceSummary {
  total: number;
  compliant: number;
  scorePct: number | null;
  perPolicy: { policy: RequiredTagPolicy; applicable: number; compliant: number }[];
  byProvider: Record<Provider, { total: number; compliant: number }>;
  byType: { type: string; total: number; compliant: number }[];
  nonCompliant: { resource: CloudResource; violations: Violation[] }[];
}

export function summarizeCompliance(resources: CloudResource[], config: GovernanceConfig): ComplianceSummary {
  const perPolicy = config.policies.map((policy) => ({ policy, applicable: 0, compliant: 0 }));
  const byProvider: ComplianceSummary["byProvider"] = { aws: { total: 0, compliant: 0 }, gcp: { total: 0, compliant: 0 } };
  const typeMap = new Map<string, { total: number; compliant: number }>();
  const nonCompliant: ComplianceSummary["nonCompliant"] = [];
  let compliant = 0;

  for (const resource of resources) {
    const { violations } = evaluateResource(resource, config);
    const ok = violations.length === 0;
    if (ok) compliant += 1;
    else nonCompliant.push({ resource, violations });

    byProvider[resource.provider].total += 1;
    if (ok) byProvider[resource.provider].compliant += 1;

    const t = typeMap.get(resource.resourceType) ?? { total: 0, compliant: 0 };
    t.total += 1;
    if (ok) t.compliant += 1;
    typeMap.set(resource.resourceType, t);

    const violated = new Set(violations.map((v) => v.policyId));
    for (const row of perPolicy) {
      const p = row.policy;
      if (p.providers.length > 0 && !p.providers.includes(resource.provider)) continue;
      row.applicable += 1;
      if (!violated.has(p.id)) row.compliant += 1;
    }
  }

  const byType = [...typeMap.entries()]
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.total - a.total);

  return {
    total: resources.length,
    compliant,
    scorePct: config.policies.length > 0 && resources.length > 0 ? Math.round((compliant / resources.length) * 100) : null,
    perPolicy,
    byProvider,
    byType,
    nonCompliant,
  };
}
