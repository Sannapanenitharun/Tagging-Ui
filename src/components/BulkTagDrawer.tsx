"use client";

import { useMemo, useState } from "react";
import { Drawer } from "./ui/Drawer";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { TagAddForm } from "./TagAddForm";
import { ProviderBadge } from "./ProviderBadge";
import { useToast } from "./ui/Toast";
import { applyTagsToResources, removeTagsFromResources, combinedFailures } from "@/lib/resource-actions";
import type { CloudResource, Provider } from "@/lib/types";

export function BulkTagDrawer({
  resources,
  onClose,
  onApplied,
}: {
  resources: CloudResource[];
  onClose: () => void;
  onApplied: (tags: Record<string, string>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [removeKey, setRemoveKey] = useState("");
  const { push } = useToast();

  const open = resources.length > 0;
  const providers = useMemo(
    () => [...new Set(resources.map((r) => r.provider))] as Provider[],
    [resources]
  );
  const taggable = resources.filter((r) => r.taggable);
  const skipped = resources.filter((r) => !r.taggable);

  async function handleAdd(key: string, value: string) {
    setBusy(true);
    try {
      const result = await applyTagsToResources(taggable, { [key]: value });
      const failed = combinedFailures(result);
      if (failed.length) {
        push({
          kind: "error",
          title: `${failed.length} resource(s) failed`,
          description: failed[0].error,
        });
      }
      const okCount = taggable.length - failed.length;
      if (okCount > 0) {
        push({ kind: "success", title: `Applied "${key}" to ${okCount} resource(s)` });
        onApplied({ [key]: value });
      }
    } catch (err) {
      push({ kind: "error", title: "Bulk tag failed", description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    const key = removeKey.trim();
    if (!key) return;
    setBusy(true);
    try {
      const result = await removeTagsFromResources(taggable, [key]);
      const failed = combinedFailures(result);
      if (failed.length) {
        push({ kind: "error", title: `${failed.length} resource(s) failed`, description: failed[0].error });
      }
      const okCount = taggable.length - failed.length;
      if (okCount > 0) {
        push({ kind: "success", title: `Removed "${key}" from ${okCount} resource(s)` });
        setRemoveKey("");
      }
    } catch (err) {
      push({ kind: "error", title: "Bulk remove failed", description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <Drawer open={open} onClose={onClose} title={`Bulk edit tags (${resources.length} selected)`}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {providers.map((p) => (
            <ProviderBadge key={p} provider={p} />
          ))}
        </div>

        {skipped.length > 0 && (
          <p className="rounded-md bg-[var(--warning-bg)] p-2 text-xs text-[var(--warning)]">
            {skipped.length} of {resources.length} selected resource(s) are read-only and will be skipped.
          </p>
        )}

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Apply a tag to {taggable.length} resource(s)
          </h3>
          <TagAddForm providers={providers} onAdd={handleAdd} busy={busy} />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Remove a tag key from {taggable.length} resource(s)
          </h3>
          <div className="flex gap-2">
            <Input placeholder="key to remove" value={removeKey} onChange={(e) => setRemoveKey(e.target.value)} />
            <Button variant="danger" size="sm" onClick={handleRemove} disabled={busy || !removeKey.trim()}>
              Remove
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
