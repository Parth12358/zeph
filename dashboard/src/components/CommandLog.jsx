import { useEffect, useRef } from 'react'

export default function CommandLog({ messages, onClear }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>ZEPH CHAT</span>
        <button style={styles.clearBtn} onClick={onClear}>CLEAR</button>
      </div>

      <div style={styles.list}>
        {messages.length === 0 ? (
          <div style={styles.empty}>// no commands yet</div>
        ) : (
          messages.map(msg =>
            msg.type === 'user'
              ? <UserMessage key={msg.id} msg={msg} />
              : <ZephMessage key={msg.id} msg={msg} />
          )
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function UserMessage({ msg }) {
  return (
    <div style={styles.userRow}>
      <div style={styles.userBubble}>
        <span style={styles.userText}>{msg.text}</span>
        <span style={styles.userTs}>{msg.timestamp}</span>
      </div>
    </div>
  )
}

function ZephMessage({ msg }) {
  const { response } = msg

  let content
  if (!response) {
    content = <div style={styles.zephError}>No response</div>
  } else if (response.error) {
    content = <div style={styles.zephError}>Planning failed: {response.error}</div>
  } else {
    const plan = response.plan
    const results = response.results || []

    const workflowLines = plan?.workflow?.map((item, i) => (
      <div key={i} style={styles.planItem}>
        <span style={styles.arrow}>→</span>
        <span style={styles.planAction}>{item.action}</span>
        <span style={styles.planColon}>: </span>
        <span style={styles.planCmd}>{item.command}</span>
        {item.target && (
          <div style={styles.planTarget}>
            {'  '}target: {item.friendly_name ? `${item.friendly_name} (${item.target})` : item.target}
          </div>
        )}
      </div>
    )) ?? []

    const okCount = results.filter(r => r.status === 'ok').length
    const total = results.length

    content = (
      <>
        {workflowLines.length > 0 && (
          <>
            <div style={styles.sectionLabel}>Planning workflow...</div>
            {workflowLines}
          </>
        )}

        {results.length > 0 && (
          <>
            <div style={styles.sectionLabel}>Dispatching...</div>
            {results.map((r, i) => {
              const ok = r.status === 'ok'
              const label = r.friendly_name ? `${r.ip} (${r.friendly_name})` : r.ip
              const notesOutput = r.action === 'notes' && ok && r.output
                ? (() => { try { const t = JSON.parse(r.output)?.text ?? r.output; return t.length > 80 ? t.slice(0, 80) + '...' : t } catch { return r.output.length > 80 ? r.output.slice(0, 80) + '...' : r.output } })()
                : null
              return (
                <div key={i} style={styles.resultItem}>
                  <span style={styles.arrow}>→</span>
                  <span style={styles.resultIp}>{label}</span>
                  <span style={styles.resultEndpoint}>  POST /{r.action ?? r.endpoint ?? 'bash'}  </span>
                  <span style={{ color: ok ? '#00ff88' : '#ff3d5a', fontWeight: 700 }}>
                    {ok ? '✓ ok' : `✗ ${r.error ?? 'error'}`}
                  </span>
                  {notesOutput && (
                    <div style={styles.notesOutput}>"{notesOutput}"</div>
                  )}
                </div>
              )
            })}
            {(() => {
              const summaryResult = results.find(r => r.action === 'summarize' && r.output)
              if (!summaryResult) return null
              let summaryText = summaryResult.output
              try {
                const parsed = JSON.parse(summaryResult.output)
                summaryText = parsed.summary || summaryResult.output
              } catch {
                summaryText = summaryResult.output
              }
              return (
                <div style={styles.summaryBlock}>
                  <div style={styles.summaryLabel}>SUMMARY</div>
                  {summaryText}
                </div>
              )
            })()}
            <div style={styles.summary}>
              Done. {okCount}/{total} actions completed.
            </div>
          </>
        )}

        {results.length === 0 && workflowLines.length === 0 && (
          <div style={styles.zephMuted}>No targets dispatched.</div>
        )}

        {results.length === 0 && workflowLines.length > 0 && (
          <div style={styles.zephMuted}>No targets dispatched.</div>
        )}
      </>
    )
  }

  return (
    <div style={styles.zephRow}>
      <div style={styles.zephHeader}>
        <span style={styles.zephName}>Zeph</span>
        <span style={styles.zephTs}>{msg.timestamp}</span>
      </div>
      <div style={styles.zephBody}>{content}</div>
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
  clearBtn: {
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
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 0',
  },
  empty: {
    padding: '20px 16px',
    color: '#2d3748',
    fontSize: '12px',
    fontFamily: "'JetBrains Mono', monospace",
  },

  // User message
  userRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '6px 16px',
  },
  userBubble: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
  },
  userText: {
    color: '#00d4ff',
    fontSize: '13px',
    fontFamily: "'JetBrains Mono', monospace",
  },
  userTs: {
    color: '#2d3748',
    fontSize: '10px',
    fontVariantNumeric: 'tabular-nums',
  },

  // Zeph message
  zephRow: {
    padding: '10px 16px',
    borderBottom: '1px solid #0e1318',
  },
  zephHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
    marginBottom: '6px',
  },
  zephName: {
    color: '#00ff88',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  zephTs: {
    color: '#2d3748',
    fontSize: '10px',
    fontVariantNumeric: 'tabular-nums',
  },
  zephBody: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '12px',
    paddingLeft: '4px',
  },
  sectionLabel: {
    color: '#4a5568',
    fontSize: '11px',
    marginBottom: '3px',
    marginTop: '4px',
  },
  planItem: {
    color: '#e2e8f0',
    paddingLeft: '2px',
    marginBottom: '2px',
  },
  planTarget: {
    color: '#4a5568',
    fontSize: '11px',
    paddingLeft: '14px',
  },
  arrow: {
    color: '#00d4ff',
    marginRight: '6px',
  },
  planAction: {
    color: '#e2e8f0',
  },
  planColon: {
    color: '#4a5568',
  },
  planCmd: {
    color: '#e2e8f0',
  },
  resultItem: {
    paddingLeft: '2px',
    marginBottom: '2px',
    fontSize: '12px',
  },
  resultIp: {
    color: '#e2e8f0',
  },
  resultEndpoint: {
    color: '#4a5568',
  },
  notesOutput: {
    color: '#4a5568',
    fontSize: '11px',
    paddingLeft: '14px',
    marginTop: '2px',
    fontStyle: 'italic',
  },
  summaryBlock: {
    marginTop: '12px',
    padding: '12px',
    borderLeft: '2px solid #00d4ff',
    background: 'rgba(0,212,255,0.05)',
    fontSize: '12px',
    color: '#e8edf5',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.6',
  },
  summaryLabel: {
    color: '#00d4ff',
    fontSize: '10px',
    marginBottom: '8px',
    letterSpacing: '1px',
  },
  summary: {
    color: '#a0aec0',
    fontSize: '11px',
    marginTop: '6px',
  },
  zephMuted: {
    color: '#4a5568',
    fontSize: '11px',
  },
  zephError: {
    color: '#ff3d5a',
    fontSize: '12px',
  },
}
