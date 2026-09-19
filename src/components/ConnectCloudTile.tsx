import { CloudIcon } from "./CloudIcon";
import { Button } from "./ui/Button";
import { LinkIcon } from "./ui/LinkIcon";
import type { Provider } from "@/lib/types";

export function ConnectCloudTile({
  provider,
  title,
  description,
  onConnect,
}: {
  provider: Provider;
  title: string;
  description: string;
  onConnect: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)]">
      <div className="flex items-center gap-3">
        <CloudIcon provider={provider} />
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
          <p className="text-xs text-[var(--muted)]">{description}</p>
        </div>
      </div>
      <Button variant="primary" size="sm" onClick={onConnect}>
        <LinkIcon /> Connect
      </Button>
    </div>
  );
}
