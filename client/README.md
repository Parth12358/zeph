# Zeph Client Agent

A lightweight Flask server that runs on each Arch Linux machine and executes Librewolf commands sent by the Zeph GX10 dispatcher.

## Prerequisites

- Python 3
- Flask: `pip install flask`
- Librewolf installed and available in `PATH`

## How to Run

```bash
python3 agent.py
```

The server starts on port 5000 and listens for commands from the GX10.

## What It Does

Listens on `0.0.0.0:5000` for `POST /bash` requests. Accepts only `librewolf` commands — opens the specified URL in Librewolf and returns immediately (non-blocking).

Example request:
```json
{ "command": "librewolf https://github.com" }
```

Example response:
```json
{ "status": "ok", "output": "opened librewolf" }
```

All received commands are logged to stdout with a timestamp.

## How to Stop

Press `Ctrl+C` in the terminal where `agent.py` is running.

## Notes

- This machine must be on the same LAN as the GX10.
- The GX10 must have this machine's IP address in its device registry.
- Only `librewolf` commands are accepted — all other commands are rejected with HTTP 403.
