import { useState, useRef } from 'react'

export default function CommandInput({ onMessage }) {
  const [text, setText] = useState('')
  const inputRef = useRef(null)

  const timestamp = () => new Date().toTimeString().slice(0, 8)

  const send = async () => {
    const cmd = text.trim()
    if (!cmd) return
    setText('')

    onMessage({ type: 'user', text: cmd, timestamp: timestamp() })

    try {
      const res = await fetch('/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      })
      const data = await res.json()
      onMessage({ type: 'zeph', response: data, timestamp: timestamp() })
    } catch (err) {
      onMessage({ type: 'zeph', response: { error: err.message }, timestamp: timestamp() })
    }

    inputRef.current?.focus()
  }

  const onKey = (e) => {
    if (e.key === 'Enter') send()
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.row}>
        <span style={styles.prompt}>&gt;</span>
        <input
          ref={inputRef}
          style={styles.input}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="enter command…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button style={styles.btn} onClick={send}>SEND</button>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    padding: '12px 16px',
    borderTop: '1px solid #1a2230',
    background: '#0e1318',
    flexShrink: 0,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  prompt: {
    color: '#00d4ff',
    fontWeight: 700,
    fontSize: '14px',
    lineHeight: 1,
    userSelect: 'none',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#e8edf5',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '13px',
    caretColor: '#00d4ff',
  },
  btn: {
    background: '#00d4ff',
    border: 'none',
    borderRadius: '4px',
    color: '#080b0f',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    padding: '5px 12px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
}
