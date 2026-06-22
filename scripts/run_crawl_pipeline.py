# Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
# Proprietary and confidential. Unauthorized use is strictly prohibited.
# See LICENSE file in the project root for full license information.

from __future__ import annotations

import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


API_BASE_URL = "http://localhost:3000/api/v1"
SMOKE_EMAIL = "coverit-smoke@example.com"
SMOKE_PASSWORD = "CoveritSmoke123!"
SMOKE_NAME = "CoverIt Smoke"
TARGET_BASE_URL = "https://quotes.toscrape.com/"
PROJECT_NAME_PREFIX = "crawler-smoke"
PROJECT_NAME = PROJECT_NAME_PREFIX
APPLICATION_NAME = "crawler-smoke-app"
VERSION_NAME_PREFIX = "smoke-version"
VERSION_NAME = VERSION_NAME_PREFIX
WATCH_SECONDS = 1000000
POLL_SECONDS = 5
CRAWL_TRIGGER_ON_DEMAND = 5
TERMINAL_STATUSES = {"COMPLETED", "FAILED", "ABORTED", 3, 4, 5}

BASE_URL = "https://tryscrapeme.com/"
QUOTES = "https://quotes.toscrape.com/"
BOOKS = "https://books.toscrape.com/"
OTHER_URL = "https://en.wikipedia.org/wiki/Main_Page"
X = "https://the-internet.herokuapp.com/challenging_dom"
WEBSITE_1 = "file:///D:/crawler_test_website/nexus_commerce/index.html"


ROOT = Path(__file__).resolve().parents[1]
CRAWLER_ROOT = ROOT.parent / "coverit-crawler"
RUN_ID = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def _json_request(method: str, path: str, body: dict[str, Any] | None = None, token: str | None = None) -> dict[str, Any]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API_BASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            text = response.read().decode("utf-8")
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8")
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            payload = {"raw": text}
        raise RuntimeError(f"{method} {path} failed with {exc.code}: {payload}") from exc


def _try_json_request(method: str, path: str, body: dict[str, Any] | None = None, token: str | None = None) -> dict[str, Any] | None:
    try:
        return _json_request(method, path, body, token)
    except RuntimeError as exc:
        if "failed with 409" in str(exc):
            return None
        raise


def _docker(*args: str) -> str:
    result = subprocess.run(
        ["docker", "compose", *args],
        cwd=ROOT,
        capture_output=True,
        timeout=30,
        check=False,
    )
    stdout = (result.stdout or b"").decode("utf-8", errors="replace")
    stderr = (result.stderr or b"").decode("utf-8", errors="replace")
    output = (stdout + stderr).strip()
    return output


def _clean_worker_logs(logs: str) -> str:
    blocked = (
        "Received notification from DBMS server",
        "CREATE CONSTRAINT state_unique IF NOT EXISTS",
        "CREATE INDEX state_session IF NOT EXISTS",
        "CREATE CONSTRAINT transition_unique IF NOT EXISTS",
        "CREATE INDEX transition_session IF NOT EXISTS",
    )
    lines = []
    for line in logs.splitlines():
        if any(item in line for item in blocked):
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def _print_worker_snapshot(session_id: str) -> None:
    queue = _docker("exec", "-T", "redis", "redis-cli", "zscore", "arq:queue", session_id)
    job = _docker("exec", "-T", "redis", "redis-cli", "exists", f"arq:job:{session_id}", f"arq:in-progress:{session_id}")
    local_log = CRAWLER_ROOT / "logs" / "local-worker.err.log"
    if local_log.exists():
        logs = "\n".join(local_log.read_text(encoding="utf-8", errors="replace").splitlines()[-80:])
        log_label = "local-worker logs"
    else:
        logs = ""
        log_label = f"{local_log} not found"
    logs = _clean_worker_logs(logs)
    print(f"redis queue_score={queue or '<empty>'} job_and_running_exists={job or '<empty>'}")
    print(log_label)
    print(logs or "<empty>")


def _wait_for_api() -> None:
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen("http://localhost:3000/health", timeout=5) as response:
                if response.status == 200:
                    return
        except Exception:
            time.sleep(2)
    raise RuntimeError("API did not become healthy on http://localhost:3000/health")


def _auth_token() -> str:
    _try_json_request(
        "POST",
        "/auth/signup",
        {"email": SMOKE_EMAIL, "password": SMOKE_PASSWORD, "name": SMOKE_NAME},
    )
    login = _json_request("POST", "/auth/login", {"email": SMOKE_EMAIL, "password": SMOKE_PASSWORD})
    token = login.get("tokens", {}).get("accessToken")
    if not token:
        raise RuntimeError(f"login response did not include access token: {login}")
    return str(token)


def _get_or_create_project(token: str) -> dict[str, Any]:
    projects = _json_request("GET", "/projects", token=token)
    if isinstance(projects, list):
        for project in projects:
            if project.get("name") == PROJECT_NAME:
                return project

    return _json_request(
        "POST",
        "/projects",
        {
            "name": PROJECT_NAME,
            "description": "Crawler integration smoke project",
        },
        token,
    )


def _get_or_create_app(project_id: str, token: str) -> dict[str, Any]:
    apps = _json_request("GET", f"/projects/{project_id}/target-applications", token=token)
    if isinstance(apps, list):
        for app in apps:
            if app.get("name") == APPLICATION_NAME:
                return app

    return _json_request(
        "POST",
        f"/projects/{project_id}/target-applications",
        {"name": APPLICATION_NAME, "baseUrl": TARGET_BASE_URL},
        token,
    )


def _get_or_create_version(project_id: str, app: dict[str, Any], token: str) -> dict[str, Any]:
    for version in app.get("versions") or []:
        if version.get("version") == VERSION_NAME:
            return version

    app_id = str(app["id"])
    fresh_app = _json_request("GET", f"/projects/{project_id}/target-applications/{app_id}", token=token)
    for version in fresh_app.get("versions") or []:
        if version.get("version") == VERSION_NAME:
            return version

    return _json_request(
        "POST",
        f"/projects/{project_id}/target-applications/{app_id}/versions",
        {"version": VERSION_NAME},
        token,
    )


def main() -> int:
    print("waiting for api")
    _wait_for_api()

    token = _auth_token()
    project = _get_or_create_project(token)
    project_id = project["id"]

    app = _get_or_create_app(project_id, token)
    app_id = app["id"]

    version = _get_or_create_version(project_id, app, token)
    version_id = version["id"]

    session = _json_request(
        "POST",
        f"/projects/{project_id}/target-applications/{app_id}/versions/{version_id}/crawl-sessions",
        {
            "triggerType": CRAWL_TRIGGER_ON_DEMAND,
            "crawlConfig": {
                "maxStates": 30,
                "timeoutSeconds": 90,
                "generateTestFlows": True,
                "crawlerSettings": {
                    "headless": True,
                    "maxTransitions": 20,
                    "timeoutMs": 20000,
                    "useSemanticDiversity": False,
                },
                "inputDefaults": {
                    "fieldPatterns": {
                        "email": "coverit-smoke@example.com",
                        "password": "CoveritSmoke123!",
                        "search": "smoke query",
                    },
                    "typeFallbacks": {
                        "email": "coverit-smoke@example.com",
                        "password": "CoveritSmoke123!",
                        "search": "smoke query",
                        "text": "test",
                    },
                },
            },
        },
        token,
    )
    session_id = session["id"]

    print(f"project_id={project_id}")
    print(f"app_id={app_id}")
    print(f"version_id={version_id}")
    print(f"run_id={RUN_ID}")
    print(f"session_id={session_id}")
    print(f"crawl_url={TARGET_BASE_URL}")

    start = _json_request(
        "PUT",
        f"/projects/{project_id}/target-applications/{app_id}/versions/{version_id}/crawl-sessions/{session_id}/start",
        token=token,
    )
    print(f"start={start}")

    details_path = f"/projects/{project_id}/target-applications/{app_id}/versions/{version_id}/crawl-sessions/{session_id}"
    deadline = time.monotonic() + WATCH_SECONDS
    while True:
        details = _json_request("GET", details_path, token=token)
        status = details.get("status")
        print(
            "status="
            f"{status} states={details.get('stateCount')} transitions={details.get('transitionCount')} "
            f"error={details.get('errorMessage')}"
        )
        _print_worker_snapshot(session_id)
        if status in TERMINAL_STATUSES:
            break
        if time.monotonic() >= deadline:
            raise RuntimeError("crawl did not finish before WATCH_SECONDS")
        time.sleep(POLL_SECONDS)

    flows = _json_request(
        "GET",
        f"/projects/{project_id}/target-applications/{app_id}/versions/{version_id}/crawl-sessions/{session_id}",
        token=token,
    )
    print(f"final={json.dumps(flows, indent=2)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
