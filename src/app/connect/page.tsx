"use client";

import { useCallback, useEffect, useState } from "react";
import { AwsConnectForm } from "@/components/AwsConnectForm";
import { GcpConnectForm } from "@/components/GcpConnectForm";
import { ConnectionCard } from "@/components/ConnectionCard";
import { ConnectCloudTile } from "@/components/ConnectCloudTile";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getSessionStatus, disconnectAws, disconnectGcp } from "@/lib/api-client";
import type { Provider, SessionStatus } from "@/lib/types";

export default function ConnectPage() {
  const [status, setStatus] = useState<SessionStatus>({ aws: null, gcp: null });
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [disconnecting, setDisconnecting] = useState<Provider | null>(null);
  const [openForm, setOpenForm] = useState<Provider | null>(null);
  const { push } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    setTimedOut(false);
    return getSessionStatus()
      .then(setStatus)
      .catch((err) => {
        push({ kind: "error", title: "Could not load connection status", description: (err as Error).message });
      })
      .finally(() => setLoading(false));
  }, [push]);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 8000);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => clearTimeout(timer));
    return () => clearTimeout(timer);
  }, [load]);

  async function handleDisconnect(provider: Provider) {
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Cloud connections</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Credentials are verified once, then held server-side in memory for this session only — never
          persisted to disk, never sent to the browser.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-12 text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <Spinner /> Loading...
          </div>
          {timedOut && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm">This is taking longer than expected.</p>
              <Button variant="secondary" size="sm" onClick={load}>
                Retry
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {status.aws ? (
            <ConnectionCard
              summary={status.aws}
              onDisconnect={() => handleDisconnect("aws")}
              busy={disconnecting === "aws"}
            />
          ) : (
            <ConnectCloudTile
              provider="aws"
              title="AWS"
              description="Connect an AWS account with an access key."
              onConnect={() => setOpenForm("aws")}
            />
          )}

          {status.gcp ? (
            <ConnectionCard
              summary={status.gcp}
              onDisconnect={() => handleDisconnect("gcp")}
              busy={disconnecting === "gcp"}
            />
          ) : (
            <ConnectCloudTile
              provider="gcp"
              title="Google Cloud"
              description="Connect a GCP project with a service account key."
              onConnect={() => setOpenForm("gcp")}
            />
          )}
        </div>
      )}

      <Modal open={openForm === "aws"} onClose={() => setOpenForm(null)} title="Connect AWS">
        <AwsConnectForm
          onConnected={(summary) => {
            setStatus((s) => ({ ...s, aws: summary }));
            setOpenForm(null);
          }}
        />
      </Modal>

      <Modal open={openForm === "gcp"} onClose={() => setOpenForm(null)} title="Connect Google Cloud">
        <GcpConnectForm
          onConnected={(summary) => {
            setStatus((s) => ({ ...s, gcp: summary }));
            setOpenForm(null);
          }}
        />
      </Modal>
    </div>
  );
}
