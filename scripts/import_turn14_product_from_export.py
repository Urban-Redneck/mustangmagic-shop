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
import subprocess
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
    parser.add_argument(
        "--pricing",
        action="store_true",
        help="After import, sync Turn14 pricing for the imported products.",
    )
    parser.add_argument(
        "--inventory",
        action="store_true",
        help="After import, sync actual Turn14 warehouse inventory for the imported products.",
    )
    parser.add_argument(
        "--item-data",
        action="store_true",
        help="After import, sync Turn14 item data, descriptions, and product images.",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Run the normal add-part pipeline: import, publish, pricing, inventory, and item data.",
    )
    parser.add_argument(
        "--legacy-inventory-columns-only",
        action="store_true",
        help="Pass --legacy-columns-only to inventory sync for databases without newer inventory columns.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Normalize without writing.")
    args = parser.parse_args()

    try:
        load_dotenv(Path(__file__).resolve().parents[1] / ".env")
        load_dotenv(Path(__file__).resolve().parents[1] / ".env.local")

        root_dir = Path(__file__).resolve().parents[1]
        publish = args.publish or args.full
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
            product["storefront_visible"] = bool(publish)
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

        if publish:
            for product in products:
                publish_product(supabase, str(product["turn14_id"]))

        turn14_ids = [str(product["turn14_id"]) for product in products]
        pipeline = run_followup_pipeline(args, root_dir, turn14_ids)
        if pipeline:
            summary["followup_pipeline"] = pipeline

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


def run_followup_pipeline(
    args: argparse.Namespace,
    root_dir: Path,
    turn14_ids: list[str],
) -> list[dict[str, Any]]:
    if not turn14_ids:
        return []

    sync_pricing = args.full or args.pricing
    sync_inventory = args.full or args.inventory
    sync_item_data = args.full or args.item_data
    if not (sync_pricing or sync_inventory or sync_item_data):
        return []

    joined_ids = ",".join(turn14_ids)
    results: list[dict[str, Any]] = []
    commands: list[tuple[str, list[str]]] = []
    if sync_pricing:
        commands.append(
            (
                "pricing",
                [sys.executable, "scripts/sync_turn14_pricing.py", "--ids", joined_ids],
            )
        )
    if sync_inventory:
        command = [sys.executable, "scripts/sync_turn14_inventory.py", "--ids", joined_ids]
        if args.legacy_inventory_columns_only:
            command.append("--legacy-columns-only")
        commands.append(("inventory", command))
    if sync_item_data:
        commands.append(
            (
                "item_data",
                [sys.executable, "scripts/sync_turn14_item_data.py", "--ids", joined_ids],
            )
        )

    for name, command in commands:
        completed = subprocess.run(
            command,
            cwd=root_dir,
            text=True,
            capture_output=True,
            check=False,
        )
        results.append(
            {
                "name": name,
                "command": " ".join(command),
                "returncode": completed.returncode,
                "stdout": parse_json_output(completed.stdout),
                "stderr": completed.stderr.strip() or None,
            }
        )
        if completed.returncode != 0:
            raise RuntimeError(
                f"{name} sync failed with exit code {completed.returncode}: "
                f"{completed.stderr.strip() or completed.stdout.strip()}"
            )

    return results


def parse_json_output(output: str) -> Any:
    output = output.strip()
    if not output:
        return None
    try:
        return json.loads(output)
    except json.JSONDecodeError:
        return output


if __name__ == "__main__":
    raise SystemExit(main())
