#!/usr/bin/env python3
"""Import a small Mustang-related Turn14 sample into Supabase."""

from __future__ import annotations

import base64
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

MAX_PAGES = 50
PER_PAGE = 100
MAX_MATCHES = 500
MUSTANG_KEYWORDS = (
  "mustang",
  "gt500",
  "gt350",
  "shelby",
  "coyote",
  "mach 1",
  "dark horse",
  "s550",
  "s650",
  "fox body",
  "5.0",
)


def main() -> int:
  try:
    config = {
      "turn14_client_id": required_env("TURN14_CLIENT_ID"),
      "turn14_client_secret": required_env("TURN14_CLIENT_SECRET"),
      "supabase_url": required_env("SUPABASE_URL").rstrip("/"),
      "supabase_service_role_key": required_env("SUPABASE_SERVICE_ROLE_KEY"),
    }

    token = get_turn14_token(
      config["turn14_client_id"],
      config["turn14_client_secret"],
    )
    failures = []
    products = []
    total_scanned = 0
    total_matches = 0

    for page in range(1, MAX_PAGES + 1):
      items = fetch_turn14_items(token, page=page, per_page=PER_PAGE)
      if not items:
        break

      for item in items:
        total_scanned += 1

        if not is_mustang_related(item):
          continue

        total_matches += 1

        try:
          products.append(normalize_product(item))
        except Exception as error:
          failures.append(
            {
              "turn14_id": item.get("id", "unknown"),
              "error": str(error),
            }
          )

        if len(products) >= MAX_MATCHES:
          break

      if len(products) >= MAX_MATCHES:
        break

    inserted_or_updated = 0
    if products:
      try:
        rows = upsert_supabase_products(
          config["supabase_url"],
          config["supabase_service_role_key"],
          products,
        )
        inserted_or_updated = len(rows)
      except Exception as error:
        for product in products:
          failures.append(
            {
              "turn14_id": product.get("turn14_id", "unknown"),
              "error": str(error),
            }
          )

    print(f"Total scanned: {total_scanned}")
    print(f"Total Mustang matches: {total_matches}")
    print(f"Total inserted/updated: {inserted_or_updated}")
    print(f"Skipped count: {total_scanned - total_matches}")
    print(f"Failures: {len(failures)}")

    for failure in failures[:10]:
      print(f"- {failure['turn14_id']}: {failure['error']}")
    if len(failures) > 10:
      print(f"- ... {len(failures) - 10} more failures")

    return 0
  except Exception as error:
    print(f"Error: {error}", file=sys.stderr)
    return 1


def required_env(name: str) -> str:
  value = os.getenv(name)
  if not value:
    raise RuntimeError(f"Missing required environment variable: {name}")
  return value


def load_dotenv(path: Path) -> None:
  if not path.exists():
    return

  for line in path.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
      continue

    key, value = line.split("=", 1)
    key = key.strip()
    if key.startswith("export "):
      key = key.removeprefix("export ").strip()
    value = value.strip().strip('"').strip("'")

    if key and key not in os.environ:
      os.environ[key] = value


load_dotenv(Path(__file__).resolve().parents[1] / ".env")
load_dotenv(Path(__file__).resolve().parents[1] / ".env.local")


def get_turn14_token(client_id: str, client_secret: str) -> str:
  body = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode("utf-8")
  basic_auth = base64.b64encode(f"{client_id}:{client_secret}".encode("utf-8")).decode(
    "ascii"
  )
  request = urllib.request.Request(
    os.getenv("TURN14_AUTH_URL", "https://api.turn14.com/v1/token"),
    data=body,
    method="POST",
    headers={
      "Authorization": f"Basic {basic_auth}",
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
  )
  response = request_json(request)
  token = response.get("access_token")
  if not token:
    raise RuntimeError(f"Turn14 auth response did not include access_token: {response}")
  return token


def fetch_turn14_items(token: str, page: int, per_page: int) -> list[dict[str, Any]]:
  api_base_url = os.getenv("TURN14_API_BASE_URL", "https://api.turn14.com/v1")
  url = f"{api_base_url.rstrip('/')}/items?page={page}&per_page={per_page}"
  request = urllib.request.Request(
    url,
    method="GET",
    headers={
      "Authorization": f"Bearer {token}",
      "Accept": "application/json",
    },
  )
  response = request_json(request)
  data = response.get("data")
  if not isinstance(data, list) or not data:
    raise RuntimeError(f"Turn14 /items returned no item data: {response}")

  items = [item for item in data if isinstance(item, dict)]
  if len(items) != len(data):
    raise RuntimeError("Turn14 /items returned one or more unexpected item shapes.")

  return items[:per_page]


def normalize_product(item: dict[str, Any]) -> dict[str, Any]:
  attrs = item.get("attributes")
  if not isinstance(attrs, dict):
    raise RuntimeError(f"Turn14 item is missing attributes: {item}")

  turn14_id = string_value(item.get("id"))
  part_number = string_value(attrs.get("part_number"))
  product_name = string_value(attrs.get("product_name"))

  if not turn14_id:
    raise RuntimeError("Turn14 item is missing id.")
  if not part_number:
    raise RuntimeError(f"Turn14 item {turn14_id} is missing part_number.")
  if not product_name:
    raise RuntimeError(f"Turn14 item {turn14_id} is missing product_name.")

  product = {
    "turn14_id": turn14_id,
    "part_number": part_number,
    "manufacturer_part_number": string_value(attrs.get("mfr_part_number")),
    "alternate_part_number": string_value(attrs.get("alternate_part_number")),
    "barcode": string_value(attrs.get("barcode")),
    "name": product_name,
    "slug": slugify(
      "-".join(
        value
        for value in [
          string_value(attrs.get("brand")),
          part_number,
          product_name,
          turn14_id,
        ]
        if value
      )
    ),
    "short_description": string_value(attrs.get("part_description")),
    "description": string_value(attrs.get("part_description")),
    "turn14_category": string_value(attrs.get("category")),
    "turn14_subcategory": string_value(attrs.get("subcategory")),
    "primary_image_url": string_value(attrs.get("thumbnail")),
    "price_group_id": attrs.get("price_group_id"),
    "price_group": string_value(attrs.get("price_group")),
    "inventory_status": "in_stock" if attrs.get("active") else "discontinued",
    "active": bool(attrs.get("active")),
    "storefront_visible": False,
    "featured": False,
    "discontinued": not bool(attrs.get("active")),
    "born_on_date": attrs.get("born_on_date"),
    "regular_stock": attrs.get("regular_stock"),
    "powersports_indicator": attrs.get("powersports_indicator"),
    "dropship_controller_id": attrs.get("dropship_controller_id"),
    "air_freight_prohibited": attrs.get("air_freight_prohibited"),
    "not_carb_approved": attrs.get("not_carb_approved"),
    "carb_acknowledgement_required": attrs.get("carb_acknowledgement_required"),
    "carb_eo_number": string_value(attrs.get("carb_eo_number")),
    "ltl_freight_required": attrs.get("ltl_freight_required"),
    "prop_65": string_value(attrs.get("prop_65")),
    "epa": string_value(attrs.get("epa")),
    "units_per_sku": attrs.get("units_per_sku"),
    "clearance_item": attrs.get("clearance_item"),
    "dimensions": attrs.get("dimensions") or [],
    "warehouse_availability": attrs.get("warehouse_availability") or [],
    "contents": attrs.get("contents") or [],
    "raw_turn14_json": item,
  }

  return product


def is_mustang_related(item: dict[str, Any]) -> bool:
  attrs = item.get("attributes")
  if not isinstance(attrs, dict):
    return False

  if has_mustang_fitment(attrs):
    return True

  text = " ".join(
    value
    for value in [
      string_value(attrs.get("product_name")),
      string_value(attrs.get("part_description")),
      string_value(attrs.get("category")),
      string_value(attrs.get("subcategory")),
      vehicle_text(attrs),
    ]
    if value
  ).lower()

  return any(keyword in text for keyword in MUSTANG_KEYWORDS)


def has_mustang_fitment(attrs: dict[str, Any]) -> bool:
  for key in ("fitments", "applications", "vehicle_fitments", "vehicles"):
    fitments = attrs.get(key)
    if not isinstance(fitments, list):
      continue

    for fitment in fitments:
      if not isinstance(fitment, dict):
        continue

      make = string_value(fitment.get("make")) or ""
      model = string_value(fitment.get("model")) or ""

      if make.lower() == "ford" and "mustang" in model.lower():
        return True

  return False


def vehicle_text(attrs: dict[str, Any]) -> str:
  values = []
  for key in ("fitments", "applications", "vehicle_fitments", "vehicles"):
    value = attrs.get(key)
    if value:
      values.append(json.dumps(value))
  return " ".join(values)


def upsert_supabase_products(
  supabase_url: str,
  service_role_key: str,
  products: list[dict[str, Any]],
) -> list[dict[str, Any]]:
  url = f"{supabase_url}/rest/v1/products?on_conflict=turn14_id"
  request = urllib.request.Request(
    url,
    data=json.dumps(products).encode("utf-8"),
    method="POST",
    headers={
      "apikey": service_role_key,
      "Authorization": f"Bearer {service_role_key}",
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Prefer": "resolution=merge-duplicates,return=representation",
    },
  )
  response = request_json(request)
  if not isinstance(response, list):
    raise RuntimeError(f"Unexpected Supabase response: {response}")
  return response


def request_json(request: urllib.request.Request) -> Any:
  timeout_seconds = int(os.getenv("IMPORT_TURN14_TIMEOUT_SECONDS", "10"))
  try:
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
      return json.loads(response.read().decode("utf-8"))
  except urllib.error.HTTPError as error:
    detail = error.read().decode("utf-8", errors="replace")
    raise RuntimeError(f"{request.full_url} failed with {error.code}: {detail}") from error
  except TimeoutError as error:
    raise RuntimeError(
      f"{request.full_url} timed out after {timeout_seconds} seconds"
    ) from error


def string_value(value: Any) -> str | None:
  if value is None:
    return None
  text = str(value).strip()
  return text or None


def slugify(value: str) -> str:
  slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
  return re.sub(r"-+", "-", slug)[:180] or "turn14-product"


if __name__ == "__main__":
  raise SystemExit(main())
