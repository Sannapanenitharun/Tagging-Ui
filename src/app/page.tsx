"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProviderBadge } from "@/components/ProviderBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { getSessionStatus, listAwsResources, listGcpResources } from "@/lib/api-client";
import type { CloudResource, SessionStatus } from "@/lib/types";

interface Stats {
  total: number;
  tagged: number;
  untagged: number;
  topKeys: { key: string; count: number }[];
}

function computeStats(resources: CloudResource[]): Stats {
  const tagged = resources.filter((r) => Object.keys(r.tags).length > 0).length;
  const keyCounts = new Map<string, number>();
  for (const r of resources) {
    for (const key of Object.keys(r.tags)) {
      keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
    }
  }
  const topKeys = [...keyCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, count]) => ({ key, count }));
  return { total: resources.length, tagged, untagged: resources.length - tagged, topKeys };
}

export default function DashboardPage() {
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await getSessionStatus();
      setStatus(s);
      const next: Record<string, Stats> = {};
      if (s.aws) {
        const r = await listAwsResources().catch(() => ({ resources: [] as CloudResource[] }));
        next.aws = computeStats(r.resources);
      }
      if (s.gcp) {
        const r = await listGcpResources().catch(() => ({ resources: [] as CloudResource[] }));
        next.gcp = computeStats(r.resources);
      }
      setStats(next);
      setLoading(false);
    })();
  }, []);

  const combined = Object.values(stats).reduce<Stats>(
    (acc, s) => ({
      total: acc.total + s.total,
      tagged: acc.tagged + s.tagged,
      untagged: acc.untagged + s.untagged,
      topKeys: acc.topKeys,
    }),
    { total: 0, tagged: 0, untagged: 0, topKeys: [] }
  );
  const coverage = combined.total > 0 ? Math.round((combined.tagged / combined.total) * 100) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Tag coverage across your connected clouds. Fix gaps from the Resources view.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-[var(--muted)]">
          <Spinner /> Loading...
        </div>
      ) : !status?.aws && !status?.gcp ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">No clouds connected yet.</p>
          <Link href="/connect" className="mt-3 inline-block">
            <Button variant="primary">Connect a cloud</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total resources" value={combined.total} />
            <StatCard label="Tagged" value={combined.tagged} tone="success" />
            <StatCard
              label="Untagged"
              value={combined.untagged}
              tone={combined.untagged > 0 ? "warning" : "success"}
            />
          </div>

          {coverage !== null && (
            <div className="rounded-lg bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)]">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--foreground)]">Overall tag coverage</span>
                <span className="text-[var(--muted)]">{coverage}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
                <div
                  className="h-full rounded-full bg-[var(--success)]"
                  style={{ width: `${coverage}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(["aws", "gcp"] as const).map((provider) =>
              stats[provider] ? (
                <div key={provider} className="rounded-lg bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)]">
                  <div className="mb-3 flex items-center gap-2">
                    <ProviderBadge provider={provider} />
                    <span className="text-sm text-[var(--muted)]">{stats[provider].total} resources</span>
                  </div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Most common tag keys
                  </h3>
                  {stats[provider].topKeys.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No tags found yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {stats[provider].topKeys.map(({ key, count }) => (
                        <li key={key} className="flex items-center justify-between text-sm">
                          <span className="truncate font-mono text-xs text-[var(--foreground)]">{key}</span>
                          <span className="text-xs text-[var(--muted)]">{count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null
            )}
          </div>

          <Link href="/resources">
            <Button variant="primary">Open Resources</Button>
          </Link>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning";
}) {
  const color = tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : "var(--foreground)";
  return (
    <div className="rounded-lg bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)]">
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
