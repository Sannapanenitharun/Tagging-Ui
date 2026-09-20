import { describe, expect, it } from "vitest";
import {
  canonicalKey,
  effectiveTags,
  evaluateResource,
  planMaterialization,
  summarizeCompliance,
  type GovernanceConfig,
  type VirtualTagRule,
} from "./governance";
import { nonCompliantCsv } from "./compliance-export";
import type { CloudResource } from "./types";

const res = (over: Partial<CloudResource> & { id: string }): CloudResource => ({
  provider: "aws",
  resourceType: "EC2 Instance",
  rawType: "ec2:instance",
  name: over.id,
  location: "us-east-1",
  tags: {},
  taggable: true,
  ...over,
});

const envAlias = { id: "a", canonical: "environment", aliases: ["env", "Env"] };
const cfg = (over: Partial<GovernanceConfig> = {}): GovernanceConfig => ({
  policies: [],
  rules: [],
  aliases: [],
  ...over,
});
const rule = (over: Partial<VirtualTagRule> = {}): VirtualTagRule => ({
  id: "r",
  key: "environment",
  value: "prod",
  conditions: [{ field: "name", op: "contains", value: "orphan" }],
  ...over,
});

describe("canonicalKey", () => {
  it("maps aliases case-insensitively and leaves unknown keys alone", () => {
    expect(canonicalKey("ENV", [envAlias])).toBe("environment");
    expect(canonicalKey("team", [envAlias])).toBe("team");
  });
});

describe("effectiveTags", () => {
  it("prefers native tags over virtual ones and lets the first matching rule win", () => {
    const r = res({ id: "1", name: "orphan-x", tags: { Env: "staging" } });
    const config = cfg({
      aliases: [envAlias],
      rules: [rule({ id: "a", value: "prod" }), rule({ id: "b", key: "team", value: "x" }), rule({ id: "c", key: "team", value: "y" })],
    });
    const eff = effectiveTags(r, config);
    expect(eff.environment).toEqual({ value: "staging", source: "native" });
    expect(eff.team).toEqual({ value: "x", source: "virtual" });
  });

  it("never matches a rule with no conditions", () => {
    expect(effectiveTags(res({ id: "1" }), cfg({ rules: [rule({ conditions: [] })] }))).toEqual({});
  });
});

describe("evaluateResource", () => {
  const policy = { id: "p", key: "environment", allowedValues: ["prod", "staging"], providers: [] };

  it("flags missing and disallowed values, ignoring case for allowed values", () => {
    const config = cfg({ policies: [policy], aliases: [envAlias] });
    expect(evaluateResource(res({ id: "1" }), config).violations[0]).toMatchObject({ kind: "missing" });
    expect(evaluateResource(res({ id: "2", tags: { env: "qa" } }), config).violations[0]).toMatchObject({
      kind: "invalid-value",
      actual: "qa",
    });
    expect(evaluateResource(res({ id: "3", tags: { Env: "PROD" } }), config).violations).toEqual([]);
  });

  it("counts a virtual tag as compliant", () => {
    const config = cfg({ policies: [policy], rules: [rule()] });
    const out = evaluateResource(res({ id: "1", name: "orphan-bucket" }), config);
    expect(out.violations).toEqual([]);
    expect(out.viaVirtual).toBe(1);
  });

  it("skips policies scoped to another cloud", () => {
    const config = cfg({ policies: [{ ...policy, providers: ["gcp"] }] });
    expect(evaluateResource(res({ id: "1" }), config).violations).toEqual([]);
  });
});

describe("summarizeCompliance", () => {
  it("returns a null score when there are no policies or no resources", () => {
    expect(summarizeCompliance([res({ id: "1" })], cfg()).scorePct).toBeNull();
    expect(summarizeCompliance([], cfg({ policies: [{ id: "p", key: "k", allowedValues: [], providers: [] }] })).scorePct).toBeNull();
  });

  it("scores and breaks down by provider", () => {
    const config = cfg({ policies: [{ id: "p", key: "team", allowedValues: [], providers: [] }] });
    const s = summarizeCompliance(
      [res({ id: "1", tags: { team: "a" } }), res({ id: "2" }), res({ id: "3", provider: "gcp", tags: { team: "b" } })],
      config
    );
    expect(s.scorePct).toBe(67);
    expect(s.byProvider.aws).toEqual({ total: 2, compliant: 1 });
    expect(s.byProvider.gcp).toEqual({ total: 1, compliant: 1 });
    expect(s.nonCompliant).toHaveLength(1);
  });
});

describe("planMaterialization", () => {
  const rules = rule();
  it("writes only matching resources that lack the key, alias-aware", () => {
    const plan = planMaterialization(
      rules,
      [
        res({ id: "1", name: "orphan-a" }),
        res({ id: "2", name: "orphan-b", tags: { Env: "dev" } }), // has it via alias
        res({ id: "3", name: "healthy" }), // doesn't match
      ],
      [envAlias]
    );
    expect(plan.writable.map((r) => r.id)).toEqual(["1"]);
    expect(plan.skipped).toEqual([]);
  });

  it("skips read-only resources with the provider's reason", () => {
    const plan = planMaterialization(
      rules,
      [res({ id: "1", name: "orphan-a", taggable: false, readOnlyReason: "Regional disks are read-only" })],
      []
    );
    expect(plan.writable).toEqual([]);
    expect(plan.skipped[0].reason).toBe("Regional disks are read-only");
  });

  it("skips values invalid for the cloud (GCP labels are lowercase)", () => {
    const plan = planMaterialization(
      rule({ value: "Prod" }),
      [res({ id: "1", name: "orphan-a", provider: "gcp" }), res({ id: "2", name: "orphan-b" })],
      []
    );
    expect(plan.writable.map((r) => r.id)).toEqual(["2"]);
    expect(plan.skipped.map((s) => s.resource.id)).toEqual(["1"]);
  });

  it("skips resources already at the tag limit, and doesn't reject reserved aws: tags already there", () => {
    const full = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`k${i}`, "v"]));
    const plan = planMaterialization(
      rules,
      [
        res({ id: "1", name: "orphan-a", tags: full }),
        res({ id: "2", name: "orphan-b", tags: { "aws:cloudformation:stack-name": "s" } }),
      ],
      []
    );
    expect(plan.skipped.map((s) => [s.resource.id, s.reason])).toEqual([["1", "Already at the 50-tag limit"]]);
    expect(plan.writable.map((r) => r.id)).toEqual(["2"]);
  });
});

describe("nonCompliantCsv", () => {
  it("emits a header plus one row per offender and neutralises formula injection", () => {
    const config = cfg({ policies: [{ id: "p", key: "team", allowedValues: [], providers: [] }] });
    const csv = nonCompliantCsv(summarizeCompliance([res({ id: "arn:1", name: "=HYPERLINK(x)" })], config));
    const [header, row] = csv.split("\r\n");
    expect(header).toBe("provider,name,type,location,id,violations");
    expect(row).toContain("'=HYPERLINK(x)");
    expect(row).toContain("missing team");
  });
});
