"use client";

import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Input";
import { useToast } from "../ui/Toast";
import { saveGovernanceConfig, newId } from "@/lib/governance-store";
import {
  canonicalKey,
  ruleMatches,
  type Condition,
  type ConditionField,
  type ConditionOp,
  type GovernanceConfig,
  type VirtualTagRule,
} from "@/lib/governance";
import { applyTagsToResources, combinedFailures } from "@/lib/resource-actions";
import { validateSingleTag } from "@/lib/validation";
import type { CloudResource } from "@/lib/types";

const FIELDS: ConditionField[] = ["name", "type", "location", "provider", "tag"];
const OPS: ConditionOp[] = ["equals", "contains", "startsWith", "exists", "missing"];
const selectCls =
  "rounded-md bg-[var(--surface)] px-2 py-2 text-sm ring-1 ring-inset ring-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none";

const blankCondition = (): Condition => ({ field: "name", op: "contains", value: "" });

export function VirtualRulesPanel({
  config,
  resources,
  onApplied,
}: {
  config: GovernanceConfig;
  resources: CloudResource[];
  onApplied: () => void;
}) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [conditions, setConditions] = useState<Condition[]>([blankCondition()]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { push } = useToast();

  const validConditions = conditions.every((c) => c.op === "exists" || c.op === "missing" || c.value.trim() !== "");

  function updateCondition(i: number, patch: Partial<Condition>) {
    setConditions((cur) => cur.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function add() {
    if (!key.trim() || !value.trim() || !validConditions) return;
    const rule: VirtualTagRule = {
      id: newId(),
      key: key.trim(),
      value: value.trim(),
      conditions: conditions.map((c) => ({ ...c, value: c.value.trim(), tagKey: c.tagKey?.trim() })),
    };
    saveGovernanceConfig({ ...config, rules: [...config.rules, rule] });
    setKey("");
    setValue("");
    setConditions([blankCondition()]);
  }

  /** Resources matching the rule that don't already natively carry the key (alias-aware). */
  function pending(rule: VirtualTagRule) {
    const ck = canonicalKey(rule.key, config.aliases).toLowerCase();
    return resources.filter(
      (r) =>
        ruleMatches(rule, r, config.aliases) &&
        !Object.keys(r.tags).some((k) => canonicalKey(k, config.aliases).toLowerCase() === ck)
    );
  }

  async function materialize(rule: VirtualTagRule) {
    const candidates = pending(rule);
    const writable = candidates.filter((r) => r.taggable && validateSingleTag(r.provider, rule.key, rule.value).valid);
    const skipped = candidates.length - writable.length;
    if (writable.length === 0) {
      push({
        kind: "info",
        title: "Nothing to write",
        description: skipped
          ? `${skipped} matching resource(s) are read-only or the value isn't valid for that cloud.`
          : "Every matching resource already has this tag.",
      });
      return;
    }
    setBusyId(rule.id);
    try {
      const result = await applyTagsToResources(writable, { [rule.key]: rule.value });
      const failed = combinedFailures(result);
      const ok = writable.length - failed.length;
      push({
        kind: failed.length ? "error" : "success",
        title: `Wrote ${rule.key}=${rule.value} to ${ok} resource(s)`,
        description:
          [failed.length ? `${failed.length} failed: ${failed[0].error}` : "", skipped ? `${skipped} skipped` : ""]
            .filter(Boolean)
            .join(" · ") || undefined,
      });
      if (ok > 0) onApplied();
    } catch (err) {
      push({ kind: "error", title: "Could not apply tags", description: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        Virtual tags label resources by rule, without changing anything in AWS or GCP. They show up in the Tagging view
        (dashed) and count toward required-tag compliance. When you&apos;re ready, write a rule&apos;s result to the
        cloud as a real tag.
      </p>

      <div className="space-y-3 rounded-lg bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Assign tag key">
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="team" />
          </Field>
          <Field label="Assign tag value">
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="payments" />
          </Field>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--muted)]">When a resource matches all of:</p>
          {conditions.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select
                className={selectCls}
                value={c.field}
                onChange={(e) => updateCondition(i, { field: e.target.value as ConditionField })}
              >
                {FIELDS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              {c.field === "tag" && (
                <Input
                  className="w-32"
                  placeholder="tag key"
                  value={c.tagKey ?? ""}
                  onChange={(e) => updateCondition(i, { tagKey: e.target.value })}
                />
              )}
              <select
                className={selectCls}
                value={c.op}
                onChange={(e) => updateCondition(i, { op: e.target.value as ConditionOp })}
              >
                {OPS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              {c.op !== "exists" && c.op !== "missing" && (
                <Input
                  className="w-44"
                  placeholder="value"
                  value={c.value}
                  onChange={(e) => updateCondition(i, { value: e.target.value })}
                />
              )}
              {conditions.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setConditions((cur) => cur.filter((_, x) => x !== i))}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setConditions((cur) => [...cur, blankCondition()])}>
            + Add condition
          </Button>
        </div>

        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={add} disabled={!key.trim() || !value.trim() || !validConditions}>
            Add rule
          </Button>
        </div>
      </div>

      {config.rules.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No virtual tag rules yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-lg bg-[var(--surface)] ring-1 ring-inset ring-[var(--border)]">
          {config.rules.map((rule) => {
            const matched = resources.filter((r) => ruleMatches(rule, r, config.aliases)).length;
            const toWrite = pending(rule).length;
            return (
              <li key={rule.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--foreground)]">
                    <span className="font-mono">
                      {rule.key}={rule.value}
                    </span>
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    if{" "}
                    {rule.conditions
                      .map((c) =>
                        c.op === "exists" || c.op === "missing"
                          ? `${c.field === "tag" ? `tag ${c.tagKey}` : c.field} ${c.op}`
                          : `${c.field === "tag" ? `tag ${c.tagKey}` : c.field} ${c.op} "${c.value}"`
                      )
                      .join(" AND ")}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    Matches {matched} loaded resource(s); {toWrite} not yet tagged for real.
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === rule.id || toWrite === 0}
                    onClick={() => materialize(rule)}
                  >
                    {busyId === rule.id ? "Writing..." : "Apply as real tags"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => saveGovernanceConfig({ ...config, rules: config.rules.filter((r) => r.id !== rule.id) })}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
