#!/usr/bin/env python3
"""Create three CG Cloud-oriented Task records in the current demo org."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path


SFDX_DIR = Path.home() / ".sfdx"
ALIAS_PATH = SFDX_DIR / "alias.json"
CONFIG_PATH = SFDX_DIR / "sfdx-config.json"


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def resolve_auth_path() -> Path:
    config = load_json(CONFIG_PATH)
    default_username = config.get("defaultusername")
    if not default_username:
        raise RuntimeError("No defaultusername found in ~/.sfdx/sfdx-config.json")

    aliases = load_json(ALIAS_PATH).get("orgs", {})
    username = aliases.get(default_username, default_username)
    auth_path = SFDX_DIR / f"{username}.json"
    if not auth_path.exists():
        raise RuntimeError(f"Auth file not found: {auth_path}")
    return auth_path


def get_crypto_key() -> str:
    try:
        result = subprocess.run(
            ["security", "find-generic-password", "-a", "local", "-s", "sfdx", "-w"],
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip()
    except (FileNotFoundError, subprocess.CalledProcessError):
        key_path = SFDX_DIR / "key.json"
        if not key_path.exists():
            raise RuntimeError("Unable to retrieve the Salesforce auth encryption key")
        return load_json(key_path)["key"]


def decrypt_auth_value(value: str | None, key: str) -> str | None:
    if value is None or ":" not in value:
        return value

    swift_code = """
import Foundation
import CryptoKit

func hexToData(_ hex: String) -> Data {
    var data = Data()
    var index = hex.startIndex
    while index < hex.endIndex {
        let next = hex.index(index, offsetBy: 2)
        data.append(UInt8(hex[index..<next], radix: 16)!)
        index = next
    }
    return data
}

let encrypted = ProcessInfo.processInfo.environment["SF_ENCRYPTED"]!
let keyString = ProcessInfo.processInfo.environment["SF_KEY"]!
let parts = encrypted.split(separator: ":")
let tokenPart = String(parts[0])
let ivString = String(tokenPart.prefix(12))
let secretHex = String(tokenPart.dropFirst(12))
let tagHex = String(parts[1])

let key = SymmetricKey(data: Data(keyString.utf8))
let nonce = try AES.GCM.Nonce(data: Data(ivString.utf8))
let box = try AES.GCM.SealedBox(nonce: nonce, ciphertext: hexToData(secretHex), tag: hexToData(tagHex))
let decrypted = try AES.GCM.open(box, using: key)
print(String(data: decrypted, encoding: .utf8)!, terminator: "")
"""

    env = os.environ.copy()
    env["SF_KEY"] = key
    env["SF_ENCRYPTED"] = value
    result = subprocess.run(
        ["swift", "-"],
        input=swift_code,
        capture_output=True,
        text=True,
        env=env,
        check=True,
    )
    return result.stdout


class SalesforceClient:
    def __init__(self, auth_path: Path):
        auth = load_json(auth_path)
        self.username = auth["username"]
        self.instance_url = auth["instanceUrl"].rstrip("/")
        self.login_url = auth["loginUrl"].rstrip("/")
        self.client_id = auth["clientId"]
        self.api_version = auth.get("instanceApiVersion", "66.0")
        crypto_key = get_crypto_key()
        self.token = decrypt_auth_value(auth["accessToken"], crypto_key)
        self.refresh_token = decrypt_auth_value(auth.get("refreshToken"), crypto_key)

    def refresh_access_token(self) -> None:
        if not self.refresh_token:
            raise RuntimeError("No refresh token is available for this org auth")

        token_url = f"{self.login_url}/services/oauth2/token"
        payload = urllib.parse.urlencode(
            {
                "grant_type": "refresh_token",
                "client_id": self.client_id,
                "refresh_token": self.refresh_token,
            }
        ).encode("utf-8")
        request = urllib.request.Request(token_url, data=payload, method="POST")
        try:
            with urllib.request.urlopen(request) as response:
                refreshed = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Token refresh failed: {exc.code} {error_body}") from exc

        self.token = refreshed["access_token"]
        self.instance_url = refreshed.get("instance_url", self.instance_url).rstrip("/")

    def _request(
        self, method: str, path: str, payload: dict | None = None, retried: bool = False
    ) -> dict:
        url = f"{self.instance_url}/services/data/v{self.api_version}/{path.lstrip('/')}"
        body = None
        headers = {"Authorization": f"Bearer {self.token}"}
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request = urllib.request.Request(url, data=body, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request) as response:
                raw = response.read()
                return json.loads(raw.decode("utf-8")) if raw else {}
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            if exc.code == 401 and not retried and self.refresh_token:
                self.refresh_access_token()
                return self._request(method, path, payload, retried=True)
            raise RuntimeError(f"{method} {path} failed: {exc.code} {error_body}") from exc

    def query(self, soql: str) -> list[dict]:
        encoded = urllib.parse.quote(soql, safe="")
        result = self._request("GET", f"query?q={encoded}")
        return result.get("records", [])

    def create(self, sobject: str, payload: dict) -> dict:
        return self._request("POST", f"sobjects/{sobject}", payload)

    def update(self, sobject: str, record_id: str, payload: dict) -> dict:
        return self._request("PATCH", f"sobjects/{sobject}/{record_id}", payload)


def get_current_user(client: SalesforceClient) -> dict:
    records = client.query(
        f"SELECT Id, Name, Username FROM User WHERE Username = '{client.username}' LIMIT 1"
    )
    if not records:
        raise RuntimeError(f"User not found for username {client.username}")
    return records[0]


def get_context_accounts(client: SalesforceClient, limit: int = 3) -> list[dict]:
    return client.query(
        f"SELECT Id, Name, Type FROM Account WHERE Name != null ORDER BY LastModifiedDate DESC LIMIT {limit}"
    )


def build_tasks(owner_id: str, accounts: list[dict]) -> list[dict]:
    today = date.today().isoformat()
    descriptions = [
        (
            "Review shelf availability and stockout conditions in store, and confirm whether key "
            "SKUs are missing or under-merchandised. Capture issues and note replenishment actions."
        ),
        (
            "Review today's product sales performance, investigate items with declining sales or "
            "weak promotion results, and confirm promotion execution with the store."
        ),
        (
            "Check the store's overall operating condition, including price labels, promotion "
            "materials, competitor placement, and store feedback, then summarize follow-up actions."
        ),
    ]
    subjects = [
        "Store Visit: Check Shelf Availability and Merchandising",
        "Sales Review: Investigate Product Performance Issues",
        "Store Check: Confirm Operations and Promotion Execution",
    ]
    priorities = ["High", "Normal", "Normal"]

    tasks = []
    for index, subject in enumerate(subjects):
        task = {
            "OwnerId": owner_id,
            "Subject": subject,
            "Status": "Not Started",
            "Priority": priorities[index],
            "ActivityDate": today,
            "Description": descriptions[index],
        }
        if index < len(accounts):
            task["WhatId"] = accounts[index]["Id"]
        tasks.append(task)
    return tasks


def main() -> int:
    auth_path = resolve_auth_path()
    client = SalesforceClient(auth_path)
    user = get_current_user(client)
    accounts = get_context_accounts(client)
    tasks = build_tasks(user["Id"], accounts)

    print(f"Using org: {client.instance_url}")
    print(f"Using user: {user['Name']} ({user['Username']})")

    for index, task in enumerate(tasks):
        response = client.create("Task", task)
        related_name = accounts[index]["Name"] if index < len(accounts) else "No related account"
        print(
            f"Created Task {index + 1}: {response.get('id')} | {task['Subject']} | "
            f"Due {task['ActivityDate']} | Related: {related_name}"
        )

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover - one-off utility
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
