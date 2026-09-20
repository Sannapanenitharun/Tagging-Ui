"use client";

import clsx from "clsx";
import { Input } from "./ui/Input";
import type { Provider } from "@/lib/types";

export type ProviderFilter = "all" | Provider;

export function FilterBar({
  search,
  onSearchChange,
  providerFilter,
  onProviderFilterChange,
  untaggedOnly,
  onUntaggedOnlyChange,
  nonCompliantOnly,
  onNonCompliantOnlyChange,
  resultCount,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  providerFilter: ProviderFilter;
  onProviderFilterChange: (v: ProviderFilter) => void;
  untaggedOnly: boolean;
  onUntaggedOnlyChange: (v: boolean) => void;
  /** Only rendered when a handler is provided (i.e. required-tag policies exist). */
  nonCompliantOnly?: boolean;
  onNonCompliantOnlyChange?: (v: boolean) => void;
  resultCount: number;
}) {
  const tabs: { value: ProviderFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "aws", label: "AWS" },
    { value: "gcp", label: "GCP" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-md bg-[var(--surface-hover)] p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onProviderFilterChange(tab.value)}
            className={clsx(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              providerFilter === tab.value
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-w-[220px] flex-1">
        <Input
          placeholder="Search by name, type, or tag..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
        <input
          type="checkbox"
          checked={untaggedOnly}
          onChange={(e) => onUntaggedOnlyChange(e.target.checked)}
        />
        Untagged only
      </label>

      {onNonCompliantOnlyChange && (
        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
          <input
            type="checkbox"
            checked={Boolean(nonCompliantOnly)}
            onChange={(e) => onNonCompliantOnlyChange(e.target.checked)}
          />
          Non-compliant only
        </label>
      )}

      <span className="text-xs text-[var(--muted)]">{resultCount} resource(s)</span>
    </div>
  );
}
