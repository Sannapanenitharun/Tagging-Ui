"use client";

import { useState } from "react";
import clsx from "clsx";
import { CompliancePanel } from "@/components/governance/CompliancePanel";
import { PoliciesPanel } from "@/components/governance/PoliciesPanel";
import { VirtualRulesPanel } from "@/components/governance/VirtualRulesPanel";
import { AliasesPanel } from "@/components/governance/AliasesPanel";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useGovernanceConfig } from "@/lib/governance-store";
import { useCloudResources } from "@/lib/use-cloud-resources";

const TABS = [
  { id: "compliance", label: "Compliance" },
  { id: "policies", label: "Required tags" },
  { id: "virtual", label: "Virtual tags" },
  { id: "aliases", label: "Normalization" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function GovernancePage() {
  const [tab, setTab] = useState<TabId>("compliance");
  const config = useGovernanceConfig();
  const { status, resources, loading, errors, reload } = useCloudResources();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--muted)]">
        <Spinner className="mr-2" /> Loading...
      </div>
    );
  }

  if (!status?.aws && !status?.gcp) {
    return (
      <EmptyState
        title="No cloud connected yet"
        description="Connect an AWS account or a GCP project to define tag policies and check compliance."
        actionHref="/connect"
        actionLabel="Go to Connections"
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Tag governance</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Policies, virtual tags, and key normalization. Evaluated against {resources.length} loaded resource(s);
            settings are saved in this browser.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={reload}>
          Refresh
        </Button>
      </div>

      {errors.length > 0 && (
        <p className="rounded-md bg-[var(--danger-bg)] p-3 text-xs text-[var(--danger)]">{errors.join(" · ")}</p>
      )}

      <div className="flex w-fit rounded-md bg-[var(--surface-hover)] p-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "compliance" && <CompliancePanel resources={resources} config={config} />}
      {tab === "policies" && <PoliciesPanel config={config} />}
      {tab === "virtual" && <VirtualRulesPanel config={config} resources={resources} onApplied={reload} />}
      {tab === "aliases" && <AliasesPanel config={config} resources={resources} />}
    </div>
  );
}
