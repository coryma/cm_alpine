#!/usr/bin/env python3
"""Align Alpine's mutable B2B storefront settings so products become visible."""

from __future__ import annotations

import json

from create_today_tasks import SalesforceClient, resolve_auth_path


ALPINE_STORE_ID = "0ZEKh000000LHFhOAO"
ALPINE_BUYER_GROUP_ID = "0ZIKh000000PTKHOA4"

REFERENCE_B2B_STORE_ID = "0ZEKh000000LG3NOAW"


def query_one(client: SalesforceClient, soql: str) -> dict | None:
    rows = client.query(soql)
    if not rows:
        return None
    if len(rows) > 1:
        raise RuntimeError(f"Expected at most one row for query: {soql}")
    return rows[0]


def ensure_webstore_pricebooks(client: SalesforceClient) -> int:
    existing_ids = {
        row["Pricebook2Id"]
        for row in client.query(
            "SELECT Pricebook2Id "
            "FROM WebStorePricebook "
            f"WHERE WebStoreId = '{ALPINE_STORE_ID}'"
        )
    }
    reference_rows = client.query(
        "SELECT Pricebook2Id, IsActive "
        "FROM WebStorePricebook "
        f"WHERE WebStoreId = '{REFERENCE_B2B_STORE_ID}'"
    )

    created = 0
    for row in reference_rows:
        if row["Pricebook2Id"] in existing_ids:
            continue
        client.create(
            "WebStorePricebook",
            {
                "WebStoreId": ALPINE_STORE_ID,
                "Pricebook2Id": row["Pricebook2Id"],
                "IsActive": row["IsActive"],
            },
        )
        existing_ids.add(row["Pricebook2Id"])
        created += 1

    return created


def ensure_alpine_buyer_group_pricebooks(client: SalesforceClient) -> int:
    existing_ids = {
        row["Pricebook2Id"]
        for row in client.query(
            "SELECT Pricebook2Id "
            "FROM BuyerGroupPricebook "
            f"WHERE BuyerGroupId = '{ALPINE_BUYER_GROUP_ID}'"
        )
    }
    reference_rows = client.query(
        "SELECT Pricebook2Id "
        "FROM BuyerGroupPricebook "
        "WHERE BuyerGroupId IN ("
        "SELECT BuyerGroupId FROM WebStoreBuyerGroup "
        f"WHERE WebStoreId = '{REFERENCE_B2B_STORE_ID}'"
        ")"
    )

    created = 0
    for row in reference_rows:
        if row["Pricebook2Id"] in existing_ids:
            continue
        client.create(
            "BuyerGroupPricebook",
            {
                "BuyerGroupId": ALPINE_BUYER_GROUP_ID,
                "Pricebook2Id": row["Pricebook2Id"],
            },
        )
        existing_ids.add(row["Pricebook2Id"])
        created += 1

    return created


def ensure_inventory_service(client: SalesforceClient) -> int:
    existing = {
        (row["Integration"], row["ServiceProviderType"])
        for row in client.query(
            "SELECT Integration, ServiceProviderType "
            "FROM StoreIntegratedService "
            f"WHERE StoreId = '{ALPINE_STORE_ID}'"
        )
    }
    reference_rows = client.query(
        "SELECT Integration, ServiceProviderType "
        "FROM StoreIntegratedService "
        f"WHERE StoreId = '{REFERENCE_B2B_STORE_ID}'"
    )

    created = 0
    for row in reference_rows:
        key = (row["Integration"], row["ServiceProviderType"])
        if row["ServiceProviderType"] != "Inventory" or key in existing:
            continue
        client.create(
            "StoreIntegratedService",
            {
                "StoreId": ALPINE_STORE_ID,
                "Integration": row["Integration"],
                "ServiceProviderType": row["ServiceProviderType"],
            },
        )
        existing.add(key)
        created += 1

    return created


def align_webstore_fields(client: SalesforceClient) -> None:
    reference = query_one(
        client,
        "SELECT LocationId, DefaultTaxPolicyId, CheckoutTimeToLive, "
        "GuestCartTimeToLive, ProductGrouping, StrikethroughPricebookId, "
        "PricingStrategy, OptionsCartAsyncProcessingEnabled, "
        "OptionsCartCalculateEnabled, OptionsCartToOrderAutoCustomFieldMapping, "
        "OptionsSplitShipmentEnabled, "
        "OptionsCommerceEinsteinActivitiesTracked, "
        "OptionsCommerceEinsteinDeployed, "
        "OptionsSkipAdditionalEntitlementCheckForSearch "
        "FROM WebStore "
        f"WHERE Id = '{REFERENCE_B2B_STORE_ID}' "
        "LIMIT 1",
    )
    if not reference:
        raise RuntimeError("Reference B2B store not found")

    client.update(
        "WebStore",
        ALPINE_STORE_ID,
        {
            "LocationId": reference["LocationId"],
            "DefaultTaxPolicyId": reference["DefaultTaxPolicyId"],
            "CheckoutTimeToLive": reference["CheckoutTimeToLive"],
            "GuestCartTimeToLive": reference["GuestCartTimeToLive"],
            "ProductGrouping": reference["ProductGrouping"],
            "StrikethroughPricebookId": reference["StrikethroughPricebookId"],
            "PricingStrategy": reference["PricingStrategy"],
            "OptionsCartAsyncProcessingEnabled": reference[
                "OptionsCartAsyncProcessingEnabled"
            ],
            "OptionsCartCalculateEnabled": reference["OptionsCartCalculateEnabled"],
            "OptionsCartToOrderAutoCustomFieldMapping": reference[
                "OptionsCartToOrderAutoCustomFieldMapping"
            ],
            "OptionsSplitShipmentEnabled": reference["OptionsSplitShipmentEnabled"],
            "OptionsCommerceEinsteinActivitiesTracked": reference[
                "OptionsCommerceEinsteinActivitiesTracked"
            ],
            "OptionsCommerceEinsteinDeployed": reference[
                "OptionsCommerceEinsteinDeployed"
            ],
            "OptionsSkipAdditionalEntitlementCheckForSearch": reference[
                "OptionsSkipAdditionalEntitlementCheckForSearch"
            ],
        },
    )


def summarize(client: SalesforceClient) -> dict:
    store = query_one(
        client,
        "SELECT Id, Name, Type, LocationId, DefaultTaxPolicyId, "
        "CheckoutTimeToLive, GuestCartTimeToLive, ProductGrouping, "
        "StrikethroughPricebookId, PricingStrategy, "
        "OptionsCartAsyncProcessingEnabled, OptionsCartCalculateEnabled, "
        "OptionsCartToOrderAutoCustomFieldMapping, OptionsSplitShipmentEnabled, "
        "OptionsCommerceEinsteinActivitiesTracked, "
        "OptionsCommerceEinsteinDeployed, "
        "OptionsSkipAdditionalEntitlementCheckForSearch "
        f"FROM WebStore WHERE Id = '{ALPINE_STORE_ID}'"
    )
    pricebooks = client.query(
        "SELECT Pricebook2.Name "
        "FROM WebStorePricebook "
        f"WHERE WebStoreId = '{ALPINE_STORE_ID}' "
        "ORDER BY Pricebook2.Name"
    )
    buyer_group_pricebooks = client.query(
        "SELECT Pricebook2.Name "
        "FROM BuyerGroupPricebook "
        f"WHERE BuyerGroupId = '{ALPINE_BUYER_GROUP_ID}' "
        "ORDER BY Pricebook2.Name"
    )
    services = client.query(
        "SELECT Integration, ServiceProviderType "
        "FROM StoreIntegratedService "
        f"WHERE StoreId = '{ALPINE_STORE_ID}' "
        "ORDER BY ServiceProviderType, Integration"
    )
    return {
        "store": store,
        "webstore_pricebooks": pricebooks,
        "buyer_group_pricebooks": buyer_group_pricebooks,
        "services": services,
    }


def main() -> int:
    client = SalesforceClient(resolve_auth_path())
    print(f"Using org: {client.instance_url}")

    created_webstore_pricebooks = ensure_webstore_pricebooks(client)
    created_buyer_group_pricebooks = ensure_alpine_buyer_group_pricebooks(client)
    created_inventory_service = ensure_inventory_service(client)
    align_webstore_fields(client)

    print(f"WebStorePricebooks created={created_webstore_pricebooks}")
    print(f"BuyerGroupPricebooks created={created_buyer_group_pricebooks}")
    print(f"Inventory services created={created_inventory_service}")
    print(json.dumps(summarize(client), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
