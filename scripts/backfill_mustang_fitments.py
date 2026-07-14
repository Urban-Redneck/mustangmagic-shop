#!/usr/bin/env python3
"""Infer Mustang fitments from synced product text and write product_fitments.

Turn14 /items payloads do not currently include fitment rows in the synced data.
This script creates a pragmatic storefront bridge by parsing Mustang year ranges
from product name/description text and mapping years to mustang_generations.
Rows are written with source=description_inference so authoritative fitment sync
can replace or coexist with them later.
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
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SOURCE = "description_inference"
DEFAULT_CURRENT_MODEL_YEAR = 2026
PAGE_SIZE = 500


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Backfill product_fitments from Mustang year text."
    )
    parser.add_argument("--dry-run", action="store_true", help="Parse without writing.")
    parser.add_argument(
        "--current-model-year",
        type=int,
        default=int(os.getenv("MUSTANG_CURRENT_MODEL_YEAR", DEFAULT_CURRENT_MODEL_YEAR)),
        help="End year for open-ended descriptions like 2015+.",
    )
    args = parser.parse_args()

    try:
        load_dotenv(Path(__file__).resolve().parents[1] / ".env")
        load_dotenv(Path(__file__).resolve().parents[1] / ".env.local")

        config = {
            "supabase_url": required_env("SUPABASE_URL").rstrip("/"),
            "service_key": required_env("SUPABASE_SERVICE_ROLE_KEY"),
        }
        generations = fetch_generations(config)
        products = fetch_products(config)
        rows = build_fitment_rows(
            products=products,
            generations=generations,
            current_model_year=args.current_model_year,
        )

        summary = {
            "started_at": utc_now(),
            "completed_at": None,
            "dry_run": args.dry_run,
            "products_seen": len(products),
            "products_with_inferred_fitment": len({row["product_id"] for row in rows}),
            "fitment_rows": len(rows),
            "current_model_year": args.current_model_year,
            "source": SOURCE,
        }

        if not args.dry_run:
            delete_existing_inferred_fitments(config)
            insert_fitments(config, rows)

        summary["completed_at"] = utc_now()
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


def fetch_generations(config: dict[str, str]) -> list[dict[str, Any]]:
    query = urllib.parse.urlencode(
        {
            "select": "id,slug,name,start_year,end_year",
            "order": "start_year.asc",
        }
    )
    data = supabase_json(config, "GET", f"mustang_generations?{query}")
    if not isinstance(data, list):
        raise RuntimeError(f"Unexpected mustang_generations response: {data}")
    return data


def fetch_products(config: dict[str, str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        query = urllib.parse.urlencode(
            {
                "select": "id,turn14_id,part_number,name,short_description,description",
                "order": "turn14_id.asc",
                "limit": str(PAGE_SIZE),
                "offset": str(offset),
            }
        )
        batch = supabase_json(config, "GET", f"products?{query}")
        if not isinstance(batch, list):
            raise RuntimeError(f"Unexpected products response: {batch}")
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += len(batch)
    return rows


def build_fitment_rows(
    products: list[dict[str, Any]],
    generations: list[dict[str, Any]],
    current_model_year: int,
) -> list[dict[str, Any]]:
    generation_years = {
        generation["slug"]: set(
            range(
                int(generation["start_year"]),
                int(generation["end_year"] or current_model_year) + 1,
            )
        )
        for generation in generations
    }
    rows: list[dict[str, Any]] = []
    seen: set[tuple[str, int]] = set()

    for product in products:
        text = product_text(product)
        if "mustang" not in text.lower():
            continue

        years = infer_years(text, generation_years, current_model_year)
        for year in sorted(years):
            generation_id = generation_id_for_year(year, generations)
            if not generation_id:
                continue
            key = (str(product["id"]), year)
            if key in seen:
                continue
            seen.add(key)
            rows.append(
                {
                    "product_id": product["id"],
                    "generation_id": generation_id,
                    "year": year,
                    "make": "Ford",
                    "model": "Mustang",
                    "notes": "Inferred from product description text.",
                    "source": SOURCE,
                    "source_fitment_id": f"{product.get('turn14_id') or product['id']}:{year}",
                }
            )
    return rows


def product_text(product: dict[str, Any]) -> str:
    return " ".join(
        str(product.get(field) or "")
        for field in ("name", "short_description", "description", "part_number")
    )


def infer_years(
    text: str,
    generation_years: dict[str, set[int]],
    current_model_year: int,
) -> set[int]:
    explicit_years = extract_explicit_years(text, current_model_year)
    token_years = extract_generation_token_years(text, generation_years)

    if explicit_years and token_years:
        intersection = explicit_years & token_years
        return intersection or (explicit_years | token_years)
    return explicit_years or token_years


def extract_explicit_years(text: str, current_model_year: int) -> set[int]:
    years: set[int] = set()

    for match in re.finditer(r"\b((?:19|20)\d{2})\s*[-–]\s*((?:19|20)\d{2})\b", text):
        years.update(year_range(int(match.group(1)), int(match.group(2)), current_model_year))

    for match in re.finditer(r"\b((?:19|20)\d{2})\s*\+", text):
        years.update(year_range(int(match.group(1)), current_model_year, current_model_year))

    for match in re.finditer(r"\b((?:19|20)\d{2})\b", text):
        years.add(int(match.group(1)))

    for match in re.finditer(r"(?<![A-Za-z0-9])(\d{2})\s*[-–]\s*(\d{2})(?![A-Za-z0-9])", text):
        start = expand_two_digit_year(int(match.group(1)))
        end = expand_two_digit_year(int(match.group(2)), start_year=start)
        years.update(year_range(start, end, current_model_year))

    for match in re.finditer(r"(?<![A-Za-z0-9])(\d{2})\s*\+", text):
        start = expand_two_digit_year(int(match.group(1)))
        years.update(year_range(start, current_model_year, current_model_year))

    return valid_mustang_years(years, current_model_year)


def extract_generation_token_years(
    text: str,
    generation_years: dict[str, set[int]],
) -> set[int]:
    normalized = text.lower()
    aliases = {
        "fox-body": [r"\bfox\s*body\b"],
        "sn95": [r"\bsn95\b"],
        "s197": [r"\bs197\b"],
        "s550": [r"\bs550\b"],
        "s650": [r"\bs650\b"],
    }
    years: set[int] = set()
    for slug, patterns in aliases.items():
        if any(re.search(pattern, normalized) for pattern in patterns):
            years.update(generation_years.get(slug, set()))
    return years


def expand_two_digit_year(value: int, start_year: int | None = None) -> int:
    year = 2000 + value
    if value >= 79:
        year = 1900 + value
    if start_year is not None and year < start_year:
        year += 100
    return year


def year_range(start: int, end: int, current_model_year: int) -> set[int]:
    if end < start:
        return set()
    return valid_mustang_years(set(range(start, min(end, current_model_year) + 1)), current_model_year)


def valid_mustang_years(years: set[int], current_model_year: int) -> set[int]:
    return {year for year in years if 1979 <= year <= current_model_year}


def generation_id_for_year(year: int, generations: list[dict[str, Any]]) -> str | None:
    for generation in generations:
        start_year = int(generation["start_year"])
        end_year = generation["end_year"]
        if year >= start_year and (end_year is None or year <= int(end_year)):
            return str(generation["id"])
    return None


def delete_existing_inferred_fitments(config: dict[str, str]) -> None:
    supabase_json(config, "DELETE", f"product_fitments?source=eq.{SOURCE}", expect_body=False)


def insert_fitments(config: dict[str, str], rows: list[dict[str, Any]]) -> None:
    for index in range(0, len(rows), PAGE_SIZE):
        chunk = rows[index : index + PAGE_SIZE]
        if chunk:
            supabase_json(config, "POST", "product_fitments", body=chunk)


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
        headers["Prefer"] = "resolution=ignore-duplicates,return=minimal"
    elif method == "DELETE":
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


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


if __name__ == "__main__":
    raise SystemExit(main())
