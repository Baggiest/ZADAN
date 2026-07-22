"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { motion, AnimatePresence } from "framer-motion";
import type { MappedCity, MetricKey } from "@/lib/types";
import {
  HEAT_COLORS,
  citiesBounds,
  heatOpacity,
  heatRadius,
  metricValue,
} from "@/lib/heat";
import { Legend } from "./Sidebar";

const IRAN_GEO = "/data/iran.geo.json";
const PROVINCES_GEO = "/data/iran-provinces.geo.json";

const DEFAULT_CENTER: [number, number] = [53.5, 32.4];
const DEFAULT_ZOOM = 1;

interface IranHeatMapProps {
  cities: MappedCity[];
  metric: MetricKey;
  selectedCity: string | null;
  showProvinces: boolean;
  showLabels: boolean;
  autoFit: boolean;
  mapRef: MutableRefObject<HTMLDivElement | null>;
  onHoverCity: (city: MappedCity | null) => void;
  onSelectCity: (city: string | null) => void;
  fillViewport?: boolean;
}

interface TooltipState {
  city: MappedCity;
  x: number;
  y: number;
}

function IranHeatMapInner({
  cities,
  metric,
  selectedCity,
  showProvinces,
  showLabels,
  autoFit,
  mapRef,
  onHoverCity,
  onSelectCity,
  fillViewport = false,
}: IranHeatMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [position, setPosition] = useState({
    coordinates: DEFAULT_CENTER as [number, number],
    zoom: DEFAULT_ZOOM,
  });
  const animKey = useRef(0);

  const values = useMemo(
    () => cities.map((c) => metricValue(c, metric)),
    [cities, metric],
  );
  const minV = values.length ? Math.min(...values) : 0;
  const maxV = values.length ? Math.max(...values) : 1;

  const colorScale = useMemo(
    () =>
      scaleLinear<string>()
        .domain([
          minV,
          minV + (maxV - minV) * 0.33,
          minV + (maxV - minV) * 0.66,
          maxV,
        ])
        .range([...HEAT_COLORS])
        .clamp(true),
    [minV, maxV],
  );

  const heatPoints = useMemo(() => {
    return cities.map((city) => {
      const value = metricValue(city, metric);
      const sizeBasis =
        metric === "rank"
          ? city.messages_mentioning
          : metric === "pct_of_messages"
            ? Math.max(city.pct_of_messages, 0.1)
            : city.messages_mentioning;
      return {
        city,
        value,
        radius: heatRadius(sizeBasis),
        opacity: heatOpacity(value, minV, maxV),
        color: colorScale(value),
      };
    });
  }, [cities, metric, minV, maxV, colorScale]);

  // Animate key on dataset change
  useEffect(() => {
    animKey.current += 1;
  }, [cities]);

  // Auto-fit / zoom to selected
  useEffect(() => {
    if (selectedCity) {
      const hit =
        cities.find(
          (c) => c.city === selectedCity || c.resolvedName === selectedCity,
        ) ?? null;
      if (hit) {
        setPosition({
          coordinates: [hit.lon, hit.lat],
          zoom: Math.max(position.zoom, 3.2),
        });
        setTooltip({
          city: hit,
          x: 0,
          y: 0,
        });
        onHoverCity(hit);
      }
      return;
    }

    if (autoFit && cities.length > 0) {
      const bounds = citiesBounds(cities);
      if (bounds) {
        const [lonMin, latMin, lonMax, latMax] = bounds;
        const center: [number, number] = [
          (lonMin + lonMax) / 2,
          (latMin + latMax) / 2,
        ];
        const lonSpan = Math.max(lonMax - lonMin, 1);
        const latSpan = Math.max(latMax - latMin, 1);
        const span = Math.max(lonSpan, latSpan);
        const zoom = Math.min(4.5, Math.max(1, 14 / span));
        setPosition({ coordinates: center, zoom });
      }
    } else if (!selectedCity && cities.length === 0) {
      setPosition({ coordinates: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, autoFit, cities]);

  const maxMentions = useMemo(
    () =>
      cities.length
        ? Math.max(...cities.map((c) => c.messages_mentioning))
        : 0,
    [cities],
  );

  const handleMarkerEnter = (
    city: MappedCity,
    evt: React.MouseEvent<SVGCircleElement>,
  ) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      city,
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    });
    onHoverCity(city);
  };

  return (
    <div
      ref={mapRef}
      className={
        fillViewport
          ? "relative h-full w-full overflow-hidden bg-[#0B1220]"
          : "relative h-full min-h-[420px] w-full overflow-hidden rounded-lg border border-[#1F2937] bg-[#0B1220]"
      }
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: DEFAULT_CENTER,
          scale: 1600,
        }}
        width={800}
        height={600}
        className="h-full w-full"
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          <filter
            id="heat-blur"
            x="-80%"
            y="-80%"
            width="260%"
            height="260%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </filter>
          <filter
            id="heat-glow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          minZoom={0.8}
          maxZoom={12}
          onMoveEnd={(pos) =>
            setPosition({
              coordinates: pos.coordinates as [number, number],
              zoom: pos.zoom,
            })
          }
        >
          <Geographies geography={IRAN_GEO}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#111827"
                  stroke="#374151"
                  strokeWidth={0.6}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {showProvinces ? (
            <Geographies geography={PROVINCES_GEO}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="transparent"
                    stroke="#4B5563"
                    strokeWidth={0.35}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", stroke: "#9CA3AF" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>
          ) : null}

          <g style={{ mixBlendMode: "screen" }} key={animKey.current}>
            {heatPoints.map(({ city, radius, opacity, color }) => {
              const isSelected =
                selectedCity === city.city ||
                selectedCity === city.resolvedName;
              const isHot = city.messages_mentioning === maxMentions && maxMentions > 0;
              const r = (radius / position.zoom) * (isSelected ? 1.15 : 1);

              return (
                <Marker
                  key={`${city.rank}-${city.city}`}
                  coordinates={[city.lon, city.lat]}
                >
                  <motion.circle
                    initial={{ opacity: 0, r: r * 0.4 }}
                    animate={{ opacity, r }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    fill={color}
                    filter={isHot ? "url(#heat-glow)" : "url(#heat-blur)"}
                    stroke={isSelected ? "#FFFFFF" : "none"}
                    strokeWidth={isSelected ? 0.8 / position.zoom : 0}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => handleMarkerEnter(city, e)}
                    onMouseMove={(e) => handleMarkerEnter(city, e)}
                    onMouseLeave={() => {
                      if (!selectedCity) {
                        setTooltip(null);
                        onHoverCity(null);
                      }
                    }}
                    onClick={() => onSelectCity(city.city)}
                  />
                  {/* Hit target — sharp, for easier hover */}
                  <circle
                    r={Math.max(4, r * 0.35)}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => handleMarkerEnter(city, e)}
                    onMouseMove={(e) => handleMarkerEnter(city, e)}
                    onMouseLeave={() => {
                      if (!selectedCity) {
                        setTooltip(null);
                        onHoverCity(null);
                      }
                    }}
                    onClick={() => onSelectCity(city.city)}
                  />
                  {(showLabels && position.zoom >= 3.5) || isSelected ? (
                    <text
                      textAnchor="middle"
                      y={-(r + 4)}
                      style={{
                        fontFamily: "inherit",
                        fontSize: 10 / position.zoom,
                        fill: "#E5E7EB",
                        pointerEvents: "none",
                        paintOrder: "stroke",
                        stroke: "#0B1220",
                        strokeWidth: 2 / position.zoom,
                      }}
                    >
                      {city.city}
                    </text>
                  ) : null}
                </Marker>
              );
            })}
          </g>
        </ZoomableGroup>
      </ComposableMap>

      <Legend />

      <AnimatePresence>
        {tooltip ? (
          <motion.div
            key={tooltip.city.city}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            className="pointer-events-none absolute z-20 min-w-[160px] rounded-md border border-[#1F2937] bg-[#111827]/95 px-3 py-2 shadow-lg backdrop-blur-sm"
            style={{
              left: Math.min(
                Math.max(tooltip.x + 12, 8),
                (mapRef.current?.clientWidth ?? 400) - 180,
              ),
              top: Math.max(tooltip.y - 72, 8),
            }}
          >
            <p className="text-sm font-semibold text-[#E5E7EB]" dir="auto">
              {tooltip.city.city}
            </p>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              Messages mentioning:{" "}
              <span className="font-mono text-[#E5E7EB]">
                {tooltip.city.messages_mentioning}
              </span>
            </p>
            <p className="text-xs text-[#9CA3AF]">
              Coverage:{" "}
              <span className="font-mono text-[#E5E7EB]">
                {tooltip.city.pct_of_messages}%
              </span>
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {cities.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-md border border-[#1F2937] bg-[#111827]/80 px-4 py-2 text-sm text-[#9CA3AF]">
            Upload a city CSV to render the heatmap
          </p>
        </div>
      ) : null}
    </div>
  );
}

export const IranHeatMap = memo(IranHeatMapInner);
