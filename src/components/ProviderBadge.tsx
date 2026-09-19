import clsx from "clsx";
import type { Provider } from "@/lib/types";

const CONFIG: Record<Provider, { label: string; fg: string; bg: string }> = {
  aws: { label: "AWS", fg: "var(--aws)", bg: "var(--aws-bg)" },
  gcp: { label: "GCP", fg: "var(--gcp)", bg: "var(--gcp-bg)" },
};

export function ProviderBadge({ provider, className }: { provider: Provider; className?: string }) {
  const { label, fg, bg } = CONFIG[provider];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        className
      )}
      style={{ color: fg, background: bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: fg }} />
      {label}
    </span>
  );
}
