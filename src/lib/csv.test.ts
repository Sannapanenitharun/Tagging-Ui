import { describe, expect, it } from "vitest";
import { csvEscape, parseValueList, toCsv } from "./csv";

describe("csvEscape", () => {
  it("quotes cells containing commas, quotes or newlines", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("a\nb")).toBe('"a\nb"');
    expect(csvEscape("plain")).toBe("plain");
  });

  it("prefixes formula leaders so spreadsheets treat them as text", () => {
    for (const lead of ["=1+1", "+1", "-1", "@SUM(A1)"]) {
      expect(csvEscape(lead)).toBe(`'${lead}`);
    }
  });
});

describe("toCsv", () => {
  it("joins rows with CRLF", () => {
    expect(toCsv([["a", "b"], ["c", "d,e"]])).toBe('a,b\r\nc,"d,e"');
  });
});

describe("parseValueList", () => {
  it("splits on commas, semicolons and newlines, trims, and dedupes", () => {
    expect(parseValueList("prod, staging;dev\r\nprod\n\n qa ")).toEqual(["prod", "staging", "dev", "qa"]);
  });
  it("returns an empty list for blank input", () => {
    expect(parseValueList("  \n ")).toEqual([]);
  });
});
