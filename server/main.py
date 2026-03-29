import asyncio
import os
import subprocess
import time
from contextlib import asynccontextmanager

import aiohttp


import psutil
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from db import init_db, get_all_devices, get_logs, update_device_meta
from scanner import start_scanner
from ollama_client import plan_workflow, summarize_notes
from dispatcher import dispatch_workflow


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    asyncio.create_task(start_scanner())
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST ─────────────────────────────────────────────────────────────────────

@app.get("/ping")
def ping():
    return {"status": "ok"}

@app.get("/stats")
def stats():
    cpu    = psutil.cpu_percent(interval=1)
    ram    = psutil.virtual_memory().percent
    uptime = int(time.time() - psutil.boot_time())
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=utilization.gpu", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=3,
        )
        gpu = int(result.stdout.strip())
    except Exception:
        gpu = 0
    return {"cpu": cpu, "ram": ram, "gpu": gpu, "uptime": uptime}

@app.get("/devices")
def devices():
    return {"devices": get_all_devices()}

@app.get("/logs")
def logs():
    return {"logs": get_logs(50)}

@app.patch("/devices/{ip:path}")
async def update_device(ip: str, body: dict):
    friendly_name = body.get("friendly_name")
    device_type = body.get("device_type")
    if friendly_name is None and device_type is None:
        return {"status": "error", "error": "invalid request"}, 400
    update_device_meta(ip, friendly_name, device_type)
    return {"status": "ok"}

@app.post("/notes/append")
async def notes_append(body: dict):
    text = body.get("text")
    targets = body.get("targets", ["all"])
    if not text:
        return {"status": "error", "error": "invalid request"}

    devices = get_all_devices()
    if "all" in targets:
        ips = [d["ip"] for d in devices if d["status"] == "online"]
    else:
        ips = [d["ip"] for d in devices if d["ip"] in targets or d["hostname"] in targets]

    timeout = aiohttp.ClientTimeout(total=10)
    results = []

    async def post_note(session, ip):
        try:
            async with session.post(f"http://{ip}:5000/notes", json={"text": text}, timeout=timeout) as resp:
                await resp.text()
                return {"target": ip, "status": "ok"}
        except asyncio.TimeoutError:
            return {"target": ip, "status": "error", "error": "timeout"}
        except Exception as e:
            return {"target": ip, "status": "error", "error": str(e)}

    async with aiohttp.ClientSession() as session:
        results = await asyncio.gather(*(post_note(session, ip) for ip in ips))

    return {"status": "ok", "results": list(results)}


@app.get("/notes/collect")
async def notes_collect():
    devices = get_all_devices()
    online = [d["ip"] for d in devices if d["status"] == "online"]
    timeout = aiohttp.ClientTimeout(total=10)
    notes = {}

    async def fetch_notes(session, ip):
        try:
            async with session.get(f"http://{ip}:5000/notes", timeout=timeout) as resp:
                data = await resp.json()
                return ip, data.get("notes", "")
        except Exception:
            return ip, ""

    async with aiohttp.ClientSession() as session:
        results = await asyncio.gather(*(fetch_notes(session, ip) for ip in online))

    for ip, content in results:
        notes[ip] = content

    return {"status": "ok", "notes": notes}


@app.get("/notes/summarize")
async def notes_summarize():
    collected = await notes_collect()
    all_notes = "\n\n".join(
        f"=== {ip} ===\n{content}"
        for ip, content in collected["notes"].items()
        if content
    )
    summary = await asyncio.to_thread(summarize_notes, all_notes)
    return {"status": "ok", "summary": summary}


@app.post("/command")
async def command(body: dict):
    cmd  = body.get("command", "")
    plan = await asyncio.to_thread(plan_workflow, cmd)

    if "error" in plan and not plan.get("workflow"):
        return {"received": cmd, "plan": plan, "results": [], "status": "error"}

    if not plan.get("workflow"):
        return {"received": cmd, "plan": plan, "results": [], "status": "ok"}

    results = await dispatch_workflow(plan.get("workflow", []))
    return {"received": cmd, "plan": plan, "results": results, "status": "ok"}

# ── WebSockets ────────────────────────────────────────────────────────────────

@app.websocket("/ws/devices")
async def ws_devices(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(get_all_devices())
            await asyncio.sleep(3)
    except (WebSocketDisconnect, Exception):
        pass

@app.websocket("/ws/logs")
async def ws_logs(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(get_logs(50))
            await asyncio.sleep(2)
    except (WebSocketDisconnect, Exception):
        pass

# ── Static mounts (must be last) ─────────────────────────────────────────────

@app.get("/pwa")
def pwa_redirect():
    return RedirectResponse(url="/pwa/")

app.mount("/pwa", StaticFiles(directory="../pwa", html=True), name="pwa")

if os.path.isdir("../dashboard/dist"):
    app.mount("/", StaticFiles(directory="../dashboard/dist", html=True), name="dashboard")
