#!/usr/bin/env python3
"""Configure the Alpine B2C Commerce store using the D2C store as reference."""

from __future__ import annotations

import json
from dataclasses import dataclass

from create_today_tasks import SalesforceClient, resolve_auth_path


ALPINE_STORE_ID = "0ZEKh000000LHFhOAO"
ALPINE_NETWORK_ID = "0DBKh000000PBjQOAW"
ALPINE_CATALOG_ID = "0ZSKh000000kUuzOAE"
ALPINE_PRICEBOOK_ID = "01sKh000000pu8fIAA"
ALPINE_BUYER_GROUP_ID = "0ZIKh000000PTKHOA4"
ALPINE_SITE_ID = "0DMKh000000LHHMOA4"

REFERENCE_STORE_ID = "0ZEKh000000LG3OOAW"
REFERENCE_NETWORK_ID = "0DBKh0000011GH8OAM"
REFERENCE_CATALOG_ID = "0ZSKh000000kTS4OAM"
REFERENCE_CUSTOM_PRICEBOOK_ID = "01sKh000000prbuIAA"
REFERENCE_STANDARD_B2C_PRICEBOOK_ID = "01sKh000000prbqIAA"
REFERENCE_GUEST_BUYER_PROFILE_ID = "3K0Kh000000LFujKAG"
REFERENCE_SITE_ID = "0DMKh0000011y8MOAQ"

ALPINE_GUEST_BUYER_PROFILE_NAME = "B2C - Alpine group Guest Buyer Profile"


@dataclass(frozen=True)
class ServiceConfig:
    integration: str
    service_provider_type: str


def query_one(client: SalesforceClient, soql: str) -> dict | None:
    rows = client.query(soql)
    if not rows:
        return None
    if len(rows) > 1:
        raise RuntimeError(f"Expected at most one row for query: {soql}")
    return rows[0]


def get_or_create_guest_buyer_profile(client: SalesforceClient) -> dict:
    existing = query_one(
        client,
        "SELECT Id, Name FROM GuestBuyerProfile "
        f"WHERE Name = '{ALPINE_GUEST_BUYER_PROFILE_NAME}' "
        "LIMIT 1",
    )
    if existing:
        return existing

    created = client.create("GuestBuyerProfile", {"Name": ALPINE_GUEST_BUYER_PROFILE_NAME})
    return {"Id": created["id"], "Name": ALPINE_GUEST_BUYER_PROFILE_NAME}


def get_site_guest_user_id(client: SalesforceClient, site_id: str) -> str:
    row = query_one(client, f"SELECT GuestUserId FROM Site WHERE Id = '{site_id}'")
    if not row or not row.get("GuestUserId"):
        raise RuntimeError(f"Guest user not found for site {site_id}")
    return row["GuestUserId"]


def ensure_guest_user_permission_sets(client: SalesforceClient) -> int:
    alpine_guest_user_id = get_site_guest_user_id(client, ALPINE_SITE_ID)
    reference_guest_user_id = get_site_guest_user_id(client, REFERENCE_SITE_ID)

    reference_assignments = client.query(
        "SELECT PermissionSetId, PermissionSet.IsOwnedByProfile, PermissionSet.Label, PermissionSet.Name "
        "FROM PermissionSetAssignment "
        f"WHERE AssigneeId = '{reference_guest_user_id}'"
    )
    existing_permission_set_ids = {
        row["PermissionSetId"]
        for row in client.query(
            "SELECT PermissionSetId FROM PermissionSetAssignment "
            f"WHERE AssigneeId = '{alpine_guest_user_id}'"
        )
    }

    created = 0
    for assignment in reference_assignments:
        if assignment["PermissionSet"]["IsOwnedByProfile"]:
            continue
        permission_set_id = assignment["PermissionSetId"]
        if permission_set_id in existing_permission_set_ids:
            continue

        client.create(
            "PermissionSetAssignment",
            {"AssigneeId": alpine_guest_user_id, "PermissionSetId": permission_set_id},
        )
        existing_permission_set_ids.add(permission_set_id)
        created += 1

    return created


def get_profile_owned_permission_set_id(client: SalesforceClient, user_id: str) -> str:
    row = query_one(
        client,
        "SELECT PermissionSetId "
        "FROM PermissionSetAssignment "
        f"WHERE AssigneeId = '{user_id}' AND PermissionSet.IsOwnedByProfile = true "
        "LIMIT 1",
    )
    if not row:
        raise RuntimeError(f"Profile-owned permission set not found for user {user_id}")
    return row["PermissionSetId"]


def ensure_guest_profile_setup_entity_access(client: SalesforceClient) -> int:
    alpine_guest_user_id = get_site_guest_user_id(client, ALPINE_SITE_ID)
    reference_guest_user_id = get_site_guest_user_id(client, REFERENCE_SITE_ID)

    alpine_parent_id = get_profile_owned_permission_set_id(client, alpine_guest_user_id)
    reference_parent_id = get_profile_owned_permission_set_id(client, reference_guest_user_id)

    reference_access = client.query(
        "SELECT SetupEntityId, SetupEntityType "
        "FROM SetupEntityAccess "
        f"WHERE ParentId = '{reference_parent_id}'"
    )
    existing_access = {
        (row["SetupEntityType"], row["SetupEntityId"])
        for row in client.query(
            "SELECT SetupEntityId, SetupEntityType "
            "FROM SetupEntityAccess "
            f"WHERE ParentId = '{alpine_parent_id}'"
        )
    }

    created = 0
    for row in reference_access:
        key = (row["SetupEntityType"], row["SetupEntityId"])
        if key in existing_access:
            continue
        client.create(
            "SetupEntityAccess",
            {"ParentId": alpine_parent_id, "SetupEntityId": row["SetupEntityId"]},
        )
        existing_access.add(key)
        created += 1

    return created


def enable_guest_access(client: SalesforceClient, guest_buyer_profile_id: str) -> None:
    payload = {
        "OptionsGuestBrowsingEnabled": True,
        "OptionsGuestCartEnabled": True,
        "OptionsGuestCheckoutEnabled": True,
    }
    client.update("WebStore", ALPINE_STORE_ID, payload)

    # This field is read-only in the standard sObject API. Try once so the script
    # documents whether the org accepts it; continue if the platform rejects it.
    try:
        client.update("WebStore", ALPINE_STORE_ID, {"GuestBuyerProfileId": guest_buyer_profile_id})
    except Exception as exc:  # pragma: no cover - depends on org API behavior
        print(f"GuestBuyerProfileId update skipped: {exc}")


def ensure_webstore_pricebook(client: SalesforceClient, pricebook_id: str) -> None:
    existing = query_one(
        client,
        "SELECT Id FROM WebStorePricebook "
        f"WHERE WebStoreId = '{ALPINE_STORE_ID}' AND Pricebook2Id = '{pricebook_id}' "
        "LIMIT 1",
    )
    if existing:
        return
    client.create(
        "WebStorePricebook",
        {"WebStoreId": ALPINE_STORE_ID, "Pricebook2Id": pricebook_id, "IsActive": True},
    )


def ensure_buyer_group_pricebook(client: SalesforceClient, pricebook_id: str) -> None:
    existing = query_one(
        client,
        "SELECT Id FROM BuyerGroupPricebook "
        f"WHERE BuyerGroupId = '{ALPINE_BUYER_GROUP_ID}' AND Pricebook2Id = '{pricebook_id}' "
        "LIMIT 1",
    )
    if existing:
        return
    client.create(
        "BuyerGroupPricebook",
        {"BuyerGroupId": ALPINE_BUYER_GROUP_ID, "Pricebook2Id": pricebook_id},
    )


def ensure_guest_buyer_group_member(
    client: SalesforceClient, guest_buyer_profile_id: str
) -> bool:
    existing = query_one(
        client,
        "SELECT Id "
        "FROM BuyerGroupMember "
        f"WHERE BuyerGroupId = '{ALPINE_BUYER_GROUP_ID}' "
        f"AND BuyerId = '{guest_buyer_profile_id}' "
        "LIMIT 1",
    )
    if existing:
        return False

    client.create(
        "BuyerGroupMember",
        {
            "BuyerGroupId": ALPINE_BUYER_GROUP_ID,
            "BuyerId": guest_buyer_profile_id,
        },
    )
    return True


def ensure_market_buyer_group(client: SalesforceClient) -> tuple[str, bool]:
    store = query_one(
        client,
        "SELECT Name, Country, CurrencyIsoCode "
        f"FROM WebStore WHERE Id = '{ALPINE_STORE_ID}'",
    )
    if not store:
        raise RuntimeError("Alpine store not found")

    market_group_name = f"{store['Name']} Market"
    group = query_one(
        client,
        "SELECT Id, Name "
        "FROM BuyerGroup "
        f"WHERE Name = '{market_group_name}' "
        "LIMIT 1",
    )

    created = False
    if not group:
        response = client.create(
            "BuyerGroup",
            {"Name": market_group_name, "Role": "Market"},
        )
        group = {"Id": response["id"], "Name": market_group_name}
        created = True

    existing_webstore_link = query_one(
        client,
        "SELECT Id "
        "FROM WebStoreBuyerGroup "
        f"WHERE WebStoreId = '{ALPINE_STORE_ID}' AND BuyerGroupId = '{group['Id']}' "
        "LIMIT 1",
    )
    if not existing_webstore_link:
        client.create(
            "WebStoreBuyerGroup",
            {"WebStoreId": ALPINE_STORE_ID, "BuyerGroupId": group["Id"]},
        )

    existing_related_objects = {
        (row["ObjectType"], row["ObjectValues"])
        for row in client.query(
            "SELECT ObjectType, ObjectValues "
            "FROM BuyerGroupRelatedObject "
            f"WHERE BuyerGroupId = '{group['Id']}'"
        )
    }
    for object_type, object_values in (
        ("DefaultCurrency", store["CurrencyIsoCode"]),
        ("SupportedShipToCountries", store["Country"]),
    ):
        if (object_type, object_values) in existing_related_objects:
            continue
        client.create(
            "BuyerGroupRelatedObject",
            {
                "BuyerGroupId": group["Id"],
                "ObjectType": object_type,
                "ObjectValues": object_values,
            },
        )

    return group["Id"], created


def get_alpine_policy_ids(client: SalesforceClient) -> list[str]:
    return [
        row["PolicyId"]
        for row in client.query(
            "SELECT PolicyId "
            "FROM CommerceEntitlementBuyerGroup "
            f"WHERE BuyerGroupId = '{ALPINE_BUYER_GROUP_ID}'"
        )
    ]


def get_alpine_entitled_product_ids(client: SalesforceClient) -> set[str]:
    product_ids = set()
    for policy_id in get_alpine_policy_ids(client):
        product_ids.update(
            row["ProductId"]
            for row in client.query(
                "SELECT ProductId "
                "FROM CommerceEntitlementProduct "
                f"WHERE PolicyId = '{policy_id}'"
            )
        )
    return product_ids


def get_alpine_visible_product_ids(client: SalesforceClient) -> list[str]:
    catalog_product_ids = {
        row["ProductId"]
        for row in client.query(
            "SELECT ProductId "
            "FROM ProductCategoryProduct "
            f"WHERE CatalogId = '{ALPINE_CATALOG_ID}'"
        )
    }
    pricebook_product_ids = {
        row["Product2Id"]
        for row in client.query(
            "SELECT Product2Id "
            "FROM PricebookEntry "
            f"WHERE Pricebook2Id = '{ALPINE_PRICEBOOK_ID}' AND IsActive = true"
        )
    }
    return sorted(catalog_product_ids & pricebook_product_ids)


def get_variation_child_product_ids(
    client: SalesforceClient, product_ids: list[str]
) -> list[str]:
    child_product_ids: set[str] = set()
    for product_id in product_ids:
        product = client._request(
            "GET",
            f"commerce/webstores/{ALPINE_STORE_ID}/products/{product_id}?language=en_US",
        )
        variation_info = product.get("variationInfo") or {}
        for mapping in variation_info.get("attributesToProductMappings", []):
            child_product_id = mapping.get("productId")
            if child_product_id:
                child_product_ids.add(child_product_id)
    return sorted(child_product_ids)


def ensure_entitlement_products(client: SalesforceClient) -> int:
    policy_ids = get_alpine_policy_ids(client)
    if not policy_ids:
        raise RuntimeError("Alpine buyer group is missing a commerce entitlement policy")
    if len(policy_ids) > 1:
        raise RuntimeError(f"Expected one Alpine policy, found {len(policy_ids)}")

    policy_id = policy_ids[0]
    existing_product_ids = get_alpine_entitled_product_ids(client)
    target_product_ids = get_alpine_visible_product_ids(client)
    target_product_ids.extend(get_variation_child_product_ids(client, target_product_ids))
    target_product_ids = sorted(set(target_product_ids))

    created = 0
    for product_id in target_product_ids:
        if product_id in existing_product_ids:
            continue
        client.create(
            "CommerceEntitlementProduct",
            {
                "PolicyId": policy_id,
                "ProductId": product_id,
            },
        )
        existing_product_ids.add(product_id)
        created += 1

    return created


def copy_pricebook_entries(client: SalesforceClient) -> tuple[int, int]:
    reference_entries = client.query(
        "SELECT Product2Id, UnitPrice, IsActive, UseStandardPrice "
        "FROM PricebookEntry "
        f"WHERE Pricebook2Id = '{REFERENCE_CUSTOM_PRICEBOOK_ID}' AND IsActive = true"
    )
    existing_entries = {
        row["Product2Id"]: row
        for row in client.query(
            "SELECT Id, Product2Id, UnitPrice, IsActive "
            "FROM PricebookEntry "
            f"WHERE Pricebook2Id = '{ALPINE_PRICEBOOK_ID}'"
        )
    }

    created = 0
    updated = 0
    for entry in reference_entries:
        payload = {
            "Pricebook2Id": ALPINE_PRICEBOOK_ID,
            "Product2Id": entry["Product2Id"],
            "UnitPrice": entry["UnitPrice"],
            "IsActive": entry["IsActive"],
            "UseStandardPrice": entry["UseStandardPrice"],
        }
        existing = existing_entries.get(entry["Product2Id"])
        if existing is None:
            client.create("PricebookEntry", payload)
            created += 1
            continue

        if existing["UnitPrice"] != entry["UnitPrice"] or existing["IsActive"] != entry["IsActive"]:
            client.update(
                "PricebookEntry",
                existing["Id"],
                {"UnitPrice": entry["UnitPrice"], "IsActive": entry["IsActive"]},
            )
            updated += 1

    return created, updated


def get_reference_categories(client: SalesforceClient) -> list[dict]:
    return client.query(
        "SELECT Id, Name, ParentCategoryId, SortOrder "
        "FROM ProductCategory "
        f"WHERE CatalogId = '{REFERENCE_CATALOG_ID}'"
    )


def get_existing_alpine_categories(client: SalesforceClient) -> dict[str, dict]:
    return {
        row["Name"]: row
        for row in client.query(
            "SELECT Id, Name, ParentCategoryId, SortOrder "
            "FROM ProductCategory "
            f"WHERE CatalogId = '{ALPINE_CATALOG_ID}'"
        )
    }


def category_depth(category: dict, categories_by_id: dict[str, dict]) -> int:
    depth = 0
    parent_id = category.get("ParentCategoryId")
    while parent_id:
        depth += 1
        parent_id = categories_by_id[parent_id].get("ParentCategoryId")
    return depth


def ensure_categories(client: SalesforceClient) -> dict[str, str]:
    reference_categories = get_reference_categories(client)
    categories_by_id = {row["Id"]: row for row in reference_categories}
    alpine_by_name = get_existing_alpine_categories(client)

    reference_to_alpine: dict[str, str] = {}
    ordered_reference = sorted(
        reference_categories,
        key=lambda row: (
            category_depth(row, categories_by_id),
            row["SortOrder"] is None,
            row["SortOrder"] or 0,
            row["Name"],
        ),
    )

    for reference in ordered_reference:
        existing = alpine_by_name.get(reference["Name"])
        if existing:
            reference_to_alpine[reference["Id"]] = existing["Id"]
            continue

        payload = {"Name": reference["Name"], "CatalogId": ALPINE_CATALOG_ID}
        if reference.get("SortOrder") is not None:
            payload["SortOrder"] = reference["SortOrder"]
        parent_reference_id = reference.get("ParentCategoryId")
        if parent_reference_id:
            payload["ParentCategoryId"] = reference_to_alpine[parent_reference_id]

        created = client.create("ProductCategory", payload)
        reference_to_alpine[reference["Id"]] = created["id"]
        alpine_by_name[reference["Name"]] = {"Id": created["id"], "Name": reference["Name"]}

    # Fill in mappings for categories that already existed before this run.
    for reference in reference_categories:
        reference_to_alpine.setdefault(reference["Id"], alpine_by_name[reference["Name"]]["Id"])

    return reference_to_alpine


def ensure_category_products(client: SalesforceClient, category_id_map: dict[str, str]) -> int:
    reference_relations = client.query(
        "SELECT ProductCategoryId, ProductId, IsPrimaryCategory "
        "FROM ProductCategoryProduct "
        f"WHERE CatalogId = '{REFERENCE_CATALOG_ID}'"
    )
    existing_relations = {
        (row["ProductCategoryId"], row["ProductId"])
        for row in client.query(
            "SELECT ProductCategoryId, ProductId "
            "FROM ProductCategoryProduct "
            f"WHERE CatalogId = '{ALPINE_CATALOG_ID}'"
        )
    }

    created = 0
    for relation in reference_relations:
        alpine_category_id = category_id_map[relation["ProductCategoryId"]]
        key = (alpine_category_id, relation["ProductId"])
        if key in existing_relations:
            continue

        client.create(
            "ProductCategoryProduct",
            {
                "ProductCategoryId": alpine_category_id,
                "ProductId": relation["ProductId"],
                "IsPrimaryCategory": relation["IsPrimaryCategory"],
            },
        )
        existing_relations.add(key)
        created += 1

    return created


def ensure_store_integrated_services(client: SalesforceClient) -> int:
    reference_rows = client.query(
        "SELECT Integration, ServiceProviderType "
        "FROM StoreIntegratedService "
        f"WHERE StoreId = '{REFERENCE_STORE_ID}'"
    )
    existing = {
        (row["Integration"], row["ServiceProviderType"])
        for row in client.query(
            "SELECT Integration, ServiceProviderType "
            "FROM StoreIntegratedService "
            f"WHERE StoreId = '{ALPINE_STORE_ID}'"
        )
    }

    created = 0
    for row in reference_rows:
        key = (row["Integration"], row["ServiceProviderType"])
        if key in existing:
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


def ensure_network_auth_settings(client: SalesforceClient) -> tuple[bool, bool]:
    reference_auth = query_one(
        client,
        "SELECT IsHeadlessUserRegistrationAllowed, DoesRegistrationRequireAuth, "
        "IsForgotPwdAllowed, DoesForgotPasswordRequireAuth, IsPwdlessLoginAllowed, "
        "DoesPwdlessLoginRequireAuth, IsUniversalClientRgstrAllowed, "
        "IsFirstPartyAppsAllowed, DoesPasswordLoginRequireAuth, "
        "RegistrationHandlerId, RegistrationExecutionUserId, "
        "RegistrationUserDefaultProfileId, MaxPasswordResetAttempts, "
        "IsUserDisambiguationAllowedForgotPwd, RecaptchaSecretKey, "
        "RecaptchaScoreThreshold, IsRecaptchaRequiredRgstr, "
        "IsRecaptchaRequiredForgotPwd, IsRecaptchaRequiredPwdlessLogin, "
        "IsForgotPwdEmailTemplateAllowlistingEnabled, CustomOtpDeliveryHandlerId, "
        "HeadlessDiscoveryHandlerId, HeadlessDiscoveryExecutionUserId, "
        "IsUserDisambiguationAllowedUsernamePwd "
        "FROM NetworkAuthApiSettings "
        f"WHERE NetworkId = '{REFERENCE_NETWORK_ID}' "
        "LIMIT 1",
    )
    existing_auth = query_one(
        client,
        "SELECT Id FROM NetworkAuthApiSettings "
        f"WHERE NetworkId = '{ALPINE_NETWORK_ID}' "
        "LIMIT 1",
    )
    auth_payload = {"NetworkId": ALPINE_NETWORK_ID}
    if reference_auth:
        for field in reference_auth:
            if field == "attributes":
                continue
            auth_payload[field] = reference_auth[field]
        auth_payload["NetworkId"] = ALPINE_NETWORK_ID

    auth_created = False
    if existing_auth:
        update_payload = dict(auth_payload)
        update_payload.pop("NetworkId", None)
        client.update("NetworkAuthApiSettings", existing_auth["Id"], update_payload)
    else:
        client.create("NetworkAuthApiSettings", auth_payload)
        auth_created = True

    reference_self_reg = query_one(
        client,
        "SELECT AccountId, OptionsShowFirstName, OptionsShowLastName, "
        "OptionsShowUsername, OptionsShowNickname, OptionsShowMobilePhone, "
        "OptionsShowEmail, OptionsIncludePassword, "
        "OptionsDisableStandardRgstrComponent, ApexHandlerId, "
        "ExecuteApexHandlerAsId, VerificationMethod, PermissionSetGroupId "
        "FROM NetworkSelfRegistration "
        f"WHERE NetworkId = '{REFERENCE_NETWORK_ID}' "
        "LIMIT 1",
    )
    existing_self_reg = query_one(
        client,
        "SELECT Id FROM NetworkSelfRegistration "
        f"WHERE NetworkId = '{ALPINE_NETWORK_ID}' "
        "LIMIT 1",
    )

    self_reg_created = False
    if reference_self_reg:
        self_reg_payload = {"NetworkId": ALPINE_NETWORK_ID}
        for field in reference_self_reg:
            if field == "attributes":
                continue
            self_reg_payload[field] = reference_self_reg[field]
        if existing_self_reg:
            client.update("NetworkSelfRegistration", existing_self_reg["Id"], self_reg_payload)
        else:
            client.create("NetworkSelfRegistration", self_reg_payload)
            self_reg_created = True

    return auth_created, self_reg_created


def ensure_network_experience_settings(client: SalesforceClient) -> None:
    reference_network = query_one(
        client,
        "SELECT OptionsEmbeddedLoginEnabled, OptionsSelfRegistrationEnabled, "
        "OptionsGuestChatterEnabled, OptionsGuestFileAccessEnabled, "
        "OptionsSendWelcomeEmail, SelfRegProfileId "
        "FROM Network "
        f"WHERE Id = '{REFERENCE_NETWORK_ID}' "
        "LIMIT 1",
    )
    if not reference_network:
        raise RuntimeError("Reference network not found")

    payload = {
        "OptionsEmbeddedLoginEnabled": reference_network["OptionsEmbeddedLoginEnabled"],
        "OptionsSelfRegistrationEnabled": reference_network["OptionsSelfRegistrationEnabled"],
        "OptionsGuestChatterEnabled": reference_network["OptionsGuestChatterEnabled"],
        "OptionsGuestFileAccessEnabled": reference_network["OptionsGuestFileAccessEnabled"],
        "OptionsSendWelcomeEmail": reference_network["OptionsSendWelcomeEmail"],
        "SelfRegProfileId": reference_network["SelfRegProfileId"],
    }
    client.update("Network", ALPINE_NETWORK_ID, payload)


def ensure_network_member_groups(client: SalesforceClient) -> int:
    reference_rows = client.query(
        "SELECT ParentId, AssignmentStatus "
        "FROM NetworkMemberGroup "
        f"WHERE NetworkId = '{REFERENCE_NETWORK_ID}'"
    )
    existing_parent_ids = {
        row["ParentId"]
        for row in client.query(
            "SELECT ParentId "
            "FROM NetworkMemberGroup "
            f"WHERE NetworkId = '{ALPINE_NETWORK_ID}'"
        )
    }

    created = 0
    for row in reference_rows:
        if row["ParentId"] in existing_parent_ids:
            continue
        client.create(
            "NetworkMemberGroup",
            {
                "NetworkId": ALPINE_NETWORK_ID,
                "ParentId": row["ParentId"],
            },
        )
        existing_parent_ids.add(row["ParentId"])
        created += 1

    return created


def activate_store(client: SalesforceClient) -> None:
    created_member_groups = ensure_network_member_groups(client)
    print(f"Network member groups created={created_member_groups}")
    ensure_network_experience_settings(client)
    client.update("WebStore", ALPINE_STORE_ID, {"OrderActivationStatus": "Activated"})
    client.update("Network", ALPINE_NETWORK_ID, {"Status": "Live"})


def summarize_state(client: SalesforceClient) -> dict:
    store = query_one(
        client,
        "SELECT Id, Name, OptionsGuestBrowsingEnabled, OptionsGuestCartEnabled, "
        "OptionsGuestCheckoutEnabled, GuestBuyerProfileId, OrderActivationStatus, "
        "DefaultLanguage, SupportedLanguages, Country "
        f"FROM WebStore WHERE Id = '{ALPINE_STORE_ID}'",
    )
    network = query_one(
        client,
        "SELECT Id, Name, Status, UrlPathPrefix "
        f"FROM Network WHERE Id = '{ALPINE_NETWORK_ID}'",
    )
    counts = {
        "webstore_pricebooks": client.query(
            f"SELECT COUNT(Id) total FROM WebStorePricebook WHERE WebStoreId = '{ALPINE_STORE_ID}'"
        )[0]["total"],
        "buyer_group_pricebooks": client.query(
            f"SELECT COUNT(Id) total FROM BuyerGroupPricebook WHERE BuyerGroupId = '{ALPINE_BUYER_GROUP_ID}'"
        )[0]["total"],
        "alpine_pricebook_entries": client.query(
            f"SELECT COUNT(Id) total FROM PricebookEntry WHERE Pricebook2Id = '{ALPINE_PRICEBOOK_ID}' AND IsActive = true"
        )[0]["total"],
        "alpine_categories": client.query(
            f"SELECT COUNT(Id) total FROM ProductCategory WHERE CatalogId = '{ALPINE_CATALOG_ID}'"
        )[0]["total"],
        "alpine_category_products": client.query(
            f"SELECT COUNT(Id) total FROM ProductCategoryProduct WHERE CatalogId = '{ALPINE_CATALOG_ID}'"
        )[0]["total"],
        "alpine_integrated_services": client.query(
            f"SELECT COUNT(Id) total FROM StoreIntegratedService WHERE StoreId = '{ALPINE_STORE_ID}'"
        )[0]["total"],
        "alpine_buyer_group_members": client.query(
            f"SELECT COUNT(Id) total FROM BuyerGroupMember WHERE BuyerGroupId = '{ALPINE_BUYER_GROUP_ID}'"
        )[0]["total"],
        "alpine_entitlement_products": client.query(
            "SELECT COUNT(Id) total "
            "FROM CommerceEntitlementProduct "
            f"WHERE PolicyId IN (SELECT PolicyId FROM CommerceEntitlementBuyerGroup WHERE BuyerGroupId = '{ALPINE_BUYER_GROUP_ID}')"
        )[0]["total"],
        "alpine_webstore_buyer_groups": client.query(
            f"SELECT COUNT(Id) total FROM WebStoreBuyerGroup WHERE WebStoreId = '{ALPINE_STORE_ID}'"
        )[0]["total"],
    }
    return {"store": store, "network": network, "counts": counts}


def main() -> int:
    client = SalesforceClient(resolve_auth_path())
    print(f"Using org: {client.instance_url}")

    guest_profile = get_or_create_guest_buyer_profile(client)
    print(f"GuestBuyerProfile: {guest_profile['Id']} | {guest_profile['Name']}")

    enable_guest_access(client, guest_profile["Id"])
    ensure_webstore_pricebook(client, REFERENCE_STANDARD_B2C_PRICEBOOK_ID)
    ensure_buyer_group_pricebook(client, REFERENCE_STANDARD_B2C_PRICEBOOK_ID)
    created_guest_buyer_member = ensure_guest_buyer_group_member(client, guest_profile["Id"])
    print(f"Guest buyer group member created={int(created_guest_buyer_member)}")
    market_group_id, created_market_group = ensure_market_buyer_group(client)
    print(
        "Market buyer group id="
        f"{market_group_id} created={int(created_market_group)}"
    )
    created_entitlement_products = ensure_entitlement_products(client)
    print(f"Entitlement products created={created_entitlement_products}")

    created_entries, updated_entries = copy_pricebook_entries(client)
    print(f"Pricebook entries created={created_entries} updated={updated_entries}")

    category_id_map = ensure_categories(client)
    print(f"Category mappings ready: {len(category_id_map)}")

    created_category_products = ensure_category_products(client, category_id_map)
    print(f"Category-product relations created={created_category_products}")

    created_services = ensure_store_integrated_services(client)
    print(f"Integrated services created={created_services}")

    created_guest_psas = ensure_guest_user_permission_sets(client)
    print(f"Guest user permission sets created={created_guest_psas}")

    created_guest_setup_access = ensure_guest_profile_setup_entity_access(client)
    print(f"Guest profile setup access created={created_guest_setup_access}")

    created_auth_settings, created_self_reg = ensure_network_auth_settings(client)
    print(
        "Network auth settings created="
        f"{int(created_auth_settings)} self-registration created={int(created_self_reg)}"
    )

    activate_store(client)

    summary = summarize_state(client)
    print(json.dumps(summary, default=str, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
