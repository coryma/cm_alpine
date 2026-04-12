#!/usr/bin/env python3
"""Reschedule all Chantelle Rep customer tasks to before 2026-04-08."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import date, timedelta

from create_today_tasks import SalesforceClient, resolve_auth_path


ACCOUNTABLE_NAME = "Chantelle Rep"
WINDOW_START = date(2026, 4, 1)
WINDOW_END = date(2026, 4, 7)


@dataclass(frozen=True)
class SourceDates:
    creation_date: date
    due_date: date | None


# Preserve the historical ordering for records that were manually moved before
# the broader April 2026 reshuffle.
SOURCE_OVERRIDES = {
    "a8sKh000000GoJFIA0": SourceDates(date(2021, 2, 21), None),
    "a8sKh000000GoJKIA0": SourceDates(date(2021, 2, 19), None),
    "a8sKh000000GoJ2IAK": SourceDates(date(2021, 2, 17), date(2021, 5, 31)),
    "a8sKh000000GoJDIA0": SourceDates(date(2021, 2, 16), date(2021, 5, 15)),
}


def parse_date(value: str | None) -> date | None:
    if value is None:
        return None
    return date.fromisoformat(value)


def get_source_dates(row: dict) -> SourceDates:
    override = SOURCE_OVERRIDES.get(row["Id"])
    if override:
        return override
    return SourceDates(
        creation_date=parse_date(row["cgcloud__Creation_Date__c"]),
        due_date=parse_date(row["cgcloud__Due_Date__c"]),
    )


def get_tasks(client: SalesforceClient) -> list[dict]:
    return client.query(
        "SELECT Id, Name, cgcloud__Description__c, cgcloud__Creation_Date__c, cgcloud__Due_Date__c, "
        "cgcloud__Account__r.Name "
        "FROM cgcloud__Account_Task__c "
        f"WHERE cgcloud__Accountable__r.Name = '{ACCOUNTABLE_NAME}'"
    )


def compute_new_creation_date(index: int, total_tasks: int) -> date:
    available_days = (WINDOW_END - WINDOW_START).days + 1
    day_offset = (index * available_days) // total_tasks
    return WINDOW_START + timedelta(days=day_offset)


def compute_new_due_date(new_creation_date: date, source_dates: SourceDates) -> date | None:
    if source_dates.due_date is None:
        return None

    due_offset = max((source_dates.due_date - source_dates.creation_date).days, 0)
    return min(new_creation_date + timedelta(days=due_offset), WINDOW_END)


def main() -> int:
    client = SalesforceClient(resolve_auth_path())
    tasks = get_tasks(client)
    if not tasks:
        raise RuntimeError(f"No customer tasks found for {ACCOUNTABLE_NAME}")

    ordered_tasks = sorted(
        tasks,
        key=lambda row: (get_source_dates(row).creation_date, row["Name"], row["Id"]),
    )

    creation_counts: Counter[str] = Counter()

    print(f"Using org: {client.instance_url}")
    print(
        f"Rescheduling {len(ordered_tasks)} customer tasks for {ACCOUNTABLE_NAME} "
        f"into {WINDOW_START.isoformat()} to {WINDOW_END.isoformat()}"
    )

    for index, row in enumerate(ordered_tasks):
        source_dates = get_source_dates(row)
        new_creation_date = compute_new_creation_date(index, len(ordered_tasks))
        new_due_date = compute_new_due_date(new_creation_date, source_dates)

        payload = {"cgcloud__Creation_Date__c": new_creation_date.isoformat()}
        payload["cgcloud__Due_Date__c"] = None if new_due_date is None else new_due_date.isoformat()

        client.update("cgcloud__Account_Task__c", row["Id"], payload)
        creation_counts[new_creation_date.isoformat()] += 1
        print(
            f"Updated {row['Id']} | {row['cgcloud__Description__c']} | "
            f"{source_dates.creation_date.isoformat()} -> {new_creation_date.isoformat()} | "
            f"{source_dates.due_date.isoformat() if source_dates.due_date else None} -> "
            f"{new_due_date.isoformat() if new_due_date else None}"
        )

    print("Creation date distribution:")
    for creation_date in sorted(creation_counts):
        print(f"  {creation_date}: {creation_counts[creation_date]}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
