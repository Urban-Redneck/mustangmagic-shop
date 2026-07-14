#!/usr/bin/env python3
"""Sync Turn14 MAP/Retail pricing into Supabase products.

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
  TURN14_PRICING_DELAY_SECONDS=0.25
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync Turn14 pricing into Supabase.")
    parser.add_argument("--limit", type=int, help="Maximum products to price.")
    parser.add_argument("--offset", type=int, default=0, help="Supabase product offset.")
    parser.add_argument(
        "--ids",
        help="Comma-separated Turn14 item IDs to price instead of scanning Supabase.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Fetch pricing without writing.")
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
            "delay_seconds": float(os.getenv("TURN14_PRICING_DELAY_SECONDS", "0.25")),
        }

        token = get_turn14_token(config)
        products = (
            fetch_products_by_ids(config, args.ids)
            if args.ids
            else fetch_products(config, offset=args.offset, limit=args.limit)
        )
        sync_run_id = None if args.dry_run else create_sync_run(config)

        summary = {
            "started_at": utc_now(),
            "completed_at": None,
            "dry_run": args.dry_run,
            "offset": args.offset,
            "limit": args.limit,
            "records_seen": 0,
            "records_priced": 0,
            "records_without_pricing": 0,
            "records_failed": 0,
        }

        failures: list[dict[str, str]] = []
        for index, product in enumerate(products):
            turn14_id = str(product["turn14_id"])
            summary["records_seen"] += 1
            try:
                pricing = fetch_pricing(config, token, turn14_id)
                update = build_price_update(pricing, product)
                if update is None:
                    summary["records_without_pricing"] += 1
                else:
                    if not args.dry_run:
                        patch_product(config, turn14_id, update)
                    summary["records_priced"] += 1
            except Exception as error:
                summary["records_failed"] += 1
                failures.append({"turn14_id": turn14_id, "error": str(error)})
                print(f"failed pricing {turn14_id}: {error}", file=sys.stderr)

            if index < len(products) - 1 and config["delay_seconds"] > 0:
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
    body = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode("utf-8")
    auth = base64.b64encode(
        f"{config['turn14_client_id']}:{config['turn14_client_secret']}".encode("utf-8")
    ).decode("ascii")
    request = urllib.request.Request(
        config["turn14_auth_url"],
        data=body,
        method="POST",
        headers={
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
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
        page_size = min(500, remaining) if remaining is not None else 500
        query = urllib.parse.urlencode(
            {
                "select": "turn14_id,regular_stock,inventory_status",
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


def fetch_products_by_ids(config: dict[str, Any], ids: str) -> list[dict[str, Any]]:
    requested_ids = [item.strip() for item in ids.split(",") if item.strip()]
    if not requested_ids:
        return []
    quoted_ids = ",".join(urllib.parse.quote(item) for item in requested_ids)
    query = urllib.parse.urlencode(
        {
            "select": "turn14_id,regular_stock,inventory_status",
            "turn14_id": f"in.({quoted_ids})",
            "order": "turn14_id.asc",
        }
    )
    request = supabase_request(config, "GET", f"products?{query}")
    rows = request_json(config, request)
    if not isinstance(rows, list):
        raise RuntimeError(f"Unexpected products response: {rows}")
    found_ids = {str(row.get("turn14_id")) for row in rows}
    missing_ids = [item for item in requested_ids if item not in found_ids]
    if missing_ids:
        raise RuntimeError(f"Supabase products missing Turn14 IDs: {', '.join(missing_ids)}")
    return rows


def fetch_pricing(config: dict[str, Any], token: str, turn14_id: str) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{config['turn14_api_base_url']}/pricing/{urllib.parse.quote(turn14_id)}",
        method="GET",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    return request_json(config, request)


def build_price_update(
    pricing_response: dict[str, Any],
    product: dict[str, Any] | None = None,
) -> dict[str, str] | None:
    attributes = ((pricing_response.get("data") or {}).get("attributes") or {})
    pricelists = attributes.get("pricelists")
    if not isinstance(pricelists, list):
        return None

    prices = {
        str(item.get("name", "")).strip().lower(): decimal_string(item.get("price"))
        for item in pricelists
        if isinstance(item, dict)
    }
    map_price = prices.get("map")
    retail = prices.get("retail")
    purchase_cost = decimal_string(attributes.get("purchase_cost"))
    storefront_price = map_price or retail
    if (
        storefront_price is None
        and retail is None
        and map_price is None
        and purchase_cost is None
    ):
        return None

    product = product or {}
    storefront_can_purchase = (
        bool(attributes.get("can_purchase"))
        and product.get("regular_stock") is not False
        and product.get("inventory_status") in {"in_stock", "low_stock"}
    )

    update: dict[str, Any] = {
        "has_map": bool(attributes.get("has_map")),
        "can_purchase": storefront_can_purchase,
        "pricing_updated_at": utc_now(),
        "raw_turn14_pricing_json": pricing_response,
    }
    if storefront_price is not None:
        update["price"] = storefront_price
    if map_price is not None:
        update["map_price"] = map_price
    if retail is not None:
        update["msrp"] = retail
    if purchase_cost is not None:
        update["purchase_cost"] = purchase_cost
    return update


def patch_product(config: dict[str, Any], turn14_id: str, update: dict[str, str]) -> None:
    request = supabase_request(
        config,
        "PATCH",
        f"products?turn14_id=eq.{urllib.parse.quote(turn14_id)}",
        update,
        prefer="return=minimal",
    )
    request_json(config, request)


def create_sync_run(config: dict[str, Any]) -> str | None:
    request = supabase_request(
        config,
        "POST",
        "sync_runs",
        [
            {
                "source": "turn14",
                "sync_type": "pricing",
                "status": "running",
                "metadata": {"script": "scripts/sync_turn14_pricing.py"},
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
            "records_upserted": summary["records_priced"],
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


def decimal_string(value: Any) -> str | None:
    if value in (None, ""):
        return None
    try:
        return str(Decimal(str(value)))
    except (InvalidOperation, ValueError):
        return None


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    raise SystemExit(main())
