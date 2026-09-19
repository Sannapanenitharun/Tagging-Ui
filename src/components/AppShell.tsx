"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/resources", label: "Resources", icon: "▤" },
  { href: "/connect", label: "Connections", icon: "⇄" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-3 py-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary)] text-sm font-bold text-[var(--primary-contrast)]">
            T
          </span>
          <span className="text-sm font-semibold text-[var(--foreground)]">Tagging Console</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                )}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="px-2 text-xs text-[var(--muted)]">Multi-cloud resource tagging</p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto bg-[var(--background)] px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
