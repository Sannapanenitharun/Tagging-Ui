"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    let stored: Theme = "system";
    try {
      stored = (localStorage.getItem("tagging-ui-theme") as Theme) || "system";
    } catch {
      // ignore
    }
    // localStorage is only readable client-side; syncing it into state on
    // mount (rather than during render) avoids a server/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(stored);
    applyTheme(stored);
  }, []);

  function cycle() {
    const next: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem("tagging-ui-theme", next);
    } catch {
      // ignore
    }
  }

  const icon = theme === "light" ? "☀" : theme === "dark" ? "☽" : "◑";
  const label = theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] ring-1 ring-inset ring-[var(--border)] hover:bg-[var(--surface-hover)]"
      title="Toggle theme"
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
