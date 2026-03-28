# Zeph — Implementation Reference

Zeph is an enterprise voice assistant that runs on an ASUS GX10 and controls machines on a local network. Natural language commands are spoken or typed, converted into structured workflows by a local LLM, and dispatched to network devices.

---

## Architecture Overview

```
iPhone (PWA)          →  POST /command
Browser (Dashboard)   →  WebSocket /ws/devices, /ws/logs + poll /stats
                               ↓
                      FastAPI server (port 8000)
                               ↓
              ┌────────────────┼──────────────────┐
           SQLite DB      Ollama LLM          Network Scanner
           (zeph.db)   (qwen3-coder:30b)    (ping + arp sweep)
```

---

## File Structure

```
zeph/
├── server/
│   ├── main.py            — FastAPI app, all routes, WebSocket endpoints, static mounts
│   ├── db.py              — SQLite schema + all database functions
│   ├── scanner.py         — Async network scanner (ping sweep + ARP parsing)
│   ├── ollama_client.py   — Local LLM workflow planner via Ollama
│   └── zeph.db            — SQLite database (auto-created on first run)
├── dashboard/
│   ├── index.html         — Vite entry, Google Fonts, global CSS reset + @keyframes
│   ├── vite.config.js     — Vite + dev proxy for all API routes and WebSockets
│   ├── package.json       — React 18, Vite 5, @vitejs/plugin-react
│   └── src/
│       ├── main.jsx       — React root render
│       ├── App.jsx        — Layout, WebSocket connections, stats polling, prop routing
│       └── components/
│           ├── StatusBar.jsx    — Top bar: logo, subtitle, online count, clock, status pill
│           ├── DeviceList.jsx   — Left panel: scrollable device list with status badges
│           ├── CommandLog.jsx   — Center panel: scrollable command history, newest first
│           ├── CommandInput.jsx — Center bottom: text input + POST to /command
│           └── SystemStats.jsx  — Right panel: CPU/RAM/GPU bars + uptime
└── pwa/
    ├── index.html         — Mobile PWA shell, iOS homescreen meta tags
    ├── app.js             — Voice (Web Speech API) + text input, POST to /command
    └── manifest.json      — PWA manifest for Add to Home Screen
```

---

## Server (`server/`)

### `main.py` — FastAPI Application

**Startup lifecycle:** Uses `@asynccontextmanager` lifespan to call `init_db()` and launch the network scanner as a background asyncio task on startup.

**Middleware:** CORS is enabled with `allow_origins=["*"]` so the React dev server (port 5173) can reach the API (port 8000).

**REST endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ping` | Health check — returns `{"status": "ok"}` |
| GET | `/stats` | Live system stats via `psutil` — CPU %, RAM %, GPU % (nvidia-smi), uptime in seconds |
| GET | `/devices` | All devices from SQLite as a list of dicts |
| GET | `/logs` | Last 50 command log entries from SQLite, newest first |
| POST | `/command` | Accepts `{"command": "<text>"}`, runs LLM workflow planner, logs result, returns plan |

**WebSocket endpoints:**

| Path | Pushes | Interval |
|------|--------|----------|
| `/ws/devices` | Full device list as JSON array | every 3 seconds |
| `/ws/logs` | Last 50 log entries as JSON array | every 2 seconds |

Both WebSocket handlers reconnect automatically on the client side (3-second retry loop in `App.jsx`).

**Static file mounts (registered last, in order):**

- `GET /pwa/*` → serves `../pwa/` directory (`html=True` for SPA routing)
- `GET /pwa` → explicit redirect to `/pwa/` (Starlette StaticFiles requires trailing slash)
- `GET /*` → serves `../dashboard/dist/` if the directory exists (conditional — server starts cleanly without a build)

**GPU stat:** Calls `nvidia-smi` via subprocess with a 3-second timeout. Falls back to `0` if not available.

---

### `db.py` — SQLite Database

Database file: `server/zeph.db` (relative to working directory, created on `init_db()`).

**Schema:**

```sql
CREATE TABLE devices (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    hostname  TEXT,
    ip        TEXT UNIQUE,
    mac       TEXT,
    status    TEXT DEFAULT 'offline',
    last_seen TEXT
);

CREATE TABLE logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    command   TEXT,
    target    TEXT,
    result    TEXT
);
```

**Functions:**

| Function | Description |
|----------|-------------|
| `init_db()` | Creates both tables if they don't exist |
| `upsert_device(hostname, ip, mac, status, last_seen)` | Insert or update on `ip` conflict — updates all fields except ip |
| `get_all_devices()` | Returns all device rows as list of dicts |
| `mark_offline_except(ips: list)` | Sets `status='offline'` for all IPs not in the given list — called after each scan sweep |
| `insert_log(timestamp, command, target, result)` | Appends a command log entry |
| `get_logs(limit=50)` | Returns most recent N entries, newest first (ORDER BY id DESC) |

---

### `scanner.py` — Network Scanner

Does not require nmap. Uses only Python stdlib + Windows built-ins.

**Subnet:** `192.168.1.0/24` (pings `.1` through `.254`). Configurable via `SUBNET_PREFIX` constant.

**Sweep cycle:** Every 30 seconds (`SWEEP_SECS`).

**How it works:**

1. Fans out 254 async pings using `asyncio.create_subprocess_exec("ping", "-n", "1", "-w", "300", ip)` — capped at 50 concurrent pings via a semaphore.
2. Collects all IPs that returned exit code 0 (alive).
3. Parses `arp -a` output via subprocess to get MAC addresses from the refreshed ARP cache.
4. Attempts reverse DNS resolution via `socket.gethostbyaddr()` for each alive IP; falls back to the IP string.
5. Calls `upsert_device()` for each alive host.
6. Calls `mark_offline_except(alive_ips)` to flip all other known devices to offline.

**Performance:** A full /24 sweep completes in approximately 6 seconds at 300ms ping timeout with 50-way concurrency.

---

### `ollama_client.py` — LLM Workflow Planner

**Model:** `qwen3-coder:30b` (local via Ollama)

**System prompt:** Instructs the model to return only a raw JSON object (no markdown, no explanation) with a `workflow` array. Each workflow item has:
- `target` — IP address, `"all"`, or `"lights"`
- `action` — one of `"bash"`, `"hyprctl"`, `"airdrop"`, `"gpio"`
- `command` — the string to execute

**`plan_workflow(command: str) -> dict`:**
- Calls `ollama.chat()` synchronously (run via `asyncio.to_thread` in the route handler)
- Parses the response as JSON
- Returns `{"workflow": [], "error": "parse failed"}` on JSON decode error
- Returns `{"workflow": [], "error": "<message>"}` on any other exception

**Example output:**
```json
{
  "workflow": [
    { "target": "192.168.1.10", "action": "bash", "command": "git pull origin main" }
  ]
}
```

---

## React Dashboard (`dashboard/`)

### Data Flow

`App.jsx` manages all data fetching and passes data down as props:

- **Devices** — WebSocket `/ws/devices`, auto-reconnects every 3s on disconnect
- **Logs** — WebSocket `/ws/logs`, auto-reconnects every 3s on disconnect
- **Stats** — HTTP poll to `/stats` every 5 seconds (`STATS_POLL_MS = 5000`)

The Vite dev server proxies all API routes and WebSocket connections to `localhost:8000`, so no CORS issues during development.

### Layout

Three-column CSS grid (set in `App.jsx`):

```
┌─────────────────┬──────────────────────────────┬──────────────┐
│  StatusBar (full width, height: 48px)                          │
├─────────────────┼──────────────────────────────┼──────────────┤
│  DeviceList     │  CommandLog                  │ SystemStats  │
│  (280px)        │  (flex: 1)                   │ (260px)      │
│                 ├──────────────────────────────┤              │
│                 │  CommandInput (pinned bottom) │              │
└─────────────────┴──────────────────────────────┴──────────────┘
```

Column gaps are 1px lines rendered as `background: #1a2230` on the grid container.

### Components

**`StatusBar.jsx`**
- Left: `ZEPH` logo (Syne 800, accent color, cyan glow text-shadow) + `// enterprise voice orchestrator` subtitle
- Center: animated pulse dot + online device count (green pill)
- Right: `ONLINE` system status pill + live clock (updates every 1s via `setInterval`)

**`DeviceList.jsx`**
- Header shows `DEVICES` label + total count badge
- Each row: hostname (accent color), IP (muted), ONLINE/OFFLINE pill badge, last seen timestamp
- Scrollable list, empty state: `no devices discovered`
- Status badges: green border/text for online, red for offline

**`SystemStats.jsx`**
- Header: `SYSTEM`
- Three stat rows: CPU, RAM, GPU — each with label, large Syne numeric value, and 3px progress bar
- Bars fill with `#00d4ff` (accent), turn `#ff3d5a` (red) at ≥ 90%
- Bars use `transition: width 0.4s ease` for smooth animation
- Uptime row: formats seconds as `Xh Xm`

**`CommandLog.jsx`**
- Header: `COMMAND LOG` + entry count
- Entries displayed newest-first (`[...logs].reverse()`)
- Each row: timestamp (muted), target device (muted), OK/ERR badge (green/red), command text (accent color)
- Scrollable, empty state: `no commands yet`

**`CommandInput.jsx`**
- Terminal-style input: `>` prompt, transparent input field, accent caret
- Send button with accent background (`#00d4ff`)
- Submits on Enter key or button click
- Clears input immediately on send
- Shows inline feedback for 3 seconds: green on success, red on error
- Refocuses input after send

### Fonts & Styles

- **JetBrains Mono** (wght 300/400/500/700) — all body text, data, inputs, code
- **Syne** (wght 400/700/800) — logo, stat values
- `@keyframes pulse` defined in `index.html` global styles — used by the animated dot in StatusBar
- Custom scrollbar: 4px wide, transparent track, `#1a2230` thumb

---

## iPhone PWA (`pwa/`)

### `index.html`

iOS homescreen PWA setup:
- `apple-mobile-web-app-capable: yes` — launches fullscreen with no Safari chrome
- `apple-mobile-web-app-status-bar-style: black-translucent` — status bar overlaps content
- `apple-mobile-web-app-title: Zeph` — homescreen icon label
- Links to `manifest.json`
- Dark background (`#080b0f`), full screen, monospace font, safe-area insets for notch

UI:
- Large circular voice button (hold to speak, release to send)
- Text input + send button
- Response display area

### `app.js`

**Voice input:**
- Uses `window.SpeechRecognition || window.webkitSpeechRecognition`
- `mousedown` / `touchstart` on voice button → `recognition.start()`
- `mouseup` / `touchend` → `recognition.stop()`
- On result → populates text input with transcript, auto-sends
- If Speech API unavailable → button is dimmed, non-functional

**Voice button states:**
- Idle: default border/background
- Listening: blue border, blue tinted background, CSS ripple pulse animation
- Sent: green border/background, reverts to idle after 1 second

**Text input:**
- Send on button click or Enter key
- Input cleared before send

**POST to `/command`:**
```javascript
fetch('/command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ command: text })
})
```
- Response JSON displayed in the response area
- Errors displayed in red

### `manifest.json`

```json
{
  "name": "Zeph",
  "short_name": "Zeph",
  "start_url": "/pwa",
  "display": "standalone",
  "background_color": "#080b0f",
  "theme_color": "#080b0f",
  "icons": []
}
```

---

## Running Locally

**Server:**
```bash
cd server
source venv/bin/activate      # Windows: venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Dashboard (dev):**
```bash
cd dashboard
npm install
npm run dev                   # runs on http://localhost:5173
```

**Dashboard (production build):**
```bash
cd dashboard
npm run build                 # outputs to dashboard/dist/
# FastAPI then serves it at http://<host>:8000/
```

**PWA:** Accessible at `http://<GX10-IP>:8000/pwa/` — save to iPhone homescreen via Safari → Share → Add to Home Screen.

**Ollama model:**
```bash
ollama pull qwen3-coder:30b
```

---

## What Is Not Yet Implemented

- **Workflow execution** — `/command` plans workflows via LLM but does not dispatch them to target machines (no SSH, no WinRM, no GPIO)
- **Authentication** — all endpoints are open; no API keys, no login
- **HTTPS / WSS** — server runs plain HTTP; Safari on LAN will show HTTPS warnings when trying to use the microphone on the PWA
- **PWA icons** — `manifest.json` has an empty `icons` array; no homescreen icon image
- **WebSocket proxy in prod** — the Vite proxy config handles WS dev-only; the built dashboard connects directly to `window.location.host`, which works when served from FastAPI but not from a separate domain
- **Subnet configuration** — `SUBNET_PREFIX` in `scanner.py` is hardcoded to `192.168.1`
