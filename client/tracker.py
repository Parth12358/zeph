import json
import os
import threading
from datetime import datetime

_USAGE_FILE = os.path.join(os.path.dirname(__file__), "usage.json")
_lock = threading.Lock()

_EMPTY = {"apps": {}, "recent_workspaces": [], "last_updated": None}


def _log(message):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [tracker] {message}")


def load() -> dict:
    try:
        with open(_USAGE_FILE, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"apps": {}, "recent_workspaces": [], "last_updated": None}


def save(data: dict):
    with open(_USAGE_FILE, "w") as f:
        json.dump(data, f, indent=2)


def record_open(app_name: str):
    with _lock:
        data = load()
        apps = data.setdefault("apps", {})
        entry = apps.setdefault(app_name, {"count": 0, "last_opened": None, "workspaces": {}, "last_workspace": None})
        entry["count"] += 1
        entry["last_opened"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        save(data)
        _log(f"recorded: {app_name} opened (count: {entry['count']})")


def record_placement(app_name: str, workspace_id: int):
    with _lock:
        data = load()
        apps = data.setdefault("apps", {})
        entry = apps.setdefault(app_name, {"count": 0, "last_opened": None, "workspaces": {}, "last_workspace": None})
        ws_key = str(workspace_id)
        entry["workspaces"][ws_key] = entry["workspaces"].get(ws_key, 0) + 1
        entry["last_workspace"] = workspace_id
        recent = data.setdefault("recent_workspaces", [])
        recent.insert(0, workspace_id)
        data["recent_workspaces"] = recent[:10]
        data["last_updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        save(data)
        _log(f"recorded: {app_name} → workspace {workspace_id}")


def get_context() -> dict:
    data = load()
    apps = data.get("apps", {})
    sorted_apps = sorted(apps.items(), key=lambda x: x[1].get("count", 0), reverse=True)
    top5 = sorted_apps[:5]
    return {
        "most_used_apps": [name for name, _ in top5],
        "recent_workspaces": data.get("recent_workspaces", []),
        "app_details": {
            name: {
                "count": info.get("count", 0),
                "last_workspace": info.get("last_workspace"),
                "last_opened": info.get("last_opened"),
            }
            for name, info in top5
        },
    }
