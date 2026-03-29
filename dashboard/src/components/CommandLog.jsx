import { useState } from 'react'

export default function CommandLog({ logs }) {
  const [sortOrder, setSortOrder] = useState('newest')

  const sortedLogs = sortOrder === 'newest' ? [...logs].reverse() : [...logs]

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>COMMAND LOG</span>
        <div style={styles.headerRight}>
          <button
            style={styles.sortBtn}
            onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')}
          >
            {sortOrder === 'newest' ? 'NEWEST FIRST' : 'OLDEST FIRST'}
          </button>
          <span style={styles.count}>{logs.length}</span>
        </div>
      </div>

      <div style={styles.list}>
        {sortedLogs.length === 0 ? (
          <div style={styles.empty}>no commands yet</div>
        ) : (
          sortedLogs.map((entry, i) => <LogRow key={i} entry={entry} />)
        )}
      </div>
    </div>
  )
}

function LogRow({ entry }) {
  const ok = entry.result === 'ok'
  const details = entry.details ? entry.details.slice(0, 100) : null
  const hasMethodInfo = entry.method || entry.endpoint

  return (
    <div style={styles.row}>
      <div style={styles.meta}>
        <span style={styles.ts}>{entry.timestamp}</span>
        {hasMethodInfo ? (
          <>
            {entry.method && <span style={styles.method}>{entry.method}</span>}
            {entry.endpoint && <span style={styles.endpoint}>{entry.endpoint}</span>}
            {entry.endpoint && <span style={styles.arrow}>→</span>}
          </>
        ) : null}
        <span style={styles.target}>{entry.target}</span>
        <span style={{ ...styles.result, color: ok ? '#00ff88' : '#ff3d5a' }}>
          {ok ? 'OK' : 'ERR'}
        </span>
      </div>
      <div style={styles.cmd}>{entry.command}</div>
      {details && <div style={styles.details}>{details}</div>}
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
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sortBtn: {
    background: 'transparent',
    border: '1px solid #1a2230',
    borderRadius: '3px',
    color: '#4a5568',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    padding: '2px 7px',
    cursor: 'pointer',
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
    gap: '6px',
    alignItems: 'center',
    marginBottom: '3px',
    flexWrap: 'wrap',
  },
  ts: {
    color: '#2d3748',
    fontSize: '11px',
    fontVariantNumeric: 'tabular-nums',
  },
  method: {
    color: '#00d4ff',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  endpoint: {
    color: '#4a5568',
    fontSize: '11px',
    fontFamily: "'JetBrains Mono', monospace",
  },
  arrow: {
    color: '#2d3748',
    fontSize: '11px',
  },
  target: {
    color: '#00d4ff',
    fontSize: '11px',
    flex: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  result: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  cmd: {
    color: '#e2e8f0',
    fontSize: '12px',
    fontFamily: "'JetBrains Mono', monospace",
    wordBreak: 'break-all',
    paddingLeft: '10px',
    borderLeft: '2px solid #00d4ff22',
  },
  details: {
    color: '#4a5568',
    fontSize: '11px',
    fontFamily: "'JetBrains Mono', monospace",
    paddingLeft: '10px',
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}
