"use client";

import { ProviderBadge } from "./ProviderBadge";
import { TagPill } from "./TagPill";
import type { CloudResource } from "@/lib/types";

const VISIBLE_TAGS = 3;

export function ResourceTable({
  resources,
  selected,
  onToggle,
  onToggleAll,
  onEdit,
}: {
  resources: CloudResource[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onEdit: (resource: CloudResource) => void;
}) {
  const allSelected = resources.length > 0 && resources.every((r) => selected.has(r.id));

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-[var(--border)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
            <th className="w-10 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="Select all resources"
              />
            </th>
            <th className="px-3 py-2">Resource</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Location</th>
            <th className="px-3 py-2">Tags</th>
            <th className="w-20 px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((r) => {
            const entries = Object.entries(r.tags);
            const shown = entries.slice(0, VISIBLE_TAGS);
            const overflow = entries.length - shown.length;
            return (
              <tr
                key={r.id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)]"
              >
                <td className="px-3 py-2 align-top">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => onToggle(r.id)}
                    aria-label={`Select ${r.name}`}
                  />
                </td>
                <td className="max-w-[220px] px-3 py-2 align-top">
                  <div className="flex items-center gap-2">
                    <ProviderBadge provider={r.provider} />
                  </div>
                  <p className="mt-1 truncate font-medium text-[var(--foreground)]" title={r.name}>
                    {r.name}
                  </p>
                  {entries.length === 0 && (
                    <span className="text-xs font-medium text-[var(--warning)]">Untagged</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top text-[var(--muted)]">{r.resourceType}</td>
                <td className="px-3 py-2 align-top text-[var(--muted)]">{r.location}</td>
                <td className="max-w-[320px] px-3 py-2 align-top">
                  <div className="flex flex-wrap gap-1">
                    {shown.map(([k, v]) => (
                      <TagPill key={k} tagKey={k} value={v} />
                    ))}
                    {overflow > 0 && (
                      <span className="self-center text-xs text-[var(--muted)]">+{overflow} more</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <button
                    type="button"
                    onClick={() => onEdit(r)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--surface-hover)]"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
