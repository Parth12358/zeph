import json
import subprocess
from datetime import datetime


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


def get_best_workspace() -> int:
    state = get_workspace_state()
    return find_best_workspace(state)
