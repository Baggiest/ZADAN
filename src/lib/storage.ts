import type { CityRow, UploadHistoryItem } from "./types";

const HISTORY_KEY = "zadan-upload-history";
const MAX_HISTORY = 8;

export function loadUploadHistory(): UploadHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UploadHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUploadHistory(items: UploadHistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch {
    // Quota exceeded — drop oldest payloads
    try {
      const slim = items.slice(0, 3).map((item) => ({
        ...item,
        rows: item.rows.slice(0, 50),
      }));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(slim));
    } catch {
      /* ignore */
    }
  }
}

export function pushUploadHistory(
  name: string,
  rows: CityRow[],
  existing: UploadHistoryItem[],
): UploadHistoryItem[] {
  const item: UploadHistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    uploadedAt: Date.now(),
    rows,
  };
  const next = [item, ...existing.filter((h) => h.name !== name)].slice(
    0,
    MAX_HISTORY,
  );
  saveUploadHistory(next);
  return next;
}
