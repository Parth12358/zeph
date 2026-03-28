import asyncio
import os
import re
import socket
import subprocess
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

from db import upsert_device, mark_offline_except

SUBNET_PREFIX = os.getenv("SUBNET_PREFIX", "192.168.1")
SWEEP_SECS    = 30
PING_TIMEOUT  = 300           # ms per ping
PING_WORKERS  = 50            # concurrent pings


async def start_scanner():
    while True:
        try:
            await _sweep()
        except Exception as e:
            print(f"[scanner] sweep error: {e}")
        await asyncio.sleep(SWEEP_SECS)


async def _ping(ip: str) -> bool:
    """Returns True if the host responds to a single ping."""
    proc = await asyncio.create_subprocess_exec(
        "ping", "-n", "1", "-w", str(PING_TIMEOUT), ip,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.wait()
    return proc.returncode == 0


async def _sweep():
    ips = [f"{SUBNET_PREFIX}.{i}" for i in range(1, 255)]

    # Fan-out pings with a semaphore to cap concurrency
    sem = asyncio.Semaphore(PING_WORKERS)

    async def guarded_ping(ip):
        async with sem:
            return ip, await _ping(ip)

    results = await asyncio.gather(*[guarded_ping(ip) for ip in ips])
    alive = [ip for ip, up in results if up]

    # Refresh ARP cache entries
    arp_table = _parse_arp()
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    for ip in alive:
        mac      = arp_table.get(ip, {}).get("mac", "")
        hostname = _resolve(ip)
        upsert_device(hostname=hostname, ip=ip, mac=mac, status="online", last_seen=ts)

    mark_offline_except(alive)
    print(f"[scanner] sweep complete — {len(alive)} host(s) online")


def _parse_arp() -> dict:
    """Parse `arp -a` output into {ip: {mac}} on Windows."""
    table = {}
    try:
        out = subprocess.check_output(["arp", "-a"], text=True, timeout=5)
        for line in out.splitlines():
            # Windows arp -a line: "  192.168.1.1          aa-bb-cc-dd-ee-ff     dynamic"
            m = re.match(r"\s+([\d.]+)\s+([\w-]+)\s+\w+", line)
            if m:
                ip, mac = m.group(1), m.group(2).replace("-", ":")
                table[ip] = {"mac": mac}
    except Exception:
        pass
    return table


def _resolve(ip: str) -> str:
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return ip
