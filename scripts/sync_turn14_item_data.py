#!/usr/bin/env python3
"""Sync Turn14 item-data images and public descriptions into Supabase."""

from __future__ import annotations

import argparse
import json
import os
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync Turn14 item data into Supabase.")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--ids", help="Comma-separated Turn14 item IDs.")
    source.add_argument(
        "--all",
        action="store_true",
        help="Sync item data for every active Supabase product with a Turn14 ID.",
    )
    parser.add_argument("--limit", type=int, help="Maximum number of products to sync.")
    parser.add_argument(
        "--offset",
        type=int,
        default=0,
        help="Offset into active Turn14 products for batched runs.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Supabase page size when loading products.",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip products that already have one or more product_images rows.",
    )
    parser.add_argument(
        "--state-file",
        default="scripts/.sync_turn14_item_data_state.json",
        help="Path for resumable sync state.",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Skip Turn14 IDs already recorded in the state file.",
    )
    parser.add_argument(
        "--progress-every",
        type=int,
        default=10,
        help="Print progress every N products.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Fetch and normalize without writing.")
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
        }
        socket.setdefaulttimeout(config["timeout_seconds"])
        token = get_turn14_token(config)
        completed_ids = load_completed_ids(Path(args.state_file)) if args.resume else set()
        summary = {
            "started_at": utc_now(),
            "completed_at": None,
            "dry_run": args.dry_run,
            "skip_existing": args.skip_existing,
            "resume": args.resume,
            "state_file": args.state_file,
            "records_queued": 0,
            "records_seen": 0,
            "records_updated": 0,
            "records_skipped": 0,
            "records_failed": 0,
        }
        failures: list[dict[str, str]] = []
        products = (
            [fetch_product(config, value.strip()) for value in args.ids.split(",") if value.strip()]
            if args.ids
            else fetch_products(
                config,
                args.limit,
                args.offset,
                args.batch_size,
                args.skip_existing,
            )
        )
        summary["records_queued"] = len(products)

        for product in products:
            turn14_id = str(product["turn14_id"])
            summary["records_seen"] += 1
            if args.resume and turn14_id in completed_ids:
                summary["records_skipped"] += 1
                continue
            try:
                item_data = fetch_item_data(config, token, turn14_id)
                normalized = normalize_item_data(config, product, item_data)
                if args.dry_run:
                    print(json.dumps(normalized, indent=2, sort_keys=True))
                else:
                    write_item_data(config, product, normalized)
                    record_completed_id(Path(args.state_file), turn14_id)
                summary["records_updated"] += 1
            except Exception as error:
                summary["records_failed"] += 1
                failures.append({"turn14_id": turn14_id, "error": str(error)})
                print(f"failed item data {turn14_id}: {error}", file=sys.stderr)
            if args.progress_every > 0 and summary["records_seen"] % args.progress_every == 0:
                print(
                    json.dumps(
                        {
                            "progress_at": utc_now(),
                            "seen": summary["records_seen"],
                            "queued": summary["records_queued"],
                            "updated": summary["records_updated"],
                            "skipped": summary["records_skipped"],
                            "failed": summary["records_failed"],
                        },
                        sort_keys=True,
                    ),
                    flush=True,
                )

        summary["completed_at"] = utc_now()
        if failures:
            summary["failures"] = failures
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


def fetch_product(config: dict[str, Any], turn14_id: str) -> dict[str, Any]:
    query = urllib.parse.urlencode(
        {
            "select": "id,turn14_id,name,part_number,short_description,description,primary_image_url",
            "turn14_id": f"eq.{turn14_id}",
        }
    )
    rows = request_json(config, supabase_request(config, "GET", f"products?{query}"))
    if not isinstance(rows, list) or not rows:
        raise RuntimeError(f"Supabase product not found for Turn14 ID {turn14_id}")
    return rows[0]


def fetch_products(
    config: dict[str, Any],
    limit: int | None,
    offset: int,
    batch_size: int,
    skip_existing: bool,
) -> list[dict[str, Any]]:
    if offset < 0:
        raise RuntimeError("--offset must be zero or greater")
    if limit is not None and limit < 1:
        raise RuntimeError("--limit must be greater than zero")
    if batch_size < 1:
        raise RuntimeError("--batch-size must be greater than zero")

    existing_product_ids = fetch_existing_image_product_ids(config) if skip_existing else set()
    products: list[dict[str, Any]] = []
    cursor = offset
    while limit is None or len(products) < limit:
        page_size = min(batch_size, limit - len(products)) if limit is not None else batch_size
        query = urllib.parse.urlencode(
            {
                "select": "id,turn14_id,name,part_number,short_description,description,primary_image_url",
                "turn14_id": "not.is.null",
                "active": "eq.true",
                "order": "turn14_id.asc",
                "limit": str(page_size),
                "offset": str(cursor),
            }
        )
        rows = request_json(config, supabase_request(config, "GET", f"products?{query}"))
        if not isinstance(rows, list):
            raise RuntimeError(f"Unexpected Supabase product response: {rows}")
        if not rows:
            break
        for row in rows:
            if not isinstance(row, dict) or row.get("turn14_id") is None:
                continue
            if skip_existing and row.get("id") in existing_product_ids:
                continue
            products.append(row)
            if limit is not None and len(products) >= limit:
                break
        cursor += len(rows)
    return products


def fetch_existing_image_product_ids(config: dict[str, Any]) -> set[str]:
    product_ids: set[str] = set()
    offset = 0
    batch_size = 1000
    while True:
        query = urllib.parse.urlencode(
            {
                "select": "product_id",
                "order": "product_id.asc",
                "limit": str(batch_size),
                "offset": str(offset),
            }
        )
        rows = request_json(config, supabase_request(config, "GET", f"product_images?{query}"))
        if not isinstance(rows, list):
            raise RuntimeError(f"Unexpected Supabase product_images response: {rows}")
        if not rows:
            break
        for row in rows:
            if isinstance(row, dict) and row.get("product_id"):
                product_ids.add(str(row["product_id"]))
        offset += len(rows)
    return product_ids


def fetch_item_data(config: dict[str, Any], token: str, turn14_id: str) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{config['turn14_api_base_url']}/items/data/{urllib.parse.quote(turn14_id)}",
        method="GET",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    try:
        response = request_json(config, request)
    except RuntimeError as error:
        if " failed with 404:" in str(error):
            return {}
        raise
    data = response.get("data")
    if isinstance(data, list) and data:
        return data[0]
    if isinstance(data, dict):
        return data
    raise RuntimeError(f"Unexpected item-data response for {turn14_id}: {response}")


def normalize_item_data(
    config: dict[str, Any],
    product: dict[str, Any],
    item_data: dict[str, Any],
) -> dict[str, Any]:
    images = normalize_images(product, item_data.get("files"))
    if not images:
        fallback_image = normalize_primary_thumbnail_replacement(config, product)
        if fallback_image:
            images = [fallback_image]
    descriptions = normalize_descriptions(item_data.get("descriptions"))
    primary_image = next((image for image in images if image["is_primary"]), images[0] if images else None)
    return {
        "product_update": {
            "primary_image_url": primary_image["url"] if primary_image else None,
            "short_description": descriptions["short_description"] or product.get("short_description"),
            "description": descriptions["description"] or product.get("description"),
        },
        "images": images,
        "description_parts": descriptions,
    }


def normalize_images(product: dict[str, Any], files: Any) -> list[dict[str, Any]]:
    if not isinstance(files, list):
        return []

    rows: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    for file_item in files:
        if not isinstance(file_item, dict) or file_item.get("type") != "Image":
            continue
        best_link = best_image_link(file_item.get("links"))
        if not best_link:
            continue
        url = str(best_link["url"])
        if url in seen_urls:
            continue
        seen_urls.add(url)
        media_content = str(file_item.get("media_content") or "Product image")
        rows.append(
            {
                "product_id": product["id"],
                "turn14_id": str(file_item.get("id")) if file_item.get("id") is not None else None,
                "url": url,
                "alt_text": f"{product['name']} - {media_content}",
                "sort_order": len(rows),
                "is_primary": False,
                "width": int(float(best_link["width"])) if best_link.get("width") else None,
                "height": int(float(best_link["height"])) if best_link.get("height") else None,
            }
        )

    if rows:
        primary_ids = [
            str(item.get("id"))
            for item in files
            if isinstance(item, dict) and str(item.get("media_content") or "").lower() == "photo - primary"
        ]
        primary_index = 0
        for index, row in enumerate(rows):
            if row["turn14_id"] in primary_ids:
                primary_index = index
                break
        rows[primary_index]["is_primary"] = True
        rows.sort(key=lambda row: (not row["is_primary"], row["sort_order"]))
        for index, row in enumerate(rows):
            row["sort_order"] = index
    return rows


def normalize_primary_thumbnail_replacement(
    config: dict[str, Any],
    product: dict[str, Any],
) -> dict[str, Any] | None:
    original_url = str(product.get("primary_image_url") or "")
    if not original_url.lower().endswith("-100.jpg"):
        return None
    replacement_url = original_url[:-8] + "-800.jpg"
    if not remote_file_exists(config, replacement_url):
        return None
    return {
        "product_id": product["id"],
        "turn14_id": None,
        "url": replacement_url,
        "alt_text": f"{product['name']} - Product image",
        "sort_order": 0,
        "is_primary": True,
        "width": 800,
        "height": 800,
    }


def remote_file_exists(config: dict[str, Any], url: str) -> bool:
    request = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(request, timeout=config["timeout_seconds"]) as response:
            return 200 <= response.status < 400
    except (TimeoutError, urllib.error.HTTPError, urllib.error.URLError):
        return False


def best_image_link(links: Any) -> dict[str, Any] | None:
    if not isinstance(links, list):
        return None
    candidates = [link for link in links if isinstance(link, dict) and link.get("url")]
    if not candidates:
        return None
    return max(candidates, key=image_area)


def image_area(link: dict[str, Any]) -> int:
    try:
        return int(float(link.get("width") or 0)) * int(float(link.get("height") or 0))
    except (TypeError, ValueError):
        return 0


def normalize_descriptions(descriptions: Any) -> dict[str, str | None]:
    if not isinstance(descriptions, list):
        return {"short_description": None, "description": None}

    by_type: dict[str, list[str]] = {}
    for item in descriptions:
        if not isinstance(item, dict):
            continue
        type_name = str(item.get("type") or "").strip()
        description = str(item.get("description") or "").strip()
        if type_name and description:
            by_type.setdefault(type_name, []).append(description)

    short_description = first_description(
        by_type,
        "Product Description - Short",
        "Product Description - Long",
        "Market Description",
    )
    details: list[str] = []
    market = first_description(by_type, "Market Description")
    if market:
        details.append(market)
    features = unique_values(by_type.get("Features and Benefits", []))
    if features:
        details.append("Features:\n" + "\n".join(f"- {feature}" for feature in features))
    extended = first_description(by_type, "Product Description - Extended")
    if extended and extended not in details:
        details.append(extended)
    return {
        "short_description": short_description,
        "description": "\n\n".join(details) if details else None,
    }


def first_description(by_type: dict[str, list[str]], *types: str) -> str | None:
    for type_name in types:
        values = by_type.get(type_name)
        if values:
            return values[0]
    return None


def unique_values(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        normalized = value.lower()
        if normalized not in seen:
            seen.add(normalized)
            result.append(value)
    return result


def write_item_data(config: dict[str, Any], product: dict[str, Any], normalized: dict[str, Any]) -> None:
    product_update = {
        key: value
        for key, value in normalized["product_update"].items()
        if value is not None
    }
    if product_update:
        request_json(
            config,
            supabase_request(
                config,
                "PATCH",
                f"products?id=eq.{urllib.parse.quote(product['id'])}",
                product_update,
                prefer="return=minimal",
            ),
        )

    images = normalized["images"]
    if not images:
        return
    request_json(
        config,
        supabase_request(
            config,
            "PATCH",
            f"product_images?product_id=eq.{urllib.parse.quote(product['id'])}",
            {"is_primary": False},
            prefer="return=minimal",
        ),
    )
    request_json(
        config,
        supabase_request(
            config,
            "POST",
            "product_images?on_conflict=product_id,url",
            images,
            prefer="resolution=merge-duplicates,return=minimal",
        ),
    )


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


def load_completed_ids(path: Path) -> set[str]:
    if not path.exists():
        return set()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return set()
    values = data.get("completed_turn14_ids") if isinstance(data, dict) else None
    if not isinstance(values, list):
        return set()
    return {str(value) for value in values}


def record_completed_id(path: Path, turn14_id: str) -> None:
    completed_ids = load_completed_ids(path)
    completed_ids.add(str(turn14_id))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "updated_at": utc_now(),
                "completed_turn14_ids": sorted(completed_ids, key=natural_sort_key),
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )


def natural_sort_key(value: str) -> tuple[int, str]:
    try:
        return (0, f"{int(value):020d}")
    except ValueError:
        return (1, value)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    raise SystemExit(main())
