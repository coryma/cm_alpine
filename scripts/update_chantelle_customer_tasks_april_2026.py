#!/usr/bin/env python3
"""Move the screenshoted Chantelle Rep customer tasks into April 2026."""

from __future__ import annotations

from dataclasses import dataclass

from create_today_tasks import SalesforceClient, resolve_auth_path


ACCOUNTABLE_NAME = "Chantelle Rep"


@dataclass(frozen=True)
class TaskUpdate:
    description: str
    account_name: str
    old_creation_date: str
    old_due_date: str | None
    new_creation_date: str
    new_due_date: str | None


UPDATES = [
    TaskUpdate(
        description="Service The Flying Dutchman",
        account_name="The Flying Dutchman",
        old_creation_date="2021-02-21",
        old_due_date=None,
        new_creation_date="2026-04-21",
        new_due_date=None,
    ),
    TaskUpdate(
        description="Missing 2nd Placement",
        account_name="*NTO Store #201",
        old_creation_date="2021-02-19",
        old_due_date=None,
        new_creation_date="2026-04-19",
        new_due_date=None,
    ),
    TaskUpdate(
        description="Delivery Problems",
        account_name="*NTO Store #201",
        old_creation_date="2021-02-17",
        old_due_date="2021-05-31",
        new_creation_date="2026-04-17",
        new_due_date="2026-04-30",
    ),
    TaskUpdate(
        description="Display Check",
        account_name="*NTO Store #226",
        old_creation_date="2021-02-16",
        old_due_date="2021-05-15",
        new_creation_date="2026-04-16",
        new_due_date="2026-04-25",
    ),
]


def find_task(client: SalesforceClient, update: TaskUpdate) -> dict:
    due_clause = (
        "cgcloud__Due_Date__c = null"
        if update.old_due_date is None
        else f"cgcloud__Due_Date__c = {update.old_due_date}"
    )
    soql = (
        "SELECT Id, Name, cgcloud__Description__c, cgcloud__Creation_Date__c, cgcloud__Due_Date__c, "
        "cgcloud__Account__r.Name, cgcloud__Accountable__r.Name "
        "FROM cgcloud__Account_Task__c "
        f"WHERE cgcloud__Description__c = '{update.description}' "
        f"AND cgcloud__Account__r.Name = '{update.account_name}' "
        f"AND cgcloud__Accountable__r.Name = '{ACCOUNTABLE_NAME}' "
        f"AND cgcloud__Creation_Date__c = {update.old_creation_date} "
        f"AND {due_clause} "
        "LIMIT 2"
    )
    rows = client.query(soql)
    if len(rows) != 1:
        raise RuntimeError(
            f"Expected exactly one task for {update.description!r}, found {len(rows)}"
        )
    return rows[0]


def build_payload(update: TaskUpdate) -> dict:
    payload = {"cgcloud__Creation_Date__c": update.new_creation_date}
    if update.new_due_date is None:
        payload["cgcloud__Due_Date__c"] = None
    else:
        payload["cgcloud__Due_Date__c"] = update.new_due_date
    return payload


def main() -> int:
    client = SalesforceClient(resolve_auth_path())
    print(f"Using org: {client.instance_url}")

    for update in UPDATES:
        row = find_task(client, update)
        payload = build_payload(update)
        client.update("cgcloud__Account_Task__c", row["Id"], payload)
        print(
            f"Updated {row['Id']} | {update.description} | "
            f"{row['cgcloud__Creation_Date__c']} -> {update.new_creation_date} | "
            f"{row['cgcloud__Due_Date__c']} -> {update.new_due_date}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
