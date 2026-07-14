#!/usr/bin/env python3
"""Replace Turn14 small thumbnail URLs with larger CloudFront image variants.

Turn14 item payloads expose `thumbnail`. For many products that URL ends in
`S.JPG`; probing shows the matching `L.JPG` URL is the larger image. This script
updates products.primary_image_url and primary product_images rows when the
larger URL exists.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


PAGE_SIZE = 500


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill larger Turn14 image URLs.")
    parser.add_argument("--dry-run", action="store_true", help="Probe without writing.")
    args = parser.parse_args()

    try:
        load_dotenv(Path(__file__).resolve().parents[1] / ".env")
        load_dotenv(Path(__file__).resolve().parents[1] / ".env.local")

        config = {
            "supabase_url": required_env("SUPABASE_URL").rstrip("/"),
            "service_key": required_env("SUPABASE_SERVICE_ROLE_KEY"),
        }

        products = fetch_products(config)
        summary = {
            "dry_run": args.dry_run,
            "products_seen": len(products),
            "small_url_candidates": 0,
            "large_urls_found": 0,
            "products_updated": 0,
            "missing_large_urls": 0,
        }

        for product in products:
            current_url = product.get("primary_image_url")
            large_url = large_variant(current_url)
            if not large_url or large_url == current_url:
                continue

            summary["small_url_candidates"] += 1
            if not url_exists(large_url):
                summary["missing_large_urls"] += 1
                continue

            summary["large_urls_found"] += 1
            if not args.dry_run:
                update_product_image(config, product["id"], large_url)
                summary["products_updated"] += 1

        print(json.dumps(summary, indent=2, sort_keys=True))
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


def fetch_products(config: dict[str, str]) -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []
    offset = 0
    while True:
        query = urllib.parse.urlencode(
            {
                "select": "id,primary_image_url",
                "primary_image_url": "not.is.null",
                "order": "turn14_id.asc",
                "limit": str(PAGE_SIZE),
                "offset": str(offset),
            }
        )
        batch = supabase_json(config, "GET", f"products?{query}")
        if not isinstance(batch, list):
            raise RuntimeError(f"Unexpected products response: {batch}")
        products.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += len(batch)
    return products


def large_variant(url: str | None) -> str | None:
    if not url:
        return None
    return re.sub(r"S(\.(?:jpe?g|png|webp))$", r"L\1", url, flags=re.IGNORECASE)


def url_exists(url: str) -> bool:
    request = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return 200 <= response.status < 300
    except urllib.error.HTTPError:
        return False


def update_product_image(config: dict[str, str], product_id: str, url: str) -> None:
    path = f"products?id=eq.{urllib.parse.quote(product_id)}"
    supabase_json(config, "PATCH", path, body={"primary_image_url": url}, expect_body=False)

    image_path = (
        "product_images"
        f"?product_id=eq.{urllib.parse.quote(product_id)}"
        "&is_primary=eq.true"
    )
    supabase_json(config, "PATCH", image_path, body={"url": url}, expect_body=False)


def supabase_json(
    config: dict[str, str],
    method: str,
    path: str,
    body: Any | None = None,
    expect_body: bool = True,
) -> Any:
    url = f"{config['supabase_url']}/rest/v1/{path}"
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {
        "apikey": config["service_key"],
        "Authorization": f"Bearer {config['service_key']}",
        "Accept": "application/json",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
        headers["Prefer"] = "return=minimal"

    request = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed with {error.code}: {detail}") from error

    if not raw or not expect_body:
        return None
    return json.loads(raw)


if __name__ == "__main__":
    raise SystemExit(main())
