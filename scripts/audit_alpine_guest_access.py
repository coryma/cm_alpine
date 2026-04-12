#!/usr/bin/env python3
"""Audit Alpine guest access and optionally grant required Apex class access."""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict

from create_today_tasks import SalesforceClient, resolve_auth_path


DEFAULT_SITE_NAME = "B2C_Alpine_group"
REQUIRED_APEX_CLASSES = (
    "AlpineProductCatalogController",
    "AlpineStorefrontConfigController",
    "DemoCartRequestController",
)
RELEVANT_OBJECTS = (
    "Lead",
    "Pricebook2",
    "PricebookEntry",
    "Product2",
)
RELEVANT_FIELD_ALLOWLIST = {
    "Lead": {
        "Lead.Company",
        "Lead.Description",
        "Lead.Email",
        "Lead.FirstName",
        "Lead.LastName",
        "Lead.Phone",
    },
    "PricebookEntry": {
        "PricebookEntry.CurrencyIsoCode",
        "PricebookEntry.IsActive",
        "PricebookEntry.Pricebook2Id",
        "PricebookEntry.Product2Id",
        "PricebookEntry.UnitPrice",
    },
    "Product2": {
        "Product2.Alpine_Badge__c",
        "Product2.Alpine_Category__c",
        "Product2.Alpine_Short_Description__c",
        "Product2.Alpine_Sort_Order__c",
        "Product2.Description",
        "Product2.DisplayUrl",
        "Product2.Family",
        "Product2.IsActive",
        "Product2.Name",
        "Product2.ProductCode",
        "Product2.Show_on_Alpine__c",
    },
}


def query_one(client: SalesforceClient, soql: str) -> dict | None:
    rows = client.query(soql)
    if not rows:
        return None
    if len(rows) > 1:
        raise RuntimeError(f"Expected one row, got {len(rows)} for query: {soql}")
    return rows[0]


def escape_soql_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'")


def quote_soql_values(values: tuple[str, ...] | list[str]) -> str:
    return ",".join(f"'{escape_soql_string(value)}'" for value in values)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--site-name",
        default=DEFAULT_SITE_NAME,
        help="Exact Experience Cloud Site.Name to audit.",
    )
    parser.add_argument(
        "--apply-required-apex-access",
        action="store_true",
        help="Create missing SetupEntityAccess rows for required storefront Apex classes.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit full report JSON instead of the human summary.",
    )
    return parser.parse_args()


def get_site(client: SalesforceClient, site_name: str) -> dict:
    escaped_name = escape_soql_string(site_name)
    row = query_one(
        client,
        "SELECT Id, Name, GuestUserId "
        "FROM Site "
        f"WHERE Name = '{escaped_name}' "
        "LIMIT 1",
    )
    if not row:
        raise RuntimeError(f"Site not found: {site_name}")
    if not row.get("GuestUserId"):
        raise RuntimeError(f"Site {site_name} does not have a guest user.")
    return row


def get_guest_user(client: SalesforceClient, guest_user_id: str) -> dict:
    row = query_one(
        client,
        "SELECT Id, Name, ProfileId, Profile.Name, UserType "
        "FROM User "
        f"WHERE Id = '{guest_user_id}' "
        "LIMIT 1",
    )
    if not row:
        raise RuntimeError(f"Guest user not found: {guest_user_id}")
    return row


def get_permission_sets(client: SalesforceClient, guest_user_id: str) -> list[dict]:
    return client.query(
        "SELECT Id, PermissionSetId, PermissionSet.Name, PermissionSet.Label, PermissionSet.IsOwnedByProfile "
        "FROM PermissionSetAssignment "
        f"WHERE AssigneeId = '{guest_user_id}' "
        "ORDER BY PermissionSet.Label"
    )


def get_profile_owned_permission_set_id(permission_sets: list[dict]) -> str:
    for row in permission_sets:
        permission_set = row["PermissionSet"]
        if permission_set["IsOwnedByProfile"]:
            return row["PermissionSetId"]
    raise RuntimeError("Profile-owned permission set assignment not found for guest user.")


def get_required_apex_classes(client: SalesforceClient) -> dict[str, str]:
    quoted_names = quote_soql_values(list(REQUIRED_APEX_CLASSES))
    rows = client.query(
        "SELECT Id, Name "
        "FROM ApexClass "
        f"WHERE Name IN ({quoted_names}) "
        "ORDER BY Name"
    )
    by_name = {row["Name"]: row["Id"] for row in rows}
    missing = [name for name in REQUIRED_APEX_CLASSES if name not in by_name]
    if missing:
        raise RuntimeError(f"Required Apex classes not found: {', '.join(missing)}")
    return by_name


def get_setup_entity_access(client: SalesforceClient, permission_set_ids: list[str]) -> list[dict]:
    quoted_permission_set_ids = quote_soql_values(permission_set_ids)
    return client.query(
        "SELECT ParentId, Parent.Name, SetupEntityType, SetupEntityId "
        "FROM SetupEntityAccess "
        f"WHERE ParentId IN ({quoted_permission_set_ids}) "
        "AND SetupEntityType = 'ApexClass' "
        "ORDER BY Parent.Name, SetupEntityId"
    )


def maybe_apply_required_apex_access(
    client: SalesforceClient,
    profile_permission_set_id: str,
    required_apex_classes: dict[str, str],
    existing_setup_entity_access: list[dict],
) -> list[str]:
    existing_ids = {
        row["SetupEntityId"]
        for row in existing_setup_entity_access
        if row["ParentId"] == profile_permission_set_id
    }
    created = []
    for class_name, class_id in required_apex_classes.items():
        if class_id in existing_ids:
            continue
        client.create(
            "SetupEntityAccess",
            {"ParentId": profile_permission_set_id, "SetupEntityId": class_id},
        )
        created.append(class_name)
    return created


def get_object_permissions(client: SalesforceClient, permission_set_ids: list[str]) -> list[dict]:
    quoted_permission_set_ids = quote_soql_values(permission_set_ids)
    quoted_objects = quote_soql_values(list(RELEVANT_OBJECTS))
    return client.query(
        "SELECT ParentId, Parent.Name, SObjectType, "
        "PermissionsRead, PermissionsCreate, PermissionsEdit, PermissionsDelete, "
        "PermissionsViewAllRecords, PermissionsModifyAllRecords "
        "FROM ObjectPermissions "
        f"WHERE ParentId IN ({quoted_permission_set_ids}) "
        f"AND SObjectType IN ({quoted_objects}) "
        "ORDER BY Parent.Name, SObjectType"
    )


def get_field_permissions(client: SalesforceClient, permission_set_ids: list[str]) -> list[dict]:
    quoted_permission_set_ids = quote_soql_values(permission_set_ids)
    return client.query(
        "SELECT ParentId, Parent.Name, SObjectType, Field, PermissionsRead, PermissionsEdit "
        "FROM FieldPermissions "
        f"WHERE ParentId IN ({quoted_permission_set_ids}) "
        "AND SObjectType IN ('Lead', 'PricebookEntry', 'Product2') "
        "ORDER BY Parent.Name, SObjectType, Field"
    )


def summarize_apex_access(
    permission_sets: list[dict],
    profile_permission_set_id: str,
    required_apex_classes: dict[str, str],
    setup_entity_access_rows: list[dict],
) -> dict[str, dict]:
    label_by_id = {row["PermissionSetId"]: row["PermissionSet"]["Label"] for row in permission_sets}
    summary = {}
    for class_name, class_id in required_apex_classes.items():
        granted_by = sorted(
            label_by_id[row["ParentId"]]
            for row in setup_entity_access_rows
            if row["SetupEntityId"] == class_id and row["ParentId"] in label_by_id
        )
        summary[class_name] = {
            "classId": class_id,
            "grantedByAny": granted_by,
            "grantedByProfilePermissionSet": label_by_id[profile_permission_set_id]
            if profile_permission_set_id in {
                row["ParentId"] for row in setup_entity_access_rows if row["SetupEntityId"] == class_id
            }
            else None,
            "isGrantedByAny": bool(granted_by),
            "isGrantedByProfilePermissionSet": profile_permission_set_id
            in {row["ParentId"] for row in setup_entity_access_rows if row["SetupEntityId"] == class_id},
        }
    return summary


def summarize_object_access(object_permission_rows: list[dict]) -> dict[str, dict]:
    summary = {
        object_name: {
            "PermissionsRead": [],
            "PermissionsCreate": [],
            "PermissionsEdit": [],
            "PermissionsDelete": [],
            "PermissionsViewAllRecords": [],
            "PermissionsModifyAllRecords": [],
        }
        for object_name in RELEVANT_OBJECTS
    }

    for row in object_permission_rows:
        object_name = row["SobjectType"]
        parent_label = row["Parent"]["Name"]
        for permission_name in (
            "PermissionsRead",
            "PermissionsCreate",
            "PermissionsEdit",
            "PermissionsDelete",
            "PermissionsViewAllRecords",
            "PermissionsModifyAllRecords",
        ):
            if row.get(permission_name):
                summary[object_name][permission_name].append(parent_label)

    for object_name in summary:
        for permission_name in summary[object_name]:
            summary[object_name][permission_name] = sorted(summary[object_name][permission_name])

    return summary


def summarize_field_access(field_permission_rows: list[dict]) -> tuple[dict[str, dict], dict[str, list[str]]]:
    summary: dict[str, dict] = {}
    overexposed: dict[str, list[str]] = defaultdict(list)

    for object_name, allowlist in RELEVANT_FIELD_ALLOWLIST.items():
        summary[object_name] = {}
        matching_rows = [row for row in field_permission_rows if row["SobjectType"] == object_name]

        by_field: dict[str, dict[str, list[str]]] = {}
        for row in matching_rows:
            field_name = row["Field"]
            bucket = by_field.setdefault(field_name, {"read": [], "edit": []})
            if row.get("PermissionsRead"):
                bucket["read"].append(row["Parent"]["Name"])
            if row.get("PermissionsEdit"):
                bucket["edit"].append(row["Parent"]["Name"])

        for field_name, permissions in sorted(by_field.items()):
            permissions["read"] = sorted(permissions["read"])
            permissions["edit"] = sorted(permissions["edit"])
            if field_name in allowlist:
                summary[object_name][field_name] = permissions
            elif permissions["read"] or permissions["edit"]:
                overexposed[object_name].append(field_name)

        overexposed[object_name] = sorted(overexposed[object_name])

    return summary, dict(overexposed)


def build_recommendations(
    permission_sets: list[dict],
    apex_access: dict[str, dict],
    object_access: dict[str, dict],
    overexposed_fields: dict[str, list[str]],
) -> list[str]:
    recommendations = []

    missing_profile_apex = [
        class_name
        for class_name, details in apex_access.items()
        if not details["isGrantedByProfilePermissionSet"]
    ]
    if missing_profile_apex:
        recommendations.append(
            "Add guest Apex class access on the profile-owned permission set for: "
            + ", ".join(missing_profile_apex)
            + "."
        )

    extra_permission_sets = [
        row["PermissionSet"]["Label"]
        for row in permission_sets
        if not row["PermissionSet"]["IsOwnedByProfile"]
    ]
    if extra_permission_sets:
        recommendations.append(
            "Review and remove non-profile guest permission sets if Alpine only uses custom Apex for storefront/read/request flows: "
            + ", ".join(extra_permission_sets)
            + "."
        )

    objects_with_direct_access = []
    for object_name, permissions in object_access.items():
        if any(permissions[permission_name] for permission_name in permissions):
            objects_with_direct_access.append(object_name)
    if objects_with_direct_access:
        recommendations.append(
            "Direct guest object access exists and is not required for the Alpine custom Apex flow. Validate dependencies, then remove CRUD on: "
            + ", ".join(objects_with_direct_access)
            + "."
        )

    objects_with_overexposed_fields = [
        object_name for object_name, fields in overexposed_fields.items() if fields
    ]
    if objects_with_overexposed_fields:
        recommendations.append(
            "Direct guest field access is broader than the Alpine flow needs. Clean up field permissions on: "
            + ", ".join(objects_with_overexposed_fields)
            + "."
        )

    recommendations.append(
        "Keep request submit on Apex only. Do not widen direct Lead guest CRUD/FLS unless a non-Apex guest form requires it."
    )
    return recommendations


def build_report(
    client: SalesforceClient,
    site_name: str,
    apply_required_apex_access: bool,
) -> dict:
    site = get_site(client, site_name)
    guest_user = get_guest_user(client, site["GuestUserId"])
    permission_sets = get_permission_sets(client, guest_user["Id"])
    permission_set_ids = [row["PermissionSetId"] for row in permission_sets]
    profile_permission_set_id = get_profile_owned_permission_set_id(permission_sets)
    required_apex_classes = get_required_apex_classes(client)
    setup_entity_access_rows = get_setup_entity_access(client, permission_set_ids)

    created_apex_access = []
    if apply_required_apex_access:
        created_apex_access = maybe_apply_required_apex_access(
            client,
            profile_permission_set_id,
            required_apex_classes,
            setup_entity_access_rows,
        )
        if created_apex_access:
            setup_entity_access_rows = get_setup_entity_access(client, permission_set_ids)

    object_permission_rows = get_object_permissions(client, permission_set_ids)
    field_permission_rows = get_field_permissions(client, permission_set_ids)

    apex_access = summarize_apex_access(
        permission_sets,
        profile_permission_set_id,
        required_apex_classes,
        setup_entity_access_rows,
    )
    object_access = summarize_object_access(object_permission_rows)
    field_access, overexposed_fields = summarize_field_access(field_permission_rows)

    return {
        "orgInstanceUrl": client.instance_url,
        "site": site,
        "guestUser": guest_user,
        "permissionSets": [
            {
                "permissionSetAssignmentId": row["Id"],
                "permissionSetId": row["PermissionSetId"],
                "label": row["PermissionSet"]["Label"],
                "name": row["PermissionSet"]["Name"],
                "isOwnedByProfile": row["PermissionSet"]["IsOwnedByProfile"],
            }
            for row in permission_sets
        ],
        "createdRequiredApexAccess": created_apex_access,
        "requiredApexAccess": apex_access,
        "objectAccess": object_access,
        "fieldAccess": field_access,
        "overexposedFields": overexposed_fields,
        "recommendations": build_recommendations(
            permission_sets,
            apex_access,
            object_access,
            overexposed_fields,
        ),
    }


def print_human_report(report: dict) -> None:
    print(f"Org: {report['orgInstanceUrl']}")
    print(
        "Site: "
        f"{report['site']['Name']} ({report['site']['Id']}) | "
        f"GuestUserId={report['site']['GuestUserId']}"
    )
    print(
        "Guest User: "
        f"{report['guestUser']['Name']} ({report['guestUser']['Id']}) | "
        f"Profile={report['guestUser']['Profile']['Name']} ({report['guestUser']['ProfileId']})"
    )
    print("")
    print("Permission Sets:")
    for row in report["permissionSets"]:
        owner_flag = "profile-owned" if row["isOwnedByProfile"] else "assigned"
        print(f"- {row['label']} [{owner_flag}] ({row['permissionSetId']})")

    if report["createdRequiredApexAccess"]:
        print("")
        print("Created required Apex access:")
        for class_name in report["createdRequiredApexAccess"]:
            print(f"- {class_name}")

    print("")
    print("Required Apex class access:")
    for class_name, details in report["requiredApexAccess"].items():
        granted_by = ", ".join(details["grantedByAny"]) if details["grantedByAny"] else "none"
        profile_state = "yes" if details["isGrantedByProfilePermissionSet"] else "no"
        print(f"- {class_name}: any=[{granted_by}] | profile-owned={profile_state}")

    print("")
    print("Direct object access:")
    for object_name, permissions in report["objectAccess"].items():
        enabled = [
            f"{permission_name.replace('Permissions', '')}={','.join(labels)}"
            for permission_name, labels in permissions.items()
            if labels
        ]
        print(f"- {object_name}: {'; '.join(enabled) if enabled else 'none'}")

    print("")
    print("Relevant direct field access:")
    for object_name, fields in report["fieldAccess"].items():
        if not fields:
            print(f"- {object_name}: none")
            continue
        print(f"- {object_name}:")
        for field_name, permissions in fields.items():
            read_by = ",".join(permissions["read"]) if permissions["read"] else "none"
            edit_by = ",".join(permissions["edit"]) if permissions["edit"] else "none"
            print(f"  - {field_name}: read={read_by} | edit={edit_by}")

    print("")
    print("Overexposed direct fields:")
    for object_name, fields in report["overexposedFields"].items():
        print(f"- {object_name}: {', '.join(fields) if fields else 'none'}")

    print("")
    print("Recommendations:")
    for recommendation in report["recommendations"]:
        print(f"- {recommendation}")


def main() -> int:
    args = parse_args()
    client = SalesforceClient(resolve_auth_path())
    report = build_report(client, args.site_name, args.apply_required_apex_access)

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print_human_report(report)

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover - one-off utility
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
