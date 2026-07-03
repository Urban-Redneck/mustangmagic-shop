#!/usr/bin/env python3
"""
Download paginated Turn14 products and upsert them into Supabase.

This script intentionally avoids third-party Python dependencies. It talks to:
- Turn14 via HTTP using environment-provided credentials.
- Supabase via PostgREST using the service role key.

Required environment variables:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  TURN14_API_BASE_URL

Turn14 auth options:
  TURN14_ACCESS_TOKEN

  or OAuth-style client credentials:
  TURN14_AUTH_URL
  TURN14_CLIENT_ID
  TURN14_CLIENT_SECRET

Optional environment variables:
  TURN14_PRODUCTS_PATH=/products
  TURN14_PAGE_PARAM=page
  TURN14_PAGE_SIZE_PARAM=per_page
  TURN14_PAGE_SIZE=100
  TURN14_PRODUCTS_DATA_PATH=data
  TURN14_PRODUCTS_NEXT_PATH=links.next
  TURN14_TIMEOUT_SECONDS=30
  TURN14_MAX_RETRIES=3
  SYNC_TURN14_STATE_FILE=scripts/.sync_turn14_state.json

Examples:
  python3 scripts/sync_turn14.py
  python3 scripts/sync_turn14.py --reset
  python3 scripts/sync_turn14.py --max-pages 5 --dry-run
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


DEFAULT_STATE_FILE = "scripts/.sync_turn14_state.json"
INVENTORY_STATUSES = {
    "unknown",
    "in_stock",
    "low_stock",
    "out_of_stock",
    "discontinued",
    "special_order",
}


class SyncError(Exception):
    pass


@dataclass(frozen=True)
class Config:
    supabase_url: str
    supabase_service_role_key: str
    turn14_api_base_url: str
    turn14_products_path: str
    turn14_page_param: str
    turn14_page_size_param: str
    turn14_page_size: int
    turn14_products_data_path: str
    turn14_products_next_path: str
    turn14_access_token: str | None
    turn14_auth_url: str | None
    turn14_client_id: str | None
    turn14_client_secret: str | None
    timeout_seconds: int
    max_retries: int
    state_file: Path


class HttpClient:
    def __init__(self, timeout_seconds: int, max_retries: int) -> None:
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries

    def request_json(
        self,
        method: str,
        url: str,
        headers: dict[str, str] | None = None,
        body: Any | None = None,
    ) -> Any:
        payload = None
        request_headers = dict(headers or {})

        if body is not None:
            payload = json.dumps(body).encode("utf-8")
            request_headers.setdefault("Content-Type", "application/json")

        request_headers.setdefault("Accept", "application/json")

        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            request = urllib.request.Request(
                url=url,
                data=payload,
                headers=request_headers,
                method=method,
            )

            try:
                with urllib.request.urlopen(
                    request,
                    timeout=self.timeout_seconds,
                ) as response:
                    raw = response.read().decode("utf-8")
                    if not raw:
                        return None
                    return json.loads(raw)
            except urllib.error.HTTPError as error:
                last_error = error
                status = error.code
                if status not in {429, 500, 502, 503, 504}:
                    detail = error.read().decode("utf-8", errors="replace")
                    raise SyncError(f"{method} {url} failed with {status}: {detail}")
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
                last_error = error

            if attempt < self.max_retries:
                time.sleep(min(2**attempt, 10))

        raise SyncError(f"{method} {url} failed after retries: {last_error}")


class SupabaseClient:
    def __init__(self, config: Config, http: HttpClient) -> None:
        self.base_url = config.supabase_url.rstrip("/")
        self.http = http
        self.headers = {
            "apikey": config.supabase_service_role_key,
            "Authorization": f"Bearer {config.supabase_service_role_key}",
            "Prefer": "resolution=merge-duplicates,return=representation",
        }

    def upsert(
        self,
        table: str,
        rows: list[dict[str, Any]],
        on_conflict: str,
    ) -> list[dict[str, Any]]:
        if not rows:
            return []

        url = (
            f"{self.base_url}/rest/v1/{table}"
            f"?on_conflict={urllib.parse.quote(on_conflict)}"
        )
        result = self.http.request_json("POST", url, self.headers, rows)
        if result is None:
            return []
        if not isinstance(result, list):
            raise SyncError(f"Unexpected Supabase upsert response for {table}: {result}")
        return result

    def insert_ignore_duplicates(
        self,
        table: str,
        rows: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        if not rows:
            return []

        headers = dict(self.headers)
        headers["Prefer"] = "resolution=ignore-duplicates,return=representation"
        url = f"{self.base_url}/rest/v1/{table}"
        result = self.http.request_json("POST", url, headers, rows)
        if result is None:
            return []
        if not isinstance(result, list):
            raise SyncError(f"Unexpected Supabase insert response for {table}: {result}")
        return result

    def update_by_id(self, table: str, row_id: str, values: dict[str, Any]) -> None:
        url = f"{self.base_url}/rest/v1/{table}?id=eq.{urllib.parse.quote(row_id)}"
        headers = dict(self.headers)
        headers["Prefer"] = "return=minimal"
        self.http.request_json("PATCH", url, headers, values)

    def delete_by_column(self, table: str, column: str, value: str) -> None:
        url = (
            f"{self.base_url}/rest/v1/{table}"
            f"?{urllib.parse.quote(column)}=eq.{urllib.parse.quote(value)}"
        )
        headers = dict(self.headers)
        headers["Prefer"] = "return=minimal"
        self.http.request_json("DELETE", url, headers)

    def fetch_generations(self) -> list[dict[str, Any]]:
        url = (
            f"{self.base_url}/rest/v1/mustang_generations"
            "?select=id,slug,start_year,end_year"
            "&order=start_year.asc"
        )
        result = self.http.request_json("GET", url, self.headers)
        if result is None:
            return []
        if not isinstance(result, list):
            raise SyncError(f"Unexpected Supabase generation response: {result}")
        return result


class Turn14Client:
    def __init__(self, config: Config, http: HttpClient) -> None:
        self.config = config
        self.http = http
        self._access_token: str | None = config.turn14_access_token

    def get_products_page(self, page: int) -> tuple[list[dict[str, Any]], str | None]:
        url = self._build_products_url(page)
        response = self.http.request_json("GET", url, self._headers())
        products = extract_products(response, self.config.turn14_products_data_path)
        next_url = extract_string(response, self.config.turn14_products_next_path)
        return products, next_url

    def _headers(self) -> dict[str, str]:
        token = self._get_access_token()
        return {"Authorization": f"Bearer {token}"}

    def _get_access_token(self) -> str:
        if self._access_token:
            return self._access_token

        if not (
            self.config.turn14_auth_url
            and self.config.turn14_client_id
            and self.config.turn14_client_secret
        ):
            raise SyncError(
                "Set TURN14_ACCESS_TOKEN, or set TURN14_AUTH_URL, "
                "TURN14_CLIENT_ID, and TURN14_CLIENT_SECRET."
            )

        body = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode(
            "utf-8"
        )
        auth = base64.b64encode(
            (
                f"{self.config.turn14_client_id}:"
                f"{self.config.turn14_client_secret}"
            ).encode("utf-8")
        ).decode("ascii")
        headers = {
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        }

        request = urllib.request.Request(
            url=self.config.turn14_auth_url,
            data=body,
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(
                request,
                timeout=self.config.timeout_seconds,
            ) as response:
                token_response = json.loads(response.read().decode("utf-8"))
        except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError) as e:
            raise SyncError(f"Turn14 auth request failed: {e}") from e

        token = token_response.get("access_token")
        if not isinstance(token, str) or not token:
            raise SyncError(f"Turn14 auth response did not include access_token: {token_response}")

        self._access_token = token
        return token

    def _build_products_url(self, page: int) -> str:
        base = self.config.turn14_api_base_url.rstrip("/")
        path = self.config.turn14_products_path
        if not path.startswith("/"):
            path = f"/{path}"

        url = f"{base}{path}"
        parsed = urllib.parse.urlparse(url)
        query = dict(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))
        query[self.config.turn14_page_param] = str(page)
        query[self.config.turn14_page_size_param] = str(self.config.turn14_page_size)

        return urllib.parse.urlunparse(
            parsed._replace(query=urllib.parse.urlencode(query))
        )


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync Turn14 products into Supabase.")
    parser.add_argument("--reset", action="store_true", help="Ignore saved pagination state.")
    parser.add_argument("--start-page", type=int, help="Start at this page number.")
    parser.add_argument("--max-pages", type=int, help="Stop after this many pages.")
    parser.add_argument("--state-file", help="Override the resumable state file path.")
    parser.add_argument("--dry-run", action="store_true", help="Download and normalize without writing.")
    args = parser.parse_args()

    try:
        config = load_config(args.state_file)
        http = HttpClient(config.timeout_seconds, config.max_retries)
        turn14 = Turn14Client(config, http)
        supabase = SupabaseClient(config, http)

        state = load_state(config.state_file)
        page = args.start_page or (1 if args.reset else int(state.get("next_page", 1)))
        generations = [] if args.dry_run else supabase.fetch_generations()

        sync_run_id = None
        if not args.dry_run:
            sync_run_id = create_sync_run(supabase)

        summary = run_sync(
            turn14=turn14,
            supabase=supabase,
            generations=generations,
            state_file=config.state_file,
            start_page=page,
            max_pages=args.max_pages,
            dry_run=args.dry_run,
        )

        if sync_run_id:
            final_status = "partial" if summary["records_failed"] else "succeeded"
            complete_sync_run(supabase, sync_run_id, final_status, summary)

        print(json.dumps(summary, indent=2, sort_keys=True))
        return 0
    except Exception as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


def run_sync(
    turn14: Turn14Client,
    supabase: SupabaseClient,
    generations: list[dict[str, Any]],
    state_file: Path,
    start_page: int,
    max_pages: int | None,
    dry_run: bool,
) -> dict[str, Any]:
    page = start_page
    pages_seen = 0
    summary = {
        "started_at": utc_now(),
        "completed_at": None,
        "start_page": start_page,
        "last_page": None,
        "next_page": page,
        "pages_seen": 0,
        "records_seen": 0,
        "records_upserted": 0,
        "records_failed": 0,
        "dry_run": dry_run,
    }

    while True:
        if max_pages is not None and pages_seen >= max_pages:
            break

        products, next_url = turn14.get_products_page(page)
        if not products:
            summary["last_page"] = page
            summary["next_page"] = None
            break

        page_result = sync_products_page(
            supabase=supabase,
            generations=generations,
            products=products,
            dry_run=dry_run,
        )

        pages_seen += 1
        summary["pages_seen"] = pages_seen
        summary["records_seen"] += page_result["records_seen"]
        summary["records_upserted"] += page_result["records_upserted"]
        summary["records_failed"] += page_result["records_failed"]
        summary["last_page"] = page

        page += 1
        summary["next_page"] = page
        save_state(state_file, summary)

        if not next_url and len(products) == 0:
            break

    summary["completed_at"] = utc_now()
    save_state(state_file, summary)
    return summary


def sync_products_page(
    supabase: SupabaseClient,
    generations: list[dict[str, Any]],
    products: list[dict[str, Any]],
    dry_run: bool,
) -> dict[str, int]:
    records_seen = len(products)
    records_upserted = 0
    records_failed = 0

    for raw_product in products:
        try:
            normalized = normalize_product(raw_product)
            if dry_run:
                records_upserted += 1
                continue

            brand_id = None
            if normalized["brand"]:
                brand_rows = supabase.upsert("brands", [normalized["brand"]], "slug")
                brand_id = first_id(brand_rows)

            product_row = dict(normalized["product"])
            product_row["brand_id"] = brand_id
            product_rows = supabase.upsert("products", [product_row], "turn14_id")
            product_id = first_id(product_rows)
            if not product_id:
                raise SyncError(f"Supabase did not return product id for {product_row['turn14_id']}")

            category_id = None
            if normalized["category"]:
                category_rows = supabase.upsert("categories", [normalized["category"]], "slug")
                category_id = first_id(category_rows)

            if category_id:
                supabase.insert_ignore_duplicates(
                    "product_categories",
                    [
                        {
                            "product_id": product_id,
                            "category_id": category_id,
                            "is_primary": True,
                        }
                    ],
                )

            fitment_rows = [
                attach_fitment_ids(product_id, fitment, generations)
                for fitment in normalized["fitments"]
            ]
            if fitment_rows:
                supabase.delete_by_column("product_fitments", "product_id", product_id)
                supabase.insert_ignore_duplicates("product_fitments", fitment_rows)

            records_upserted += 1
        except Exception as error:
            records_failed += 1
            product_ref = raw_product.get("id") or raw_product.get("turn14_id") or "<unknown>"
            print(f"failed product {product_ref}: {error}", file=sys.stderr)

    return {
        "records_seen": records_seen,
        "records_upserted": records_upserted,
        "records_failed": records_failed,
    }


def normalize_product(raw: dict[str, Any]) -> dict[str, Any]:
    turn14_id = first_string(
        raw,
        "turn14_id",
        "id",
        "product_id",
        "item_id",
        "part_id",
        "data.id",
    )
    if not turn14_id:
        raise SyncError("product is missing Turn14 product id")

    part_number = first_string(raw, "part_number", "partNumber", "mfr_part_number", "sku")
    name = first_string(raw, "name", "title", "product_name", "description.name")
    brand_name = first_string(raw, "brand.name", "brand", "manufacturer.name", "manufacturer")

    if not part_number:
        part_number = turn14_id
    if not name:
        name = f"{brand_name or 'Turn14'} {part_number}".strip()

    slug = make_uniqueish_slug([brand_name, part_number, name, turn14_id])
    inventory_status = normalize_inventory_status(
        first_string(raw, "inventory_status", "availability", "status")
    )
    discontinued = bool(first_value(raw, "discontinued", "is_discontinued") or inventory_status == "discontinued")

    product = {
        "turn14_id": turn14_id,
        "part_number": part_number,
        "name": name,
        "slug": slug,
        "short_description": first_string(raw, "short_description", "shortDescription", "summary"),
        "description": first_string(raw, "description", "long_description", "longDescription"),
        "primary_image_url": first_string(raw, "primary_image_url", "image", "image_url", "images.0.url"),
        "price": decimal_string(first_value(raw, "price", "pricing.price", "jobber_price")),
        "map_price": decimal_string(first_value(raw, "map_price", "pricing.map", "pricing.map_price")),
        "msrp": decimal_string(first_value(raw, "msrp", "pricing.msrp", "retail_price")),
        "inventory_status": inventory_status,
        "active": not discontinued,
        "discontinued": discontinued,
        "raw_turn14_json": raw,
        "turn14_updated_at": first_string(raw, "updated_at", "modified_at", "last_modified"),
    }

    brand = None
    if brand_name:
        brand_turn14_id = first_string(raw, "brand.id", "brand_id", "manufacturer.id")
        brand = {
            "turn14_id": brand_turn14_id,
            "name": brand_name,
            "slug": slugify(brand_name),
            "logo_url": first_string(raw, "brand.logo_url", "brand.logo", "manufacturer.logo_url"),
            "website_url": first_string(raw, "brand.website_url", "manufacturer.website_url"),
        }

    category_name = first_string(raw, "category.name", "category", "product_category", "categories.0.name")
    category = None
    if category_name:
        category = {
            "name": category_name,
            "slug": slugify(category_name),
            "is_active": True,
        }

    return {
        "brand": remove_none_values(brand) if brand else None,
        "category": remove_none_values(category) if category else None,
        "product": remove_none_values(product),
        "fitments": normalize_fitments(raw),
    }


def normalize_fitments(raw: dict[str, Any]) -> list[dict[str, Any]]:
    candidates = first_value(raw, "fitments", "applications", "vehicle_fitments", "vehicles")
    if not isinstance(candidates, list):
        return []

    fitments: list[dict[str, Any]] = []
    for item in candidates:
        if not isinstance(item, dict):
            continue

        make = first_string(item, "make") or "Ford"
        model = first_string(item, "model") or "Mustang"
        if "mustang" not in model.lower():
            continue

        years = extract_years(item)
        for year in years:
            fitments.append(
                remove_none_values(
                    {
                        "year": year,
                        "make": make,
                        "model": model,
                        "trim": first_string(item, "trim", "submodel"),
                        "engine": first_string(item, "engine", "engine_description"),
                        "notes": first_string(item, "notes", "note"),
                        "source": "turn14",
                        "source_fitment_id": first_string(item, "id", "fitment_id", "application_id"),
                    }
                )
            )

    return fitments


def attach_fitment_ids(
    product_id: str,
    fitment: dict[str, Any],
    generations: list[dict[str, Any]],
) -> dict[str, Any]:
    row = dict(fitment)
    row["product_id"] = product_id
    row["generation_id"] = generation_id_for_year(row["year"], generations)
    return row


def generation_id_for_year(year: int, generations: list[dict[str, Any]]) -> str | None:
    for generation in generations:
        start_year = generation.get("start_year")
        end_year = generation.get("end_year")
        if isinstance(start_year, int) and year >= start_year:
            if end_year is None or year <= end_year:
                return generation.get("id")
    return None


def extract_years(item: dict[str, Any]) -> list[int]:
    direct_year = first_value(item, "year")
    if isinstance(direct_year, int):
        return [direct_year]
    if isinstance(direct_year, str) and direct_year.isdigit():
        return [int(direct_year)]

    start = first_value(item, "start_year", "year_start", "from_year")
    end = first_value(item, "end_year", "year_end", "to_year")
    try:
        start_int = int(start)
        end_int = int(end)
        if start_int <= end_int:
            return list(range(start_int, end_int + 1))
    except (TypeError, ValueError):
        pass

    year_range = first_string(item, "years", "year_range")
    if year_range:
        matches = [int(match) for match in re.findall(r"\b(19\d{2}|20\d{2})\b", year_range)]
        if len(matches) >= 2:
            return list(range(min(matches), max(matches) + 1))
        return matches

    return []


def create_sync_run(supabase: SupabaseClient) -> str | None:
    rows = supabase.upsert(
        "sync_runs",
        [
            {
                "source": "turn14",
                "sync_type": "products",
                "status": "running",
                "metadata": {"script": "scripts/sync_turn14.py"},
            }
        ],
        "id",
    )
    return first_id(rows)


def complete_sync_run(
    supabase: SupabaseClient,
    sync_run_id: str,
    status: str,
    summary: dict[str, Any],
) -> None:
    supabase.update_by_id(
        "sync_runs",
        sync_run_id,
        {
            "status": status,
            "completed_at": utc_now(),
            "records_seen": summary["records_seen"],
            "records_upserted": summary["records_upserted"],
            "records_failed": summary["records_failed"],
            "metadata": summary,
        },
    )


def extract_products(response: Any, data_path: str) -> list[dict[str, Any]]:
    products = get_path(response, data_path)
    if products is None and isinstance(response, list):
        products = response
    if not isinstance(products, list):
        raise SyncError(f"Could not find product list at path '{data_path}'")
    return [item for item in products if isinstance(item, dict)]


def extract_string(response: Any, path: str) -> str | None:
    value = get_path(response, path)
    return value if isinstance(value, str) and value else None


def get_path(value: Any, path: str) -> Any:
    current = value
    for part in path.split("."):
        if current is None:
            return None
        if isinstance(current, list):
            try:
                current = current[int(part)]
            except (ValueError, IndexError):
                return None
        elif isinstance(current, dict):
            current = current.get(part)
        else:
            return None
    return current


def first_value(data: dict[str, Any], *paths: str) -> Any:
    for path in paths:
        value = get_path(data, path)
        if value not in (None, ""):
            return value
    return None


def first_string(data: dict[str, Any], *paths: str) -> str | None:
    value = first_value(data, *paths)
    if value is None:
        return None
    if isinstance(value, str):
        return value.strip() or None
    return str(value).strip() or None


def first_id(rows: list[dict[str, Any]]) -> str | None:
    if not rows:
        return None
    value = rows[0].get("id")
    return value if isinstance(value, str) else None


def decimal_string(value: Any) -> str | None:
    if value in (None, ""):
        return None
    try:
        return str(Decimal(str(value)))
    except (InvalidOperation, ValueError):
        return None


def normalize_inventory_status(value: str | None) -> str:
    if not value:
        return "unknown"
    normalized = slugify(value).replace("-", "_")
    aliases = {
        "available": "in_stock",
        "in_stock": "in_stock",
        "low_stock": "low_stock",
        "out_of_stock": "out_of_stock",
        "unavailable": "out_of_stock",
        "backordered": "special_order",
        "special_order": "special_order",
        "discontinued": "discontinued",
    }
    return aliases.get(normalized, normalized if normalized in INVENTORY_STATUSES else "unknown")


def make_uniqueish_slug(parts: list[str | None]) -> str:
    slug_parts = [slugify(part) for part in parts if part]
    slug = "-".join(part for part in slug_parts if part)
    return slug[:180] or "turn14-product"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return re.sub(r"-+", "-", slug)


def remove_none_values(row: dict[str, Any] | None) -> dict[str, Any]:
    if row is None:
        return {}
    return {key: value for key, value in row.items() if value is not None}


def load_config(state_file: str | None) -> Config:
    def required(name: str) -> str:
        value = os.getenv(name)
        if not value:
            raise SyncError(f"Missing required environment variable: {name}")
        return value

    return Config(
        supabase_url=required("SUPABASE_URL"),
        supabase_service_role_key=required("SUPABASE_SERVICE_ROLE_KEY"),
        turn14_api_base_url=required("TURN14_API_BASE_URL"),
        turn14_products_path=os.getenv("TURN14_PRODUCTS_PATH", "/products"),
        turn14_page_param=os.getenv("TURN14_PAGE_PARAM", "page"),
        turn14_page_size_param=os.getenv("TURN14_PAGE_SIZE_PARAM", "per_page"),
        turn14_page_size=int(os.getenv("TURN14_PAGE_SIZE", "100")),
        turn14_products_data_path=os.getenv("TURN14_PRODUCTS_DATA_PATH", "data"),
        turn14_products_next_path=os.getenv("TURN14_PRODUCTS_NEXT_PATH", "links.next"),
        turn14_access_token=os.getenv("TURN14_ACCESS_TOKEN"),
        turn14_auth_url=os.getenv("TURN14_AUTH_URL"),
        turn14_client_id=os.getenv("TURN14_CLIENT_ID"),
        turn14_client_secret=os.getenv("TURN14_CLIENT_SECRET"),
        timeout_seconds=int(os.getenv("TURN14_TIMEOUT_SECONDS", "30")),
        max_retries=int(os.getenv("TURN14_MAX_RETRIES", "3")),
        state_file=Path(state_file or os.getenv("SYNC_TURN14_STATE_FILE", DEFAULT_STATE_FILE)),
    )


def load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_state(path: Path, state: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(f"{path.suffix}.tmp")
    with tmp_path.open("w", encoding="utf-8") as file:
        json.dump(state, file, indent=2, sort_keys=True)
        file.write("\n")
    tmp_path.replace(path)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    raise SystemExit(main())
