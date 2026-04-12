#!/usr/bin/env python3
"""Create Chantelle Rep visit-execution Visit records from April customer tasks."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

from create_today_tasks import SalesforceClient, resolve_auth_path


ACCOUNTABLE_NAME = "Chantelle Rep"
LOCATION_NAME = "Default Location"
TASK_WINDOW_START = date(2026, 4, 1)
TASK_WINDOW_END = date(2026, 4, 10)
START_HOUR_UTC = 14


@dataclass(frozen=True)
class TemplateChoice:
    name: str
    duration_minutes: int


def get_accountable(client: SalesforceClient) -> dict:
    rows = client.query(
        f"SELECT Id, Name FROM User WHERE Name = '{ACCOUNTABLE_NAME}' AND IsActive = true LIMIT 1"
    )
    if not rows:
        raise RuntimeError(f"User not found: {ACCOUNTABLE_NAME}")
    return rows[0]


def get_location(client: SalesforceClient) -> dict:
    rows = client.query(f"SELECT Id, Name FROM Location WHERE Name = '{LOCATION_NAME}' LIMIT 1")
    if not rows:
        raise RuntimeError(f"Location not found: {LOCATION_NAME}")
    return rows[0]


def get_templates(client: SalesforceClient) -> dict[str, TemplateChoice]:
    rows = client.query(
        "SELECT Id, Name, cgcloud__Default_Duration__c "
        "FROM cgcloud__Visit_Template__c "
        "WHERE Name IN ('Delivery Visit', 'Grocery / Merchandizing', 'Grocery / Sales')"
    )
    templates: dict[str, TemplateChoice] = {}
    for row in rows:
        templates[row["Name"]] = TemplateChoice(
            name=row["Id"],
            duration_minutes=int(row["cgcloud__Default_Duration__c"]),
        )
    expected = {
        "Delivery Visit",
        "Grocery / Merchandizing",
        "Grocery / Sales",
    }
    missing = expected.difference(templates)
    if missing:
        raise RuntimeError(f"Missing visit templates: {sorted(missing)}")
    return templates


def get_source_tasks(client: SalesforceClient) -> list[dict]:
    soql = (
        "SELECT Id, Name, cgcloud__Description__c, cgcloud__Priority__c, "
        "cgcloud__Creation_Date__c, cgcloud__Account__c, cgcloud__Account__r.Name "
        "FROM cgcloud__Account_Task__c "
        f"WHERE cgcloud__Accountable__r.Name = '{ACCOUNTABLE_NAME}' "
        f"AND cgcloud__Creation_Date__c >= {TASK_WINDOW_START.isoformat()} "
        f"AND cgcloud__Creation_Date__c <= {TASK_WINDOW_END.isoformat()} "
        "ORDER BY cgcloud__Creation_Date__c ASC, Name ASC"
    )
    rows = client.query(soql)
    if not rows:
        raise RuntimeError("No Chantelle customer tasks found in the target April window")
    return rows


def choose_template(description: str, templates: dict[str, TemplateChoice]) -> tuple[str, TemplateChoice]:
    normalized = description.lower()
    if any(token in normalized for token in ["delivery", "driver"]):
        key = "Delivery Visit"
    elif any(token in normalized for token in ["display", "advertising", "placement", "fridge", "new item"]):
        key = "Grocery / Merchandizing"
    else:
        key = "Grocery / Sales"
    return key, templates[key]


def choose_priority(task_priority: str | None) -> str | None:
    mapping = {"A": "High", "B": "Medium", "C": "Low"}
    return mapping.get(task_priority or "")


def get_existing_visit_keys(client: SalesforceClient, accountable_id: str) -> set[tuple[str, str, str]]:
    soql = (
        "SELECT Id, AccountId, cgcloud__Visit_Template__c, cgcloud__Visit_Planned_Date__c "
        "FROM Visit "
        f"WHERE cgcloud__Accountable__c = '{accountable_id}' "
        f"AND cgcloud__Visit_Planned_Date__c >= {TASK_WINDOW_START.isoformat()} "
        f"AND cgcloud__Visit_Planned_Date__c <= {TASK_WINDOW_END.isoformat()}"
    )
    rows = client.query(soql)
    return {
        (row["cgcloud__Visit_Planned_Date__c"], row["AccountId"], row["cgcloud__Visit_Template__c"])
        for row in rows
    }


def build_payload(
    task: dict,
    accountable_id: str,
    location_id: str,
    template_choice: TemplateChoice,
    visit_priority: str | None,
) -> dict:
    visit_date = date.fromisoformat(task["cgcloud__Creation_Date__c"])
    start_dt = datetime.combine(
        visit_date,
        time(hour=START_HOUR_UTC, minute=0),
        tzinfo=timezone.utc,
    )
    end_dt = start_dt + timedelta(minutes=template_choice.duration_minutes)

    payload = {
        "AccountId": task["cgcloud__Account__c"],
        "PlaceId": location_id,
        "Status": "Planned",
        "PlannedVisitStartTime": start_dt.isoformat().replace("+00:00", "Z"),
        "PlannedVisitEndTime": end_dt.isoformat().replace("+00:00", "Z"),
        "cgcloud__Accountable__c": accountable_id,
        "cgcloud__Visit_Template__c": template_choice.name,
        "cgcloud__Visit_Planned_Date__c": visit_date.isoformat(),
    }
    if visit_priority:
        payload["VisitPriority"] = visit_priority
    return payload


def main() -> int:
    client = SalesforceClient(resolve_auth_path())
    accountable = get_accountable(client)
    location = get_location(client)
    templates = get_templates(client)
    tasks = get_source_tasks(client)
    existing_keys = get_existing_visit_keys(client, accountable["Id"])

    print(f"Using org: {client.instance_url}")
    print(f"Using accountable: {accountable['Name']} ({accountable['Id']})")
    print(f"Using location: {location['Name']} ({location['Id']})")
    print(f"Source tasks: {len(tasks)}")

    created = 0
    skipped = 0
    for task in tasks:
        template_label, template_choice = choose_template(task["cgcloud__Description__c"], templates)
        visit_priority = choose_priority(task.get("cgcloud__Priority__c"))
        visit_key = (
            task["cgcloud__Creation_Date__c"],
            task["cgcloud__Account__c"],
            template_choice.name,
        )
        if visit_key in existing_keys:
            print(
                f"Skipped {task['cgcloud__Creation_Date__c']} | {task['cgcloud__Account__r']['Name']} | "
                f"{template_label} | already exists"
            )
            skipped += 1
            continue

        payload = build_payload(
            task=task,
            accountable_id=accountable["Id"],
            location_id=location["Id"],
            template_choice=template_choice,
            visit_priority=visit_priority,
        )
        response = client.create("Visit", payload)
        print(
            f"Created {response.get('id')} | {task['cgcloud__Creation_Date__c']} | "
            f"{task['cgcloud__Account__r']['Name']} | {template_label} | "
            f"{task['cgcloud__Description__c']}"
        )
        created += 1

    print(f"Created: {created}")
    print(f"Skipped: {skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
