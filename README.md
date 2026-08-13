# Iran War Heatmap Dashboard (Based on real people reporting)


Frontend-only **Next.js 15** OSINT dashboard that I made so I can tell if a war is back on or my family is being dramatic.
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

## Live sync (GitHub Actions → Vercel)

Iran-hosted machines often cannot reach Telegram. Sync runs on **GitHub Actions**
(outside Iran), writes CSVs into `public/sample/`, commits them, and Vercel
redeploys the static files. The Next.js app does **not** talk to Telegram.

### One-time setup

1. Create an API app at [my.telegram.org](https://my.telegram.org) (API ID + hash).
2. On a machine that **can** reach Telegram:

```bash
pip install -r requirements-sync.txt
python3 scripts/telegram_login.py
```

3. In the GitHub repo → **Settings → Secrets and variables → Actions**, add:
   - `TELEGRAM_API_ID`
   - `TELEGRAM_API_HASH`
   - `TELEGRAM_SESSION` (string printed by the login script)
   - `TELEGRAM_CHANNEL` (optional, default `VahidOnline`)

4. Enable Actions. Workflow: `.github/workflows/sync-vahid.yml`
   - **Cron:** every 30 minutes
   - **Manual:** Actions tab → “Sync VahidOnline heatmap” → Run workflow

### Manual fallbacks (if auto sync fails)

| Method | How |
|--------|-----|
| UI **Reload live** | Refetch `/sample/*.csv` after a successful Actions run / deploy |
| UI **CSV upload** | Upload any `extract_cities` CSV (dashboard “Manual fallback”) |
| Offline rebuild | `python3 sync_vahid.py --from-export result.json` then commit/push `public/sample/` |
| Actions manual run | GitHub → Actions → Run workflow |

```bash
# Offline rebuild from Telegram Desktop export (no API needed)
python3 sync_vahid.py --from-export result.json
```

```bash
# Live fetch (needs env secrets / local session)
export TELEGRAM_API_ID=...
export TELEGRAM_API_HASH=...
export TELEGRAM_SESSION=...
python3 sync_vahid.py
```

## CSV format

Produced by `extract_cities.py` / `zadan2.py`:

```csv
rank,city,messages_mentioning,total_messages,pct_of_messages
1,هرمز,36,298,12.1
2,بندرعباس,34,298,11.4
3,تهران,24,298,8.1
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
