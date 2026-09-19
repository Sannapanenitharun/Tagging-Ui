import Link from "next/link";
import { Button } from "./ui/Button";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] px-6 py-16 text-center">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="mt-4">
          <Button variant="primary">{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
