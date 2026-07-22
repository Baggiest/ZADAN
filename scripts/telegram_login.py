#!/usr/bin/env python3
"""
One-time helper: log into Telegram and print a Telethon StringSession.

1. Create an app at https://my.telegram.org → API development tools
2. pip install -r requirements-sync.txt
3. python3 scripts/telegram_login.py
4. Paste the printed session into GitHub secret TELEGRAM_SESSION
   (and API id/hash into TELEGRAM_API_ID / TELEGRAM_API_HASH)

Run this on a machine that can reach Telegram (not blocked in Iran).
"""

from __future__ import annotations

import asyncio
import os
import sys


async def main() -> None:
    try:
        from telethon import TelegramClient
        from telethon.sessions import StringSession
    except ImportError:
        print("Install deps first: pip install -r requirements-sync.txt", file=sys.stderr)
        sys.exit(1)

    api_id = os.environ.get("TELEGRAM_API_ID") or input("API ID: ").strip()
    api_hash = os.environ.get("TELEGRAM_API_HASH") or input("API hash: ").strip()
    if not api_id or not api_hash:
        print("API ID and hash are required.", file=sys.stderr)
        sys.exit(1)

    client = TelegramClient(StringSession(), int(api_id), api_hash)
    await client.start()
    session = client.session.save()
    me = await client.get_me()
    print("\nAuthorized as:", getattr(me, "username", None) or me.id)
    print("\n=== TELEGRAM_SESSION (keep secret) ===\n")
    print(session)
    print("\n=== end ===\n")
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
