import clsx from "clsx";

export function TagPill({
  tagKey,
  value,
  onRemove,
  className,
}: {
  tagKey: string;
  value: string;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex max-w-full items-center gap-1 rounded-md bg-[var(--surface-hover)] px-2 py-1 text-xs ring-1 ring-inset ring-[var(--border)]",
        className
      )}
      title={`${tagKey} = ${value}`}
    >
      <span className="truncate font-medium text-[var(--foreground)]">{tagKey}</span>
      {value && (
        <>
          <span className="text-[var(--muted)]">=</span>
          <span className="truncate text-[var(--muted)]">{value}</span>
        </>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${tagKey}`}
          className="ml-1 shrink-0 rounded text-[var(--muted)] hover:text-[var(--danger)]"
        >
          &times;
        </button>
      )}
    </span>
  );
}
