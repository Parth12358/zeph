import sqlite3

DB_PATH = "zeph.db"

def init_db():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hostname TEXT,
            ip TEXT UNIQUE,
            mac TEXT,
            status TEXT DEFAULT 'offline',
            last_seen TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            command TEXT,
            target TEXT,
            result TEXT
        )
    """)
    for col, definition in [("friendly_name", "TEXT"), ("device_type", "TEXT")]:
        try:
            con.execute(f"ALTER TABLE devices ADD COLUMN {col} {definition}")
        except Exception:
            pass  # column already exists
    try:
        con.execute("ALTER TABLE devices ADD COLUMN is_zeph_client INTEGER DEFAULT 0")
    except Exception:
        pass  # column already exists
    for col, definition in [("method", "TEXT DEFAULT 'POST'"), ("endpoint", "TEXT DEFAULT ''"), ("details", "TEXT DEFAULT ''")]:
        try:
            con.execute(f"ALTER TABLE logs ADD COLUMN {col} {definition}")
        except Exception:
            pass  # column already exists
    con.commit()
    con.close()

def upsert_device(hostname, ip, mac, status, last_seen):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""
        INSERT INTO devices (hostname, ip, mac, status, last_seen)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(ip) DO UPDATE SET
            hostname=excluded.hostname,
            mac=excluded.mac,
            status=excluded.status,
            last_seen=excluded.last_seen
    """, (hostname, ip, mac, status, last_seen))
    con.commit()
    con.close()

def get_all_devices():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("SELECT hostname, ip, mac, status, last_seen, friendly_name, device_type, is_zeph_client FROM devices")
    rows = cur.fetchall()
    con.close()
    return [{"hostname": r[0], "ip": r[1], "mac": r[2], "status": r[3], "last_seen": r[4], "friendly_name": r[5], "device_type": r[6], "is_zeph_client": bool(r[7])} for r in rows]

def set_zeph_client(ip: str, value: bool):
    con = sqlite3.connect(DB_PATH)
    con.execute("UPDATE devices SET is_zeph_client=? WHERE ip=?", (1 if value else 0, ip))
    con.commit()
    con.close()

def get_zeph_clients() -> list:
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("SELECT hostname, ip, mac, status, last_seen, friendly_name, device_type, is_zeph_client FROM devices WHERE is_zeph_client=1 AND status='online'")
    rows = cur.fetchall()
    con.close()
    return [{"hostname": r[0], "ip": r[1], "mac": r[2], "status": r[3], "last_seen": r[4], "friendly_name": r[5], "device_type": r[6], "is_zeph_client": bool(r[7])} for r in rows]

def update_device_meta(ip: str, friendly_name: str, device_type: str):
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "UPDATE devices SET friendly_name=?, device_type=? WHERE ip=?",
        (friendly_name, device_type, ip)
    )
    con.commit()
    con.close()

def insert_log(timestamp, command, target, result, method="POST", endpoint="", details=""):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute(
        "INSERT INTO logs (timestamp, command, target, result, method, endpoint, details) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (timestamp, command, target, result, method, endpoint, details)
    )
    con.commit()
    con.close()

def mark_offline_except(ips: list):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    if ips:
        placeholders = ",".join("?" * len(ips))
        cur.execute(
            f"UPDATE devices SET status='offline' WHERE ip NOT IN ({placeholders})",
            ips
        )
    else:
        cur.execute("UPDATE devices SET status='offline'")
    con.commit()
    con.close()

def get_logs(limit=50):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute(
        "SELECT timestamp, command, target, result, method, endpoint, details FROM logs ORDER BY id DESC LIMIT ?",
        (limit,)
    )
    rows = cur.fetchall()
    con.close()
    return [{"timestamp": r[0], "command": r[1], "target": r[2], "result": r[3], "method": r[4], "endpoint": r[5], "details": r[6]} for r in rows]
