"use client";

import { useEffect, useState } from "react";
import { AwsConnectForm } from "@/components/AwsConnectForm";
import { GcpConnectForm } from "@/components/GcpConnectForm";
import { ConnectionCard } from "@/components/ConnectionCard";
import { useToast } from "@/components/ui/Toast";
import { getSessionStatus, disconnectAws, disconnectGcp } from "@/lib/api-client";
import type { SessionStatus } from "@/lib/types";

export default function ConnectPage() {
  const [status, setStatus] = useState<SessionStatus>({ aws: null, gcp: null });
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<"aws" | "gcp" | null>(null);
  const { push } = useToast();

  useEffect(() => {
    getSessionStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  async function handleDisconnect(provider: "aws" | "gcp") {
    setDisconnecting(provider);
    try {
      if (provider === "aws") await disconnectAws();
      else await disconnectGcp();
      setStatus((s) => ({ ...s, [provider]: null }));
      push({ kind: "info", title: `Disconnected from ${provider.toUpperCase()}` });
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Cloud connections</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Credentials are verified once, then held server-side in memory for this session only — never
          persisted to disk, never sent to the browser.
        </p>
      </div>

      {!loading && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">AWS</h2>
          {status.aws ? (
            <ConnectionCard
              summary={status.aws}
              onDisconnect={() => handleDisconnect("aws")}
              busy={disconnecting === "aws"}
            />
          ) : (
            <div className="rounded-lg bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)]">
              <AwsConnectForm onConnected={(summary) => setStatus((s) => ({ ...s, aws: summary }))} />
            </div>
          )}
        </section>
      )}

      {!loading && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Google Cloud</h2>
          {status.gcp ? (
            <ConnectionCard
              summary={status.gcp}
              onDisconnect={() => handleDisconnect("gcp")}
              busy={disconnecting === "gcp"}
            />
          ) : (
            <div className="rounded-lg bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)]">
              <GcpConnectForm onConnected={(summary) => setStatus((s) => ({ ...s, gcp: summary }))} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
