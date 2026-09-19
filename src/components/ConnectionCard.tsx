import { ProviderBadge } from "./ProviderBadge";
import { Button } from "./ui/Button";
import type { AwsConnectionSummary, GcpConnectionSummary } from "@/lib/types";

export function ConnectionCard({
  summary,
  onDisconnect,
  busy,
}: {
  summary: AwsConnectionSummary | GcpConnectionSummary;
  onDisconnect: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-[var(--success-bg)] p-4 ring-1 ring-inset ring-[var(--border)]">
      <div>
        <div className="flex items-center gap-2">
          <ProviderBadge provider={summary.provider} />
          <span className="text-xs font-medium text-[var(--success)]">Connected</span>
        </div>
        {summary.provider === "aws" ? (
          <div className="mt-1 text-sm text-[var(--foreground)]">
            <p>
              Account <span className="font-mono">{summary.accountId}</span> &middot; {summary.region}
            </p>
            <p className="truncate text-xs text-[var(--muted)]" title={summary.arn}>
              {summary.arn}
            </p>
          </div>
        ) : (
          <div className="mt-1 text-sm text-[var(--foreground)]">
            <p>
              Project <span className="font-mono">{summary.projectId}</span>
            </p>
            <p className="truncate text-xs text-[var(--muted)]" title={summary.serviceAccountEmail}>
              {summary.serviceAccountEmail}
            </p>
          </div>
        )}
      </div>
      <Button variant="secondary" size="sm" onClick={onDisconnect} disabled={busy}>
        Disconnect
      </Button>
    </div>
  );
}
