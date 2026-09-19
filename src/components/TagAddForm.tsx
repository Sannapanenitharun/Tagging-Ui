"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { validateSingleTag, tagHint } from "@/lib/validation";
import type { Provider } from "@/lib/types";

export function TagAddForm({
  providers,
  onAdd,
  busy,
}: {
  providers: Provider[];
  onAdd: (key: string, value: string) => void;
  busy?: boolean;
}) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function submit() {
    const trimmedKey = key.trim();
    const messages = new Set<string>();
    for (const provider of providers) {
      const result = validateSingleTag(provider, trimmedKey, value);
      for (const e of result.errors) messages.add(`${provider.toUpperCase()}: ${e.message}`);
    }
    if (!trimmedKey) messages.add("Key is required.");
    if (messages.size > 0) {
      setErrors([...messages]);
      return;
    }
    setErrors([]);
    onAdd(trimmedKey, value);
    setKey("");
    setValue("");
  }

  return (
    <div className="space-y-2 rounded-md bg-[var(--surface-hover)] p-3">
      <div className="flex gap-2">
        <Input placeholder="key" value={key} onChange={(e) => setKey(e.target.value)} />
        <Input placeholder="value" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={submit}
          disabled={busy || !key.trim()}
          className="shrink-0"
        >
          Add
        </Button>
      </div>
      {errors.length > 0 ? (
        <ul className="space-y-0.5 text-xs text-[var(--danger)]">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--muted)]">{providers.map(tagHint).join(" · ")}</p>
      )}
    </div>
  );
}
