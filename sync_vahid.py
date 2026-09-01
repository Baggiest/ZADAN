#!/usr/bin/env python3
"""
sync_vahid.py

Fetches recent messages from the Vahid Online Telegram channel and regenerates
the heatmap CSV samples (24h / 48h / 72h / all).

Designed to run on GitHub Actions (outside Iran) or any machine that can reach
Telegram. Does NOT need to run inside Next.js / Vercel.

Environment (required for live fetch):
  TELEGRAM_API_ID       int from https://my.telegram.org
  TELEGRAM_API_HASH     string from https://my.telegram.org
  TELEGRAM_SESSION      Telethon StringSession (see scripts/telegram_login.py)

Optional:
  TELEGRAM_CHANNEL      username or @name (default: VahidOnline)
  SYNC_LOOKBACK_DAYS    how many days of history to pull (default: 14)
  SYNC_OUT_DIR          output directory (default: public/sample)

Offline / fallback (no Telegram):
  python3 sync_vahid.py --from-export result.json
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

import zadan2  # noqa: E402


DEFAULT_CHANNEL = os.environ.get("TELEGRAM_CHANNEL", "VahidOnline")
DEFAULT_LOOKBACK_DAYS = int(os.environ.get("SYNC_LOOKBACK_DAYS", "14"))
DEFAULT_OUT_DIR = Path(os.environ.get("SYNC_OUT_DIR", ROOT / "public" / "sample"))


def message_ts(msg: dict) -> int | None:
    u = msg.get("date_unixtime")
    if u is not None and str(u).isdigit():
        return int(u)
    date = msg.get("date")
    if isinstance(date, str) and date:
        try:
            # Telegram export uses local-naive ISO; treat as UTC if no tz
            dt = datetime.fromisoformat(date.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return int(dt.timestamp())
        except ValueError:
            return None
    return None


def filter_hours(messages: list[dict], hours: int | None, latest_ts: int) -> list[dict]:
    if hours is None:
        return messages
    cut = latest_ts - hours * 3600
    out = []
    for m in messages:
        ts = message_ts(m)
        if ts is not None and ts >= cut:
            out.append(m)
    return out


def atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=str(path.parent),
        delete=False,
        prefix=f".{path.name}.",
        suffix=".tmp",
    ) as tmp:
        tmp.write(text)
        tmp_path = Path(tmp.name)
    tmp_path.replace(path)


def write_csvs(messages: list[dict], out_dir: Path) -> dict:
    """Regenerate window CSVs. Returns meta dict."""
    dated = []
    for m in messages:
        if not isinstance(m, dict) or m.get("type") != "message":
            continue
        ts = message_ts(m)
        if ts is None:
            continue
        dated.append((m, ts))

    if not dated:
        raise SystemExit("No dated messages to process.")

    latest_ts = max(ts for _, ts in dated)
    plain = [m for m, _ in dated]

    windows = [
        (24, "counts-24h.csv"),
        (48, "counts-48h.csv"),
        (72, "counts-72h.csv"),
        (None, "counts.csv"),
    ]

    summary = {}
    for hours, filename in windows:
        subset = filter_hours(plain, hours, latest_ts)
        total, counts = zadan2.count_city_messages(subset, zadan2.ALL_PLACES)
        out_path = out_dir / filename
        # write via temp for atomicity
        tmp = out_path.with_suffix(out_path.suffix + ".tmp")
        zadan2.write_csv(total, counts, str(tmp))
        tmp.replace(out_path)
        label = "all" if hours is None else f"{hours}h"
        summary[label] = {
            "file": filename,
            "messages": total,
            "cities": len(counts),
        }
        print(f"  {filename}: {total} messages, {len(counts)} cities")

    # keep root counts.csv in sync when writing to public/sample
    if out_dir.resolve() == (ROOT / "public" / "sample").resolve():
        root_counts = ROOT / "counts.csv"
        src = out_dir / "counts.csv"
        if src.exists():
            root_counts.write_bytes(src.read_bytes())

    meta = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "latest_message_at": datetime.fromtimestamp(latest_ts, tz=timezone.utc).isoformat(),
        "message_count": len(plain),
        "windows": summary,
        "channel": DEFAULT_CHANNEL,
        "source": "telegram",
    }
    atomic_write_text(out_dir / "meta.json", json.dumps(meta, ensure_ascii=False, indent=2) + "\n")
    return meta


def telethon_message_to_export(msg) -> dict | None:
    """Convert a Telethon message into Telegram-export-shaped dict for zadan2."""
    if msg is None:
        return None

    text = getattr(msg, "message", None) or ""
    if not str(text).strip():
        return None

    date = msg.date
    if date is None:
        return None
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    else:
        date = date.astimezone(timezone.utc)

    return {
        "id": msg.id,
        "type": "message",
        "date": date.replace(tzinfo=None).isoformat(timespec="seconds"),
        "date_unixtime": str(int(date.timestamp())),
        "from": "Vahid Online",
        "text": text,
        "text_entities": [],
    }


async def fetch_channel_messages(
    api_id: int,
    api_hash: str,
    session: str,
    channel: str,
    lookback_days: int,
) -> list[dict]:
    try:
        from telethon import TelegramClient
        from telethon.sessions import StringSession
    except ImportError as e:
        raise SystemExit(
            "telethon is required for live sync. "
            "Install with: pip install -r requirements-sync.txt"
        ) from e

    client = TelegramClient(StringSession(session), api_id, api_hash)
    await client.connect()
    if not await client.is_user_authorized():
        await client.disconnect()
        raise SystemExit(
            "TELEGRAM_SESSION is invalid or not authorized. "
            "Run: python3 scripts/telegram_login.py"
        )

    entity = await client.get_entity(channel)
    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    collected: list[dict] = []

    async for msg in client.iter_messages(entity, offset_date=None):
        if msg.date is None:
            continue
        msg_date = msg.date if msg.date.tzinfo else msg.date.replace(tzinfo=timezone.utc)
        if msg_date < since:
            break
        converted = telethon_message_to_export(msg)
        if converted is not None:
            collected.append(converted)

    await client.disconnect()
    # oldest → newest not required for counting
    print(f"Fetched {len(collected)} messages from {channel} (last {lookback_days}d)")
    return collected


def load_export(path: Path) -> list[dict]:
    messages = zadan2.load_messages(str(path))
    return [m for m in messages if isinstance(m, dict)]


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync VahidOnline → heatmap CSVs")
    parser.add_argument(
        "--from-export",
        type=str,
        default=None,
        help="Offline mode: rebuild CSVs from a Telegram Desktop JSON export",
    )
    parser.add_argument(
        "--out-dir",
        type=str,
        default=str(DEFAULT_OUT_DIR),
        help="Directory for CSV + meta.json output",
    )
    parser.add_argument(
        "--lookback-days",
        type=int,
        default=DEFAULT_LOOKBACK_DAYS,
        help="Days of channel history to fetch (live mode)",
    )
    parser.add_argument(
        "--channel",
        type=str,
        default=DEFAULT_CHANNEL,
        help="Channel username (live mode)",
    )
    parser.add_argument(
        "--save-export",
        type=str,
        default=None,
        help="Optional path to write a Telegram-export-shaped JSON snapshot",
    )
    args = parser.parse_args()
    out_dir = Path(args.out_dir)

    if args.from_export:
        print(f"Offline rebuild from {args.from_export}")
        messages = load_export(Path(args.from_export))
        meta_source = "export"
    else:
        api_id = os.environ.get("TELEGRAM_API_ID")
        api_hash = os.environ.get("TELEGRAM_API_HASH")
        session = os.environ.get("TELEGRAM_SESSION")
        if not api_id or not api_hash or not session:
            raise SystemExit(
                "Missing TELEGRAM_API_ID / TELEGRAM_API_HASH / TELEGRAM_SESSION.\n"
                "For offline rebuild: python3 sync_vahid.py --from-export result.json\n"
                "For login: python3 scripts/telegram_login.py"
            )
        messages = asyncio.run(
            fetch_channel_messages(
                api_id=int(api_id),
                api_hash=api_hash,
                session=session,
                channel=args.channel,
                lookback_days=args.lookback_days,
            )
        )
        meta_source = "telegram"

    if args.save_export:
        payload = {
            "name": "Vahid Online",
            "type": "public_channel",
            "messages": messages,
        }
        atomic_write_text(
            Path(args.save_export),
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        )
        print(f"Wrote snapshot {args.save_export}")

    print(f"Writing CSVs → {out_dir}")
    meta = write_csvs(messages, out_dir)
    meta["source"] = meta_source
    meta["channel"] = args.channel
    atomic_write_text(out_dir / "meta.json", json.dumps(meta, ensure_ascii=False, indent=2) + "\n")
    print(f"Done. updated_at={meta['updated_at']}")


if __name__ == "__main__":
    main()
