#!/usr/bin/env python3
"""Move the screenshoted *NTO Store #201 CG Cloud orders into April 2026."""

from __future__ import annotations

from dataclasses import dataclass

from create_today_tasks import SalesforceClient, resolve_auth_path


@dataclass(frozen=True)
class OrderUpdate:
    record_id: str
    new_date: str


UPDATES = [
    OrderUpdate("aATKh000000GoPsOAK", "2026-04-26"),
    OrderUpdate("aATKh000000GoPqOAK", "2026-04-28"),
    OrderUpdate("aATKh000000GoPoOAK", "2026-04-21"),
    OrderUpdate("aATKh000000GoPmOAK", "2026-04-21"),
    OrderUpdate("aATKh000000GoPkOAK", "2026-04-21"),
    OrderUpdate("aATKh000000GoPiOAK", "2026-04-18"),
    OrderUpdate("aATKh000000GoPgOAK", "2026-04-18"),
    OrderUpdate("aATKh000000GoPXOA0", "2026-04-18"),
    OrderUpdate("aATKh000000GoPfOAK", "2026-04-18"),
    OrderUpdate("aATKh000000GoPVOA0", "2026-04-18"),
]


def get_orders(client: SalesforceClient) -> list[dict]:
    ids = "', '".join(update.record_id for update in UPDATES)
    soql = (
        "SELECT Id, Name, cgcloud__Order_Date__c, cgcloud__Initiation_Date__c, "
        "cgcloud__Delivery_Date__c, cgcloud__Pricing_Date__c, "
        "cgcloud__Document_Type__c, cgcloud__Document_Transaction_Type__c, "
        "cgcloud__Order_Account__r.Name "
        "FROM cgcloud__Order__c "
        f"WHERE Id IN ('{ids}')"
    )
    return client.query(soql)


def build_payload(order: dict, new_date: str) -> dict:
    payload = {
        "cgcloud__Order_Date__c": new_date,
        "cgcloud__Initiation_Date__c": new_date,
        "cgcloud__Pricing_Date__c": new_date,
    }
    if order.get("cgcloud__Delivery_Date__c") is not None:
        payload["cgcloud__Delivery_Date__c"] = new_date
    return payload


def main() -> int:
    client = SalesforceClient(resolve_auth_path())
    orders_by_id = {row["Id"]: row for row in get_orders(client)}

    if len(orders_by_id) != len(UPDATES):
        missing = [update.record_id for update in UPDATES if update.record_id not in orders_by_id]
        raise RuntimeError(f"Missing expected orders: {missing}")

    print(f"Using org: {client.instance_url}")

    for update in UPDATES:
        order = orders_by_id[update.record_id]
        payload = build_payload(order, update.new_date)
        client.update("cgcloud__Order__c", update.record_id, payload)
        print(
            f"Updated {order['Id']} | {order['Name']} | "
            f"{order['cgcloud__Order_Date__c']} -> {update.new_date} | "
            f"Delivery {order.get('cgcloud__Delivery_Date__c')} -> "
            f"{payload.get('cgcloud__Delivery_Date__c')}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
