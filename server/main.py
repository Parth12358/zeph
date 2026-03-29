import asyncio
import os
import subprocess
import time
from contextlib import asynccontextmanager


import psutil
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from db import init_db, get_all_devices, get_logs, update_device_meta
from scanner import start_scanner
from ollama_client import plan_workflow
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
