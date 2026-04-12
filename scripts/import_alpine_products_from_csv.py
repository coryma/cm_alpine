#!/usr/bin/env python3
"""Import Alpine products from a CSV file into the current Salesforce org."""

from __future__ import annotations

import argparse
import csv
import json
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


ALPINE_STORE_ID = "0ZEKh000000LHFhOAO"
STANDARD_PRICEBOOK_ID = "01sKh000000prbkIAA"
ALPINE_PRICEBOOK_ID = "01sKh000000pu8fIAA"
ALPINE_STRIKETHROUGH_PRICEBOOK_ID = "01sKh000000pu8eIAA"
ALPINE_POLICY_ID = "1CeKh000000PTBwKAO"
ALL_PRODUCTS_CATEGORY_ID = "0ZGKh000000oh5EOAQ"
SHOP_ALL_CATEGORY_ID = "0ZGKh000000oh5dOAA"


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def resolve_target_org(explicit_target_org: str | None) -> str:
    if explicit_target_org:
        return explicit_target_org

    sf_config = Path.home() / ".sf" / "config.json"
    if sf_config.exists():
        target_org = load_json(sf_config).get("target-org")
        if target_org:
            return target_org

    sfdx_config = Path.home() / ".sfdx" / "sfdx-config.json"
    if sfdx_config.exists():
        target_org = load_json(sfdx_config).get("defaultusername")
        if target_org:
            return target_org

    return "sftw-260331"


def soql_literal(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'")


def parse_decimal(raw_value: str | None) -> Decimal | None:
    if raw_value is None:
        return None

    normalized = raw_value.strip()
    if not normalized:
        return None

    try:
        return Decimal(normalized)
    except InvalidOperation as exc:
        raise RuntimeError(f"Invalid decimal value: {raw_value!r}") from exc


def parse_bool(raw_value: str | None) -> bool:
    return (raw_value or "").strip().lower() in {"1", "true", "yes", "y"}


def first_non_empty(*values: str | None) -> str | None:
    for value in values:
        if value and value.strip():
            return value.strip()
    return None


def chunked(values: list[str], size: int = 20) -> list[list[str]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def build_short_description(description: str | None, max_length: int = 255) -> str | None:
    if not description:
        return None

    normalized = " ".join(description.split())
    if not normalized:
        return None
    if len(normalized) <= max_length:
        return normalized

    first_sentence = normalized.split(". ", 1)[0].strip()
    if first_sentence and len(first_sentence) <= max_length:
        return first_sentence

    trimmed = normalized[: max_length - 3].rstrip()
    if " " in trimmed:
        trimmed = trimmed.rsplit(" ", 1)[0]
    return trimmed + "..."


def to_payload_decimal(value: Decimal | None) -> float | None:
    if value is None:
        return None
    return float(value)


def infer_family(name: str, category: str | None, provided_family: str | None) -> str | None:
    if provided_family:
        return provided_family

    normalized_name = name.strip().lower()
    normalized_category = (category or "").strip().lower()

    if normalized_name.startswith(("gobar", "gogoo", "bigfootbar", "yetibar")):
        return "Alpine Nutrition"
    if normalized_name.startswith("gobrew"):
        return "Alpine Blends"
    if normalized_name.startswith("alpine energy"):
        return "Alpine Energy"

    if normalized_category.startswith("energy/"):
        return "Alpine Nutrition"
    if normalized_category.startswith("drinks/coffee") or normalized_category.startswith("machines/coffee"):
        return "Alpine Blends"
    if normalized_category.startswith("drinks/energy") or normalized_category.startswith("machines/smart dispenser"):
        return "Alpine Energy"

    return None


class SfOrgSession:
    def __init__(self, target_org: str, api_version: str = "66.0", timeout_seconds: int = 30) -> None:
        self.target_org = target_org
        self.api_version = api_version
        self.timeout_seconds = timeout_seconds
        self.instance_url = ""
        self.access_token = ""
        self._field_cache: dict[str, set[str]] = {}
        self.refresh_auth()

    def refresh_auth(self) -> None:
        result = json.loads(
            subprocess.check_output(
                ["/usr/local/bin/sf", "org", "display", "-o", self.target_org, "--json"],
                text=True,
            )
        )["result"]
        self.instance_url = result["instanceUrl"].rstrip("/")
        self.access_token = result["accessToken"]

    def _request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        retried: bool = False,
    ) -> dict[str, Any]:
        url = f"{self.instance_url}/services/data/v{self.api_version}/{path.lstrip('/')}"
        body = None
        headers = {"Authorization": f"Bearer {self.access_token}"}
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request = urllib.request.Request(url, data=body, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                raw = response.read()
                return json.loads(raw.decode("utf-8")) if raw else {}
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            if exc.code == 401 and not retried:
                self.refresh_auth()
                return self._request(method, path, payload, retried=True)
            raise RuntimeError(f"{method} {path} failed: {exc.code} {error_body}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"{method} {path} failed: {exc}") from exc

    def query(self, soql: str) -> list[dict[str, Any]]:
        encoded = urllib.parse.quote(soql, safe="")
        result = self._request("GET", f"query?q={encoded}")
        return result.get("records", [])

    def create(self, sobject: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", f"sobjects/{sobject}", payload)

    def update(self, sobject: str, record_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("PATCH", f"sobjects/{sobject}/{record_id}", payload)

    def describe_fields(self, sobject: str) -> set[str]:
        if sobject not in self._field_cache:
            description = self._request("GET", f"sobjects/{sobject}/describe")
            self._field_cache[sobject] = {field["name"] for field in description.get("fields", [])}
        return self._field_cache[sobject]


def query_one(client: SfOrgSession, soql: str) -> dict[str, Any] | None:
    rows = client.query(soql)
    if not rows:
        return None
    if len(rows) > 1:
        raise RuntimeError(f"Expected at most one row for query: {soql}")
    return rows[0]


@dataclass(frozen=True)
class CsvProduct:
    row_number: int
    name: str
    description: str | None
    sku: str | None
    family: str | None
    category: str | None
    display_url: str | None
    listing_url: str | None
    sales_price: Decimal | None
    original_price: Decimal | None
    is_active: bool

    @property
    def lookup_key(self) -> str:
        return self.sku or self.name


def load_csv_rows(csv_path: Path, limit: int | None = None) -> list[CsvProduct]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        raw_rows = list(csv.DictReader(handle))

    rows: list[CsvProduct] = []
    for index, row in enumerate(raw_rows, start=2):
        name = (row.get("Product Name") or "").strip()
        if not name:
            raise RuntimeError(f"Missing Product Name at CSV row {index}")

        product = CsvProduct(
            row_number=index,
            name=name,
            description=first_non_empty(row.get("Product Description")),
            sku=first_non_empty(row.get("SKU")),
            family=infer_family(
                name,
                first_non_empty(row.get("Category")),
                first_non_empty(row.get("Product Family")),
            ),
            category=first_non_empty(row.get("Category")),
            display_url=first_non_empty(row.get("Media Standard Url 1"), row.get("Media Listing Url 1")),
            listing_url=first_non_empty(row.get("Media Listing Url 1")),
            sales_price=parse_decimal(row.get("Price (sales)")),
            original_price=parse_decimal(row.get("Price (original)")),
            is_active=parse_bool(row.get("Product isActive")),
        )
        rows.append(product)

    if limit is not None:
        return rows[:limit]
    return rows


def get_product_select_clause(product_fields: set[str]) -> str:
    select_fields = ["Id", "Name", "ProductCode", "Family", "Description", "IsActive", "DisplayUrl"]
    for field_name in (
        "Show_on_Alpine__c",
        "Alpine_Category__c",
        "Alpine_Short_Description__c",
        "Alpine_Sort_Order__c",
    ):
        if field_name in product_fields:
            select_fields.append(field_name)
    return ", ".join(select_fields)


def prefetch_existing_products(
    client: SfOrgSession, products: list[CsvProduct], product_fields: set[str]
) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    select_clause = get_product_select_clause(product_fields)
    by_sku: dict[str, dict[str, Any]] = {}
    by_name: dict[str, dict[str, Any]] = {}

    skus = sorted({product.sku for product in products if product.sku})
    names = sorted({product.name for product in products})

    for sku_chunk in chunked(skus):
        values = ", ".join(f"'{soql_literal(value)}'" for value in sku_chunk)
        rows = client.query(f"SELECT {select_clause} FROM Product2 WHERE ProductCode IN ({values})")
        for row in rows:
            if row.get("ProductCode"):
                by_sku[row["ProductCode"]] = row
            by_name[row["Name"]] = row

    for name_chunk in chunked(names):
        values = ", ".join(f"'{soql_literal(value)}'" for value in name_chunk)
        rows = client.query(f"SELECT {select_clause} FROM Product2 WHERE Name IN ({values})")
        for row in rows:
            if row.get("ProductCode"):
                by_sku.setdefault(row["ProductCode"], row)
            by_name[row["Name"]] = row

    return by_sku, by_name


def get_existing_product(
    product: CsvProduct,
    existing_by_sku: dict[str, dict[str, Any]],
    existing_by_name: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    if product.sku and product.sku in existing_by_sku:
        return existing_by_sku[product.sku]

    return existing_by_name.get(product.name)


def get_next_sort_order_seed(client: SfOrgSession, product_fields: set[str]) -> int:
    if "Alpine_Sort_Order__c" not in product_fields:
        return 1000

    row = query_one(
        client,
        "SELECT Alpine_Sort_Order__c "
        "FROM Product2 "
        "WHERE Alpine_Sort_Order__c != null "
        "ORDER BY Alpine_Sort_Order__c DESC "
        "LIMIT 1",
    )
    if not row or row.get("Alpine_Sort_Order__c") is None:
        return 1000
    return int(row["Alpine_Sort_Order__c"]) + 10


def build_product_payload(
    product: CsvProduct, sort_order: int | None, product_fields: set[str]
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "Name": product.name,
        "IsActive": product.is_active,
    }
    if product.sku:
        payload["ProductCode"] = product.sku
    if product.family:
        payload["Family"] = product.family
    if product.description:
        payload["Description"] = product.description
    if product.display_url:
        payload["DisplayUrl"] = product.display_url
    if "Show_on_Alpine__c" in product_fields:
        payload["Show_on_Alpine__c"] = product.is_active
    if product.category and "Alpine_Category__c" in product_fields:
        payload["Alpine_Category__c"] = product.category

    short_description = build_short_description(product.description)
    if short_description and "Alpine_Short_Description__c" in product_fields:
        payload["Alpine_Short_Description__c"] = short_description
    if sort_order is not None and "Alpine_Sort_Order__c" in product_fields:
        payload["Alpine_Sort_Order__c"] = sort_order
    return payload


def values_differ(existing_value: Any, new_value: Any) -> bool:
    if existing_value is None and new_value in (None, ""):
        return False
    if isinstance(existing_value, bool) or isinstance(new_value, bool):
        return bool(existing_value) != bool(new_value)
    return str(existing_value) != str(new_value)


def is_duplicate_error(exc: RuntimeError, marker: str | None = None) -> bool:
    message = str(exc)
    if marker and marker in message:
        return True
    return "DUPLICATE_VALUE" in message or "FIELD_INTEGRITY_EXCEPTION" in message


def ensure_product(
    client: SfOrgSession,
    product: CsvProduct,
    sort_order_seed: int,
    product_fields: set[str],
    existing_by_sku: dict[str, dict[str, Any]],
    existing_by_name: dict[str, dict[str, Any]],
) -> tuple[str, str, int]:
    existing = get_existing_product(product, existing_by_sku, existing_by_name)
    supports_sort_order = "Alpine_Sort_Order__c" in product_fields
    sort_order = None
    if supports_sort_order:
        sort_order = None if existing and existing.get("Alpine_Sort_Order__c") is not None else sort_order_seed
    payload = build_product_payload(product, sort_order, product_fields)

    if existing:
        changed_payload = {
            field_name: value
            for field_name, value in payload.items()
            if values_differ(existing.get(field_name), value)
        }
        if changed_payload:
            client.update("Product2", existing["Id"], changed_payload)
            product_status = "updated"
        else:
            product_status = "unchanged"
        merged = dict(existing)
        merged.update(payload)
        existing_by_name[product.name] = merged
        if product.sku:
            existing_by_sku[product.sku] = merged
        return existing["Id"], product_status, sort_order_seed

    created = client.create("Product2", payload)
    created_row = {"Id": created["id"], **payload}
    existing_by_name[product.name] = created_row
    if product.sku:
        existing_by_sku[product.sku] = created_row
    next_seed = sort_order_seed + 10 if supports_sort_order and sort_order is not None else sort_order_seed
    return created["id"], "created", next_seed


def prefetch_pricebook_entries(
    client: SfOrgSession, pricebook_id: str, product_ids: list[str]
) -> dict[str, dict[str, Any]]:
    entries: dict[str, dict[str, Any]] = {}
    for product_id_chunk in chunked(product_ids):
        values = ", ".join(f"'{product_id}'" for product_id in product_id_chunk)
        rows = client.query(
            "SELECT Id, Product2Id, UnitPrice, IsActive "
            "FROM PricebookEntry "
            f"WHERE Pricebook2Id = '{pricebook_id}' "
            f"AND Product2Id IN ({values})"
        )
        for row in rows:
            entries[row["Product2Id"]] = row
    return entries


def ensure_pricebook_entry(
    client: SfOrgSession,
    pricebook_id: str,
    product_id: str,
    unit_price: Decimal | None,
    existing_entries: dict[str, dict[str, Any]],
) -> str:
    if unit_price is None:
        return "skipped"

    existing = existing_entries.get(product_id)

    payload = {
        "Pricebook2Id": pricebook_id,
        "Product2Id": product_id,
        "UnitPrice": to_payload_decimal(unit_price),
        "IsActive": True,
    }
    if pricebook_id != STANDARD_PRICEBOOK_ID:
        payload["UseStandardPrice"] = False

    if not existing:
        try:
            created = client.create("PricebookEntry", payload)
        except RuntimeError as exc:
            if not is_duplicate_error(exc, "already exists in this price book"):
                raise
            existing = query_one(
                client,
                "SELECT Id, Product2Id, UnitPrice, IsActive "
                "FROM PricebookEntry "
                f"WHERE Pricebook2Id = '{pricebook_id}' "
                f"AND Product2Id = '{product_id}' "
                "LIMIT 1",
            )
            if not existing:
                raise
            existing_entries[product_id] = existing
            current_price = Decimal(str(existing["UnitPrice"]))
            if current_price != unit_price or not existing["IsActive"]:
                client.update(
                    "PricebookEntry",
                    existing["Id"],
                    {"UnitPrice": to_payload_decimal(unit_price), "IsActive": True},
                )
                existing_entries[product_id]["UnitPrice"] = to_payload_decimal(unit_price)
                existing_entries[product_id]["IsActive"] = True
                return "updated"
            return "unchanged"
        existing_entries[product_id] = {
            "Id": created["id"],
            "Product2Id": product_id,
            "UnitPrice": to_payload_decimal(unit_price),
            "IsActive": True,
        }
        return "created"

    current_price = Decimal(str(existing["UnitPrice"]))
    if current_price != unit_price or not existing["IsActive"]:
        client.update(
            "PricebookEntry",
            existing["Id"],
            {"UnitPrice": to_payload_decimal(unit_price), "IsActive": True},
        )
        existing_entries[product_id]["UnitPrice"] = to_payload_decimal(unit_price)
        existing_entries[product_id]["IsActive"] = True
        return "updated"

    return "unchanged"


def prefetch_category_links(
    client: SfOrgSession, category_id: str, product_ids: list[str]
) -> set[str]:
    linked_product_ids: set[str] = set()
    for product_id_chunk in chunked(product_ids):
        values = ", ".join(f"'{product_id}'" for product_id in product_id_chunk)
        rows = client.query(
            "SELECT ProductId "
            "FROM ProductCategoryProduct "
            f"WHERE ProductCategoryId = '{category_id}' "
            f"AND ProductId IN ({values})"
        )
        linked_product_ids.update(row["ProductId"] for row in rows)
    return linked_product_ids


def ensure_category_link(
    client: SfOrgSession, product_id: str, category_id: str, existing_links: set[str]
) -> str:
    if product_id in existing_links:
        return "unchanged"

    try:
        client.create(
            "ProductCategoryProduct",
            {
                "ProductId": product_id,
                "ProductCategoryId": category_id,
                "IsPrimaryCategory": False,
            },
        )
    except RuntimeError as exc:
        if not is_duplicate_error(exc):
            raise
        existing_links.add(product_id)
        return "unchanged"
    existing_links.add(product_id)
    return "created"


def prefetch_entitlements(client: SfOrgSession, product_ids: list[str]) -> set[str]:
    entitled_product_ids: set[str] = set()
    for product_id_chunk in chunked(product_ids):
        values = ", ".join(f"'{product_id}'" for product_id in product_id_chunk)
        rows = client.query(
            "SELECT ProductId "
            "FROM CommerceEntitlementProduct "
            f"WHERE PolicyId = '{ALPINE_POLICY_ID}' "
            f"AND ProductId IN ({values})"
        )
        entitled_product_ids.update(row["ProductId"] for row in rows)
    return entitled_product_ids


def ensure_entitlement(client: SfOrgSession, product_id: str, entitled_product_ids: set[str]) -> str:
    if product_id in entitled_product_ids:
        return "unchanged"

    try:
        client.create(
            "CommerceEntitlementProduct",
            {"PolicyId": ALPINE_POLICY_ID, "ProductId": product_id},
        )
    except RuntimeError as exc:
        if not is_duplicate_error(exc):
            raise
        entitled_product_ids.add(product_id)
        return "unchanged"
    entitled_product_ids.add(product_id)
    return "created"


def verify_storefront_product(client: SfOrgSession, product_id: str) -> bool:
    try:
        result = client._request(
            "GET",
            f"commerce/webstores/{ALPINE_STORE_ID}/products/{product_id}?language=en_US",
        )
    except RuntimeError:
        return False
    return bool(result.get("id"))


def import_products(
    client: SfOrgSession, products: list[CsvProduct], verify_storefront: bool = False
) -> dict[str, Any]:
    product_fields = client.describe_fields("Product2")
    sort_order_seed = get_next_sort_order_seed(client, product_fields)
    existing_by_sku, existing_by_name = prefetch_existing_products(client, products, product_fields)
    summary = {
        "products_created": 0,
        "products_updated": 0,
        "products_unchanged": 0,
        "standard_pricebook_created": 0,
        "standard_pricebook_updated": 0,
        "alpine_pricebook_created": 0,
        "alpine_pricebook_updated": 0,
        "strikethrough_pricebook_created": 0,
        "strikethrough_pricebook_updated": 0,
        "entitlements_created": 0,
        "all_products_links_created": 0,
        "shop_all_links_created": 0,
        "storefront_verified": 0,
        "sku_warnings": [],
        "available_product_fields": sorted(
            field_name
            for field_name in (
                "DisplayUrl",
                "Family",
                "ProductCode",
                "Show_on_Alpine__c",
                "Alpine_Category__c",
                "Alpine_Short_Description__c",
                "Alpine_Sort_Order__c",
            )
            if field_name in product_fields
        ),
        "processed": [],
    }

    product_rows: list[tuple[CsvProduct, str, str]] = []
    for product in products:
        product_id, product_status, sort_order_seed = ensure_product(
            client,
            product,
            sort_order_seed,
            product_fields,
            existing_by_sku,
            existing_by_name,
        )
        product_rows.append((product, product_id, product_status))
        if product_status == "created":
            summary["products_created"] += 1
        elif product_status == "updated":
            summary["products_updated"] += 1
        else:
            summary["products_unchanged"] += 1

    product_ids = [product_id for _, product_id, _ in product_rows]
    standard_entries = prefetch_pricebook_entries(client, STANDARD_PRICEBOOK_ID, product_ids)
    alpine_entries = prefetch_pricebook_entries(client, ALPINE_PRICEBOOK_ID, product_ids)
    strike_entries = prefetch_pricebook_entries(client, ALPINE_STRIKETHROUGH_PRICEBOOK_ID, product_ids)
    entitled_product_ids = prefetch_entitlements(client, product_ids)
    all_products_links = prefetch_category_links(client, ALL_PRODUCTS_CATEGORY_ID, product_ids)
    shop_all_links = prefetch_category_links(client, SHOP_ALL_CATEGORY_ID, product_ids)

    for product, product_id, product_status in product_rows:
        standard_status = ensure_pricebook_entry(
            client,
            STANDARD_PRICEBOOK_ID,
            product_id,
            product.sales_price,
            standard_entries,
        )
        alpine_status = ensure_pricebook_entry(
            client,
            ALPINE_PRICEBOOK_ID,
            product_id,
            product.sales_price,
            alpine_entries,
        )
        strike_status = ensure_pricebook_entry(
            client,
            ALPINE_STRIKETHROUGH_PRICEBOOK_ID,
            product_id,
            product.original_price,
            strike_entries,
        )
        entitlement_status = ensure_entitlement(client, product_id, entitled_product_ids)
        all_products_status = ensure_category_link(client, product_id, ALL_PRODUCTS_CATEGORY_ID, all_products_links)
        shop_all_status = ensure_category_link(client, product_id, SHOP_ALL_CATEGORY_ID, shop_all_links)
        storefront_visible = verify_storefront_product(client, product_id) if verify_storefront else False

        if standard_status == "created":
            summary["standard_pricebook_created"] += 1
        elif standard_status == "updated":
            summary["standard_pricebook_updated"] += 1

        if alpine_status == "created":
            summary["alpine_pricebook_created"] += 1
        elif alpine_status == "updated":
            summary["alpine_pricebook_updated"] += 1

        if strike_status == "created":
            summary["strikethrough_pricebook_created"] += 1
        elif strike_status == "updated":
            summary["strikethrough_pricebook_updated"] += 1

        if entitlement_status == "created":
            summary["entitlements_created"] += 1
        if all_products_status == "created":
            summary["all_products_links_created"] += 1
        if shop_all_status == "created":
            summary["shop_all_links_created"] += 1
        if storefront_visible:
            summary["storefront_verified"] += 1

        if product.sku and len(product.sku) < 4:
            summary["sku_warnings"].append(
                {
                    "row_number": product.row_number,
                    "sku": product.sku,
                    "name": product.name,
                }
            )

        summary["processed"].append(
            {
                "row_number": product.row_number,
                "product_id": product_id,
                "name": product.name,
                "sku": product.sku,
                "product_status": product_status,
                "standard_pricebook_status": standard_status,
                "alpine_pricebook_status": alpine_status,
                "strikethrough_pricebook_status": strike_status,
                "entitlement_status": entitlement_status,
                "storefront_visible": storefront_visible,
            }
        )

    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--csv",
        default="/Users/cory.ma/Downloads/Alpine_Data_With_Media.csv",
        help="Path to the source CSV file.",
    )
    parser.add_argument(
        "--target-org",
        default=None,
        help="Salesforce target org alias or username. Defaults to the CLI target org.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only process the first N CSV rows.",
    )
    parser.add_argument(
        "--verify-storefront",
        action="store_true",
        help="Verify each imported product via the Commerce storefront API.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    csv_path = Path(args.csv).expanduser().resolve()
    if not csv_path.exists():
        raise RuntimeError(f"CSV file not found: {csv_path}")

    target_org = resolve_target_org(args.target_org)
    client = SfOrgSession(target_org)
    products = load_csv_rows(csv_path, args.limit)
    summary = import_products(client, products, verify_storefront=args.verify_storefront)
    summary["target_org"] = target_org
    summary["csv_path"] = str(csv_path)
    summary["processed_count"] = len(products)
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
