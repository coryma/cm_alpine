#!/usr/bin/env python3
"""Publish a small set of demo products to the Alpine B2C storefront."""

from __future__ import annotations

import json
from dataclasses import dataclass

from create_today_tasks import SalesforceClient, resolve_auth_path


ALPINE_STORE_ID = "0ZEKh000000LHFhOAO"
ALPINE_PRICEBOOK_ID = "01sKh000000pu8fIAA"
STANDARD_PRICEBOOK_ID = "01sKh000000prbkIAA"
ALPINE_POLICY_ID = "1CeKh000000PTBwKAO"

ALL_PRODUCTS_CATEGORY_ID = "0ZGKh000000oh5EOAQ"
SHOP_ALL_CATEGORY_ID = "0ZGKh000000oh5dOAA"


@dataclass(frozen=True)
class DemoProduct:
    product_id: str
    name: str
    unit_price: float


DEMO_PRODUCTS = (
    DemoProduct(
        product_id="01tKh000005aaMjIAI",
        name="Alpine Energy Drink - Tart Cherry",
        unit_price=4.99,
    ),
    DemoProduct(
        product_id="01tKh000005qEJOIA2",
        name="Alpine - Oat Cereal",
        unit_price=4.99,
    ),
)


def query_one(client: SalesforceClient, soql: str) -> dict | None:
    rows = client.query(soql)
    if not rows:
        return None
    if len(rows) > 1:
        raise RuntimeError(f"Expected at most one row for query: {soql}")
    return rows[0]


def ensure_product_active(client: SalesforceClient, product: DemoProduct) -> None:
    row = query_one(
        client,
        "SELECT Id, Name, IsActive "
        f"FROM Product2 WHERE Id = '{product.product_id}' "
        "LIMIT 1",
    )
    if not row:
        raise RuntimeError(f"Product not found: {product.product_id}")
    if row["Name"] != product.name:
        raise RuntimeError(
            f"Product name mismatch for {product.product_id}: "
            f"expected {product.name!r}, got {row['Name']!r}"
        )
    if row["IsActive"]:
        return
    client.update("Product2", product.product_id, {"IsActive": True})


def ensure_pricebook_entry(
    client: SalesforceClient, pricebook_id: str, product: DemoProduct
) -> tuple[bool, bool]:
    existing = query_one(
        client,
        "SELECT Id, UnitPrice, IsActive "
        "FROM PricebookEntry "
        f"WHERE Pricebook2Id = '{pricebook_id}' "
        f"AND Product2Id = '{product.product_id}' "
        "LIMIT 1",
    )

    payload = {
        "Pricebook2Id": pricebook_id,
        "Product2Id": product.product_id,
        "UnitPrice": product.unit_price,
        "IsActive": True,
    }
    if pricebook_id != STANDARD_PRICEBOOK_ID:
        payload["UseStandardPrice"] = False

    if not existing:
        client.create("PricebookEntry", payload)
        return True, False

    needs_update = (
        float(existing["UnitPrice"]) != float(product.unit_price)
        or not existing["IsActive"]
    )
    if needs_update:
        client.update(
            "PricebookEntry",
            existing["Id"],
            {"UnitPrice": product.unit_price, "IsActive": True},
        )
        return False, True

    return False, False


def ensure_category_link(
    client: SalesforceClient, product: DemoProduct, category_id: str
) -> bool:
    existing = query_one(
        client,
        "SELECT Id "
        "FROM ProductCategoryProduct "
        f"WHERE ProductId = '{product.product_id}' "
        f"AND ProductCategoryId = '{category_id}' "
        "LIMIT 1",
    )
    if existing:
        return False

    client.create(
        "ProductCategoryProduct",
        {
            "ProductId": product.product_id,
            "ProductCategoryId": category_id,
            "IsPrimaryCategory": False,
        },
    )
    return True


def ensure_entitlement(client: SalesforceClient, product: DemoProduct) -> bool:
    existing = query_one(
        client,
        "SELECT Id "
        "FROM CommerceEntitlementProduct "
        f"WHERE PolicyId = '{ALPINE_POLICY_ID}' "
        f"AND ProductId = '{product.product_id}' "
        "LIMIT 1",
    )
    if existing:
        return False

    client.create(
        "CommerceEntitlementProduct",
        {
            "PolicyId": ALPINE_POLICY_ID,
            "ProductId": product.product_id,
        },
    )
    return True


def verify_product_visible(client: SalesforceClient, product: DemoProduct) -> dict:
    return client._request(
        "GET",
        f"commerce/webstores/{ALPINE_STORE_ID}/products/{product.product_id}?language=en_US",
    )


def publish_product(client: SalesforceClient, product: DemoProduct) -> dict:
    ensure_product_active(client, product)
    standard_created, standard_updated = ensure_pricebook_entry(
        client, STANDARD_PRICEBOOK_ID, product
    )
    alpine_created, alpine_updated = ensure_pricebook_entry(
        client, ALPINE_PRICEBOOK_ID, product
    )
    all_products_created = ensure_category_link(client, product, ALL_PRODUCTS_CATEGORY_ID)
    shop_all_created = ensure_category_link(client, product, SHOP_ALL_CATEGORY_ID)
    entitlement_created = ensure_entitlement(client, product)
    storefront_product = verify_product_visible(client, product)

    return {
        "product_id": product.product_id,
        "name": product.name,
        "unit_price": product.unit_price,
        "standard_pricebook_entry_created": standard_created,
        "standard_pricebook_entry_updated": standard_updated,
        "alpine_pricebook_entry_created": alpine_created,
        "alpine_pricebook_entry_updated": alpine_updated,
        "all_products_category_created": all_products_created,
        "shop_all_category_created": shop_all_created,
        "entitlement_created": entitlement_created,
        "storefront_product_name": storefront_product.get("name"),
        "storefront_fields": {
            "id": storefront_product.get("id"),
            "defaultImage": storefront_product.get("defaultImage"),
            "fields": storefront_product.get("fields"),
        },
    }


def main() -> int:
    client = SalesforceClient(resolve_auth_path())
    print(f"Using org: {client.instance_url}")
    result = [publish_product(client, product) for product in DEMO_PRODUCTS]
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
