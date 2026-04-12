#!/usr/bin/env python3
"""Create three diagnostic Visit records to test CG Cloud calendar visibility."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from create_today_tasks import SalesforceClient, resolve_auth_path


ACCOUNTABLE_NAME = "Chantelle Rep"
LOCATION_NAME = "Default Location"
VISIT_TEMPLATE_NAME = "Grocery / Sales"


@dataclass(frozen=True)
class DiagnosticVisit:
    label: str
    account_name: str
    start_iso_utc: str
    duration_minutes: int
    include_visitor: bool
    include_planned_date: bool


DIAGNOSTIC_VISITS = [
    # Variant A: closest to the manually-created app visit we inspected.
    DiagnosticVisit(
        label="A",
        account_name="*NTO Store #201",
        start_iso_utc="2026-04-06T04:55:00+00:00",
        duration_minutes=90,
        include_visitor=False,
        include_planned_date=False,
    ),
    # Variant B: same owner-assignment, but also sets Visitor per the official desktop steps.
    DiagnosticVisit(
        label="B",
        account_name="*NTO Store #226",
        start_iso_utc="2026-04-07T05:10:00+00:00",
        duration_minutes=90,
        include_visitor=True,
        include_planned_date=False,
    ),
    # Variant C: sets both Visitor and Visit Planned Date to test weekly calendar planning behavior.
    DiagnosticVisit(
        label="C",
        account_name="The Flying Dutchman",
        start_iso_utc="2026-04-09T05:25:00+00:00",
        duration_minutes=90,
        include_visitor=True,
        include_planned_date=True,
    ),
]


def get_user(client: SalesforceClient, name: str) -> dict:
    rows = client.query(f"SELECT Id, Name FROM User WHERE Name = '{name}' AND IsActive = true LIMIT 1")
    if not rows:
        raise RuntimeError(f"User not found: {name}")
    return rows[0]


def get_account(client: SalesforceClient, name: str) -> dict:
    rows = client.query(f"SELECT Id, Name FROM Account WHERE Name = '{name}' LIMIT 1")
    if not rows:
        raise RuntimeError(f"Account not found: {name}")
    return rows[0]


def get_location(client: SalesforceClient, name: str) -> dict:
    rows = client.query(f"SELECT Id, Name FROM Location WHERE Name = '{name}' LIMIT 1")
    if not rows:
        raise RuntimeError(f"Location not found: {name}")
    return rows[0]


def get_visit_template(client: SalesforceClient, name: str) -> dict:
    rows = client.query(
        f"SELECT Id, Name, cgcloud__Default_Duration__c FROM cgcloud__Visit_Template__c WHERE Name = '{name}' LIMIT 1"
    )
    if not rows:
        raise RuntimeError(f"Visit template not found: {name}")
    return rows[0]


def visit_key(visit: DiagnosticVisit, account_id: str, template_id: str) -> tuple[str, str, str]:
    start_dt = datetime.fromisoformat(visit.start_iso_utc)
    return (start_dt.isoformat(), account_id, template_id)


def existing_visit_keys(client: SalesforceClient, owner_id: str) -> set[tuple[str, str, str]]:
    rows = client.query(
        "SELECT Id, PlannedVisitStartTime, AccountId, cgcloud__Visit_Template__c "
        "FROM Visit "
        f"WHERE OwnerId = '{owner_id}' "
        "AND PlannedVisitStartTime >= 2026-04-06T00:00:00Z "
        "AND PlannedVisitStartTime <= 2026-04-10T00:00:00Z"
    )
    return {
        (row["PlannedVisitStartTime"].replace(".000+0000", "+00:00"), row["AccountId"], row["cgcloud__Visit_Template__c"])
        for row in rows
    }


def get_existing_visit_id(
    client: SalesforceClient,
    owner_id: str,
    visit: DiagnosticVisit,
    account_id: str,
    template_id: str,
) -> str | None:
    start_dt = datetime.fromisoformat(visit.start_iso_utc)
    rows = client.query(
        "SELECT Id FROM Visit "
        f"WHERE OwnerId = '{owner_id}' "
        f"AND AccountId = '{account_id}' "
        f"AND cgcloud__Visit_Template__c = '{template_id}' "
        f"AND PlannedVisitStartTime = {start_dt.isoformat().replace('+00:00', 'Z')} "
        "LIMIT 1"
    )
    return rows[0]["Id"] if rows else None


def build_payload(
    visit: DiagnosticVisit,
    owner_id: str,
    account_id: str,
    location_id: str,
    template_id: str,
) -> dict:
    start_dt = datetime.fromisoformat(visit.start_iso_utc)
    end_dt = start_dt + timedelta(minutes=visit.duration_minutes)
    payload = {
        "OwnerId": owner_id,
        "AccountId": account_id,
        "PlaceId": location_id,
        "Status": "Planned",
        "PlannedVisitStartTime": start_dt.isoformat().replace("+00:00", "Z"),
        "PlannedVisitEndTime": end_dt.isoformat().replace("+00:00", "Z"),
        "cgcloud__Accountable__c": owner_id,
        "cgcloud__Visit_Template__c": template_id,
    }
    if visit.include_visitor:
        payload["VisitorId"] = owner_id
    if visit.include_planned_date:
        payload["cgcloud__Visit_Planned_Date__c"] = start_dt.date().isoformat()
    return payload


def sync_related_event(
    client: SalesforceClient,
    visit_id: str,
    owner_id: str,
    account_name: str,
    template_name: str,
) -> None:
    rows = client.query(
        "SELECT Id, OwnerId, Subject FROM Event "
        f"WHERE WhatId = '{visit_id}' "
        "ORDER BY CreatedDate DESC LIMIT 1"
    )
    if not rows:
        print(f"Warning: no related Event found for visit {visit_id}")
        return

    event = rows[0]
    desired_subject = f"{account_name} {template_name}"
    payload = {}
    if event["OwnerId"] != owner_id:
        payload["OwnerId"] = owner_id
    if event.get("Subject") != desired_subject:
        payload["Subject"] = desired_subject

    if payload:
        client.update("Event", event["Id"], payload)
        print(
            f"Updated Event {event['Id']} | owner->{owner_id} | "
            f"subject->{desired_subject}"
        )


def sync_visit_fields(
    client: SalesforceClient,
    visit_id: str,
    visit: DiagnosticVisit,
    owner_id: str,
    account_name: str,
    template_name: str,
) -> None:
    start_dt = datetime.fromisoformat(visit.start_iso_utc)
    actual_start = start_dt + timedelta(seconds=38)
    payload = {
        "ActualVisitStartTime": actual_start.isoformat().replace("+00:00", "Z"),
        "cgcloud__Creation_Date_and_Time__c": actual_start.isoformat().replace("+00:00", "Z"),
        "cgcloud__Responsible__c": owner_id,
        "cgcloud__Subject__c": f"{account_name} {template_name}",
        "cgcloud__Week__c": float(start_dt.isocalendar().week),
        "cgcloud__Distribution_Rate_All__c": 0,
        "cgcloud__Distribution_Rate_Focus__c": 0,
        "cgcloud__OOS_Rate_All__c": 0,
        "cgcloud__OOS_Rate_Focus__c": 0,
        "cgcloud__PSI__c": 0,
        "cgcloud__PSQ_Rate__c": 0,
    }
    client.update("Visit", visit_id, payload)
    print(
        f"Updated Visit {visit_id} | actual_start->{actual_start.isoformat()} | "
        f"subject->{account_name} {template_name}"
    )


def main() -> int:
    client = SalesforceClient(resolve_auth_path())
    chantelle = get_user(client, ACCOUNTABLE_NAME)
    location = get_location(client, LOCATION_NAME)
    template = get_visit_template(client, VISIT_TEMPLATE_NAME)
    existing = existing_visit_keys(client, chantelle["Id"])

    print(f"Using org: {client.instance_url}")
    print(f"Owner/accountable: {chantelle['Name']} ({chantelle['Id']})")
    print(f"Location: {location['Name']} ({location['Id']})")
    print(f"Template: {template['Name']} ({template['Id']})")

    for visit in DIAGNOSTIC_VISITS:
        account = get_account(client, visit.account_name)
        key = visit_key(visit, account["Id"], template["Id"])
        if key in existing:
            print(f"Skipped {visit.label} | {visit.account_name} | {visit.start_iso_utc} | already exists")
            visit_id = get_existing_visit_id(
                client=client,
                owner_id=chantelle["Id"],
                visit=visit,
                account_id=account["Id"],
                template_id=template["Id"],
            )
        else:
            payload = build_payload(
                visit=visit,
                owner_id=chantelle["Id"],
                account_id=account["Id"],
                location_id=location["Id"],
                template_id=template["Id"],
            )
            response = client.create("Visit", payload)
            visit_id = response.get("id")
            print(
                f"Created {visit_id} | variant {visit.label} | {visit.account_name} | "
                f"{visit.start_iso_utc} | visitor={visit.include_visitor} | planned_date={visit.include_planned_date}"
            )

        if visit_id:
            sync_visit_fields(
                client=client,
                visit_id=visit_id,
                visit=visit,
                owner_id=chantelle["Id"],
                account_name=visit.account_name,
                template_name=VISIT_TEMPLATE_NAME,
            )
            sync_related_event(
                client=client,
                visit_id=visit_id,
                owner_id=chantelle["Id"],
                account_name=visit.account_name,
                template_name=VISIT_TEMPLATE_NAME,
            )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
