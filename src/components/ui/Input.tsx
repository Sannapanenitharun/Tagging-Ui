import clsx from "clsx";
import type { InputHTMLAttributes, LabelHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-md bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]",
        "ring-1 ring-inset ring-[var(--border)] placeholder:text-[var(--muted)]",
        "focus:ring-2 focus:ring-[var(--primary)] focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block" {...props}>
      <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span>}
    </label>
  );
}
