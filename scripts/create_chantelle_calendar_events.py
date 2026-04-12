#!/usr/bin/env python3
"""Create English Retail Execution calendar events for Chantelle Rep."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

from create_today_tasks import SalesforceClient, resolve_auth_path


OWNER_NAME = "Chantelle Rep"
START_DATE = date(2026, 4, 1)
END_DATE = date(2026, 4, 10)
STORE_LIMIT = 10


@dataclass(frozen=True)
class EventTemplate:
    subject: str
    description: str


TEMPLATES = [
    EventTemplate(
        "Store Visit: Shelf Availability and Replenishment Review",
        "Review shelf availability, confirm replenishment needs, and capture any gaps on priority SKUs.",
    ),
    EventTemplate(
        "Compliance Audit: Price Tags and Promotion Execution",
        "Validate price tags, promotion signage, and in-store execution against current compliance standards.",
    ),
    EventTemplate(
        "Store Visit: Out-of-Stock and Backroom Check",
        "Inspect out-of-stock items, review backroom inventory, and align the replenishment plan with store staff.",
    ),
    EventTemplate(
        "Merchandising Review: Endcap and Display Compliance",
        "Check endcaps and secondary displays to confirm merchandising quality and promotional compliance.",
    ),
    EventTemplate(
        "Inventory Review: Replenishment Readiness",
        "Review stock levels, identify replenishment risks, and verify readiness for the next sales cycle.",
    ),
    EventTemplate(
        "Store Visit: Promotion Execution and POSM Check",
        "Confirm promotion execution, point-of-sale materials, and visibility of priority brand placements.",
    ),
    EventTemplate(
        "Shelf Audit: Facings, Availability, and Gaps",
        "Audit facings, shelf availability, and execution gaps that may impact sales performance.",
    ),
    EventTemplate(
        "Planogram Compliance Review",
        "Compare current shelf layout against planogram expectations and record corrective actions.",
    ),
    EventTemplate(
        "Replenishment Follow-Up: High-Velocity SKUs",
        "Follow up on high-velocity SKUs, review replenishment timing, and escalate unresolved stock risks.",
    ),
    EventTemplate(
        "Weekly Store Visit: Compliance and Action Review",
        "Wrap up the week with a full compliance review, issue recap, and agreed next steps with the store team.",
    ),
]


def get_owner(client: SalesforceClient) -> dict:
    users = client.query(
        f"SELECT Id, Name, Username FROM User WHERE Name = '{OWNER_NAME}' AND IsActive = true LIMIT 1"
    )
    if not users:
        raise RuntimeError(f"User not found: {OWNER_NAME}")
    return users[0]


def get_store_accounts(client: SalesforceClient, limit: int) -> list[dict]:
    rows = client.query(
        f"SELECT Id, Name, Type FROM Account WHERE Name LIKE '%Store%' ORDER BY Name LIMIT {limit}"
    )
    if len(rows) < limit:
        raise RuntimeError(f"Expected at least {limit} store accounts, found {len(rows)}")
    return rows


def get_existing_subjects(client: SalesforceClient, owner_id: str) -> set[tuple[str, str]]:
    rows = client.query(
        "SELECT Subject, ActivityDate "
        f"FROM Event WHERE OwnerId = '{owner_id}' "
        f"AND ActivityDate >= {START_DATE.isoformat()} AND ActivityDate <= {END_DATE.isoformat()}"
    )
    return {(row["ActivityDate"], row["Subject"]) for row in rows}


def build_event_payload(event_date: date, owner_id: str, store: dict, template: EventTemplate) -> dict:
    start_dt = datetime.combine(event_date, time(hour=16, minute=0), tzinfo=timezone.utc)
    end_dt = start_dt + timedelta(minutes=90)
    return {
        "OwnerId": owner_id,
        "Subject": template.subject,
        "Description": f"{template.description} Store: {store['Name']}.",
        "StartDateTime": start_dt.isoformat().replace("+00:00", "Z"),
        "EndDateTime": end_dt.isoformat().replace("+00:00", "Z"),
        "Location": store["Name"],
        "WhatId": store["Id"],
    }


def main() -> int:
    client = SalesforceClient(resolve_auth_path())
    owner = get_owner(client)
    stores = get_store_accounts(client, STORE_LIMIT)
    existing = get_existing_subjects(client, owner["Id"])

    print(f"Using owner: {owner['Name']} ({owner['Username']})")
    print(f"Using org: {client.instance_url}")

    current_date = START_DATE
    created = 0
    for index, store in enumerate(stores):
        template = TEMPLATES[index]
        payload = build_event_payload(current_date, owner["Id"], store, template)
        identity = (current_date.isoformat(), template.subject)
        if identity in existing:
            print(f"Skipped {current_date.isoformat()} | {template.subject} | already exists")
        else:
            response = client.create("Event", payload)
            print(
                f"Created {response.get('id')} | {current_date.isoformat()} | "
                f"{template.subject} | {store['Name']}"
            )
            created += 1
        current_date += timedelta(days=1)

    print(f"Total created: {created}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
