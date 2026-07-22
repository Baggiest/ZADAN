"use client";

import type { DatasetStats, MappedCity, MetricKey } from "@/lib/types";
import { sortByMetric } from "@/lib/heat";

interface SidebarProps {
  stats: DatasetStats;
  cities: MappedCity[];
  metric: MetricKey;
  selectedCity: string | null;
  onSelectCity: (city: string) => void;
  compact?: boolean;
}

export function Sidebar({
  stats,
  cities,
  metric,
  selectedCity,
  onSelectCity,
  compact = false,
}: SidebarProps) {
  const top = sortByMetric(cities, metric).slice(0, 20);

  return (
    <aside
      className={`flex h-full min-h-0 flex-col rounded-lg border border-[#1F2937] ${
        compact
          ? "bg-[#111827]/92 shadow-lg backdrop-blur-md"
          : "bg-[#111827]"
      }`}
    >
      <div className="border-b border-[#1F2937] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#E5E7EB]">Statistics</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-[#9CA3AF]">Total Messages</dt>
            <dd className="font-mono tabular-nums text-[#E5E7EB]">
              {stats.totalMessages.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-[#9CA3AF]">Unique Cities</dt>
            <dd className="font-mono tabular-nums text-[#E5E7EB]">
              {stats.uniqueCities.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-[#9CA3AF]">Highest Mentions</dt>
            <dd className="font-mono tabular-nums text-[#E5E7EB]">
              {stats.highestMentionCount.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-[#9CA3AF]">Avg Coverage</dt>
            <dd className="font-mono tabular-nums text-[#E5E7EB]">
              {stats.averageCoverage.toFixed(1)}%
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-[#1F2937] px-4 py-2">
          <h3 className="text-sm font-semibold text-[#E5E7EB]">Top 20 Cities</h3>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {top.length === 0 ? (
            <li className="px-2 py-4 text-center text-xs text-[#6B7280]">
              Upload a CSV to see rankings
            </li>
          ) : (
            top.map((city) => {
              const active =
                selectedCity === city.city ||
                selectedCity === city.resolvedName;
              return (
                <li key={`${city.rank}-${city.city}`}>
                  <button
                    type="button"
                    onClick={() => onSelectCity(city.city)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      active
                        ? "bg-[#FF4D4F]/15 text-[#FF4D4F]"
                        : "text-[#E5E7EB] hover:bg-[#1F2937]"
                    }`}
                  >
                    <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-[#9CA3AF]">
                      {city.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate" dir="auto">
                      {city.city}
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-[#9CA3AF]">
                      {city.messages_mentioning}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </aside>
  );
}

export function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-[152px] z-10 rounded-md border border-[#1F2937]/90 bg-[#0B1220]/90 px-3 py-2 backdrop-blur-sm sm:left-[160px]">
      <p className="mb-1.5 text-[10px] uppercase tracking-wider text-[#9CA3AF]">
        Activity
      </p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#9CA3AF]">Low</span>
        <div
          className="h-2 w-28 rounded-sm"
          style={{
            background:
              "linear-gradient(90deg, #FFE66D 0%, #FF9F1C 33%, #FF3B30 66%, #B10000 100%)",
          }}
        />
        <span className="text-[10px] text-[#9CA3AF]">High</span>
      </div>
    </div>
  );
}
