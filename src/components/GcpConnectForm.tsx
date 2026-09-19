"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Field, Input } from "./ui/Input";
import { ErrorPanel } from "./ui/ErrorPanel";
import { useToast } from "./ui/Toast";
import { connectGcp, ApiRequestError } from "@/lib/api-client";
import type { GcpConnectionSummary } from "@/lib/types";

export function GcpConnectForm({ onConnected }: { onConnected: (summary: GcpConnectionSummary) => void }) {
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setServiceAccountJson(text);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const summary = await connectGcp({ serviceAccountJson, projectId: projectId.trim() || undefined });
      onConnected(summary);
      push({ kind: "success", title: "Connected to GCP", description: `Project ${summary.projectId}` });
      setServiceAccountJson("");
    } catch (err) {
      const message = err instanceof ApiRequestError ? (err.details ?? err.message) : "Connection failed.";
      setError(message);
      push({ kind: "error", title: "GCP connection failed", description: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Service account key (.json)">
        <input
          type="file"
          accept="application/json"
          onChange={handleFile}
          className="block w-full text-sm text-[var(--muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface-hover)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--foreground)]"
        />
      </Field>
      <Field label="Or paste the JSON key directly" hint="Never leaves this server; kept in memory only for this session.">
        <textarea
          value={serviceAccountJson}
          onChange={(e) => setServiceAccountJson(e.target.value)}
          rows={5}
          spellCheck={false}
          className="w-full rounded-md bg-[var(--surface)] px-3 py-2 font-mono text-xs ring-1 ring-inset ring-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
        />
      </Field>
      <Field label="Project ID (optional)" hint="Defaults to the key's project_id field.">
        <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} />
      </Field>
      <p className="text-xs text-[var(--muted)]">
        Needs at least <code>roles/viewer</code> plus <code>roles/cloudasset.viewer</code> on the project to
        list resources, and per-service roles (e.g. <code>roles/compute.instanceAdmin.v1</code>,{" "}
        <code>roles/storage.admin</code>) to edit labels. See the README for a suggested custom role.
      </p>
      {error && <ErrorPanel title="GCP rejected this connection" message={error} />}
      <Button type="submit" variant="primary" disabled={busy || !serviceAccountJson} className="w-full justify-center">
        {busy ? "Connecting..." : "Connect GCP project"}
      </Button>
    </form>
  );
}
