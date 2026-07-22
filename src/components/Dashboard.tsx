"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toPng, toSvg } from "html-to-image";
import { CsvUpload, MetricFilter, SearchBox } from "./CsvUpload";
import { StatsCards } from "./StatsCards";
import { Sidebar } from "./Sidebar";
import { IranHeatMap } from "./IranHeatMap";
import { parseCityCsv, parseCityCsvFile } from "@/lib/parseCsv";
import { computeStats, mapCities } from "@/lib/heat";
import {
  loadUploadHistory,
  pushUploadHistory,
} from "@/lib/storage";
import type {
  AliasesMap,
  CityCoordinatesMap,
  CityRow,
  MetricKey,
  UploadHistoryItem,
} from "@/lib/types";

export type TimeWindow = 24 | 48 | 72 | "all";

const SAMPLE_BY_WINDOW: Record<TimeWindow, string> = {
  24: "/sample/counts-24h.csv",
  48: "/sample/counts-48h.csv",
  72: "/sample/counts-72h.csv",
  all: "/sample/counts.csv",
};

const WINDOW_LABEL: Record<TimeWindow, string> = {
  24: "24h",
  48: "48h",
  72: "72h",
  all: "All",
};

export function Dashboard() {
  const [coords, setCoords] = useState<CityCoordinatesMap>({});
  const [aliases, setAliases] = useState<AliasesMap>({});
  const [rows, setRows] = useState<CityRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<MetricKey>("messages_mentioning");
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [showProvinces, setShowProvinces] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [autoFit, setAutoFit] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [ready, setReady] = useState(false);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(24);
  const [windowCache, setWindowCache] = useState<
    Partial<Record<TimeWindow, CityRow[]>>
  >({});
  const windowCacheRef = useRef(windowCache);
  windowCacheRef.current = windowCache;

  const mapRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setHistory(loadUploadHistory());
    Promise.all([
      fetch("/data/cityCoordinates.json").then((r) => r.json()),
      fetch("/data/aliases.json").then((r) => r.json()),
    ])
      .then(([c, a]) => {
        setCoords(c);
        setAliases(a);
        setReady(true);
      })
      .catch(() => setError("Failed to load city coordinate data."));
  }, []);

  const applyRows = useCallback(
    (next: CityRow[], name: string, saveHistory = true) => {
      setRows(next);
      setFileName(name);
      setSelectedCity(null);
      setError(next.length === 0 ? "No valid rows found in CSV." : null);
      if (saveHistory && next.length > 0) {
        setHistory((prev) => pushUploadHistory(name, next, prev));
      }
    },
    [],
  );

  const loadWindow = useCallback(
    async (window: TimeWindow) => {
      const cached = windowCacheRef.current[window];
      if (cached) {
        applyRows(cached, `sample · past ${WINDOW_LABEL[window]}`, false);
        return;
      }
      setBusy(true);
      try {
        const res = await fetch(SAMPLE_BY_WINDOW[window]);
        if (!res.ok) throw new Error("fetch failed");
        const text = await res.text();
        const parsed = parseCityCsv(text);
        setWindowCache((prev) => {
          const next = { ...prev, [window]: parsed };
          windowCacheRef.current = next;
          return next;
        });
        applyRows(parsed, `sample · past ${WINDOW_LABEL[window]}`, false);
      } catch {
        setError(`Could not load ${WINDOW_LABEL[window]} sample data.`);
      } finally {
        setBusy(false);
      }
    },
    [applyRows],
  );

  useEffect(() => {
    if (!ready) return;
    void loadWindow(timeWindow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const selectTimeWindow = (window: TimeWindow) => {
    setTimeWindow(window);
    void loadWindow(window);
  };

  const mapped = useMemo(
    () => mapCities(rows, coords, aliases),
    [rows, coords, aliases],
  );
  const stats = useMemo(() => computeStats(rows, mapped), [rows, mapped]);

  const handleUpload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const parsed = await parseCityCsvFile(file);
      applyRows(parsed, file.name, true);
    } catch {
      setError("Could not parse CSV file.");
    } finally {
      setBusy(false);
    }
  };

  const runSearch = () => {
    const q = search.trim();
    if (!q) {
      setSelectedCity(null);
      return;
    }
    const hit =
      mapped.find(
        (c) =>
          c.city === q ||
          c.resolvedName === q ||
          c.city.includes(q) ||
          c.resolvedName.includes(q),
      ) ?? null;
    if (hit) {
      setSelectedCity(hit.city);
    } else {
      setError(`City not found on map: ${q}`);
      setTimeout(() => setError(null), 2500);
    }
  };

  const exportPng = async () => {
    if (!mapRef.current) return;
    const dataUrl = await toPng(mapRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#0B1220",
    });
    downloadDataUrl(dataUrl, `iran-heatmap-${Date.now()}.png`);
  };

  const exportSvg = async () => {
    if (!mapRef.current) return;
    const dataUrl = await toSvg(mapRef.current, {
      cacheBust: true,
      backgroundColor: "#0B1220",
    });
    downloadDataUrl(dataUrl, `iran-heatmap-${Date.now()}.svg`);
  };

  const toggleFullscreen = async () => {
    const el = shellRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable;

      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSelectedCity(null);
        setSearch("");
      }
      if (!typing && e.key.toLowerCase() === "f") {
        e.preventDefault();
        void toggleFullscreen();
      }
      if (!typing && e.key.toLowerCase() === "p") {
        setShowProvinces((v) => !v);
      }
      if (!typing && e.key.toLowerCase() === "l") {
        setShowLabels((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={shellRef}
      className={`min-h-screen bg-[#0B1220] text-[#E5E7EB] ${fullscreen ? "p-0" : ""}`}
    >
      {/* —— First viewport: map —— */}
      <section className="relative flex h-[100dvh] min-h-[560px] flex-col">
        <header className="z-20 flex shrink-0 flex-wrap items-center gap-3 border-b border-[#1F2937] bg-[#0B1220]/95 px-3 py-2 backdrop-blur-md md:px-4">
          <div className="mr-auto min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#FF4D4F]">
              OSINT · Iran
            </p>
            <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
              War Alarm Heatmap
            </h1>
          </div>

          <TimeWindowPicker
            value={timeWindow}
            busy={busy}
            onChange={selectTimeWindow}
          />

          <div className="w-full sm:w-56 md:w-64">
            <SearchBox
              value={search}
              onChange={setSearch}
              onSubmit={runSearch}
              inputRef={searchRef}
            />
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          <IranHeatMap
            cities={mapped}
            metric={metric}
            selectedCity={selectedCity}
            showProvinces={showProvinces}
            showLabels={showLabels}
            autoFit={autoFit}
            mapRef={mapRef}
            onHoverCity={() => {}}
            onSelectCity={setSelectedCity}
            fillViewport
          />

          {/* Floating controls over map */}
          <div className="pointer-events-none absolute right-3 top-3 z-10 flex max-w-[min(100%,320px)] flex-col gap-2">
            <div className="pointer-events-auto hidden max-h-[min(70vh,520px)] w-[280px] overflow-hidden lg:block">
              <Sidebar
                stats={stats}
                cities={mapped}
                metric={metric}
                selectedCity={selectedCity}
                onSelectCity={setSelectedCity}
                compact
              />
            </div>
          </div>

          <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
            <div className="pointer-events-auto flex flex-wrap gap-1.5 rounded-md border border-[#1F2937]/80 bg-[#0B1220]/85 p-1.5 backdrop-blur-sm">
              <Toggle
                active={showProvinces}
                onClick={() => setShowProvinces((v) => !v)}
                label="Provinces"
              />
              <Toggle
                active={showLabels}
                onClick={() => setShowLabels((v) => !v)}
                label="Labels"
              />
              <Toggle
                active={autoFit}
                onClick={() => setAutoFit((v) => !v)}
                label="Auto-fit"
              />
              <button
                type="button"
                onClick={() => void exportPng()}
                className="rounded-md border border-[#1F2937] bg-[#111827] px-2.5 py-1 text-xs text-[#9CA3AF] hover:text-[#E5E7EB]"
              >
                PNG
              </button>
              <button
                type="button"
                onClick={() => void exportSvg()}
                className="rounded-md border border-[#1F2937] bg-[#111827] px-2.5 py-1 text-xs text-[#9CA3AF] hover:text-[#E5E7EB]"
              >
                SVG
              </button>
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="rounded-md border border-[#1F2937] bg-[#111827] px-2.5 py-1 text-xs text-[#9CA3AF] hover:text-[#E5E7EB]"
              >
                {fullscreen ? "Exit" : "Full"}
              </button>
            </div>
          </div>

          {fileName ? (
            <p className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-md border border-[#1F2937]/80 bg-[#0B1220]/85 px-2 py-1 text-[11px] text-[#9CA3AF] backdrop-blur-sm">
              {fileName}
              {" · "}
              {mapped.length}/{rows.length} cities
              {" · "}
              past {WINDOW_LABEL[timeWindow]}
            </p>
          ) : null}
        </div>
      </section>

      {/* —— Below fold —— */}
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6">
        {error ? (
          <div className="rounded-md border border-[#FF4D4F]/40 bg-[#FF4D4F]/10 px-3 py-2 text-sm text-[#FF4D4F]">
            {error}
          </div>
        ) : null}

        <StatsCards stats={stats} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-3">
            <CsvUpload onUpload={handleUpload} busy={busy} />
            <MetricFilter value={metric} onChange={setMetric} />
            {history.length > 0 ? (
              <div className="rounded-lg border border-[#1F2937] bg-[#111827] px-3 py-2">
                <p className="text-[11px] uppercase tracking-wider text-[#9CA3AF]">
                  Recent uploads
                </p>
                <ul className="mt-1.5 space-y-1">
                  {history.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="w-full truncate text-left text-xs text-[#9CA3AF] hover:text-[#FF4D4F]"
                        onClick={() =>
                          applyRows(item.rows, item.name, false)
                        }
                      >
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="w-full lg:hidden lg:w-[320px]">
            <div className="min-h-[360px]">
              <Sidebar
                stats={stats}
                cities={mapped}
                metric={metric}
                selectedCity={selectedCity}
                onSelectCity={setSelectedCity}
              />
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[#6B7280]">
          Time windows use sample extracts relative to the latest message in the
          Telegram export. Upload a custom CSV to replace the current view; pick
          24h / 48h / 72h / All again to return to samples.
        </p>
      </div>
    </div>
  );
}

function TimeWindowPicker({
  value,
  onChange,
  busy,
}: {
  value: TimeWindow;
  onChange: (w: TimeWindow) => void;
  busy?: boolean;
}) {
  const options: TimeWindow[] = [24, 48, 72, "all"];
  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-[#1F2937] bg-[#111827] p-1"
      role="group"
      aria-label="Time window"
    >
      {options.map((opt) => (
        <button
          key={String(opt)}
          type="button"
          disabled={busy}
          onClick={() => onChange(opt)}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            value === opt
              ? "bg-[#FF4D4F]/20 text-[#FF4D4F]"
              : "text-[#9CA3AF] hover:text-[#E5E7EB]"
          }`}
        >
          {WINDOW_LABEL[opt]}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-[#FF4D4F]/50 bg-[#FF4D4F]/15 text-[#FF4D4F]"
          : "border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:text-[#E5E7EB]"
      }`}
    >
      {label}
    </button>
  );
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
