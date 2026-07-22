import type {
  AliasesMap,
  CityCoordinatesMap,
  CityRow,
  DatasetStats,
  MappedCity,
  MetricKey,
} from "./types";
import { resolveCityName } from "./parseCsv";

export function mapCities(
  rows: CityRow[],
  coords: CityCoordinatesMap,
  aliases: AliasesMap,
): MappedCity[] {
  const mapped: MappedCity[] = [];

  for (const row of rows) {
    const resolvedName = resolveCityName(row.city, aliases);
    const point = coords[resolvedName] ?? coords[row.city];
    if (!point) continue;
    mapped.push({
      ...row,
      city: row.city,
      resolvedName,
      lat: point.lat,
      lon: point.lon,
    });
  }

  return mapped;
}

export function computeStats(
  rows: CityRow[],
  mapped: MappedCity[],
): DatasetStats {
  if (rows.length === 0) {
    return {
      totalMessages: 0,
      uniqueCities: 0,
      mappedCities: 0,
      highestMentionCount: 0,
      averageCoverage: 0,
      maximumCoverage: 0,
    };
  }

  const totalMessages = rows[0]?.total_messages ?? 0;
  const highestMentionCount = Math.max(
    ...rows.map((r) => r.messages_mentioning),
  );
  const maximumCoverage = Math.max(...rows.map((r) => r.pct_of_messages));
  const averageCoverage =
    rows.reduce((sum, r) => sum + r.pct_of_messages, 0) / rows.length;

  return {
    totalMessages,
    uniqueCities: rows.length,
    mappedCities: mapped.length,
    highestMentionCount,
    averageCoverage,
    maximumCoverage,
  };
}

export function metricValue(city: CityRow, metric: MetricKey): number {
  switch (metric) {
    case "pct_of_messages":
      return city.pct_of_messages;
    case "rank":
      // Invert rank so lower rank = hotter
      return 1 / Math.max(city.rank, 1);
    case "messages_mentioning":
    default:
      return city.messages_mentioning;
  }
}

export function sortByMetric(
  cities: MappedCity[],
  metric: MetricKey,
): MappedCity[] {
  return [...cities].sort((a, b) => {
    if (metric === "rank") return a.rank - b.rank;
    return metricValue(b, metric) - metricValue(a, metric);
  });
}

export function heatRadius(messages: number): number {
  return 6 + Math.log(Math.max(messages, 1)) * 12;
}

export function heatOpacity(
  value: number,
  min: number,
  max: number,
): number {
  if (max <= min) return 0.55;
  const t = (value - min) / (max - min);
  return 0.15 + t * (0.8 - 0.15);
}

export const HEAT_COLORS = [
  "#FFE66D",
  "#FF9F1C",
  "#FF3B30",
  "#B10000",
] as const;

/** Bounding box for Iran-ish active cities [lonMin, latMin, lonMax, latMax] */
export function citiesBounds(
  cities: Array<{ lat: number; lon: number }>,
): [number, number, number, number] | null {
  if (cities.length === 0) return null;
  let lonMin = Infinity;
  let latMin = Infinity;
  let lonMax = -Infinity;
  let latMax = -Infinity;
  for (const c of cities) {
    lonMin = Math.min(lonMin, c.lon);
    lonMax = Math.max(lonMax, c.lon);
    latMin = Math.min(latMin, c.lat);
    latMax = Math.max(latMax, c.lat);
  }
  // Pad
  const lonPad = Math.max((lonMax - lonMin) * 0.15, 0.8);
  const latPad = Math.max((latMax - latMin) * 0.15, 0.8);
  return [
    lonMin - lonPad,
    latMin - latPad,
    lonMax + lonPad,
    latMax + latPad,
  ];
}
