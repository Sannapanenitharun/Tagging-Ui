"use client";

import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Input";
import { saveGovernanceConfig, newId } from "@/lib/governance-store";
import type { GovernanceConfig } from "@/lib/governance";
import type { Provider } from "@/lib/types";

const csv = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function PoliciesPanel({ config }: { config: GovernanceConfig }) {
  const [key, setKey] = useState("");
  const [values, setValues] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);

  function add() {
    const k = key.trim();
    if (!k) return;
    saveGovernanceConfig({
      ...config,
      policies: [...config.policies, { id: newId(), key: k, allowedValues: csv(values), providers }],
    });
    setKey("");
    setValues("");
    setProviders([]);
  }

  function remove(id: string) {
    saveGovernanceConfig({ ...config, policies: config.policies.filter((p) => p.id !== id) });
  }

  function toggle(p: Provider) {
    setProviders((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        Every resource must carry these tags. Keys are matched through your aliases, and a tag supplied by a virtual
        rule counts as present.
      </p>

      <div className="space-y-3 rounded-lg bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Required tag key">
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="cost-center" />
          </Field>
          <Field label="Allowed values (optional, comma separated)">
            <Input value={values} onChange={(e) => setValues(e.target.value)} placeholder="prod, staging, dev" />
          </Field>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
            <span>Applies to:</span>
            {(["aws", "gcp"] as const).map((p) => (
              <label key={p} className="flex items-center gap-1.5">
                <input type="checkbox" checked={providers.includes(p)} onChange={() => toggle(p)} />
                {p.toUpperCase()}
              </label>
            ))}
            <span>(none checked = all)</span>
          </div>
          <Button variant="primary" size="sm" onClick={add} disabled={!key.trim()}>
            Add policy
          </Button>
        </div>
      </div>

      {config.policies.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No required tags yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-lg bg-[var(--surface)] ring-1 ring-inset ring-[var(--border)]">
          {config.policies.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="font-mono text-sm text-[var(--foreground)]">{p.key}</p>
                <p className="text-xs text-[var(--muted)]">
                  {p.allowedValues.length ? `one of: ${p.allowedValues.join(", ")}` : "any value"} ·{" "}
                  {p.providers.length ? p.providers.map((x) => x.toUpperCase()).join(", ") : "all clouds"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
