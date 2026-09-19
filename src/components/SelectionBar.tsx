import { Button } from "./ui/Button";

export function SelectionBar({
  count,
  onBulkEdit,
  onClear,
}: {
  count: number;
  onBulkEdit: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-between rounded-md bg-[var(--primary)]/10 px-4 py-2 ring-1 ring-inset ring-[var(--primary)]/30">
      <span className="text-sm font-medium text-[var(--foreground)]">{count} selected</span>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={onBulkEdit}>
          Bulk edit tags
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
