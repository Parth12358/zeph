import os
import socket
from datetime import datetime

NOTES_PATH = os.path.expanduser("~/Documents/notes.md")


def ensure_notes_file():
    os.makedirs(os.path.dirname(NOTES_PATH), exist_ok=True)
    if not os.path.exists(NOTES_PATH):
        with open(NOTES_PATH, "w") as f:
            f.write("# Zeph Notes\n---\n")


def append_note(text: str, machine_name: str):
    ensure_notes_file()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"\n## [{timestamp}] — {machine_name}\n{text}\n\n---\n"
    with open(NOTES_PATH, "a") as f:
        f.write(entry)


def read_notes() -> str:
    try:
        with open(NOTES_PATH, "r") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def get_machine_name() -> str:
    return socket.gethostname()
