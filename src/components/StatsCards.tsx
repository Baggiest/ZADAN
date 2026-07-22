"use client";

import type { DatasetStats } from "@/lib/types";

interface StatsCardsProps {
  stats: DatasetStats;
}

function Card({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[#1F2937] bg-[#111827] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-[#9CA3AF]">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#E5E7EB]">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-[#6B7280]">{hint}</p>
      ) : null}
    </div>
  );
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card
        label="Total Messages"
        value={stats.totalMessages.toLocaleString()}
      />
      <Card
        label="Cities Mentioned"
        value={stats.uniqueCities.toLocaleString()}
        hint={`${stats.mappedCities} on map`}
      />
      <Card
        label="Maximum Coverage"
        value={`${stats.maximumCoverage.toFixed(1)}%`}
      />
      <Card
        label="Highest Mention Count"
        value={stats.highestMentionCount.toLocaleString()}
      />
    </div>
  );
}
