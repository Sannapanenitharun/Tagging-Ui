/** Cells starting with these are interpreted as formulas by spreadsheet apps (CSV injection). */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

export function csvEscape(value: string): string {
  const safe = FORMULA_LEAD.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

/** Splits pasted or imported text on commas, semicolons, or newlines; trims, drops blanks, dedupes (case-sensitive). */
export function parseValueList(text: string): string[] {
  return [...new Set(text.split(/[,;\n\r]+/).map((s) => s.trim()).filter(Boolean))];
}

/** Browser-only: triggers a file download. */
export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
