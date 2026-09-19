import type { Provider } from "@/lib/types";

const CONFIG: Record<Provider, { color: string; bg: string }> = {
  aws: { color: "var(--aws)", bg: "var(--aws-bg)" },
  gcp: { color: "var(--gcp)", bg: "var(--gcp-bg)" },
};

/** Generic cloud glyph, tinted per provider — not a brand logo, just a recognizable "this is a cloud" shape. */
export function CloudIcon({ provider, size = 40 }: { provider: Provider; size?: number }) {
  const { color, bg } = CONFIG[provider];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl"
      style={{ width: size, height: size, background: bg, color }}
    >
      <svg width={size * 0.55} height={size * 0.55 * 0.6} viewBox="0 0 64 40" fill="currentColor" aria-hidden="true">
        <ellipse cx="20" cy="24" rx="14" ry="12" />
        <ellipse cx="34" cy="16" rx="16" ry="14" />
        <ellipse cx="48" cy="24" rx="13" ry="11" />
        <rect x="10" y="22" width="44" height="14" rx="7" />
      </svg>
    </span>
  );
}
