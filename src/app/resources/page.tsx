"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterBar, type ProviderFilter } from "@/components/FilterBar";
import { ResourceTable } from "@/components/ResourceTable";
import { SelectionBar } from "@/components/SelectionBar";
import { TagEditorDrawer } from "@/components/TagEditorDrawer";
import { BulkTagDrawer } from "@/components/BulkTagDrawer";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { getSessionStatus, listAwsResources, listGcpResources } from "@/lib/api-client";
import type { CloudResource, SessionStatus } from "@/lib/types";

export default function ResourcesPage() {
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [resources, setResources] = useState<CloudResource[]>([]);
  const [awsNextToken, setAwsNextToken] = useState<string | undefined>();
  const [gcpNextToken, setGcpNextToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [untaggedOnly, setUntaggedOnly] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<CloudResource | null>(null);
  const [bulkEditing, setBulkEditing] = useState(false);

  const { push } = useToast();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getSessionStatus();
      setStatus(s);

      const [awsResult, gcpResult] = await Promise.all([
        s.aws
          ? listAwsResources().catch((err) => {
              push({ kind: "error", title: "Could not load AWS resources", description: (err as Error).message });
              return null;
            })
          : null,
        s.gcp
          ? listGcpResources().catch((err) => {
              push({ kind: "error", title: "Could not load GCP resources", description: (err as Error).message });
              return null;
            })
          : null,
      ]);

      const results: CloudResource[] = [];
      if (awsResult) {
        results.push(...awsResult.resources);
        setAwsNextToken(awsResult.nextToken);
      }
      if (gcpResult) {
        results.push(...gcpResult.resources);
        setGcpNextToken(gcpResult.nextPageToken);
      }
      setResources(results);
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    // Fetches from the session/resource APIs on mount; state updates land
    // asynchronously after the network round-trip, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const [awsResult, gcpResult] = await Promise.all([
        awsNextToken ? listAwsResources({ nextToken: awsNextToken }) : null,
        gcpNextToken ? listGcpResources({ pageToken: gcpNextToken }) : null,
      ]);

      const additions: CloudResource[] = [];
      if (awsResult) {
        additions.push(...awsResult.resources);
        setAwsNextToken(awsResult.nextToken);
      }
      if (gcpResult) {
        additions.push(...gcpResult.resources);
        setGcpNextToken(gcpResult.nextPageToken);
      }
      setResources((prev) => [...prev, ...additions]);
    } finally {
      setLoadingMore(false);
    }
  }

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (providerFilter !== "all" && r.provider !== providerFilter) return false;
      if (untaggedOnly && Object.keys(r.tags).length > 0) return false;
      if (search.trim()) {
        const needle = search.trim().toLowerCase();
        const haystack = [
          r.name,
          r.resourceType,
          r.location,
          ...Object.entries(r.tags).flatMap(([k, v]) => [k, v]),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [resources, providerFilter, untaggedOnly, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const allSelected = filtered.length > 0 && filtered.every((r) => prev.has(r.id));
      if (allSelected) return new Set();
      return new Set(filtered.map((r) => r.id));
    });
  }

  function updateResource(updated: CloudResource) {
    setResources((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setEditing(updated);
  }

  const selectedResources = resources.filter((r) => selected.has(r.id));
  const hasAnyConnection = Boolean(status?.aws || status?.gcp);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--muted)]">
        <Spinner className="mr-2" /> Loading resources...
      </div>
    );
  }

  if (!hasAnyConnection) {
    return (
      <EmptyState
        title="No cloud connected yet"
        description="Connect an AWS account or a GCP project to start browsing and tagging its resources."
        actionHref="/connect"
        actionLabel="Go to Connections"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Resources</h1>
        <Button variant="secondary" size="sm" onClick={loadAll}>
          Refresh
        </Button>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        providerFilter={providerFilter}
        onProviderFilterChange={setProviderFilter}
        untaggedOnly={untaggedOnly}
        onUntaggedOnlyChange={setUntaggedOnly}
        resultCount={filtered.length}
      />

      <SelectionBar
        count={selected.size}
        onBulkEdit={() => setBulkEditing(true)}
        onClear={() => setSelected(new Set())}
      />

      {filtered.length === 0 ? (
        <EmptyState title="No resources match" description="Try clearing filters or connecting another cloud." />
      ) : (
        <ResourceTable
          resources={filtered}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onEdit={setEditing}
        />
      )}

      {(awsNextToken || gcpNextToken) && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}

      <TagEditorDrawer resource={editing} onClose={() => setEditing(null)} onUpdated={updateResource} />

      {bulkEditing && (
        <BulkTagDrawer
          resources={selectedResources}
          onClose={() => setBulkEditing(false)}
          onApplied={(tags) => {
            setResources((prev) =>
              prev.map((r) => (selected.has(r.id) && r.taggable ? { ...r, tags: { ...r.tags, ...tags } } : r))
            );
          }}
        />
      )}
    </div>
  );
}
