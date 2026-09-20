"use client";

import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Input";
import { saveGovernanceConfig, newId } from "@/lib/governance-store";
import type { GovernanceConfig } from "@/lib/governance";
import type { CloudResource } from "@/lib/types";

export function AliasesPanel({ config, resources }: { config: GovernanceConfig; resources: CloudResource[] }) {
  const [canonical, setCanonical] = useState("");
  const [aliases, setAliases] = useState("");

  const keyCounts = new Map<string, number>();
  for (const r of resources) for (const k of Object.keys(r.tags)) keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
  const topKeys = [...keyCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);

  function add() {
    const c = canonical.trim();
    const list = aliases
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (!c || list.length === 0) return;
    saveGovernanceConfig({ ...config, aliases: [...config.aliases, { id: newId(), canonical: c, aliases: list }] });
    setCanonical("");
    setAliases("");
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        Different teams and clouds spell the same tag differently (<code>Env</code>, <code>env</code>,{" "}
        <code>ENVIRONMENT</code>). Map them to one canonical key so policies, virtual tags, and filters treat them as
        one dimension. This only changes how this console reads tags; nothing is renamed in the cloud.
      </p>

      <div className="space-y-3 rounded-lg bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Canonical key">
            <Input value={canonical} onChange={(e) => setCanonical(e.target.value)} placeholder="environment" />
          </Field>
          <Field label="Aliases (comma separated)">
            <Input value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="env, Env, stage" />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={add} disabled={!canonical.trim() || !aliases.trim()}>
            Add mapping
          </Button>
        </div>
      </div>

      {topKeys.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Tag keys seen in your resources
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {topKeys.map(([k, n]) => (
              <span
                key={k}
                className="rounded-md bg-[var(--surface-hover)] px-2 py-1 font-mono text-xs text-[var(--foreground)] ring-1 ring-inset ring-[var(--border)]"
              >
                {k} <span className="text-[var(--muted)]">{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {config.aliases.length > 0 && (
        <ul className="divide-y divide-[var(--border)] rounded-lg bg-[var(--surface)] ring-1 ring-inset ring-[var(--border)]">
          {config.aliases.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <p className="text-sm text-[var(--foreground)]">
                <span className="font-mono">{a.aliases.join(", ")}</span> → <span className="font-mono">{a.canonical}</span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => saveGovernanceConfig({ ...config, aliases: config.aliases.filter((x) => x.id !== a.id) })}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
