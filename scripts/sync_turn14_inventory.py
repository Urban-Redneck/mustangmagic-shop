#!/usr/bin/env python3
"""Sync actual Turn14 warehouse inventory into Supabase products.

This script intentionally avoids third-party dependencies.

Required environment variables:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  TURN14_CLIENT_ID
  TURN14_CLIENT_SECRET

Optional environment variables:
  TURN14_API_BASE_URL=https://api.turn14.com/v1
  TURN14_AUTH_URL=https://api.turn14.com/v1/token
  TURN14_TIMEOUT_SECONDS=30
  TURN14_MAX_RETRIES=3
  TURN14_INVENTORY_DELAY_SECONDS=0.25
  TURN14_LOW_STOCK_THRESHOLD=2
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

MAX_INVENTORY_IDS_PER_REQUEST = 250


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync Turn14 inventory into Supabase.")
    parser.add_argument("--limit", type=int, help="Maximum products to sync.")
    parser.add_argument("--offset", type=int, default=0, help="Supabase product offset.")
    parser.add_argument(
        "--ids",
        help="Comma-separated Turn14 item IDs to sync instead of scanning Supabase.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Fetch inventory without writing.")
    parser.add_argument("--verbose", action="store_true", help="Print computed per-product updates.")
    parser.add_argument(
        "--legacy-columns-only",
        action="store_true",
        help="Write only existing catalog columns: inventory_status, warehouse_availability, and can_purchase.",
    )
    args = parser.parse_args()

    try:
        load_dotenv(Path(__file__).resolve().parents[1] / ".env")
        load_dotenv(Path(__file__).resolve().parents[1] / ".env.local")

        config = {
            "supabase_url": required_env("SUPABASE_URL").rstrip("/"),
            "service_key": required_env("SUPABASE_SERVICE_ROLE_KEY"),
            "turn14_client_id": required_env("TURN14_CLIENT_ID"),
            "turn14_client_secret": required_env("TURN14_CLIENT_SECRET"),
            "turn14_auth_url": os.getenv("TURN14_AUTH_URL", "https://api.turn14.com/v1/token"),
            "turn14_api_base_url": os.getenv("TURN14_API_BASE_URL", "https://api.turn14.com/v1").rstrip("/"),
            "timeout_seconds": int(os.getenv("TURN14_TIMEOUT_SECONDS", "30")),
            "max_retries": int(os.getenv("TURN14_MAX_RETRIES", "3")),
            "delay_seconds": float(os.getenv("TURN14_INVENTORY_DELAY_SECONDS", "0.25")),
            "low_stock_threshold": int(os.getenv("TURN14_LOW_STOCK_THRESHOLD", "2")),
        }

        token = get_turn14_token(config)
        if args.ids:
            products = [{"turn14_id": item.strip()} for item in args.ids.split(",") if item.strip()]
        else:
            products = fetch_products(config, offset=args.offset, limit=args.limit)

        sync_run_id = None if args.dry_run else create_sync_run(config)
        summary: dict[str, Any] = {
            "started_at": utc_now(),
            "completed_at": None,
            "dry_run": args.dry_run,
            "offset": args.offset,
            "limit": args.limit,
            "requested_ids": args.ids,
            "records_seen": 0,
            "records_updated": 0,
            "records_missing_inventory": 0,
            "records_failed": 0,
        }

        failures: list[dict[str, str]] = []
        product_by_id = {str(product["turn14_id"]): product for product in products}
        turn14_ids = list(product_by_id)

        for chunk_index, turn14_id_chunk in enumerate(chunks(turn14_ids, MAX_INVENTORY_IDS_PER_REQUEST)):
            try:
                inventory_response = fetch_inventory(config, token, turn14_id_chunk)
                inventory_by_id = normalize_inventory_response(inventory_response)
            except Exception as error:
                summary["records_failed"] += len(turn14_id_chunk)
                failures.append({"turn14_ids": ",".join(turn14_id_chunk), "error": str(error)})
                print(f"failed inventory chunk {turn14_id_chunk[0]}..: {error}", file=sys.stderr)
                continue

            for turn14_id in turn14_id_chunk:
                summary["records_seen"] += 1
                inventory_item = inventory_by_id.get(turn14_id)
                if inventory_item is None:
                    summary["records_missing_inventory"] += 1
                    update = build_missing_inventory_update()
                else:
                    update = build_inventory_update(config, inventory_item)
                if args.legacy_columns_only:
                    update = legacy_inventory_update(update)

                try:
                    if args.verbose:
                        print(
                            json.dumps(
                                {
                                    "turn14_id": turn14_id,
                                    "inventory_status": update.get("inventory_status"),
                                    "inventory_quantity": update.get("inventory_quantity"),
                                    "can_purchase": update.get("can_purchase"),
                                    "warehouse_availability": update.get("warehouse_availability"),
                                    "inventory_eta": update.get("inventory_eta"),
                                },
                                sort_keys=True,
                            )
                        )
                    if not args.dry_run:
                        patch_product(config, turn14_id, update)
                    summary["records_updated"] += 1
                except Exception as error:
                    summary["records_failed"] += 1
                    failures.append({"turn14_id": turn14_id, "error": str(error)})
                    print(f"failed updating inventory {turn14_id}: {error}", file=sys.stderr)

            if chunk_index < (len(turn14_ids) - 1) // MAX_INVENTORY_IDS_PER_REQUEST and config["delay_seconds"] > 0:
                time.sleep(config["delay_seconds"])

        summary["completed_at"] = utc_now()
        if failures:
            summary["failures"] = failures[:20]
        if sync_run_id:
            final_status = "partial" if summary["records_failed"] else "succeeded"
            complete_sync_run(config, sync_run_id, final_status, summary)

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


def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_turn14_token(config: dict[str, Any]) -> str:
    payload = json.dumps(
        {
            "grant_type": "client_credentials",
            "client_id": config["turn14_client_id"],
            "client_secret": config["turn14_client_secret"],
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        config["turn14_auth_url"],
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    response = request_json(config, request)
    token = response.get("access_token")
    if not isinstance(token, str) or not token:
        raise RuntimeError(f"Turn14 auth response did not include access_token: {response}")
    return token


def fetch_products(config: dict[str, Any], offset: int, limit: int | None) -> list[dict[str, Any]]:
    remaining = limit
    current_offset = offset
    rows: list[dict[str, Any]] = []
    while remaining is None or remaining > 0:
        page_size = min(1000, remaining) if remaining is not None else 1000
        query = urllib.parse.urlencode(
            {
                "select": "turn14_id",
                "turn14_id": "not.is.null",
                "order": "turn14_id.asc",
                "limit": str(page_size),
                "offset": str(current_offset),
            }
        )
        request = supabase_request(config, "GET", f"products?{query}")
        batch = request_json(config, request)
        if not isinstance(batch, list):
            raise RuntimeError(f"Unexpected products response: {batch}")
        rows.extend(row for row in batch if row.get("turn14_id"))
        if len(batch) < page_size:
            break
        current_offset += len(batch)
        if remaining is not None:
            remaining -= len(batch)
    return rows


def fetch_inventory(config: dict[str, Any], token: str, turn14_ids: list[str]) -> dict[str, Any]:
    joined_ids = ",".join(urllib.parse.quote(turn14_id, safe="") for turn14_id in turn14_ids)
    request = urllib.request.Request(
        f"{config['turn14_api_base_url']}/inventory/{joined_ids}",
        method="GET",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    return request_json(config, request)


def normalize_inventory_response(response: dict[str, Any]) -> dict[str, dict[str, Any]]:
    data = response.get("data")
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        raise RuntimeError(f"Unexpected inventory response: {response}")
    rows: dict[str, dict[str, Any]] = {}
    for item in data:
        if isinstance(item, dict) and item.get("id") is not None:
            rows[str(item["id"])] = item
    return rows


def build_inventory_update(config: dict[str, Any], inventory_item: dict[str, Any]) -> dict[str, Any]:
    attributes = inventory_item.get("attributes") or {}
    inventory = attributes.get("inventory") if isinstance(attributes, dict) else None
    inventory_by_location = coerce_quantity_map(inventory)
    inventory_quantity = sum(inventory_by_location.values())
    eta = attributes.get("eta") if isinstance(attributes, dict) else None
    manufacturer = attributes.get("manufacturer") if isinstance(attributes, dict) else None

    if inventory_quantity > 0:
        inventory_status = (
            "low_stock"
            if inventory_quantity <= config["low_stock_threshold"]
            else "in_stock"
        )
    elif has_future_supply(eta, manufacturer):
        inventory_status = "special_order"
    else:
        inventory_status = "out_of_stock"

    update: dict[str, Any] = {
        "inventory_status": inventory_status,
        "inventory_quantity": inventory_quantity,
        "inventory_updated_at": utc_now(),
        "inventory_eta": eta if isinstance(eta, dict) else None,
        "warehouse_availability": [
            {
                "location_id": location_id,
                "quantity": quantity,
                "can_place_order": quantity > 0,
            }
            for location_id, quantity in sorted(inventory_by_location.items())
        ],
        "raw_turn14_inventory_json": inventory_item,
    }
    if inventory_status not in {"in_stock", "low_stock"}:
        update["can_purchase"] = False
    return update


def build_missing_inventory_update() -> dict[str, Any]:
    return {
        "inventory_status": "unknown",
        "inventory_quantity": None,
        "inventory_updated_at": utc_now(),
        "inventory_eta": None,
        "warehouse_availability": [],
        "raw_turn14_inventory_json": None,
        "can_purchase": False,
    }


def legacy_inventory_update(update: dict[str, Any]) -> dict[str, Any]:
    legacy = {
        "inventory_status": update["inventory_status"],
        "warehouse_availability": update["warehouse_availability"],
    }
    if "can_purchase" in update:
        legacy["can_purchase"] = update["can_purchase"]
    return legacy


def coerce_quantity_map(value: Any) -> dict[str, int]:
    if not isinstance(value, dict):
        return {}
    quantities: dict[str, int] = {}
    for location_id, quantity in value.items():
        try:
            parsed = int(quantity)
        except (TypeError, ValueError):
            parsed = 0
        quantities[str(location_id)] = max(parsed, 0)
    return quantities


def has_future_supply(eta: Any, manufacturer: Any) -> bool:
    if isinstance(eta, dict):
        qty_on_order = eta.get("qty_on_order")
        if any(coerce_quantity_map(qty_on_order).values()):
            return True
        estimated_availability = eta.get("estimated_availability")
        if isinstance(estimated_availability, dict) and any(estimated_availability.values()):
            return True
    if isinstance(manufacturer, dict):
        try:
            if int(manufacturer.get("stock") or 0) > 0:
                return True
        except (TypeError, ValueError):
            pass
        if manufacturer.get("esd"):
            return True
    return False


def patch_product(config: dict[str, Any], turn14_id: str, update: dict[str, Any]) -> None:
    request = supabase_request(
        config,
        "PATCH",
        f"products?turn14_id=eq.{urllib.parse.quote(turn14_id)}",
        update,
        prefer="return=minimal",
    )
    try:
        request_json(config, request)
    except RuntimeError as error:
        if not is_missing_inventory_metadata_column(error):
            raise
        fallback_request = supabase_request(
            config,
            "PATCH",
            f"products?turn14_id=eq.{urllib.parse.quote(turn14_id)}",
            legacy_inventory_update(update),
            prefer="return=minimal",
        )
        request_json(config, fallback_request)


def is_missing_inventory_metadata_column(error: RuntimeError) -> bool:
    message = str(error)
    return (
        "column products.inventory_quantity does not exist" in message
        or "column products.inventory_updated_at does not exist" in message
        or "column products.inventory_eta does not exist" in message
        or "column products.raw_turn14_inventory_json does not exist" in message
    )


def create_sync_run(config: dict[str, Any]) -> str | None:
    request = supabase_request(
        config,
        "POST",
        "sync_runs",
        [
            {
                "source": "turn14",
                "sync_type": "inventory",
                "status": "running",
                "metadata": {"script": "scripts/sync_turn14_inventory.py"},
            }
        ],
        prefer="return=representation",
    )
    rows = request_json(config, request)
    if isinstance(rows, list) and rows:
        value = rows[0].get("id")
        return value if isinstance(value, str) else None
    return None


def complete_sync_run(
    config: dict[str, Any],
    sync_run_id: str,
    status: str,
    summary: dict[str, Any],
) -> None:
    request = supabase_request(
        config,
        "PATCH",
        f"sync_runs?id=eq.{urllib.parse.quote(sync_run_id)}",
        {
            "status": status,
            "completed_at": utc_now(),
            "records_seen": summary["records_seen"],
            "records_upserted": summary["records_updated"],
            "records_failed": summary["records_failed"],
            "metadata": summary,
        },
        prefer="return=minimal",
    )
    request_json(config, request)


def supabase_request(
    config: dict[str, Any],
    method: str,
    path: str,
    body: Any | None = None,
    prefer: str = "resolution=merge-duplicates,return=representation",
) -> urllib.request.Request:
    headers = {
        "apikey": config["service_key"],
        "Authorization": f"Bearer {config['service_key']}",
        "Accept": "application/json",
        "Prefer": prefer,
    }
    payload = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        payload = json.dumps(body).encode("utf-8")
    return urllib.request.Request(
        f"{config['supabase_url']}/rest/v1/{path}",
        data=payload,
        method=method,
        headers=headers,
    )


def request_json(config: dict[str, Any], request: urllib.request.Request) -> Any:
    last_error: Exception | None = None
    for attempt in range(config["max_retries"] + 1):
        try:
            with urllib.request.urlopen(request, timeout=config["timeout_seconds"]) as response:
                raw = response.read().decode("utf-8")
                if not raw:
                    return None
                return json.loads(raw)
        except urllib.error.HTTPError as error:
            last_error = error
            if error.code not in {429, 500, 502, 503, 504}:
                detail = error.read().decode("utf-8", errors="replace")
                raise RuntimeError(f"{request.method} {request.full_url} failed with {error.code}: {detail}")
        except (TimeoutError, urllib.error.URLError, json.JSONDecodeError) as error:
            last_error = error
        if attempt < config["max_retries"]:
            time.sleep(min(2**attempt, 10))
    raise RuntimeError(f"{request.method} {request.full_url} failed after retries: {last_error}")


def chunks(values: list[str], size: int) -> list[list[str]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    raise SystemExit(main())
