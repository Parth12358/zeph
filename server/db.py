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
    cur.execute("SELECT hostname, ip, mac, status, last_seen FROM devices")
    rows = cur.fetchall()
    con.close()
    return [{"hostname": r[0], "ip": r[1], "mac": r[2], "status": r[3], "last_seen": r[4]} for r in rows]