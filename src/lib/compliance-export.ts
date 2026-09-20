import { toCsv } from "./csv";
import type { ComplianceSummary } from "./governance";

/** One row per non-compliant resource, with its violations described in plain text. */
export function nonCompliantCsv(summary: ComplianceSummary): string {
  const rows = [["provider", "name", "type", "location", "id", "violations"]];
  for (const { resource, violations } of summary.nonCompliant) {
    rows.push([
      resource.provider,
      resource.name,
      resource.resourceType,
      resource.location,
      resource.id,
      violations.map((v) => (v.kind === "missing" ? `missing ${v.key}` : `${v.key}=${v.actual} not allowed`)).join("; "),
    ]);
  }
  return toCsv(rows);
}
