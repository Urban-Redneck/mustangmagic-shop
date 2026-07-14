#!/usr/bin/env python3
"""Set or clear a storefront manual price override.

Turn14 pricing sync continues updating products.price/map_price/msrp. The
storefront and checkout use manual_price first when it is present.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


def main() -> int:
    parser = argparse.ArgumentParser(description="Set or clear a manual product price.")
    parser.add_argument("part_number", help="Store part number, e.g. frpM-9424-M50CJB.")
    parser.add_argument("price", nargs="?", help="Manual storefront price. Omit with --clear.")
    parser.add_argument("--clear", action="store_true", help="Clear the manual price override.")
    parser.add_argument("--reason", default="manual competitive price", help="Internal reason for the override.")
    args = parser.parse_args()

    try:
        load_dotenv(Path(__file__).resolve().parents[1] / ".env")
        load_dotenv(Path(__file__).resolve().parents[1] / ".env.local")

        if args.clear:
            manual_price = None
        else:
            if args.price is None:
                raise RuntimeError("Provide a price or pass --clear.")
            manual_price = decimal_price(args.price)

        config = {
            "supabase_url": required_env("SUPABASE_URL").rstrip("/"),
            "service_key": required_env("SUPABASE_SERVICE_ROLE_KEY"),
        }

        product = find_product(config, args.part_number)
        update = {
            "manual_price": manual_price,
            "manual_price_reason": None if args.clear else args.reason,
            "manual_price_updated_at": utc_now(),
        }
        patched = patch_product(config, product["id"], update)
        print(json.dumps(patched, indent=2, sort_keys=True))
        return 0
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


def decimal_price(value: str) -> str:
    try:
        price = Decimal(value)
    except InvalidOperation as error:
        raise RuntimeError(f"Invalid price: {value}") from error
    if price < 0:
        raise RuntimeError("Price must be zero or greater.")
    return f"{price.quantize(Decimal('0.01'))}"


def find_product(config: dict[str, str], part_number: str) -> dict[str, Any]:
    encoded_part = urllib.parse.quote(part_number, safe="")
    request = supabase_request(
        config,
        "GET",
        (
            "products"
            "?select=id,turn14_id,part_number,name,price,manual_price,map_price,msrp"
            f"&part_number=ilike.{encoded_part}"
        ),
    )
    rows = request_json(request)
    if not isinstance(rows, list):
        raise RuntimeError(f"Unexpected Supabase response: {rows}")

    matches = [
        row
        for row in rows
        if isinstance(row, dict)
        and str(row.get("part_number") or "").lower() == part_number.lower()
    ]
    if not matches:
        raise RuntimeError(f"No product found for part number: {part_number}")
    if len(matches) > 1:
        raise RuntimeError(f"Multiple products found for part number: {part_number}")
    return matches[0]


def patch_product(
    config: dict[str, str],
    product_id: str,
    update: dict[str, Any],
) -> dict[str, Any]:
    encoded_id = urllib.parse.quote(product_id, safe="")
    request = supabase_request(
        config,
        "PATCH",
        (
            "products"
            "?select=id,turn14_id,part_number,name,price,manual_price,map_price,msrp"
            f"&id=eq.{encoded_id}"
        ),
        update,
        prefer="return=representation",
    )
    rows = request_json(request)
    if not isinstance(rows, list) or len(rows) != 1:
        raise RuntimeError(f"Unexpected Supabase patch response: {rows}")
    return rows[0]


def supabase_request(
    config: dict[str, str],
    method: str,
    path: str,
    body: dict[str, Any] | None = None,
    prefer: str | None = None,
) -> urllib.request.Request:
    url = f"{config['supabase_url']}/rest/v1/{path}"
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {
        "apikey": config["service_key"],
        "Authorization": f"Bearer {config['service_key']}",
        "Accept": "application/json",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
    if prefer:
        headers["Prefer"] = prefer
    return urllib.request.Request(url, data=data, method=method, headers=headers)


def request_json(request: urllib.request.Request) -> Any:
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code}: {detail}") from error
    return json.loads(payload) if payload else None


def utc_now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    raise SystemExit(main())
