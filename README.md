# Iran War Alarm Heatmap Dashboard

Frontend-only **Next.js 15** OSINT dashboard that visualizes Iranian cities from Telegram war-monitoring CSV exports as an interactive SVG heatmap.

No map tiles, API keys, or paid services required.

## Features

- Drag-and-drop / click CSV upload (`extract_cities.py` format)
- SVG Iran map via `react-simple-maps` + Mercator projection
- Blurred radial heat circles (log radius, additive blending)
- Instant tooltips, search, metric filters, sidebar Top 20
- Stats cards, legend, province borders toggle
- Export PNG / SVG, fullscreen, keyboard shortcuts
- Recent uploads history (localStorage)
- ~1,100 city coordinate lookup + spelling aliases

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

A sample dataset from `counts.csv` loads automatically.

> If peer dependency warnings appear for `react-simple-maps` (React 19), install with:
>
> ```bash
> npm install --legacy-peer-deps
> ```

## CSV format

Produced by `extract_cities.py` / `zadan2.py`:

```csv
rank,city,messages_mentioning,total_messages,pct_of_messages
1,بار,47,298,15.8
2,هرمز,36,298,12.1
3,بندرعباس,34,298,11.4
```

Unknown city names (no coordinate match) are ignored on the map but still counted in row totals where applicable.

## Data files

| Path | Purpose |
|------|---------|
| `data/iran.geo.json` | Simplified Iran outline (also served from `public/data/`) |
| `data/iran-provinces.geo.json` | Province borders (toggle) |
| `data/cityCoordinates.json` | ~1,095 city lat/lon lookup |
| `data/aliases.json` | Alternate spellings → canonical names |
| `public/sample/counts.csv` | Demo dataset |

City coordinates are approximate city-center points matched from GeoNames against the gazetteer in `zadan2.py`.

## Generate a CSV from Telegram export

```bash
python3 zadan2.py result.json --out cities.csv
```

Then upload `cities.csv` in the dashboard.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `F` | Toggle fullscreen |
| `P` | Toggle province borders |
| `L` | Toggle city labels |
| `Esc` | Clear selection / search |

## Stack

- Next.js 15 (App Router) · TypeScript · React 19
- Tailwind CSS · Framer Motion
- react-simple-maps · PapaParse · d3-scale · html-to-image

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

## Notes

- Heat radius: `6 + log(messages) * 12`
- Opacity scales from `0.15` → `0.8`
- Color ramp: `#FFE66D` → `#FF9F1C` → `#FF3B30` → `#B10000`
- Designed as a dark OSINT visualization (`#0B1220` background)
