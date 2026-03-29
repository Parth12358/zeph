import { useState, useEffect } from 'react'

export default function StatusBar({ devices }) {
  const [time, setTime] = useState(nowStr())
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setTime(nowStr()), 1000)
    return () => clearInterval(id)
  }, [])

  const triggerScan = async () => {
    setScanning(true)
    try {
      await fetch('/scan', { method: 'POST' })
    } catch (e) {
      console.error('scan failed', e)
    }
    setTimeout(() => setScanning(false), 3000)
  }

  const onlineCount = devices.filter(d => d.status === 'online').length

  return (
    <div style={styles.bar}>
      {/* Left — logo + subtitle */}
      <div style={styles.left}>
        <span style={styles.logo}>ZEPH</span>
        <span style={styles.subtitle}>// enterprise voice orchestrator</span>
      </div>

      {/* Center — online device count */}
      <div style={styles.center}>
        <div style={styles.pill}>
          <span style={styles.pulseDot} />
          <span style={{ color: '#00ff88' }}>{onlineCount} online</span>
        </div>
      </div>

      {/* Right — scan button + system status + clock */}
      <div style={styles.right}>
        <button onClick={triggerScan} disabled={scanning} style={{
          ...styles.scanBtn,
          opacity: scanning ? 0.5 : 1,
          color: scanning ? '#4a5568' : '#00d4ff',
          borderColor: scanning ? '#1a2230' : 'rgba(0,212,255,0.3)',
        }}>
          {scanning ? '...' : '↻ SCAN'}
        </button>
        <div style={styles.statusPill}>
          <span style={styles.statusDot} />
          <span style={{ color: '#00ff88', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em' }}>
            ONLINE
          </span>
        </div>
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
    height: '48px',
    background: '#0e1318',
    borderBottom: '1px solid #1a2230',
    flexShrink: 0,
  },
  left: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: '20px',
    color: '#00d4ff',
    letterSpacing: '0.2em',
    textShadow: '0 0 12px rgba(0,212,255,0.6), 0 0 24px rgba(0,212,255,0.2)',
  },
  subtitle: {
    fontSize: '10px',
    color: '#2d3748',
    letterSpacing: '0.05em',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '4px 12px',
    background: 'rgba(0,255,136,0.07)',
    border: '1px solid rgba(0,255,136,0.18)',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 500,
  },
  pulseDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: '#00ff88',
    boxShadow: '0 0 6px #00ff88',
    display: 'inline-block',
    animation: 'pulse 2s ease-in-out infinite',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 10px',
    background: 'rgba(0,255,136,0.07)',
    border: '1px solid rgba(0,255,136,0.18)',
    borderRadius: '20px',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#00ff88',
    display: 'inline-block',
  },
  time: {
    color: '#4a5568',
    fontSize: '12px',
    fontVariantNumeric: 'tabular-nums',
  },
  scanBtn: {
    background: 'transparent',
    border: '1px solid',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    padding: '3px 10px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'opacity 0.2s',
  },
}
