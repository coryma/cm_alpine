#!/usr/bin/env python3
"""Create additional Chantelle Rep calendar-visible Visit records."""

from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from create_today_tasks import SalesforceClient, resolve_auth_path


ACCOUNTABLE_NAME = "Chantelle Rep"
LOCATION_NAME = "Default Location"
VISIT_TEMPLATE_NAME = "Grocery / Sales"
TASK_WINDOW_START = date(2026, 4, 11)
TASK_WINDOW_END = date(2026, 4, 20)
START_MINUTES = [55, 10, 25]
BASE_HOUR_UTC = 4
DEFAULT_DURATION_MINUTES = 90


@dataclass(frozen=True)
class SourceTask:
    record_id: str
    description: str
    account_id: str
    account_name: str
    task_date: date


@dataclass(frozen=True)
class FallbackVisit:
    account_name: str
    task_date: date
    description: str


FALLBACK_VISITS = [
    FallbackVisit("*NTO Store #201", date(2026, 4, 11), "Store follow-up"),
    FallbackVisit("*NTO Store #226", date(2026, 4, 12), "Display follow-up"),
    FallbackVisit("The Flying Dutchman", date(2026, 4, 13), "Customer service check"),
    FallbackVisit("Kroger Store #203", date(2026, 4, 14), "Promotion execution review"),
    FallbackVisit("7-Eleven", date(2026, 4, 15), "Availability and replenishment review"),
]


def get_user(client: SalesforceClient, name: str) -> dict:
    rows = client.query(
        f"SELECT Id, Name FROM User WHERE Name = '{name}' AND IsActive = true LIMIT 1"
    )
    if not rows:
        raise RuntimeError(f"User not found: {name}")
    return rows[0]


def get_location(client: SalesforceClient, name: str) -> dict:
    rows = client.query(f"SELECT Id, Name FROM Location WHERE Name = '{name}' LIMIT 1")
    if not rows:
        raise RuntimeError(f"Location not found: {name}")
    return rows[0]


def get_visit_template(client: SalesforceClient, name: str) -> dict:
    rows = client.query(
        f"SELECT Id, Name, cgcloud__Default_Duration__c FROM cgcloud__Visit_Template__c "
        f"WHERE Name = '{name}' LIMIT 1"
    )
    if not rows:
        raise RuntimeError(f"Visit template not found: {name}")
    return rows[0]


def get_account(client: SalesforceClient, name: str) -> dict:
    safe_name = name.replace("'", "\\'")
    rows = client.query(f"SELECT Id, Name FROM Account WHERE Name = '{safe_name}' LIMIT 1")
    if not rows:
        raise RuntimeError(f"Account not found: {name}")
    return rows[0]


def get_source_tasks(client: SalesforceClient) -> list[SourceTask]:
    soql = (
        "SELECT Id, cgcloud__Description__c, cgcloud__Account__c, cgcloud__Account__r.Name, "
        "cgcloud__Creation_Date__c "
        "FROM cgcloud__Account_Task__c "
        f"WHERE cgcloud__Accountable__r.Name = '{ACCOUNTABLE_NAME}' "
        f"AND cgcloud__Creation_Date__c >= {TASK_WINDOW_START.isoformat()} "
        f"AND cgcloud__Creation_Date__c <= {TASK_WINDOW_END.isoformat()} "
        "ORDER BY cgcloud__Creation_Date__c ASC, Name ASC"
    )
    rows = client.query(soql)
    return [
        SourceTask(
            record_id=row["Id"],
            description=row["cgcloud__Description__c"],
            account_id=row["cgcloud__Account__c"],
            account_name=row["cgcloud__Account__r"]["Name"],
            task_date=date.fromisoformat(row["cgcloud__Creation_Date__c"]),
        )
        for row in rows
    ]


def get_fallback_tasks(client: SalesforceClient) -> list[SourceTask]:
    tasks: list[SourceTask] = []
    for visit in FALLBACK_VISITS:
        account = get_account(client, visit.account_name)
        tasks.append(
            SourceTask(
                record_id="fallback",
                description=visit.description,
                account_id=account["Id"],
                account_name=account["Name"],
                task_date=visit.task_date,
            )
        )
    return tasks


def compute_start_datetime(task_date: date, index: int) -> datetime:
    minute = START_MINUTES[index % len(START_MINUTES)]
    return datetime(task_date.year, task_date.month, task_date.day, BASE_HOUR_UTC, minute, tzinfo=timezone.utc)


def existing_visit_keys(client: SalesforceClient, owner_id: str, template_id: str) -> set[tuple[str, str]]:
    soql = (
        "SELECT AccountId, PlannedVisitStartTime "
        "FROM Visit "
        f"WHERE OwnerId = '{owner_id}' "
        f"AND cgcloud__Visit_Template__c = '{template_id}' "
        f"AND PlannedVisitStartTime >= {TASK_WINDOW_START.isoformat()}T00:00:00Z "
        f"AND PlannedVisitStartTime <= {TASK_WINDOW_END.isoformat()}T23:59:59Z"
    )
    rows = client.query(soql)
    return {
        (row["AccountId"], row["PlannedVisitStartTime"].replace(".000+0000", "+00:00"))
        for row in rows
    }


def build_visit_payload(
    task: SourceTask,
    owner_id: str,
    location_id: str,
    template_id: str,
    start_dt: datetime,
    duration_minutes: int,
) -> dict:
    end_dt = start_dt + timedelta(minutes=duration_minutes)
    actual_start = start_dt + timedelta(seconds=38)
    subject = f"{task.account_name} {VISIT_TEMPLATE_NAME}"
    return {
        "OwnerId": owner_id,
        "AccountId": task.account_id,
        "PlaceId": location_id,
        "Status": "Planned",
        "VisitorId": owner_id,
        "PlannedVisitStartTime": start_dt.isoformat().replace("+00:00", "Z"),
        "PlannedVisitEndTime": end_dt.isoformat().replace("+00:00", "Z"),
        "ActualVisitStartTime": actual_start.isoformat().replace("+00:00", "Z"),
        "cgcloud__Creation_Date_and_Time__c": actual_start.isoformat().replace("+00:00", "Z"),
        "cgcloud__Accountable__c": owner_id,
        "cgcloud__Responsible__c": owner_id,
        "cgcloud__Visit_Template__c": template_id,
        "cgcloud__Visit_Planned_Date__c": task.task_date.isoformat(),
        "cgcloud__Subject__c": subject,
        "cgcloud__Week__c": float(task.task_date.isocalendar().week),
        "cgcloud__Creation_Mode__c": "Manually",
        "cgcloud__Distribution_Rate_All__c": 0,
        "cgcloud__Distribution_Rate_Focus__c": 0,
        "cgcloud__OOS_Rate_All__c": 0,
        "cgcloud__OOS_Rate_Focus__c": 0,
        "cgcloud__PSI__c": 0,
        "cgcloud__PSQ_Rate__c": 0,
    }


def wait_for_related_event(client: SalesforceClient, visit_id: str, attempts: int = 6) -> dict | None:
    for _ in range(attempts):
        rows = client.query(
            "SELECT Id, OwnerId, Subject "
            "FROM Event "
            f"WHERE WhatId = '{visit_id}' "
            "ORDER BY CreatedDate DESC LIMIT 1"
        )
        if rows:
            return rows[0]
        time.sleep(1)
    return None


def sync_related_event(client: SalesforceClient, visit_id: str, owner_id: str, subject: str) -> None:
    event = wait_for_related_event(client, visit_id)
    if not event:
        print(f"Warning: no related Event found for visit {visit_id}")
        return

    payload = {}
    if event["OwnerId"] != owner_id:
        payload["OwnerId"] = owner_id
    if event.get("Subject") != subject:
        payload["Subject"] = subject

    if payload:
        client.update("Event", event["Id"], payload)
        print(f"Updated Event {event['Id']} | owner->Chantelle | subject->{subject}")


def main() -> int:
    client = SalesforceClient(resolve_auth_path())
    chantelle = get_user(client, ACCOUNTABLE_NAME)
    location = get_location(client, LOCATION_NAME)
    template = get_visit_template(client, VISIT_TEMPLATE_NAME)
    tasks = get_source_tasks(client)
    if not tasks:
        tasks = get_fallback_tasks(client)
    existing = existing_visit_keys(client, chantelle["Id"], template["Id"])

    print(f"Using org: {client.instance_url}")
    print(f"Creating visits for {len(tasks)} tasks from {TASK_WINDOW_START} to {TASK_WINDOW_END}")

    created = 0
    skipped = 0
    for index, task in enumerate(tasks):
        start_dt = compute_start_datetime(task.task_date, index)
        key = (task.account_id, start_dt.isoformat())
        subject = f"{task.account_name} {VISIT_TEMPLATE_NAME}"
        if key in existing:
            print(f"Skipped {task.task_date} | {task.account_name} | already exists")
            skipped += 1
            continue

        payload = build_visit_payload(
            task=task,
            owner_id=chantelle["Id"],
            location_id=location["Id"],
            template_id=template["Id"],
            start_dt=start_dt,
            duration_minutes=int(template.get("cgcloud__Default_Duration__c") or DEFAULT_DURATION_MINUTES),
        )
        response = client.create("Visit", payload)
        visit_id = response.get("id")
        print(f"Created {visit_id} | {task.task_date} | {task.account_name} | {task.description}")
        sync_related_event(client, visit_id, chantelle["Id"], subject)
        created += 1

    print(f"Created: {created}")
    print(f"Skipped: {skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
