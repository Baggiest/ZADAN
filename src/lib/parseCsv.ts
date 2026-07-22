import Papa from "papaparse";
import type { AliasesMap, CityRow } from "./types";

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.trim().replace("%", "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeCityKey(name: string): string {
  return name
    .trim()
    .replace(/[\u200c\u200d]/g, "")
    .replace(/ك/g, "ک")
    .replace(/ي/g, "ی")
    .replace(/\s+/g, " ");
}

export function resolveCityName(
  raw: string,
  aliases: AliasesMap,
): string {
  const trimmed = raw.trim();
  if (aliases[trimmed]) return aliases[trimmed];
  const normalized = normalizeCityKey(trimmed);
  if (aliases[normalized]) return aliases[normalized];
  // Try alias keys normalized
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (normalizeCityKey(alias) === normalized) return canonical;
  }
  return trimmed;
}

export function parseCityCsv(text: string): CityRow[] {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const rows: CityRow[] = [];

  for (const row of parsed.data) {
    if (!row || typeof row !== "object") continue;
    const city = (row.city ?? "").trim();
    if (!city) continue;

    const rank = toNumber(row.rank);
    const messages = toNumber(row.messages_mentioning);
    const total = toNumber(row.total_messages);
    const pct = toNumber(row.pct_of_messages);

    if (
      rank === null ||
      messages === null ||
      total === null ||
      pct === null
    ) {
      continue;
    }

    rows.push({
      rank,
      city,
      messages_mentioning: messages,
      total_messages: total,
      pct_of_messages: pct,
    });
  }

  return rows;
}

export async function parseCityCsvFile(file: File): Promise<CityRow[]> {
  const text = await file.text();
  return parseCityCsv(text);
}
