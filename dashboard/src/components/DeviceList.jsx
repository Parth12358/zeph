export default function DeviceList({ devices }) {
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>DEVICES</span>
        <span style={styles.count}>{devices.length}</span>
      </div>

      <div style={styles.list}>
        {devices.length === 0 ? (
          <div style={styles.empty}>no devices discovered</div>
        ) : (
          devices.map((d, i) => <DeviceRow key={d.ip ?? i} device={d} />)
        )}
      </div>
    </div>
  )
}

function DeviceRow({ device }) {
  const online = device.status === 'online'
  return (
    <div style={styles.row}>
      <div style={styles.rowTop}>
        <span style={styles.hostname}>{device.hostname ?? '—'}</span>
        <span style={{ ...styles.badge, ...(online ? styles.badgeOnline : styles.badgeOffline) }}>
          {online ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>
      <div style={styles.rowBottom}>
        <span style={styles.ip}>{device.ip}</span>
        {device.last_seen && (
          <span style={styles.lastSeen}>{device.last_seen}</span>
        )}
      </div>
    </div>
  )
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #1a2230',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.2em',
    color: '#4a5568',
  },
  count: {
    fontSize: '11px',
    color: '#00d4ff',
    fontWeight: 700,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  empty: {
    padding: '20px 16px',
    color: '#4a5568',
    fontSize: '12px',
  },
  row: {
    padding: '10px 16px',
    borderBottom: '1px solid #0e1318',
    cursor: 'default',
  },
  rowTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  hostname: {
    fontWeight: 500,
    color: '#00d4ff',
    fontSize: '13px',
  },
  badge: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  badgeOnline: {
    color: '#00ff88',
    background: 'rgba(0,255,136,0.1)',
    border: '1px solid rgba(0,255,136,0.25)',
  },
  badgeOffline: {
    color: '#ff3d5a',
    background: 'rgba(255,61,90,0.1)',
    border: '1px solid rgba(255,61,90,0.25)',
  },
  rowBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ip: {
    color: '#4a5568',
    fontSize: '11px',
    fontVariantNumeric: 'tabular-nums',
  },
  lastSeen: {
    color: '#2d3748',
    fontSize: '10px',
    fontVariantNumeric: 'tabular-nums',
  },
}
