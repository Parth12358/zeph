import subprocess
import threading
from datetime import datetime
from flask import Flask, request, jsonify
from placer import smart_place

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

    if not command.strip().startswith(("librewolf", "xdg-open")):
        log("Status: error (command not allowed)")
        return jsonify({"status": "error", "error": "command not allowed"}), 403

    args = command.strip().split()
    log(f"Executing: {args}")

    try:
        subprocess.Popen(args)
        threading.Thread(target=smart_place, args=("librewolf",), daemon=True).start()
        log("Status: ok")
        return jsonify({"status": "ok", "output": "opened librewolf"})
    except Exception as e:
        log(f"Status: error ({e})")
        return jsonify({"status": "error", "error": str(e)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
