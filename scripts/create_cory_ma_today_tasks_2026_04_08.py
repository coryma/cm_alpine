#!/usr/bin/env python3
"""Create four Salesforce Tasks for Cory Ma due on 2026-04-08."""

from __future__ import annotations

from create_today_tasks import SalesforceClient, resolve_auth_path


TARGET_DATE = "2026-04-08"
TARGET_USER_NAME = "Cory Ma"


def get_owner(client: SalesforceClient) -> dict:
    rows = client.query(
        "SELECT Id, Name, Username "
        "FROM User "
        f"WHERE Name = '{TARGET_USER_NAME}' "
        "LIMIT 2"
    )
    if len(rows) != 1:
        raise RuntimeError(f"Expected exactly one user named {TARGET_USER_NAME!r}, found {len(rows)}")
    return rows[0]


def get_accounts(client: SalesforceClient, limit: int = 4) -> list[dict]:
    return client.query(
        f"SELECT Id, Name, Type FROM Account WHERE Name != null ORDER BY LastModifiedDate DESC LIMIT {limit}"
    )


def get_existing_subjects(client: SalesforceClient, owner_id: str) -> set[str]:
    rows = client.query(
        "SELECT Subject "
        "FROM Task "
        f"WHERE OwnerId = '{owner_id}' "
        f"AND ActivityDate = {TARGET_DATE}"
    )
    return {row["Subject"] for row in rows}


def build_tasks(owner_id: str, accounts: list[dict]) -> list[dict]:
    task_specs = [
        (
            "Store Visit: Check Shelf Availability and Merchandising",
            "High",
            (
                "Review shelf availability, out-of-stock risk, and on-shelf execution for key SKUs. "
                "Capture merchandising gaps and note corrective actions."
            ),
        ),
        (
            "Sales Review: Investigate Product Performance Issues",
            "Normal",
            (
                "Review current sales performance, identify underperforming products, and confirm "
                "promotion execution issues with the account."
            ),
        ),
        (
            "Store Check: Confirm Operations and Promotion Execution",
            "Normal",
            (
                "Check price labels, promotional materials, competitor placement, and store feedback. "
                "Summarize follow-up actions for operational issues."
            ),
        ),
        (
            "Account Follow-up: Confirm Next Actions and Risks",
            "Normal",
            (
                "Review the latest account activity, confirm next steps, surface open risks, and "
                "document recommended follow-up actions for the customer."
            ),
        ),
    ]

    tasks = []
    for index, (subject, priority, description) in enumerate(task_specs):
        task = {
            "OwnerId": owner_id,
            "Subject": subject,
            "Status": "Not Started",
            "Priority": priority,
            "ActivityDate": TARGET_DATE,
            "Description": description,
        }
        if index < len(accounts):
            task["WhatId"] = accounts[index]["Id"]
        tasks.append(task)
    return tasks


def main() -> int:
    client = SalesforceClient(resolve_auth_path())
    owner = get_owner(client)
    accounts = get_accounts(client)
    tasks = build_tasks(owner["Id"], accounts)
    existing_subjects = get_existing_subjects(client, owner["Id"])

    print(f"Using org: {client.instance_url}")
    print(f"Using user: {owner['Name']} ({owner['Username']})")

    created = 0
    skipped = 0
    for index, task in enumerate(tasks):
        if task["Subject"] in existing_subjects:
            skipped += 1
            print(f"Skipped existing task: {task['Subject']}")
            continue

        response = client.create("Task", task)
        related_name = accounts[index]["Name"] if index < len(accounts) else "No related account"
        created += 1
        print(
            f"Created Task {created}: {response.get('id')} | {task['Subject']} | "
            f"Due {task['ActivityDate']} | Related: {related_name}"
        )

    print(f"Created {created} tasks, skipped {skipped} existing tasks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
