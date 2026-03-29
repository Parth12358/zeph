import { useState, useEffect } from 'react'
import StatusBar    from './components/StatusBar.jsx'
import DeviceList   from './components/DeviceList.jsx'
import CommandLog   from './components/CommandLog.jsx'
import CommandInput from './components/CommandInput.jsx'
import SystemStats  from './components/SystemStats.jsx'

const STATS_POLL_MS = 5000

function wsUrl(path) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}${path}`
}

export default function App() {
  const [devices,  setDevices]  = useState([])
  const [messages, setMessages] = useState([])
  const [stats,    setStats]    = useState({ cpu: 0, ram: 0, gpu: 0, uptime: 0 })

  const addMessage  = (msg) => setMessages(prev => [...prev, { ...msg, id: Date.now() }])
  const clearMessages = () => setMessages([])

  // WebSocket — devices
  useEffect(() => {
    let ws
    let retryId

    const connect = () => {
      ws = new WebSocket(wsUrl('/ws/devices'))
      ws.onmessage = (e) => setDevices(JSON.parse(e.data))
      ws.onclose   = ()  => { retryId = setTimeout(connect, 3000) }
      ws.onerror   = ()  => ws.close()
    }

    connect()
    return () => {
      clearTimeout(retryId)
      ws?.close()
    }
  }, [])

  // Polling — stats
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/stats')
        setStats(await res.json())
      } catch {
        // server unreachable — keep previous state
      }
    }

    poll()
    const id = setInterval(poll, STATS_POLL_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={styles.root}>
      <StatusBar devices={devices} />

      <div style={styles.grid}>
        <aside style={styles.panel}>
          <DeviceList devices={devices} />
        </aside>

        <main style={styles.center}>
          <CommandLog messages={messages} onClear={clearMessages} />
          <CommandInput onMessage={addMessage} />
        </main>

        <aside style={styles.panel}>
          <SystemStats stats={stats} />
        </aside>
      </div>
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#080b0f',
    overflow: 'hidden',
  },
  grid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '280px 1fr 260px',
    gap: '1px',
    background: '#1a2230',
    overflow: 'hidden',
  },
  panel: {
    background: '#080b0f',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  center: {
    background: '#080b0f',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
}
