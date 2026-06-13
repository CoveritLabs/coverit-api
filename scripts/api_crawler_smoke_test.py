# Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
# Proprietary and confidential. Unauthorized use is strictly prohibited.
# See LICENSE file in the project root for full license information.

import json
import os
import sys
import time
import uuid
import urllib.error
import urllib.request
import urllib.parse
from typing import Any, Dict, Optional, Tuple

def _json_loads_maybe(text: str) -> Any:
    try:
        return json.loads(text)
    except Exception:
        return text


def _http_json(method: str, url: str, *, token: Optional[str] = None, body: Optional[Dict[str, Any]] = None, timeout: int = 30) -> Tuple[int, Any]:
    data = None
    headers = {
        "Accept": "application/json",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=data, headers=headers, method=method.upper())

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, _json_loads_maybe(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8") if e.fp else ""
        payload = _json_loads_maybe(raw) if raw else None
        raise RuntimeError(f"HTTP {e.code} {method} {url} {payload}") from None
    except urllib.error.URLError as e:
        raise RuntimeError(f"Request failed {method} {url} {e}") from None


def _http_text(method: str, url: str, *, timeout: int = 15) -> Tuple[int, str]:
    req = urllib.request.Request(url, headers={"Accept": "*/*"}, method=method.upper())
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return resp.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace") if e.fp else ""
        raise RuntimeError(f"HTTP {e.code} {method} {url} {raw[:500]}") from None
    except urllib.error.URLError as e:
        raise RuntimeError(f"Request failed {method} {url} {e}") from None


def _join_url(base: str, path: str) -> str:
    return base.rstrip("/") + "/" + path.lstrip("/")


def _origin(url: str) -> str:
    parts = urllib.parse.urlsplit(url)
    if not parts.scheme or not parts.netloc:
        raise RuntimeError(f"Invalid URL: {url}")
    return f"{parts.scheme}://{parts.netloc}"


def _as_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except Exception:
        return None


_CRAWL_STATUS_BY_NUMBER = {
    0: "UNSPECIFIED",
    1: "QUEUED",
    2: "RUNNING",
    3: "COMPLETED",
    4: "FAILED",
    5: "ABORTED",
    6: "PAUSED",
    7: "NEW",
}


def _normalize_crawl_status(value: Any) -> str:
    if value is None:
        return "UNKNOWN"

    if isinstance(value, int):
        return _CRAWL_STATUS_BY_NUMBER.get(value, f"UNKNOWN({value})")

    if isinstance(value, str):
        v = value.strip().upper()
        for name in _CRAWL_STATUS_BY_NUMBER.values():
            if v == name or v.endswith(f"_{name}"):
                return name
        return v or "UNKNOWN"

    n = _as_int(value)
    if n is not None:
        return _CRAWL_STATUS_BY_NUMBER.get(n, f"UNKNOWN({n})")

    return "UNKNOWN"


def _parse_trigger_type(value: str) -> int:
    v = (value or "").strip()
    if v.isdigit():
        n = int(v)
        if 0 <= n <= 4:
            return n
    mapping = {
        "UNSPECIFIED": 0,
        "MANUAL": 1,
        "SCHEDULED": 2,
        "CI_TRIGGER": 3,
        "WEBHOOK": 4,
    }
    key = v.upper()
    if key in mapping:
        return mapping[key]
    raise RuntimeError(f"Invalid COVERIT_CRAWL_TRIGGER_TYPE: {value}")


def main() -> int:
    base = "http://localhost:3000/api/v1"
    password = "TestPassword123!@#"
    name = "API Smoke Tester"
    email = f"api-smoke-{uuid.uuid4().hex[:12]}@example.com"

    project_name = f"api-smoke-{uuid.uuid4().hex[:8]}"
    project_description = "A project created by the API crawler"

    target_app_name = f"target-app-{uuid.uuid4().hex[:8]}"
    target_base_url = "https://the-internet.herokuapp.com"
    target_version = "0.0.1"

    poll_interval = 2.0
    poll_timeout = 600

    pickup_timeout = 30.0
    precheck_api = True
    precheck_target = True
    min_states = 0
    min_transitions = 0

    print(
        json.dumps(
            {
                "base": base,
                "email": email,
                "project": project_name,
                "targetBaseUrl": target_base_url,
                "pollIntervalSeconds": poll_interval,
                "pollTimeoutSeconds": poll_timeout,
                "workerPickupTimeoutSeconds": pickup_timeout,
            },
            indent=2,
        )
    )

    if precheck_api:
        health_url = _join_url(_origin(base), "/health")
        status, payload = _http_json("GET", health_url, timeout=10)
        if not isinstance(payload, dict) or payload.get("status") != "ok":
            raise RuntimeError(f"API healthcheck unexpected response: {payload}")
        print(json.dumps({"apiHealth": "ok", "url": health_url}, indent=2))

    if precheck_target:
        status, _ = _http_text("GET", target_base_url, timeout=10)
        if status < 200 or status >= 500:
            raise RuntimeError(f"Target base URL not reachable (status {status}): {target_base_url}")
        print(json.dumps({"targetPrecheckStatus": status, "url": target_base_url}, indent=2))

    signup_url = _join_url(base, "/auth/signup")
    try:
        status, payload = _http_json("POST", signup_url, body={"email": email, "password": password, "name": name})
        print(json.dumps({"signupStatus": status, "signup": payload}, indent=2))
    except RuntimeError as e:
        msg = str(e)
        if "HTTP 409" in msg or "EMAIL" in msg or "taken" in msg.lower() or "already" in msg.lower():
            print(json.dumps({"signupSkipped": True, "reason": msg}, indent=2))
        else:
            raise

    login_url = _join_url(base, "/auth/login")
    status, login = _http_json("POST", login_url, body={"email": email, "password": password})
    access_token = (login or {}).get("tokens", {}).get("accessToken")
    if not access_token:
        raise RuntimeError(f"Login succeeded but accessToken missing: {login}")
    print(json.dumps({"loginStatus": status, "user": (login or {}).get("user")}, indent=2))

    create_project_url = _join_url(base, "/projects")
    project_body: Dict[str, Any] = {"name": project_name}
    if project_description is not None:
        project_body["description"] = project_description
    status, project = _http_json("POST", create_project_url, token=access_token, body=project_body)
    project_id = (project or {}).get("id")
    if not project_id:
        raise RuntimeError(f"Create project failed: {project}")
    print(json.dumps({"createProjectStatus": status, "projectId": project_id}, indent=2))

    create_app_url = _join_url(base, f"/projects/{project_id}/target-applications")
    status, app = _http_json(
        "POST",
        create_app_url,
        token=access_token,
        body={"name": target_app_name, "baseUrl": target_base_url},
    )
    app_id = (app or {}).get("id")
    if not app_id:
        raise RuntimeError(f"Create target application failed: {app}")
    print(json.dumps({"createTargetApplicationStatus": status, "appId": app_id}, indent=2))

    create_version_url = _join_url(base, f"/projects/{project_id}/target-applications/{app_id}/versions")
    status, ver = _http_json("POST", create_version_url, token=access_token, body={"version": target_version})
    version_id = (ver or {}).get("id")
    if not version_id:
        raise RuntimeError(f"Create version failed: {ver}")
    print(json.dumps({"createVersionStatus": status, "versionId": version_id}, indent=2))

    create_session_url = _join_url(
        base,
        f"/projects/{project_id}/target-applications/{app_id}/versions/{version_id}/crawl-sessions",
    )

    crawl_config: Dict[str, Any] = {
        "crawlerSettings": {
            "headless": False,
            "timeout_ms": 30000,
            "max_states": 50,
            "max_transitions": 200,
            "max_elements_per_state": 5,
            "max_select_options_per_element": 2,
            "max_action_repeats_per_url": 1,
            "action_retry_count": 1,
            "replay_retry_count": 1,
            "popup_timeout_ms": 3000,
            "dom_quiet_ms": 400,
            "dom_settle_timeout_ms": 3000,
            "use_dom_quiescence": True,
            "page_load_state": "networkidle",
            "click_non_http_links": False,
            "defer_destructive_actions": "true".lower() == "true",
            "destructive_keywords":
                "logout,log out,sign out,delete,remove,unsubscribe,cancel,checkout,pay,purchase,order,place order,reset,deactivate,terminate,drop,empty cart,clear cart",
        },
    }

    trigger_type = _parse_trigger_type("MANUAL")

    status, session = _http_json(
        "POST",
        create_session_url,
        token=access_token,
        body={
            "triggerType": trigger_type,
            "crawlConfig": crawl_config,
        },
    )

    session_id = (session or {}).get("id")
    if not session_id:
        raise RuntimeError(f"Create crawl session failed: {session}")

    initial_status_raw = (session or {}).get("status")
    print(
        json.dumps(
            {
                "createSessionStatus": status,
                "crawlSessionId": session_id,
                "initialStatus": initial_status_raw,
                "initialStatusName": _normalize_crawl_status(initial_status_raw),
            },
            indent=2,
        )
    )

    start_url = _join_url(
        base,
        f"/projects/{project_id}/target-applications/{app_id}/versions/{version_id}/crawl-sessions/{session_id}/start",
    )
    status, started = _http_json("PUT", start_url, token=access_token, body={})
    print(json.dumps({"startSessionStatus": status, "startResponse": started}, indent=2))

    details_url = _join_url(
        base,
        f"/projects/{project_id}/target-applications/{app_id}/versions/{version_id}/crawl-sessions/{session_id}",
    )

    deadline = time.time() + poll_timeout

    pickup_deadline = min(deadline, time.time() + pickup_timeout)
    last = None
    while time.time() < pickup_deadline:
        _, details = _http_json("GET", details_url, token=access_token)
        status_raw = (details or {}).get("status")
        status_value = _normalize_crawl_status(status_raw)
        snapshot = {
            "status": status_value,
            "rawStatus": status_raw,
            "stateCount": (details or {}).get("stateCount"),
            "transitionCount": (details or {}).get("transitionCount"),
            "errorMessage": (details or {}).get("errorMessage"),
            "startedAt": (details or {}).get("startedAt"),
            "finishedAt": (details or {}).get("finishedAt"),
        }

        if snapshot != last:
            print(json.dumps({"crawlSession": snapshot}, indent=2))
            last = snapshot

        if status_value in {"RUNNING", "COMPLETED", "FAILED", "ABORTED", "PAUSED"}:
            break

        time.sleep(poll_interval)

    if last is None:
        raise RuntimeError("Did not receive crawl session details")

    if last.get("status") == "QUEUED":
        raise RuntimeError(
            "Crawl session is still QUEUED after pickup timeout — worker likely not consuming. "
            "Ensure the crawler consumer is running (coverit-crawler: python -m src.workers.queue_consumer) "
            "and that its REDIS_URL and DATABASE_URL point to the same services as the API."
        )

    if last.get("status") == "NEW":
        raise RuntimeError("Crawl session never entered QUEUED/RUNNING — start may not have worked")

    while time.time() < deadline:
        _, details = _http_json("GET", details_url, token=access_token)
        status_raw = (details or {}).get("status")
        status_value = _normalize_crawl_status(status_raw)
        snapshot = {
            "status": status_value,
            "rawStatus": status_raw,
            "stateCount": (details or {}).get("stateCount"),
            "transitionCount": (details or {}).get("transitionCount"),
            "errorMessage": (details or {}).get("errorMessage"),
            "startedAt": (details or {}).get("startedAt"),
            "finishedAt": (details or {}).get("finishedAt"),
        }

        if snapshot != last:
            print(json.dumps({"crawlSession": snapshot}, indent=2))
            last = snapshot

        if status_value in {"COMPLETED", "FAILED", "ABORTED", "PAUSED"}:
            break

        time.sleep(poll_interval)

    if last.get("status") == "COMPLETED":
        state_count = _as_int(last.get("stateCount")) or 0
        transition_count = _as_int(last.get("transitionCount")) or 0
        if min_states and state_count < min_states:
            raise RuntimeError(f"Crawl completed but stateCount={state_count} < {min_states}")
        if min_transitions and transition_count < min_transitions:
            raise RuntimeError(f"Crawl completed but transitionCount={transition_count} < {min_transitions}")
        if not last.get("startedAt") or not last.get("finishedAt"):
            raise RuntimeError(f"Crawl completed but timestamps missing: {last}")
        return 0

    if last.get("status") in {"FAILED", "ABORTED"}:
        return 2

    return 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
    except Exception as e:
        print(str(e), file=sys.stderr)
        raise SystemExit(1)
