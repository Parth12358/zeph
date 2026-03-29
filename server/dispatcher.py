import aiohttp
import asyncio
import logging
from datetime import datetime
from db import get_all_devices, insert_log

logger = logging.getLogger(__name__)


async def resolve_targets(target: str, action: str, command: str) -> list:
    # Raw IP address
    if target and target[0].isdigit():
        return [target]

    # Broadcast to all Zeph client machines
    if target == "all":
        from db import get_zeph_clients
        clients = get_zeph_clients()
        return [d["ip"] for d in clients]

    # Lights / GPIO stub
    if target == "lights" or action == "gpio":
        return ["lights"]

    # Hostname lookup
    devices = get_all_devices()
    for d in devices:
        if d["hostname"] == target:
            return [d["ip"]]

    logger.warning("resolve_targets: no match for target=%r action=%r", target, action)
    return []


async def dispatch_one(
    session: aiohttp.ClientSession, ip: str, action: str, command: str
) -> dict:
    # Stubs — no HTTP, force target to "lights"
    if action in ("gpio", "lights") or ip == "lights":
        return {"target": "lights", "action": action, "command": command, "status": "stub", "output": "gpio not yet implemented", "error": None}

    action_map = {
        "bash":     (f"http://{ip}:5000/bash",     {"command": command}),
        "hyprctl":  (f"http://{ip}:5000/dispatch",  {"command": command}),
        "airdrop":  (f"http://{ip}:5000/airdrop",   {"file": command}),
        "notes":    (f"http://{ip}:5000/notes",     {"text": command}),
    }

    if action not in action_map:
        return {
            "target": ip, "action": action, "command": command,
            "status": "error", "output": None,
            "error": f"unknown action: {action}",
        }

    url, payload = action_map[action]
    timeout = aiohttp.ClientTimeout(total=10)

    try:
        async with session.post(url, json=payload, timeout=timeout) as resp:
            output = await resp.text()
            return {
                "target": ip, "action": action, "command": command,
                "status": "ok", "output": output, "error": None,
            }
    except asyncio.TimeoutError:
        return {
            "target": ip, "action": action, "command": command,
            "status": "error", "output": None, "error": "timeout",
        }
    except aiohttp.ClientError as exc:
        return {
            "target": ip, "action": action, "command": command,
            "status": "error", "output": None, "error": str(exc),
        }
    except Exception as exc:
        return {
            "target": ip, "action": action, "command": command,
            "status": "error", "output": None, "error": f"unexpected: {str(exc)}",
        }


async def dispatch_workflow(workflow: list) -> list:
    if not workflow:
        return []

    # Build flat list of (ip, action, command) tuples
    tasks = []
    for item in workflow:
        action = item.get("action", "")
        command = item.get("command", "")
        target = item.get("target", "")
        ips = await resolve_targets(target, action, command)
        for ip in ips:
            tasks.append((ip, action, command))

    async with aiohttp.ClientSession() as session:
        results = await asyncio.gather(
            *(dispatch_one(session, ip, action, command) for ip, action, command in tasks)
        )

    now = datetime.now().strftime("%H:%M:%S")
    endpoint_map = {"bash": "/bash", "hyprctl": "/dispatch", "airdrop": "/airdrop", "gpio": "/gpio", "notes": "/notes"}
    for r in results:
        endpoint = endpoint_map.get(r["action"], "/dispatch")
        details = r.get("output") or r.get("error") or ""
        insert_log(now, r["command"], r["target"], r["status"], method="POST", endpoint=endpoint, details=details)

    return list(results)
