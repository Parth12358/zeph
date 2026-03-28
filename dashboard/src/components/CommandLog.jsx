export default function CommandLog({ logs }) {
  const entries = [...logs].reverse()

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>COMMAND LOG</span>
        <span style={styles.count}>{logs.length}</span>
      </div>

      <div style={styles.list}>
        {entries.length === 0 ? (
          <div style={styles.empty}>no commands yet</div>
        ) : (
          entries.map((entry, i) => <LogRow key={i} entry={entry} />)
        )}
      </div>
    </div>
  )
}

function LogRow({ entry }) {
  const ok = entry.result === 'ok'
  return (
    <div style={styles.row}>
      <div style={styles.meta}>
        <span style={styles.ts}>{entry.timestamp}</span>
        <span style={styles.target}>{entry.target}</span>
        <span style={{ ...styles.result, color: ok ? '#00ff88' : '#ff3d5a' }}>
          {ok ? 'OK' : 'ERR'}
        </span>
      </div>
      <div style={styles.cmd}>{entry.command}</div>
    </div>
  )
}

const styles = {
  panel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderBottom: '1px solid #1a2230',
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
    padding: '8px 16px',
    borderBottom: '1px solid #0e1318',
  },
  meta: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '3px',
  },
  ts: {
    color: '#2d3748',
    fontSize: '11px',
    fontVariantNumeric: 'tabular-nums',
  },
  target: {
    color: '#4a5568',
    fontSize: '11px',
    flex: 1,
  },
  result: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  cmd: {
    color: '#e8edf5',
    fontSize: '12px',
    fontFamily: "'JetBrains Mono', monospace",
    wordBreak: 'break-all',
  },
}
