"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";

interface CsvUploadProps {
  onUpload: (file: File) => void;
  busy?: boolean;
}

export function CsvUpload({ onUpload, busy }: CsvUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
        // Still allow — some browsers omit type
      }
      onUpload(file);
    },
    [onUpload],
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-lg border border-dashed px-4 py-3 transition-colors ${
        dragging
          ? "border-[#FF4D4F] bg-[#FF4D4F]/10"
          : "border-[#1F2937] bg-[#111827] hover:border-[#374151]"
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[#E5E7EB]">
            {busy ? "Parsing CSV…" : "Drop CSV or click to browse"}
          </p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">
            extract_cities.py output · replaces current dataset
          </p>
        </div>
        <span className="rounded border border-[#1F2937] bg-[#0B1220] px-2.5 py-1 text-xs text-[#FF4D4F]">
          .csv
        </span>
      </div>
    </div>
  );
}

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchBox({
  value,
  onChange,
  onSubmit,
  inputRef,
}: SearchBoxProps) {
  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search city… (e.g. تهران)"
        dir="auto"
        className="w-full rounded-lg border border-[#1F2937] bg-[#0B1220] px-3 py-2 pl-9 text-sm text-[#E5E7EB] placeholder:text-[#6B7280] outline-none focus:border-[#FF4D4F]/60"
      />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">
        ⌕
      </span>
    </form>
  );
}

interface MetricFilterProps {
  value: import("@/lib/types").MetricKey;
  onChange: (value: import("@/lib/types").MetricKey) => void;
}

export function MetricFilter({ value, onChange }: MetricFilterProps) {
  const options: Array<{
    id: import("@/lib/types").MetricKey;
    label: string;
  }> = [
    { id: "messages_mentioning", label: "Messages Mentioning" },
    { id: "pct_of_messages", label: "Percentage of Messages" },
    { id: "rank", label: "Rank" },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
            value === opt.id
              ? "border-[#FF4D4F]/50 bg-[#FF4D4F]/15 text-[#FF4D4F]"
              : "border-[#1F2937] bg-[#0B1220] text-[#9CA3AF] hover:text-[#E5E7EB]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function useSampleCsv(
  enabled: boolean,
  onLoaded: (text: string, name: string) => void,
) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/sample/counts.csv");
        if (!res.ok || cancelled) return;
        const text = await res.text();
        if (!cancelled) onLoaded(text, "counts.csv");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, onLoaded]);
}
