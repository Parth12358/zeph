import { useState } from 'react'

export default function DeviceList({ devices }) {
  const [editingIp, setEditingIp] = useState(null)
  const [editName, setEditName] = useState("")
  const [editType, setEditType] = useState("PC")

  function openEdit(device) {
    setEditingIp(device.ip)
    setEditName(device.friendly_name || "")
    setEditType(device.device_type || "PC")
  }

  function closeEdit() {
    setEditingIp(null)
  }

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
          devices.map((d, i) => (
            <DeviceRow
              key={d.ip ?? i}
              device={d}
              isEditing={editingIp === d.ip}
              editName={editName}
              editType={editType}
              onRowClick={() => openEdit(d)}
              onNameChange={setEditName}
              onTypeChange={setEditType}
              onCancel={closeEdit}
              onSaved={(updated) => {
                Object.assign(d, updated)
                closeEdit()
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

function DeviceRow({ device, isEditing, editName, editType, onRowClick, onNameChange, onTypeChange, onCancel, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [isClient, setIsClient] = useState(!!device.is_zeph_client)
  const online = device.status === 'online'
  const displayName = device.friendly_name || device.hostname || '—'

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/devices/${device.ip}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendly_name: editName, device_type: editType })
      })
      device.friendly_name = editName
      device.device_type = editType
      onSaved({ friendly_name: editName, device_type: editType })
    } finally {
      setSaving(false)
    }
  }

  async function toggleClient(e) {
    e.stopPropagation()
    const newVal = !isClient
    setIsClient(newVal)
    device.is_zeph_client = newVal
    await fetch(`/devices/${device.ip}/zeph-client`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_zeph_client: newVal })
    })
  }

  return (
    <div style={styles.rowWrapper}>
      <div style={{ ...styles.row, cursor: 'pointer' }} onClick={onRowClick}>
        <div style={styles.rowTop}>
          <div style={styles.nameGroup}>
            <span style={styles.hostname}>{displayName}</span>
            {device.device_type && (
              <span style={{ ...styles.typeBadge, color: typeColor(device.device_type), borderColor: typeColor(device.device_type) + '44', background: typeColor(device.device_type) + '11' }}>
                {device.device_type}
              </span>
            )}
            <button
              style={{ ...styles.clientBtn, ...(isClient ? styles.clientBtnActive : styles.clientBtnInactive) }}
              onClick={toggleClient}
            >
              {isClient ? 'CLIENT' : '+CLIENT'}
            </button>
          </div>
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

      {isEditing && (
        <div style={styles.editForm} onClick={e => e.stopPropagation()}>
          <input
            style={styles.input}
            value={editName}
            onChange={e => onNameChange(e.target.value)}
            placeholder={device.hostname || 'friendly name'}
          />
          <select
            style={styles.select}
            value={editType}
            onChange={e => onTypeChange(e.target.value)}
          >
            {["PC", "Laptop", "Phone", "Server", "Other"].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div style={styles.editButtons}>
            <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? '...' : 'Save'}
            </button>
            <button style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function typeColor(type) {
  return { PC: '#00d4ff', Laptop: '#7b61ff', Phone: '#00ff88', Server: '#ffd166', Other: '#4a5568' }[type] ?? '#4a5568'
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
  rowWrapper: {
    borderBottom: '1px solid #0e1318',
  },
  row: {
    padding: '10px 16px',
  },
  rowTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  nameGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  hostname: {
    fontWeight: 500,
    color: '#00d4ff',
    fontSize: '13px',
  },
  typeBadge: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    padding: '1px 5px',
    borderRadius: '3px',
    border: '1px solid',
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
  editForm: {
    padding: '8px 16px 12px',
    background: '#0a0f16',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  input: {
    background: '#0e1318',
    border: '1px solid #1a2230',
    borderRadius: '4px',
    color: '#e2e8f0',
    fontSize: '12px',
    padding: '5px 8px',
    outline: 'none',
  },
  select: {
    background: '#0e1318',
    border: '1px solid #1a2230',
    borderRadius: '4px',
    color: '#e2e8f0',
    fontSize: '12px',
    padding: '5px 8px',
    outline: 'none',
  },
  editButtons: {
    display: 'flex',
    gap: '6px',
  },
  saveBtn: {
    background: '#00d4ff22',
    border: '1px solid #00d4ff44',
    borderRadius: '4px',
    color: '#00d4ff',
    fontSize: '11px',
    fontWeight: 700,
    padding: '4px 12px',
    cursor: 'pointer',
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid #1a2230',
    borderRadius: '4px',
    color: '#4a5568',
    fontSize: '11px',
    padding: '4px 12px',
    cursor: 'pointer',
  },
  clientBtn: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    padding: '1px 5px',
    borderRadius: '3px',
    border: '1px solid',
    cursor: 'pointer',
  },
  clientBtnActive: {
    color: '#00d4ff',
    background: 'rgba(0,212,255,0.1)',
    borderColor: 'rgba(0,212,255,0.4)',
  },
  clientBtnInactive: {
    color: '#4a5568',
    background: 'transparent',
    borderColor: '#2d3748',
  },
}
