#!/usr/bin/env python3
"""Align Alpine site guest access with the working B2B storefront guest config."""

from __future__ import annotations

import json

from create_today_tasks import SalesforceClient, resolve_auth_path


ALPINE_SITE_ID = "0DMKh000000LHHMOA4"
REFERENCE_B2B_SITE_ID = "0DMKh0000011y8F"


def query_one(client: SalesforceClient, soql: str) -> dict | None:
    rows = client.query(soql)
    if not rows:
        return None
    if len(rows) > 1:
        raise RuntimeError(f"Expected at most one row for query: {soql}")
    return rows[0]


def get_guest_user_id(client: SalesforceClient, site_id: str) -> str:
    row = query_one(client, f"SELECT GuestUserId FROM Site WHERE Id = '{site_id}'")
    if not row or not row.get("GuestUserId"):
        raise RuntimeError(f"Guest user not found for site {site_id}")
    return row["GuestUserId"]


def get_profile_owned_permission_set_id(client: SalesforceClient, guest_user_id: str) -> str:
    row = query_one(
        client,
        "SELECT PermissionSetId "
        "FROM PermissionSetAssignment "
        f"WHERE AssigneeId = '{guest_user_id}' AND PermissionSet.IsOwnedByProfile = true "
        "LIMIT 1",
    )
    if not row:
        raise RuntimeError(f"Profile-owned permission set not found for {guest_user_id}")
    return row["PermissionSetId"]


def sync_guest_permission_sets(client: SalesforceClient) -> tuple[int, int]:
    alpine_guest_user_id = get_guest_user_id(client, ALPINE_SITE_ID)
    b2b_guest_user_id = get_guest_user_id(client, REFERENCE_B2B_SITE_ID)

    alpine = {
        row["PermissionSetId"]: row
        for row in client.query(
            "SELECT Id, PermissionSetId, PermissionSet.IsOwnedByProfile "
            "FROM PermissionSetAssignment "
            f"WHERE AssigneeId = '{alpine_guest_user_id}'"
        )
        if not row["PermissionSet"]["IsOwnedByProfile"]
    }
    reference_ids = {
        row["PermissionSetId"]
        for row in client.query(
            "SELECT PermissionSetId, PermissionSet.IsOwnedByProfile "
            "FROM PermissionSetAssignment "
            f"WHERE AssigneeId = '{b2b_guest_user_id}'"
        )
        if not row["PermissionSet"]["IsOwnedByProfile"]
    }

    created = 0
    deleted = 0

    for permission_set_id in sorted(reference_ids - set(alpine)):
        client.create(
            "PermissionSetAssignment",
            {"AssigneeId": alpine_guest_user_id, "PermissionSetId": permission_set_id},
        )
        created += 1

    for permission_set_id, row in alpine.items():
        if permission_set_id in reference_ids:
            continue
        client._request("DELETE", f"sobjects/PermissionSetAssignment/{row['Id']}")
        deleted += 1

    return created, deleted


def sync_profile_setup_entity_access(client: SalesforceClient) -> tuple[int, int]:
    alpine_guest_user_id = get_guest_user_id(client, ALPINE_SITE_ID)
    b2b_guest_user_id = get_guest_user_id(client, REFERENCE_B2B_SITE_ID)

    alpine_parent_id = get_profile_owned_permission_set_id(client, alpine_guest_user_id)
    b2b_parent_id = get_profile_owned_permission_set_id(client, b2b_guest_user_id)

    alpine_rows = client.query(
        "SELECT Id, SetupEntityId, SetupEntityType "
        "FROM SetupEntityAccess "
        f"WHERE ParentId = '{alpine_parent_id}'"
    )
    b2b_rows = client.query(
        "SELECT SetupEntityId, SetupEntityType "
        "FROM SetupEntityAccess "
        f"WHERE ParentId = '{b2b_parent_id}'"
    )

    alpine_by_key = {
        (row["SetupEntityType"], row["SetupEntityId"]): row for row in alpine_rows
    }
    b2b_keys = {(row["SetupEntityType"], row["SetupEntityId"]) for row in b2b_rows}

    created = 0
    deleted = 0

    for key in sorted(b2b_keys - set(alpine_by_key)):
        _, setup_entity_id = key
        client.create(
            "SetupEntityAccess",
            {"ParentId": alpine_parent_id, "SetupEntityId": setup_entity_id},
        )
        created += 1

    for key, row in alpine_by_key.items():
        if key in b2b_keys:
            continue
        client._request("DELETE", f"sobjects/SetupEntityAccess/{row['Id']}")
        deleted += 1

    return created, deleted


def summarize(client: SalesforceClient) -> dict:
    alpine_guest_user_id = get_guest_user_id(client, ALPINE_SITE_ID)
    profile_parent_id = get_profile_owned_permission_set_id(client, alpine_guest_user_id)
    return {
        "guest_psas": client.query(
            "SELECT PermissionSet.Label, PermissionSet.Name, PermissionSet.IsOwnedByProfile "
            "FROM PermissionSetAssignment "
            f"WHERE AssigneeId = '{alpine_guest_user_id}' "
            "ORDER BY PermissionSet.Label"
        ),
        "setup_entity_access": client.query(
            "SELECT SetupEntityType, SetupEntityId "
            "FROM SetupEntityAccess "
            f"WHERE ParentId = '{profile_parent_id}' "
            "ORDER BY SetupEntityType, SetupEntityId"
        ),
    }


def main() -> int:
    client = SalesforceClient(resolve_auth_path())
    print(f"Using org: {client.instance_url}")

    created_psas, deleted_psas = sync_guest_permission_sets(client)
    created_sea, deleted_sea = sync_profile_setup_entity_access(client)

    print(f"Guest PSAs created={created_psas} deleted={deleted_psas}")
    print(f"SetupEntityAccess created={created_sea} deleted={deleted_sea}")
    print(json.dumps(summarize(client), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
