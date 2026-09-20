"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_GOVERNANCE, type GovernanceConfig } from "./governance";

const STORAGE_KEY = "tagging-ui-governance";

let cache: { raw: string | null | undefined; value: GovernanceConfig } = { raw: undefined, value: EMPTY_GOVERNANCE };
const listeners = new Set<() => void>();

function read(): GovernanceConfig {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return cache.value;
  }
  if (raw === cache.raw) return cache.value;
  let value = EMPTY_GOVERNANCE;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<GovernanceConfig>;
      value = {
        policies: parsed.policies ?? [],
        rules: parsed.rules ?? [],
        aliases: parsed.aliases ?? [],
      };
    } catch {
      value = EMPTY_GOVERNANCE;
    }
  }
  cache = { raw, value };
  return value;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useGovernanceConfig(): GovernanceConfig {
  return useSyncExternalStore(subscribe, read, () => EMPTY_GOVERNANCE);
}

export function saveGovernanceConfig(next: GovernanceConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode / quota); config stays in-memory only for this tab
    cache = { raw: undefined, value: next };
  }
  listeners.forEach((l) => l());
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
