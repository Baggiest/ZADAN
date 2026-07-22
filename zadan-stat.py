#!/usr/bin/env python3
"""
word_frequency.py

Takes a Telegram export JSON file (result.json style export, or a raw list of
message objects) and ranks words by how often they appear, most -> least.

Handles the two shapes Telegram uses for the "text" field:
  1. A plain string:            "text": "hello world"
  2. A list of strings/objects: "text": ["hello ", {"type": "mention", "text": "@someone"}, ""]

Usage:
    python3 word_frequency.py messages.json
    python3 word_frequency.py messages.json --top 50
    python3 word_frequency.py messages.json --out counts.csv
    python3 word_frequency.py messages.json --no-stopwords
    python3 word_frequency.py messages.json --min-length 2
"""

import argparse
import csv
import json
import re
import sys
from collections import Counter

# A small set of very common Persian/Farsi stopwords. These tend to dominate
# the top of any frequency list without adding much information, so they're
# filtered out by default. Use --no-stopwords to disable this, or edit the
# set below to add/remove words for your own use case.
DEFAULT_STOPWORDS = {
    "و", "در", "به", "از", "که", "این", "را", "با", "است", "هم",
    "برای", "آن", "یک", "تا", "هست", "می‌شود", "شد", "شده", "بود",
    "کرد", "کند", "کنم", "کنید", "بر", "یا", "اما", "ولی", "چون",
    "اگر", "نیز", "دیگر", "همه", "روی", "بین", "بی", "چه", "من",
    "تو", "ما", "شما", "او", "آنها", "خود", "هر", "چند", "کجا",
}

# Matches "word" characters in a Unicode-aware way. \w with re.UNICODE
# (the default in Python 3) already covers Persian letters, digits, and
# underscores, but Persian text also uses combining marks and the
# zero-width non-joiner (ZWNJ, U+200C) inside words (e.g. می‌شود),
# so those are included explicitly.
WORD_PATTERN = re.compile(r"[\w\u200c]+", re.UNICODE)


def extract_text_from_message(message: dict) -> str:
    """
    Pulls all human-readable text out of a single Telegram message object,
    regardless of whether "text" is a string, a list, or missing entirely.
    Falls back to "text_entities" if "text" isn't present, since that field
    carries the same content in a more structured form.
    """
    text_field = message.get("text")

    if isinstance(text_field, str):
        return text_field

    if isinstance(text_field, list):
        parts = []
        for item in text_field:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                # Entities like mentions, links, bold text, etc. all carry
                # their visible text in a "text" key.
                parts.append(item.get("text", ""))
        return "".join(parts)

    # Fallback: some exports (or edited messages) may only populate
    # text_entities and leave "text" empty/missing.
    entities = message.get("text_entities")
    if isinstance(entities, list):
        parts = [e.get("text", "") for e in entities if isinstance(e, dict)]
        return "".join(parts)

    return ""


def load_messages(path: str) -> list:
    """
    Loads the JSON file and returns a flat list of message dicts.
    Supports:
      - A full Telegram export: {"messages": [...]}
      - A raw list of message objects: [...]
      - A single message object: {...}
    """
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict) and "messages" in data:
        return data["messages"]
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return [data]

    raise ValueError(
        "Unrecognized JSON structure: expected a Telegram export dict, "
        "a list of messages, or a single message object."
    )


def count_words(
    messages: list,
    use_stopwords: bool = True,
    min_length: int = 1,
    extra_stopwords: set = None,
) -> Counter:
    """
    Extracts and counts every word across all messages.
    Only messages of type "message" are considered (this skips service
    messages like "user joined the group", which have a different shape
    and aren't really "content").
    """
    stopwords = set()
    if use_stopwords:
        stopwords |= DEFAULT_STOPWORDS
    if extra_stopwords:
        stopwords |= extra_stopwords

    counts = Counter()

    for message in messages:
        if not isinstance(message, dict):
            continue
        if message.get("type") != "message":
            continue

        text = extract_text_from_message(message)
        if not text:
            continue

        words = WORD_PATTERN.findall(text.lower())

        for word in words:
            if len(word) < min_length:
                continue
            if word in stopwords:
                continue
            # Skip words that are purely digits (timestamps, IDs, etc.
            # tend to inflate counts without being meaningful "words").
            if word.isdigit():
                continue
            counts[word] += 1

    return counts


def print_ranking(counts: Counter, top: int = None):
    ranked = counts.most_common(top)
    if not ranked:
        print("No words found.")
        return

    rank_width = len(str(len(ranked)))
    count_width = max(len(str(c)) for _, c in ranked)

    for i, (word, count) in enumerate(ranked, start=1):
        print(f"{i:>{rank_width}}. {count:>{count_width}}  {word}")


def write_csv(counts: Counter, out_path: str, top: int = None):
    ranked = counts.most_common(top)
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["rank", "word", "count"])
        for i, (word, count) in enumerate(ranked, start=1):
            writer.writerow([i, word, count])
    print(f"\nSaved {len(ranked)} rows to {out_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Rank word frequency across a Telegram export JSON file."
    )
    parser.add_argument("json_file", help="Path to the Telegram export JSON file")
    parser.add_argument(
        "--top", type=int, default=None,
        help="Only show the top N words (default: show all)"
    )
    parser.add_argument(
        "--out", type=str, default=None,
        help="Optional path to also save results as a CSV file"
    )
    parser.add_argument(
        "--no-stopwords", action="store_true",
        help="Disable filtering of common Persian stopwords"
    )
    parser.add_argument(
        "--min-length", type=int, default=1,
        help="Minimum word length to include (default: 1)"
    )
    args = parser.parse_args()

    try:
        messages = load_messages(args.json_file)
    except FileNotFoundError:
        print(f"Error: file not found: {args.json_file}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: invalid JSON in {args.json_file}: {e}", file=sys.stderr)
        sys.exit(1)

    counts = count_words(
        messages,
        use_stopwords=not args.no_stopwords,
        min_length=args.min_length,
    )

    print(f"Total messages scanned: {len(messages)}")
    print(f"Unique words found: {len(counts)}")
    print(f"Total word occurrences: {sum(counts.values())}\n")

    print_ranking(counts, top=args.top)

    if args.out:
        write_csv(counts, args.out, top=args.top)


if __name__ == "__main__":
    main()