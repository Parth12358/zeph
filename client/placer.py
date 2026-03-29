import json
import subprocess
from datetime import datetime

ALACRITTY_WRAP = {
    "nano", "btop", "lazygit", "lazydocker", "yazi",
    "zellij", "pgcli", "taskwarrior", "helix", "opencode"
}


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


get_best_workspace_multi = get_best_workspace


def tile_apps(count: int):
    import time
    if count == 2:
        subprocess.run(["hyprctl", "dispatch", "splitratio", "0.5"], capture_output=True, text=True)
    elif count == 3:
        time.sleep(0.3)
        subprocess.run(["hyprctl", "dispatch", "layoutmsg", "orientationtop"], capture_output=True, text=True)
    elif count >= 4:
        subprocess.run(["hyprctl", "dispatch", "splitratio", "0.5"], capture_output=True, text=True)
        time.sleep(0.3)
        subprocess.run(["hyprctl", "dispatch", "splitratio", "0.5"], capture_output=True, text=True)


def open_multi(apps: list):
    import time
    from tracker import record_open, record_placement

    apps = apps[:4]

    workspace_id = get_best_workspace()

    subprocess.run(["hyprctl", "dispatch", "workspace", str(workspace_id)], capture_output=True, text=True)
    time.sleep(0.3)

    for app in apps:
        args = app.strip().split()
        if args[0] == "librewolf" and "--new-window" not in args:
            args.insert(1, "--new-window")
        if args[0] in ALACRITTY_WRAP:
            args = ["alacritty", "-e"] + args
        subprocess.Popen(args)
        time.sleep(0.5)

    time.sleep(0.5)
    tile_apps(len(apps))

    for app in apps:
        app_name = app.strip().split()[0]
        record_open(app_name)
        record_placement(app_name, workspace_id)

    log(f"[multi] opened {len(apps)} apps on workspace {workspace_id}")
