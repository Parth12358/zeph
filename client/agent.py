import subprocess
import time
from datetime import datetime
from flask import Flask, request, jsonify
from placer import get_best_workspace
from whitelist import HYPRCTL_DISPATCH, BASH_PREFIXES
from tracker import record_open, record_placement, get_context
from notes import append_note, read_notes, get_machine_name

app = Flask(__name__)


def log(message):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")


@app.route("/bash", methods=["POST"])
def bash():
    data = request.get_json(silent=True)
    if not data or "command" not in data:
        log("Error: invalid request")
        return jsonify({"status": "error", "error": "invalid request"}), 400

    command = data["command"]
    log(f"Received: {command}")

    if not any(command.strip().startswith(prefix) for prefix in BASH_PREFIXES):
        log("Status: error (command not allowed)")
        return jsonify({"status": "error", "error": "command not allowed"}), 403

    args = command.strip().split()
    if args[0] == "librewolf" and "--new-window" not in args:
        args.insert(1, "--new-window")
    if args[0] == "xdg-open":
        args = ["librewolf", "--new-window"] + args[1:]
    args = [arg.strip("'\"") for arg in args]

    workspace_id = get_best_workspace()
    log(f"[placer] selected workspace: {workspace_id}")
    subprocess.run(["hyprctl", "dispatch", "workspace", str(workspace_id)], capture_output=True, text=True)
    log(f"[placer] switching to workspace {workspace_id}")
    time.sleep(0.3)

    log(f"Executing: {args}")

    try:
        subprocess.Popen(args)
        app_name = args[0]
        record_open(app_name)
        record_placement(app_name, workspace_id)
        log("Status: ok")
        return jsonify({"status": "ok", "output": f"opened {app_name}"})
    except Exception as e:
        log(f"Status: error ({e})")
        return jsonify({"status": "error", "error": str(e)})


@app.route("/dispatch", methods=["POST"])
def dispatch():
    data = request.get_json(silent=True)
    if not data or "command" not in data:
        log("[dispatch] Error: invalid request")
        return jsonify({"status": "error", "error": "invalid request"}), 400

    command = data["command"].strip()
    log(f"[dispatch] Received: {command}")

    subcommand = command.split()[0] if command else ""
    if subcommand not in HYPRCTL_DISPATCH:
        log(f"[dispatch] Status: error (command not allowed)")
        return jsonify({"status": "error", "error": "command not allowed"}), 403

    args = ["hyprctl", "dispatch"] + command.split()
    log(f"[dispatch] Executing: {' '.join(args)}")

    try:
        result = subprocess.run(args, capture_output=True, text=True)
        if result.returncode != 0:
            error = result.stderr.strip() or f"exit code {result.returncode}"
            log(f"[dispatch] Status: error ({error})")
            return jsonify({"status": "error", "error": error})
        cmd_parts = command.split()
        if subcommand == "exec" and len(cmd_parts) > 1:
            record_open(cmd_parts[1])
        log("[dispatch] Status: ok")
        return jsonify({"status": "ok", "output": result.stdout.strip()})
    except Exception as e:
        log(f"[dispatch] Status: error ({e})")
        return jsonify({"status": "error", "error": str(e)})


@app.route("/context", methods=["GET"])
def context():
    return jsonify(get_context())


@app.route("/notes", methods=["GET"])
def notes_get():
    return jsonify({"status": "ok", "notes": read_notes()})


@app.route("/notes", methods=["POST"])
def notes_post():
    data = request.get_json(silent=True)
    if not data or "text" not in data:
        log("[notes] Error: invalid request")
        return jsonify({"status": "error", "error": "invalid request"}), 400
    append_note(data["text"], get_machine_name())
    log("[notes] appended note from server")
    return jsonify({"status": "ok", "message": "note appended"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
