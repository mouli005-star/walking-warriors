import { useEffect, useState } from 'react'
import { FileText, RefreshCw, Filter } from 'lucide-react'
import { dashboard } from '../services/api'

const EVENT_COLORS = {
  CASCADE_TRIGGERED:        'var(--orange)',
  STAGE_BLOOD_FAMILY_STARTED:'var(--green)',
  STAGE_BACKUP_POOL_STARTED: 'var(--blue)',
  DONOR_REPLIED:            'var(--text-secondary)',
  AI_CASCADE_DECISION:      'var(--orange)',
  NGO_ALERT_TRIGGERED:      'var(--red)',
  PATIENT_REGISTERED:       'var(--blue)',
  DONOR_REGISTERED:         'var(--green)',
  ADMIN_LOGIN:              'var(--text-muted)',
  SYSTEM_SEED:              'var(--text-muted)',
}

export default function AuditLog() {
  const [logs,    setLogs]    = useState([])
  const [filter,  setFilter]  = useState('')
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    const params = { limit: 100 }
    if (filter) params.event_type = filter
    dashboard.auditLog(params).then(r => {
      setLogs(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const eventTypes = [...new Set(logs.map(l => l.event_type).filter(Boolean))]

  return (
    <div>
      <div className="page-header">
        <h1>Audit Log</h1>
        <p>Append-only event trail · Every action recorded</p>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10, marginBottom: 18
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Filter by event type
          </span>
        </div>

        <button
          onClick={load}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setFilter('')}
          className={!filter ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '5px 12px', fontSize: 11 }}>
          All Events
        </button>
        {eventTypes.map(t => (
          <button key={t}
            onClick={() => setFilter(t)}
            className={filter === t ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '5px 12px', fontSize: 11 }}>
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading audit log...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No events yet
          </div>
        ) : (
          <div style={{ padding: '20px 0' }}>
            {logs.map((log, i) => (
              <div key={`${log.id || i}-${log.created_at}`} style={{
                display: 'grid', gridTemplateColumns: '12px 1fr', gap: 14,
                padding: '16px 20px', borderBottom: i === logs.length - 1 ? 'none' : '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: EVENT_COLORS[log.event_type] || 'var(--text-muted)'
                  }}/>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {log.event_type?.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {log.entity_type || 'Unknown'} · {log.entity_id || '—'}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {log.payload && Object.keys(log.payload).length > 0 && (
                    <div style={{
                      marginTop: 12,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: 12,
                      display: 'grid',
                      gap: 8
                    }}>
                      {Object.entries(log.payload).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', gap: 6, fontSize: 12 }}>
                          <span style={{ color: 'var(--text-muted)', minWidth: 100 }}>{k.replace(/_/g, ' ')}:</span>
                          <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
