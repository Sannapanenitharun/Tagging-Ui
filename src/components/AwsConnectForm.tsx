"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Field, Input } from "./ui/Input";
import { ErrorPanel } from "./ui/ErrorPanel";
import { useToast } from "./ui/Toast";
import { connectAws, ApiRequestError } from "@/lib/api-client";
import { AWS_REGIONS } from "@/lib/aws-regions";
import type { AwsConnectionSummary } from "@/lib/types";

export function AwsConnectForm({ onConnected }: { onConnected: (summary: AwsConnectionSummary) => void }) {
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const summary = await connectAws({
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        sessionToken: sessionToken.trim() || undefined,
        region,
      });
      onConnected(summary);
      push({ kind: "success", title: "Connected to AWS", description: `Account ${summary.accountId}` });
      setAccessKeyId("");
      setSecretAccessKey("");
      setSessionToken("");
    } catch (err) {
      const message = err instanceof ApiRequestError ? (err.details ?? err.message) : "Connection failed.";
      setError(message);
      push({ kind: "error", title: "AWS connection failed", description: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Access key ID">
        <Input
          value={accessKeyId}
          onChange={(e) => setAccessKeyId(e.target.value)}
          autoComplete="off"
          required
        />
      </Field>
      <Field label="Secret access key">
        <Input
          type="password"
          value={secretAccessKey}
          onChange={(e) => setSecretAccessKey(e.target.value)}
          autoComplete="off"
          required
        />
      </Field>
      <Field label="Session token (optional, for temporary credentials)">
        <Input value={sessionToken} onChange={(e) => setSessionToken(e.target.value)} autoComplete="off" />
      </Field>
      <Field label="Region">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full rounded-md bg-[var(--surface)] px-3 py-2 text-sm ring-1 ring-inset ring-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
        >
          {AWS_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-xs text-[var(--muted)]">
        Requires an IAM identity with <code>tag:GetResources</code>, <code>tag:TagResources</code>,{" "}
        <code>tag:UntagResources</code>, <code>tag:GetTagKeys</code>, and <code>sts:GetCallerIdentity</code>. See
        the README for a ready-to-use least-privilege policy.
      </p>
      {error && <ErrorPanel title="AWS rejected this connection" message={error} />}
      <Button type="submit" variant="primary" disabled={busy} className="w-full justify-center">
        {busy ? "Connecting..." : "Connect AWS account"}
      </Button>
    </form>
  );
}
