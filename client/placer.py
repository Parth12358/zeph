import json
import subprocess
import time
from datetime import datetime
from tracker import record_placement


def log(message):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [placer] {message}")


def _hyprctl(args: list) -> str | None:
    try:
        result = subprocess.run(["hyprctl"] + args, capture_output=True, text=True)
        return result.stdout
    except Exception as e:
        log(f"hyprctl error: {e}")
        return None


def wait_for_window(name: str, retries: int = 5, delay: float = 0.5) -> dict | None:
    log(f"waiting for {name} window...")
    for _ in range(retries):
        out = _hyprctl(["clients", "-j"])
        if out:
            try:
                clients = json.loads(out)
                for client in clients:
                    cls = client.get("class", "")
                    title = client.get("title", "")
                    if name.lower() in cls.lower() or name.lower() in title.lower():
                        log(f"found window: {cls or title} (address: {client.get('address', '?')})")
                        return client
            except json.JSONDecodeError:
                pass
        time.sleep(delay)
    log(f"window '{name}' not found after {retries} retries")
    return None


def get_workspace_state() -> dict:
    state = {i: 0 for i in range(1, 11)}

    out = _hyprctl(["clients", "-j"])
    if out:
        try:
            clients = json.loads(out)
            for client in clients:
                ws = client.get("workspace", {}).get("id", None)
                if ws is not None and 1 <= ws <= 10:
                    state[ws] = state.get(ws, 0) + 1
        except json.JSONDecodeError:
            pass

    return state


def find_best_workspace(state: dict) -> int:
    empty = [ws for ws, count in state.items() if count == 0]
    if empty:
        return min(empty)
    # Fallback — least occupied workspace
    return min(state, key=lambda ws: state[ws])


def place_window(window: dict, workspace_id: int, current_count: int):
    address = window.get("address", "")

    log(f"moving to workspace {workspace_id}")
    _hyprctl(["dispatch", "movetoworkspace", f"{workspace_id},address:{address}"])
    time.sleep(0.2)

    if current_count == 0:
        log(f"applying layout: fullscreen (0 existing windows)")
        _hyprctl(["dispatch", "fullscreen", "1"])
    elif current_count == 1:
        log(f"applying layout: split (1 existing window)")
        _hyprctl(["dispatch", "splitratio", "0.5"])
        time.sleep(0.2)
        _hyprctl(["dispatch", "layoutmsg", "preselect right"])
    else:
        log(f"applying layout: floating centered ({current_count} existing windows)")
        _hyprctl(["dispatch", "setfloating"])
        time.sleep(0.2)
        _hyprctl(["dispatch", "resizeactive", "exact 70% 70%"])
        time.sleep(0.2)
        _hyprctl(["dispatch", "centerwindow"])

    time.sleep(0.2)
    log(f"switching to workspace {workspace_id}")
    _hyprctl(["dispatch", "workspace", str(workspace_id)])
    time.sleep(0.1)
    log("placement complete")


def smart_place(app_name: str):
    window = wait_for_window(app_name)
    if window is None:
        log(f"warning: could not find window for '{app_name}', skipping placement")
        return

    state = get_workspace_state()
    log(f"workspace state: {state}")

    workspace_id = find_best_workspace(state)
    current_count = state.get(workspace_id, 0)
    if current_count == 0:
        log(f"selected empty workspace: {workspace_id}")
    else:
        log(f"no empty workspace found, using least occupied: {workspace_id} ({current_count} windows)")

    place_window(window, workspace_id, current_count)
    record_placement(app_name, workspace_id)
