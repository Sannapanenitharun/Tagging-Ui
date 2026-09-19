"use client";

import { useState } from "react";
import { Drawer } from "./ui/Drawer";
import { TagPill } from "./TagPill";
import { TagAddForm } from "./TagAddForm";
import { ProviderBadge } from "./ProviderBadge";
import { Spinner } from "./ui/Spinner";
import { useToast } from "./ui/Toast";
import { applyTagsToResources, removeTagsFromResources } from "@/lib/resource-actions";
import type { CloudResource } from "@/lib/types";

export function TagEditorDrawer({
  resource,
  onClose,
  onUpdated,
}: {
  resource: CloudResource | null;
  onClose: () => void;
  onUpdated: (updated: CloudResource) => void;
}) {
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  if (!resource) return null;

  async function addTag(key: string, value: string) {
    if (!resource) return;
    setBusy(true);
    try {
      const result = await applyTagsToResources([resource], { [key]: value });
      const failed = [...(result.aws?.failed ?? []), ...(result.gcp?.failed ?? [])];
      if (failed.length) {
        push({ kind: "error", title: "Could not add tag", description: failed[0].error });
      } else {
        onUpdated({ ...resource, tags: { ...resource.tags, [key]: value } });
        push({ kind: "success", title: `Tag applied: ${key}` });
      }
    } catch (err) {
      push({ kind: "error", title: "Could not add tag", description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function removeTag(key: string) {
    if (!resource) return;
    setBusy(true);
    try {
      const result = await removeTagsFromResources([resource], [key]);
      const failed = [...(result.aws?.failed ?? []), ...(result.gcp?.failed ?? [])];
      if (failed.length) {
        push({ kind: "error", title: "Could not remove tag", description: failed[0].error });
      } else {
        const nextTags = { ...resource.tags };
        delete nextTags[key];
        onUpdated({ ...resource, tags: nextTags });
        push({ kind: "success", title: `Tag removed: ${key}` });
      }
    } catch (err) {
      push({ kind: "error", title: "Could not remove tag", description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const tagEntries = Object.entries(resource.tags);

  return (
    <Drawer open={Boolean(resource)} onClose={onClose} title="Edit tags">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <ProviderBadge provider={resource.provider} />
            <span className="text-xs text-[var(--muted)]">{resource.resourceType}</span>
          </div>
          <p className="mt-1 truncate text-sm font-medium text-[var(--foreground)]" title={resource.name}>
            {resource.name}
          </p>
          <p className="truncate text-xs text-[var(--muted)]" title={resource.id}>
            {resource.id}
          </p>
        </div>

        {!resource.taggable && (
          <p className="rounded-md bg-[var(--warning-bg)] p-2 text-xs text-[var(--warning)]">
            {resource.readOnlyReason ?? "This resource type is read-only."}
          </p>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Current tags ({tagEntries.length})
            </h3>
            {busy && <Spinner className="text-[var(--muted)]" />}
          </div>
          {tagEntries.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No tags yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tagEntries.map(([k, v]) => (
                <TagPill
                  key={k}
                  tagKey={k}
                  value={v}
                  onRemove={resource.taggable ? () => removeTag(k) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {resource.taggable && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Add a tag</h3>
            <TagAddForm providers={[resource.provider]} onAdd={addTag} busy={busy} />
          </div>
        )}
      </div>
    </Drawer>
  );
}
