import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-[var(--primary)] text-[var(--primary-contrast)] hover:bg-[var(--primary-hover)]",
  secondary:
    "bg-[var(--surface)] text-[var(--foreground)] ring-1 ring-inset ring-[var(--border)] hover:bg-[var(--surface-hover)]",
  danger: "bg-[var(--danger)] text-white hover:opacity-90",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
};

export function Button({ variant = "secondary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
}
