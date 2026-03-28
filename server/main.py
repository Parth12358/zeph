from fastapi import FastAPI
from db import init_db, get_all_devices

app = FastAPI()

@app.on_event("startup")
def startup():
    init_db()

@app.get("/ping")
def ping():
    return {"status": "ok"}

@app.get("/stats")
def stats():
    return {"cpu": 0, "ram": 0, "gpu": 0, "uptime": 0}

@app.get("/devices")
def devices():
    return {"devices": get_all_devices()}

@app.get("/logs")
def logs():
    return {"logs": []}

@app.post("/command")
def command(body: dict):
    return {"received": body.get("command"), "status": "ok"}
