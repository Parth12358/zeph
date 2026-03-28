export default function SystemStats({ stats }) {
  const { cpu = 0, ram = 0, gpu = 0, uptime = 0 } = stats
  const h = Math.floor(uptime / 3600)
  const m = Math.floor((uptime % 3600) / 60)

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>SYSTEM</span>
      </div>

      <div style={styles.body}>
        <StatRow label="CPU" value={cpu} />
        <StatRow label="RAM" value={ram} />
        <StatRow label="GPU" value={gpu} />

        <div style={styles.uptimeRow}>
          <span style={styles.label}>UPTIME</span>
          <span style={styles.uptimeValue}>{h}h {m}m</span>
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value }) {
  const pct = Math.min(100, Math.max(0, value))
  const hot = pct >= 90
  const barColor = hot ? '#ff3d5a' : '#00d4ff'

  return (
    <div style={styles.statRow}>
      <div style={styles.statTop}>
        <span style={styles.label}>{label}</span>
        <span style={{ ...styles.value, color: hot ? '#ff3d5a' : '#e8edf5' }}>
          {pct}<span style={styles.unit}>%</span>
        </span>
      </div>
      <div style={styles.track}>
        <div style={{ ...styles.fill, width: `${pct}%`, background: barColor }} />
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
  body: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  statRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  statTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.15em',
    color: '#4a5568',
  },
  value: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '22px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
  },
  unit: {
    fontSize: '12px',
    fontWeight: 400,
    marginLeft: '1px',
    color: '#4a5568',
  },
  track: {
    height: '3px',
    background: '#1a2230',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.4s ease',
  },
  uptimeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '4px',
    borderTop: '1px solid #1a2230',
  },
  uptimeValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#e8edf5',
    fontVariantNumeric: 'tabular-nums',
  },
}
