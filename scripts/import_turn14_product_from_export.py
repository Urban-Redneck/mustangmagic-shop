#!/usr/bin/env python3
"""Import one or more Turn14 items from a local export into Supabase.

This uses the same normalization and Supabase upsert path as sync_turn14.py,
but avoids scanning the upstream API when a requested item is already present
in turn14_items_export.json.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

import sync_turn14


def main() -> int:
    parser = argparse.ArgumentParser(description="Import specific Turn14 items from a local JSON export.")
    parser.add_argument("identifiers", nargs="+", help="Turn14 item IDs or part numbers.")
    parser.add_argument(
        "--input",
        default="turn14_items_export.json",
        help="Path to the local Turn14 JSON export.",
    )
    parser.add_argument(
        "--publish",
        action="store_true",
        help="Set storefront_visible=true for imported products.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Normalize without writing.")
    args = parser.parse_args()

    try:
        load_dotenv(Path(__file__).resolve().parents[1] / ".env")
        load_dotenv(Path(__file__).resolve().parents[1] / ".env.local")

        requested = {identifier.lower() for identifier in args.identifiers}
        export_path = Path(args.input)
        raw_items = json.loads(export_path.read_text(encoding="utf-8"))
        items = extract_items(raw_items)
        matches = [item for item in items if item_matches(item, requested)]
        if not matches:
            raise RuntimeError(f"No matching items found in {export_path}: {', '.join(args.identifiers)}")

        config = sync_turn14.load_config(None)
        http = sync_turn14.HttpClient(config.timeout_seconds, config.max_retries)
        supabase = sync_turn14.SupabaseClient(config, http)
        generations = [] if args.dry_run else supabase.fetch_generations()

        products = []
        for item in matches:
            normalized = sync_turn14.normalize_product(item)
            product = normalized["product"]
            product["storefront_visible"] = bool(args.publish)
            products.append(product)

        if args.dry_run:
            print(json.dumps(products, indent=2, sort_keys=True))
            return 0

        summary = sync_turn14.sync_products_page(
            supabase=supabase,
            generations=generations,
            products=matches,
            dry_run=False,
        )

        if args.publish:
            for product in products:
                publish_product(supabase, str(product["turn14_id"]))

        print(json.dumps(summary, indent=2, sort_keys=True))
        return 0 if summary["records_failed"] == 0 else 1
    except Exception as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.removeprefix("export ").strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def extract_items(raw: Any) -> list[dict[str, Any]]:
    if isinstance(raw, dict):
        data = raw.get("data")
        if isinstance(data, list):
            raw = data
    if not isinstance(raw, list):
        raise RuntimeError("Input export must be a JSON array or an object with a data array.")
    return [item for item in raw if isinstance(item, dict)]


def item_matches(item: dict[str, Any], requested: set[str]) -> bool:
    attrs = item.get("attributes") if isinstance(item.get("attributes"), dict) else {}
    candidates = {
        str(item.get("id") or "").lower(),
        str(attrs.get("part_number") or "").lower(),
        str(attrs.get("mfr_part_number") or "").lower(),
    }
    return bool(candidates & requested)


def publish_product(supabase: sync_turn14.SupabaseClient, turn14_id: str) -> None:
    url = (
        f"{supabase.base_url}/rest/v1/products"
        f"?turn14_id=eq.{sync_turn14.urllib.parse.quote(turn14_id)}"
    )
    headers = dict(supabase.headers)
    headers["Prefer"] = "return=minimal"
    supabase.http.request_json(
        "PATCH",
        url,
        headers,
        {"storefront_visible": True, "active": True},
    )


if __name__ == "__main__":
    raise SystemExit(main())
