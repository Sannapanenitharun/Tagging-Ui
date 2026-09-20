"use client";

import { useMemo } from "react";
import { ProviderBadge } from "../ProviderBadge";
import { Button } from "../ui/Button";
import { nonCompliantCsv } from "@/lib/compliance-export";
import { downloadTextFile } from "@/lib/csv";
import { summarizeCompliance, type GovernanceConfig } from "@/lib/governance";
import type { CloudResource } from "@/lib/types";

function Bar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "var(--success)" : pct >= 60 ? "var(--warning)" : "var(--danger)";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

const pct = (a: number, b: number) => (b === 0 ? 100 : Math.round((a / b) * 100));

export function CompliancePanel({ resources, config }: { resources: CloudResource[]; config: GovernanceConfig }) {
  const s = useMemo(() => summarizeCompliance(resources, config), [resources, config]);

  if (config.policies.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
        Define at least one required tag in the &quot;Required tags&quot; tab to see compliance.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)]">
          <p className="text-xs font-medium text-[var(--muted)]">Compliance score</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{s.scorePct ?? "–"}%</p>
          <div className="mt-2">
            <Bar pct={s.scorePct ?? 0} />
          </div>
        </div>
        <div className="rounded-lg bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)]">
          <p className="text-xs font-medium text-[var(--muted)]">Compliant resources</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--success)]">{s.compliant}</p>
        </div>
        <div className="rounded-lg bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)]">
          <p className="text-xs font-medium text-[var(--muted)]">Non-compliant resources</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--warning)]">{s.nonCompliant.length}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)]">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">By required tag</h3>
          <ul className="space-y-3">
            {s.perPolicy.map(({ policy, applicable, compliant }) => (
              <li key={policy.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-mono text-xs text-[var(--foreground)]">{policy.key}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {compliant}/{applicable} ({pct(compliant, applicable)}%)
                  </span>
                </div>
                <Bar pct={pct(compliant, applicable)} />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)]">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">By cloud and type</h3>
          <ul className="space-y-3">
            {(["aws", "gcp"] as const).map((p) =>
              s.byProvider[p].total > 0 ? (
                <li key={p}>
                  <div className="mb-1 flex items-center justify-between">
                    <ProviderBadge provider={p} />
                    <span className="text-xs text-[var(--muted)]">
                      {s.byProvider[p].compliant}/{s.byProvider[p].total} (
                      {pct(s.byProvider[p].compliant, s.byProvider[p].total)}%)
                    </span>
                  </div>
                  <Bar pct={pct(s.byProvider[p].compliant, s.byProvider[p].total)} />
                </li>
              ) : null
            )}
            {s.byType.slice(0, 6).map((t) => (
              <li key={t.type}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-[var(--foreground)]">{t.type}</span>
                  <span className="text-[var(--muted)]">
                    {t.compliant}/{t.total}
                  </span>
                </div>
                <Bar pct={pct(t.compliant, t.total)} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-lg bg-[var(--surface)] ring-1 ring-inset ring-[var(--border)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Non-compliant resources</h3>
          <Button
            variant="secondary"
            size="sm"
            disabled={s.nonCompliant.length === 0}
            onClick={() => downloadTextFile("non-compliant-resources.csv", nonCompliantCsv(s))}
          >
            Export CSV
          </Button>
        </div>
        {s.nonCompliant.length === 0 ? (
          <p className="p-4 text-sm text-[var(--muted)]">Every loaded resource satisfies your required tags.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {s.nonCompliant.slice(0, 50).map(({ resource, violations }) => (
              <li key={resource.id} className="flex items-start justify-between gap-4 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ProviderBadge provider={resource.provider} />
                    <span className="truncate text-sm font-medium text-[var(--foreground)]">{resource.name}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">{resource.resourceType}</p>
                </div>
                <ul className="flex flex-wrap justify-end gap-1">
                  {violations.map((v) => (
                    <li
                      key={v.policyId}
                      className="rounded bg-[var(--warning-bg)] px-1.5 py-0.5 text-xs text-[var(--warning)]"
                    >
                      {v.kind === "missing" ? `missing ${v.key}` : `${v.key}=${v.actual} not allowed`}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        {s.nonCompliant.length > 50 && (
          <p className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
            Showing 50 of {s.nonCompliant.length}.
          </p>
        )}
      </section>
    </div>
  );
}
