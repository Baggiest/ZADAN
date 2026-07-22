export type MetricKey = "messages_mentioning" | "pct_of_messages" | "rank";

export interface CityRow {
  rank: number;
  city: string;
  messages_mentioning: number;
  total_messages: number;
  pct_of_messages: number;
}

export interface CityCoords {
  lat: number;
  lon: number;
}

export type CityCoordinatesMap = Record<string, CityCoords>;
export type AliasesMap = Record<string, string>;

export interface MappedCity extends CityRow {
  lat: number;
  lon: number;
  resolvedName: string;
}

export interface DatasetStats {
  totalMessages: number;
  uniqueCities: number;
  mappedCities: number;
  highestMentionCount: number;
  averageCoverage: number;
  maximumCoverage: number;
}

export interface UploadHistoryItem {
  id: string;
  name: string;
  uploadedAt: number;
  rows: CityRow[];
}

export interface HeatPoint {
  city: MappedCity;
  radius: number;
  opacity: number;
  color: string;
  value: number;
}
