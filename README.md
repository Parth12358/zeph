# Zeph

Natural language network orchestrator. Tell Zeph what to do — it plans a workflow using a local LLM and dispatches commands to every machine on your network simultaneously.

```
"open youtube on my arch machine"
  → Ollama plans: [{ target: "10.0.0.124", action: "bash", command: "librewolf https://youtube.com" }]
  → dispatched to 10.0.0.124:5000/bash
  → done
```

---

## Architecture

```
GX10 (server)
├── server/        FastAPI + SQLite + Ollama
├── dashboard/     React dashboard (Vite, served as static)
└── pwa/           Mobile PWA with voice input

Client machines (Arch + Hyprland)
└── client/        Flask agent on port 5000
```

- **Server** runs on your main machine. Scans the subnet, manages the device registry, calls Ollama to plan workflows, and dispatches HTTP commands to clients.
- **Client agent** runs on each Arch machine. Exposes `/bash`, `/dispatch`, `/notes` over HTTP. Whitelisted commands only.
- **Dashboard** is a React SPA showing live device list, command log, and system stats. Served from `/` by FastAPI.
- **PWA** is a mobile shell at `/pwa` with voice input via Web Speech API.

---

## Requirements

**Server machine**
- Python 3.10+
- [Ollama](https://ollama.com) running locally with `qwen3-coder:30b` pulled
- `nmap` (for subnet scan, optional — ping sweep is the default)
- Node.js 18+ (to build dashboard)

**Client machines**
- Python 3.10+
- Hyprland (for `hyprctl` dispatch commands)
- `librewolf` (used for all browser opens)

---

## Installation

### 1. Clone

```bash
git clone <repo-url> zeph
cd zeph
```

### 2. Server setup

```bash
cd server
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn aiohttp python-dotenv psutil ollama
```

Create `server/.env`:

```env
SUBNET_PREFIX=10.0.0
```

Set `SUBNET_PREFIX` to the first three octets of your LAN (e.g. `192.168.1`, `10.0.0`).

Pull the LLM model:

```bash
ollama pull qwen3-coder:30b
```

### 3. Build the dashboard

```bash
cd dashboard
npm install
npm run build
```

The built files land in `dashboard/dist/` and are served automatically by FastAPI at `/`.

### 4. Run the server

```bash
cd server
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

Dashboard: `http://<server-ip>:8000`
PWA: `http://<server-ip>:8000/pwa`

### 5. Client agent setup (each Arch machine)

```bash
cd client
python -m venv venv
source venv/bin/activate
pip install flask
python agent.py
```

The agent listens on port 5000. To auto-start with Hyprland, add to `~/.config/hypr/hyprland.conf`:

```
exec-once = /path/to/client/venv/bin/python /path/to/client/agent.py
```

---

## Dashboard usage

- **Device list** — shows all discovered devices. Click a row to set a friendly name and device type.
- **CLIENT toggle** — marks a device as a Zeph client. Only `CLIENT`-flagged machines receive `"all"` dispatches. Toggle before sending any commands.
- **Command input** — type a natural language command and press Enter. Ollama plans the workflow; the dispatcher fires it.
- **Command log** — shows each dispatched command with method, endpoint, target IP, and output.
- **SCAN button** — manually trigger a subnet sweep.

---

## PWA (mobile)

Open `http://<server-ip>:8000/pwa` on your phone and add to homescreen.

- Tap the mic button to speak a command (Web Speech API).
- Type in the text field and tap Send.
- Responses show in the output area.

> Voice input requires HTTPS on iOS. See Phase 7 in the TODO for cert setup.

---

## Configuration

| File | Key | Default | Description |
|------|-----|---------|-------------|
| `server/.env` | `SUBNET_PREFIX` | `192.168.1` | First three octets of your LAN subnet |
| `server/ollama_client.py` | `MODEL` | `qwen3-coder:30b` | Ollama model for workflow planning |
| `server/scanner.py` | `SWEEP_SECS` | `300` | Subnet scan interval in seconds |
| `server/scanner.py` | `PING_WORKERS` | `50` | Concurrent ping workers |
| `client/whitelist.py` | `BASH_PREFIXES` | `librewolf`, `xdg-open` | Allowed bash command prefixes |
| `client/whitelist.py` | `HYPRCTL_DISPATCH` | see file | Allowed hyprctl dispatch commands |

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/command` | Submit natural language command |
| `GET` | `/devices` | List all devices |
| `PATCH` | `/devices/{ip}` | Update friendly name / device type |
| `PATCH` | `/devices/{ip}/zeph-client` | Toggle Zeph client flag |
| `GET` | `/logs` | Recent command logs |
| `POST` | `/scan` | Trigger manual subnet sweep |
| `GET` | `/stats` | CPU / RAM / GPU / uptime |
| `POST` | `/notes/append` | Push a note to client machines |
| `GET` | `/notes/collect` | Pull notes from all clients |
| `GET` | `/notes/summarize` | Ollama summary of collected notes |
| `WS` | `/ws/devices` | Live device list (3s interval) |
| `WS` | `/ws/logs` | Live command log (2s interval) |

**Client agent** (port 5000 on each machine):

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/bash` | Run whitelisted bash command |
| `POST` | `/dispatch` | Run whitelisted hyprctl dispatch |
| `GET` | `/notes` | Read notes.md |
| `POST` | `/notes` | Append to notes.md |
| `GET` | `/context` | Return usage tracking context |

---

## Development

Run server with hot reload:

```bash
cd server && uvicorn main:app --reload --port 8000
```

Run dashboard dev server (proxies API to port 8000):

```bash
cd dashboard && npm run dev
```

Dashboard dev server runs on `http://localhost:5173`.

---

## TODO

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for the full phase-by-phase TODO list.

---

# Zeph — TODO

---

## Phase 1 — Dashboard + PWA ✅ COMPLETE

### Server (`server/`)
- [x] `main.py` — FastAPI app, all routes, WebSocket endpoints, static mounts, CORS, lifespan
- [x] `db.py` — SQLite schema (devices + logs tables), all CRUD functions
- [x] `scanner.py` — async ping sweep + ARP parsing, Linux flags, subnet via .env, 5min interval
- [x] `ollama_client.py` — `plan_workflow()` via `qwen3-coder:30b`, structured JSON output, device list injected at runtime

### Dashboard (`dashboard/`)
- [x] `App.jsx` — layout, WebSocket connections, stats polling, prop routing
- [x] `StatusBar.jsx` — logo, online count, clock, status pill, SCAN refresh button
- [x] `DeviceList.jsx` — device rows, status badges, friendly name + device type, inline edit, is_zeph_client toggle
- [x] `CommandLog.jsx` — scrolling log, METHOD + endpoint + target + output per entry
- [x] `CommandInput.jsx` — terminal-style input, POST to /command, feedback
- [x] `SystemStats.jsx` — CPU/RAM/GPU bars, uptime, animated transitions
- [x] `vite.config.js` — dev proxy for API + WebSocket + /ping to port 8000
- [x] `package.json` — React 18, Vite 5

### PWA (`pwa/`)
- [x] `index.html` — mobile shell, iOS homescreen meta tags, safe-area insets, apple-touch-icon
- [x] `app.js` — Web Speech API voice input, text input, POST to /command, button states
- [x] `manifest.json` — start_url /pwa, icons array with 192x192 + 512x512
- [x] `icon.png` + `icon-192.png` — generated via Pillow

### Fixes Applied
- [x] Subnet moved to `server/.env` via python-dotenv
- [x] Scanner fixed for Linux ping flags + ARP parsing
- [x] Scanner interval changed to 5 minutes
- [x] Manual scan trigger `POST /scan` endpoint added
- [x] `get_logs(50)` explicit in main.py
- [x] `import os` at top of main.py
- [x] `/ping` proxy added to vite.config.js
- [x] Device familiars — friendly name + device type, stored in SQLite
- [x] `is_zeph_client` flag — only Zeph clients receive "all" dispatches
- [x] `PATCH /devices/<ip>/zeph-client` endpoint added
- [x] Logs table updated — method, endpoint, details columns added

---

## Phase 2 — Workflow Execution (Client Dispatcher) ✅ COMPLETE

### `server/dispatcher.py`
- [x] Build `dispatcher.py` — async HTTP dispatcher using `aiohttp`
- [x] Function `dispatch_workflow(workflow: list)` — iterates workflow items, fires HTTP POST to each target
- [x] Target resolution — look up IP from device registry by hostname or use IP directly
- [x] Handle `target: "all"` — dispatch to Zeph clients only (`is_zeph_client = true`)
- [x] Handle `target: "lights"` — stub result
- [x] Parallel dispatch — use `asyncio.gather()` for concurrent execution
- [x] Return results per target — `{ ip, action, command, result, error }`
- [x] Wire dispatcher into `/command` endpoint in `main.py`
- [x] Log each dispatch result with method, endpoint, details

### Fixes Applied
- [x] Broad `except Exception` fallback in `dispatch_one`
- [x] Stub result always returns `target: "lights"`
- [x] Explicit empty workflow early-return in `/command`

---

## Phase 3 — Client Agent (Arch + Hyprland) 🔄 IN PROGRESS

### `client/agent.py` ✅
- [x] Flask HTTP server on port 5000
- [x] `POST /bash` — runs allowed bash commands via subprocess
- [x] `POST /dispatch` — runs whitelisted hyprctl dispatch commands
- [x] `GET /context` — returns usage tracking context
- [x] `GET /notes` — returns full notes.md contents
- [x] `POST /notes` — appends note with timestamp + machine name
- [x] All requests logged to stdout with timestamp
- [x] `--new-window` injected for librewolf automatically
- [x] `xdg-open` replaced with `librewolf --new-window`
- [x] Quotes stripped from URL args

### `client/whitelist.py` ✅
- [x] `HYPRCTL_DISPATCH` — workspace, exec, movetoworkspace, togglefloating, fullscreen
- [x] `BASH_PREFIXES` — librewolf, xdg-open

### `client/placer.py` ✅
- [x] Workspace-first logic — switches to empty workspace before launching app
- [x] `get_workspace_state()` — tracks windows per workspace 1-10
- [x] `find_best_workspace()` — prefers empty, falls back to least occupied
- [x] `get_best_workspace()` — main entry point

### `client/tracker.py` ✅
- [x] `usage.json` — local usage tracking file
- [x] Tracks app open count, last opened, workspace history
- [x] `recent_workspaces` — last 10 workspaces used
- [x] `GET /context` exposes context to GX10

### `client/notes.py` ✅
- [x] `~/Documents/notes.md` — auto-created with header
- [x] `append_note()` — timestamp + machine name + `---` separator
- [x] `read_notes()` — returns full file contents

### Server notes endpoints ✅
- [x] `POST /notes/append` — pushes note to all/specific clients
- [x] `GET /notes/collect` — pulls notes from all online clients
- [x] `GET /notes/summarize` — Ollama summarizes collected notes
- [x] `summarize_notes()` added to `ollama_client.py`

### Ollama improvements ✅
- [x] System prompt updated — no quotes around URLs, always use librewolf
- [x] Device list injected into Ollama context at runtime
- [x] Ollama uses exact IPs from device registry

### Still TODO in Phase 3
- [ ] Part 7 — Multi-app workflows (open nano + browser simultaneously on new workspace)
- [ ] Deploy client agent to second Arch machine
- [ ] Auto-start via Hyprland `exec-once` (optional)

---

## Phase 4 — OpenDrop / AirDrop File Distribution

- [ ] Add `POST /airdrop` endpoint to `main.py`
- [ ] Accepts `{ "file": "<path>", "target": "<ip or hostname>" }`
- [ ] Calls OpenDrop CLI via subprocess: `opendrop send -f <file> -r <target>`
- [ ] Wire `action: "airdrop"` in dispatcher
- [ ] Handle OpenDrop not installed — return clear error
- [ ] Test file send to iPhone (native AirDrop receive)

---

## Phase 5 — Voice Input on GX10 (Whisper STT)

- [ ] Build `whisper_input.py` — local Whisper STT using `openai-whisper`
- [ ] Capture mic input via `sounddevice` or `pyaudio`
- [ ] Transcribe with Whisper `base` or `small` model
- [ ] On transcription complete → POST to `/command` internally
- [ ] Wire into `main.py` lifespan startup alongside scanner

---

## Phase 6 — PWA Rewrite

- [ ] Rewrite PWA for better UX
- [ ] Format response display — human readable not raw JSON
- [ ] Better voice button UX
- [ ] HTTPS/WSS for iPhone mic support

---

## Phase 7 — HTTPS / WSS (Microphone Fix)

- [ ] Generate self-signed cert
- [ ] Run uvicorn with SSL
- [ ] Add GX10 cert to iPhone trusted certs
- [ ] Update PWA manifest + fetch/WebSocket calls to https/wss

---

## Phase 8 — Config & Deployment

- [ ] Move remaining hardcoded values to `.env` — OLLAMA_MODEL, PORT, ZEPH_API_KEY
- [ ] `startup.sh` — single script to launch everything on GX10 boot
- [ ] systemd service for FastAPI server on GX10
- [ ] Deploy client agent to second Arch machine
- [ ] Add `dashboard/dist` to `.gitignore` to avoid git pull conflicts

---

## Phase 9 — Demo Prep (Hackathon)

- [ ] End-to-end demo script — one voice command triggers multi-machine workflow
- [ ] At least 2 client machines running the agent
- [ ] At least 1 physical action (lights)
- [ ] Dashboard on external monitor showing live command log + device list
- [ ] iPhone PWA on homescreen, voice working over HTTPS
- [ ] Rehearse demo flow — target under 90 seconds start to finish

---

## Known Issues / Open Gaps

- [ ] WebSocket proxy in prod — confirm built dashboard WS connects through FastAPI
- [ ] No retry logic in dispatcher — if client is down, request just fails
- [ ] PWA response display shows raw JSON — Phase 6 will fix
- [ ] Second Arch machine not yet deployed
- [ ] `dashboard/dist` conflicts on git pull — add to .gitignore

---

## Phase 10 — Win
