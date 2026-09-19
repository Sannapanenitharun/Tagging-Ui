"use client";

import { useState } from "react";

export function ErrorPanel({ title, message }: { title: string; message: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable; nothing to fall back to
    }
  }

  return (
    <div className="rounded-md bg-[var(--danger-bg)] p-3 ring-1 ring-inset ring-[var(--danger)]/30">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[var(--danger)]">{title}</p>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-1.5 select-text whitespace-pre-wrap break-words font-mono text-xs text-[var(--foreground)]">
        {message}
      </p>
    </div>
  );
}
