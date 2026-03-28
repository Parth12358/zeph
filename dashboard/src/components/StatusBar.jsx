import { useState, useEffect } from 'react'

export default function StatusBar({ devices }) {
  const [time, setTime] = useState(nowStr())

  useEffect(() => {
    const id = setInterval(() => setTime(nowStr()), 1000)
    return () => clearInterval(id)
  }, [])

  const onlineCount = devices.filter(d => d.status === 'online').length
  const allOk = devices.length === 0 || onlineCount === devices.length

  return (
    <div style={styles.bar}>
      <span style={styles.logo}>ZEPH</span>

      <div style={styles.center}>
        <div style={styles.pill}>
          <span style={{ ...styles.dot, background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
          <span style={{ color: '#00ff88' }}>{onlineCount} online</span>
        </div>
      </div>

      <div style={styles.right}>
        <span style={{ ...styles.healthDot, background: allOk ? '#00ff88' : '#ff3d5a' }} />
        <span style={styles.time}>{time}</span>
      </div>
    </div>
  )
}

function nowStr() {
  return new Date().toLocaleTimeString('en-US', { hour12: false })
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    height: '44px',
    background: '#0e1318',
    borderBottom: '1px solid #1a2230',
    flexShrink: 0,
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: '18px',
    color: '#00d4ff',
    letterSpacing: '0.15em',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 10px',
    background: 'rgba(0,255,136,0.08)',
    border: '1px solid rgba(0,255,136,0.2)',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 500,
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'pulse 2s ease-in-out infinite',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#4a5568',
    fontSize: '12px',
  },
  healthDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  time: {
    fontVariantNumeric: 'tabular-nums',
  },
}
