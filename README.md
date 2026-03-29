# Zeph

Natural language network orchestrator. Tell Zeph what to do — it plans a workflow using a local LLM and dispatches commands to every machine on your network simultaneously.

```
"open up my coding setup"
  → Ollama plans: [{ target: "10.0.0.214", action: "multi", command: "helix,kitty,lazygit" }]
  → dispatched to 10.0.0.214:5000/multi
  → done
```

```
"open youtube and my studying stuff"
  → Ollama plans: [{ target: "10.0.0.214", action: "multi", command: "librewolf,helix,nano ~/Documents/notes.md" }]
  → dispatched to 10.0.0.214:5000/multi
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
- **Client agent** runs on each Arch machine. Exposes `/bash`, `/dispatch`, `/notes`, `/multi` over HTTP. Whitelisted commands only.
- **Dashboard** is a React SPA showing live device list, command log, and system stats. Served from `/` by FastAPI.
- **PWA** is a mobile shell at `/pwa` with tap-to-speak voice input via Web Speech API.

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
- `alacritty` (used to wrap TUI apps)

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
OLLAMA_MODEL=qwen3-coder:30b
PORT=8000
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

### 6. Install client apps

```bash
sudo pacman -S btop lazygit yazi zellij pgcli mpv grim alacritty
yay -S lazydocker pdfpc pairdrop
```

---

## Dashboard usage

- **Device list** — shows all discovered devices. Click a row to set a friendly name and device type.
- **Command input** — type a natural language command and press Enter. Ollama plans the workflow; the dispatcher fires it.
- **Command log** — shows each dispatched command with method, endpoint, target IP, and output.
- **SCAN button** — manually trigger a subnet sweep.

---

## PWA (mobile)

Open `http://<server-ip>:8000/pwa` on your phone and add to homescreen.

- **Tap** the mic button to start listening.
- **Tap again** to stop and send.
- Type in the text field and tap Send as an alternative.

> Voice input requires HTTPS on iOS Safari. On Android Chrome it works over HTTP on LAN.

---

## Preset workflows

The LLM understands named setups and freestyle context. Examples:

| Command | What Zeph does |
|---------|---------------|
| `set up for dev` | helix + kitty + lazygit on new workspace |
| `set up for studying` | librewolf + helix + notes on new workspace |
| `morning setup` | btop + librewolf + taskwarrior |
| `presentation mode` | pdfpc + librewolf, switch to workspace 1 |
| `hackathon mode` | helix + kitty + lazygit + git pull |
| `show me what's running` | btop + lazydocker |
| `open git` | lazygit in alacritty |
| `docker setup` | lazydocker + kitty |
| `focus mode` | helix + notes |

The LLM is not limited to these — it infers intent from any natural language description.

---

## Configuration

| File | Key | Default | Description |
|------|-----|---------|-------------|
| `server/.env` | `SUBNET_PREFIX` | `192.168.1` | First three octets of your LAN subnet |
| `server/.env` | `OLLAMA_MODEL` | `qwen3-coder:30b` | Ollama model for workflow planning |
| `server/.env` | `PORT` | `8000` | Server port |
| `server/scanner.py` | `SWEEP_SECS` | `300` | Subnet scan interval in seconds |
| `server/scanner.py` | `PING_WORKERS` | `50` | Concurrent ping workers |
| `client/whitelist.py` | `BASH_PREFIXES` | see file | Allowed bash command prefixes |
| `client/whitelist.py` | `MULTI_ALLOWED` | see file | Allowed apps for multi-app workflows |
| `client/whitelist.py` | `HYPRCTL_DISPATCH` | see file | Allowed hyprctl dispatch commands |

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/command` | Submit natural language command |
| `GET` | `/devices` | List all devices |
| `PATCH` | `/devices/{ip}` | Update friendly name / device type |
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
| `POST` | `/multi` | Open up to 4 apps on new workspace |
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

# Zeph — TODO

---

## Phase 1 — Dashboard + PWA ✅ COMPLETE

### Server (`server/`)
- [x] `main.py` — FastAPI app, all routes, WebSocket endpoints, static mounts, CORS, lifespan
- [x] `db.py` — SQLite schema (devices + logs tables), all CRUD functions, idempotent migrations
- [x] `scanner.py` — async ping sweep + ARP parsing, Linux flags, subnet via .env, 5min interval
- [x] `ollama_client.py` — `plan_workflow()` + `summarize_notes()`, device list injected at runtime, improved system prompt

### Dashboard (`dashboard/`)
- [x] `App.jsx` — layout, WebSocket connections, stats polling, prop routing
- [x] `StatusBar.jsx` — logo, online count, clock, status pill, SCAN refresh button
- [x] `DeviceList.jsx` — device rows, status badges, friendly name + device type, inline edit
- [x] `CommandLog.jsx` — conversation UI, parsed Zeph responses, summary block, CLEAR button
- [x] `CommandInput.jsx` — terminal-style input, POST to /command, feeds conversation UI
- [x] `SystemStats.jsx` — CPU/RAM/GPU bars, uptime, animated transitions
- [x] `vite.config.js` — dev proxy for API + WebSocket + /ping to port 8000
- [x] `package.json` — React 18, Vite 5

### PWA (`pwa/`)
- [x] `index.html` — mobile shell, iOS homescreen meta tags, safe-area insets, apple-touch-icon
- [x] `app.js` — tap-to-start/stop voice input, Web Speech API, POST to /command
- [x] `manifest.json` — start_url /pwa, icons array with 192x192 + 512x512
- [x] `icon.png` + `icon-192.png` — generated via Pillow

### Fixes Applied
- [x] Subnet moved to `server/.env` via python-dotenv
- [x] Scanner fixed for Linux ping flags + ARP parsing
- [x] Scanner interval changed to 5 minutes
- [x] Manual scan trigger `POST /scan` endpoint added
- [x] Device familiars — friendly name + device type, stored in SQLite
- [x] `get_named_devices()` — only dispatches to devices with friendly name set
- [x] Logs table updated — method, endpoint, details columns

---

## Phase 2 — Workflow Execution (Client Dispatcher) ✅ COMPLETE

### `server/dispatcher.py`
- [x] Async HTTP dispatcher using `aiohttp`
- [x] `dispatch_workflow()` — parallel dispatch via `asyncio.gather()`
- [x] Target resolution — IP, hostname, "all" (named devices), "server"
- [x] `action: "bash"` → POST /bash on client
- [x] `action: "hyprctl"` → POST /dispatch on client
- [x] `action: "notes"` → POST /notes on client
- [x] `action: "summarize"` → GET /notes/summarize on server
- [x] `action: "multi"` → POST /multi on client
- [x] `action: "lights"` → stub result
- [x] 10s timeout per request, broad exception handling
- [x] Log each dispatch result with method, endpoint, details

---

## Phase 3 — Client Agent (Arch + Hyprland) ✅ COMPLETE

### `client/agent.py` ✅
- [x] Flask HTTP server on port 5000
- [x] `POST /bash` — allowed bash commands, --new-window injected, xdg-open replaced, quotes stripped
- [x] `POST /dispatch` — whitelisted hyprctl dispatch commands
- [x] `POST /notes` — appends note with timestamp + machine name
- [x] `POST /multi` — opens up to 4 apps on new workspace
- [x] `GET /notes` — returns full notes.md
- [x] `GET /context` — returns usage tracking context

### `client/whitelist.py` ✅
- [x] `HYPRCTL_DISPATCH` — workspace, exec, movetoworkspace, togglefloating, fullscreen
- [x] `BASH_PREFIXES` — librewolf, xdg-open, git, cd
- [x] `MULTI_ALLOWED` — librewolf, kitty, alacritty, nano, code-oss, helix, btop, lazygit, lazydocker, yazi, zellij, pgcli, taskwarrior, mpv, pdfpc, grim, pairdrop, opencode, xdg-open

### `client/placer.py` ✅
- [x] Workspace-first logic — switches to empty workspace before launching app
- [x] `get_best_workspace()` — prefers empty, falls back to least occupied
- [x] `open_multi()` — opens up to 4 apps on same workspace, most important first
- [x] `tile_apps()` — tiling layout for 2/3/4 apps
- [x] `ALACRITTY_WRAP` set — all TUI apps wrapped in alacritty automatically

### `client/tracker.py` ✅
- [x] `usage.json` — local usage tracking
- [x] App count, last opened, workspace history
- [x] `GET /context` exposes to GX10

### `client/notes.py` ✅
- [x] `~/Documents/notes.md` — auto-created with header
- [x] `append_note()` — timestamp + machine name + separator
- [x] `read_notes()` — returns full contents

### Server notes endpoints ✅
- [x] `POST /notes/append` — pushes note to named clients
- [x] `GET /notes/collect` — pulls from all online named clients
- [x] `GET /notes/summarize` — Ollama summarizes, shown in conversation UI

### Multi-app workflows ✅
- [x] Part 7 tested end-to-end via server
- [x] 2/3/4 app combos verified
- [x] App order importance rule added to Ollama system prompt
- [x] Preset workflows: studying, dev, morning, presentation, hackathon, focus
- [x] Freestyle LLM rules — infers intent beyond explicit examples

---

## Phase 4 — OpenDrop / AirDrop File Distribution ❌ SCRAPPED

OpenDrop not viable — AWDL/pkg_resources dependency issues, too fragile for hackathon demo.

---

## Phase 5 — Voice Input on GX10 (Whisper STT)

- [ ] Build `whisper_input.py` — local Whisper STT
- [ ] Capture mic, transcribe, POST to `/command`
- [ ] Wire into `main.py` lifespan startup

---

## Phase 6 — PWA Rewrite

- [ ] Better UX — human readable responses not raw JSON
- [x] Tap-to-start/stop voice button — done

---

## Phase 7 — HTTPS / WSS (Microphone Fix)

- [ ] Generate self-signed cert
- [ ] Run uvicorn with SSL
- [ ] Add GX10 cert to iPhone trusted certs
- [ ] Update PWA manifest + fetch/WebSocket to https/wss

---

## Phase 8 — Config & Deployment

- [x] `.env` — SUBNET_PREFIX, OLLAMA_MODEL, PORT
- [ ] `startup.sh` — single boot script for GX10
- [ ] systemd service for FastAPI
- [ ] `README.md` — full setup guide

---

## Phase 9 — Demo Prep (Hackathon)

- [ ] End-to-end demo script
- [ ] Dashboard on external monitor
- [ ] iPhone PWA on homescreen
- [ ] Rehearse — target under 90 seconds

---

## Phase 10 — Win

---

## Ambiguous Bugs (Not Worth Fixing)

- [ ] Dashboard sometimes doesn't dispatch until hard refresh — stale WS after server restart. Fix: Ctrl+Shift+R.

## Known Issues / Open Gaps

- [ ] PWA response still raw JSON
- [ ] iOS voice requires HTTPS — use Android or dashboard for demo