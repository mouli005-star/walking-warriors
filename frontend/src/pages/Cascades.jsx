import { useEffect, useState } from 'react'
import { Zap, ChevronRight, MessageSquare, Play, SkipForward } from 'lucide-react'
import { cascade, ai } from '../services/api'

const STAGES = ['BLOOD_FAMILY','BACKUP_POOL','EXPANDED','BLOOD_BANK','NGO_ALERT']
const STAGE_LABELS = {
  BLOOD_FAMILY: 'Blood Family',
  BACKUP_POOL:  'Backup Pool',
  EXPANDED:     'Expanded',
  BLOOD_BANK:   'Blood Bank',
  NGO_ALERT:    'NGO Alert'
}
const STAGE_COLORS = {
  BLOOD_FAMILY: 'var(--green)',
  BACKUP_POOL:  'var(--blue)',
  EXPANDED:     'var(--purple)',
  BLOOD_BANK:   'var(--orange)',
  NGO_ALERT:    'var(--red)'
}

export default function Cascades() {
  const [runs,       setRuns]       = useState([])
  const [selected,   setSelected]   = useState(null)
  const [detail,     setDetail]     = useState(null)
  const [replyText,  setReplyText]  = useState('')
  const [loading,    setLoading]    = useState(true)
  const [parsing,    setParsing]    = useState(false)
  const [parsedIntent, setParsedIntent] = useState(null)

  useEffect(() => {
    cascade.runs({ limit: 20 }).then(r => {
      setRuns(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function openDetail(run) {
    setSelected(run)
    setParsedIntent(null)
    try {
      const r = await cascade.detail(run.id)
      setDetail(r.data)
    } catch {}
  }

  async function testIntentParser() {
    if (!replyText.trim()) return
    setParsing(true)
    setParsedIntent(null)
    try {
      const r = await ai.parseIntent(replyText, 'Demo Donor')
      setParsedIntent(r.data)
    } catch {}
    setParsing(false)
  }

  async function advanceCascade(id) {
    try {
      const r = await cascade.advance(id)
      alert(`AI Decision: ${r.data.ai_decision?.action} — ${r.data.ai_decision?.reason}`)
      openDetail(selected)
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Cascade Engine</h1>
        <p>Autonomous blood coordination · AI-driven donor outreach</p>
      </div>

      {/* Intent Parser Demo */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
          🧠 AI Intent Parser — Live Demo
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          Test how Bedrock AI parses donor replies in any Indian language
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Type a donor reply: 'Haan bhai aa jaunga', 'Nahi yaar busy hun', 'Kal try karta hun'..."
            onKeyDown={e => e.key === 'Enter' && testIntentParser()}
            style={{ flex: 1 }}
          />
          <button
            onClick={testIntentParser}
            disabled={parsing || !replyText.trim()}
            className="btn-primary"
            style={{ whiteSpace: 'nowrap' }}>
            {parsing ? 'Parsing...' : 'Parse Intent'}
          </button>
        </div>

        {parsedIntent && (
          <div style={{
            marginTop: 14, display: 'flex', gap: 12,
            flexWrap: 'wrap', animation: 'slide-up 0.2s ease'
          }}>
            <div style={{
              padding: '10px 16px',
              background: parsedIntent.parsed_intent === 'CONFIRMED' ? 'var(--green-soft)'
                : parsedIntent.parsed_intent === 'DECLINED' ? 'var(--red-soft)'
                : 'var(--orange-soft)',
              borderRadius: 10, flex: 1
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>INTENT</div>
              <div style={{
                fontSize: 22, fontWeight: 800,
                color: parsedIntent.parsed_intent === 'CONFIRMED' ? 'var(--green)'
                  : parsedIntent.parsed_intent === 'DECLINED' ? 'var(--red)'
                  : 'var(--orange)'
              }}>
                {parsedIntent.parsed_intent}
              </div>
            </div>
            <div style={{
              padding: '10px 16px',
              background: 'var(--bg-elevated)',
              borderRadius: 10, flex: 1
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CONFIDENCE</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>
                {Math.round((parsedIntent.confidence || 0) * 100)}%
              </div>
            </div>
            <div style={{
              padding: '10px 16px',
              background: 'var(--bg-elevated)',
              borderRadius: 10, flex: 1
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>LANGUAGE</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--purple)' }}>
                {parsedIntent.language_detected}
              </div>
            </div>
            <div style={{
              padding: '10px 16px',
              background: 'var(--bg-elevated)',
              borderRadius: 10, flex: 2
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                REASONING
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {parsedIntent.reasoning}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Cascade List */}
        <div style={{ flex: 1 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border)',
              fontWeight: 600
            }}>
              Active Cascade Runs
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading...
              </div>
            ) : runs.length === 0 ? (
              <div style={{
                padding: 40, textAlign: 'center',
                color: 'var(--text-muted)', fontSize: 13
              }}>
                No cascades yet. Trigger one from the Patients page.
              </div>
            ) : runs.map(run => (
              <div key={run.id}
                onClick={() => openDetail(run)}
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: selected?.id === run.id
                    ? 'var(--bg-elevated)' : 'transparent',
                  transition: 'background 0.15s'
                }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={14} color={STAGE_COLORS[run.current_stage]}/>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      Cascade #{run.id}
                    </span>
                  </div>
                  <span className={`badge badge-${run.status?.toLowerCase()}`}>
                    {run.status}
                  </span>
                </div>

                {/* Stage progress */}
                <div style={{
                  display: 'flex', gap: 3, marginBottom: 8
                }}>
                  {STAGES.map((s, i) => {
                    const current = STAGES.indexOf(run.current_stage)
                    return (
                      <div key={s} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= current
                          ? STAGE_COLORS[run.current_stage]
                          : 'var(--border)'
                      }}/>
                    )
                  })}
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 11, color: 'var(--text-muted)'
                }}>
                  <span>{STAGE_LABELS[run.current_stage]}</span>
                  <span>
                    {run.units_confirmed}/{run.units_needed} units ·
                    {run.donors_contacted} contacted
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        {detail && selected && (
          <div style={{ width: 380, flexShrink: 0 }}>
            <div className="card">
              <div style={{
                fontWeight: 700, fontSize: 15, marginBottom: 16,
                display: 'flex', justifyContent: 'space-between'
              }}>
                <span>Cascade #{selected.id} Detail</span>
                <button
                  onClick={() => advanceCascade(selected.id)}
                  className="btn-secondary"
                  style={{ fontSize: 11, padding: '5px 10px',
                    display: 'flex', alignItems: 'center', gap: 4 }}>
                  <SkipForward size={11}/> AI Advance
                </button>
              </div>

              {/* Summary */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 8, marginBottom: 16
              }}>
                {[
                  { label: 'Confirmed', value: detail.summary?.confirmed, color: 'var(--green)' },
                  { label: 'Declined',  value: detail.summary?.declined,  color: 'var(--red)'   },
                  { label: 'No Reply',  value: detail.summary?.no_reply,  color: 'var(--orange)' },
                  { label: 'Total',     value: detail.summary?.total_contacted, color: 'var(--blue)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: 'var(--bg-elevated)',
                    borderRadius: 8, padding: '10px 12px'
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color }}>{value || 0}</div>
                  </div>
                ))}
              </div>

              {/* Contacts */}
              <div style={{
                fontWeight: 600, fontSize: 13, marginBottom: 10
              }}>
                Donors Contacted
              </div>
              <div style={{
                maxHeight: 350, overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 6
              }}>
                {detail.contacts?.map(c => (
                  <div key={c.contact_id} style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8, padding: '10px 12px'
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      marginBottom: 4
                    }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {c.donor_id?.slice(0,10)}...
                      </span>
                      <span className={`badge badge-${c.response?.toLowerCase() === 'confirmed'
                        ? 'ok' : c.response?.toLowerCase() === 'declined'
                        ? 'critical' : 'pending'}`}>
                        {c.response}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex', gap: 8,
                      fontSize: 11, color: 'var(--text-muted)'
                    }}>
                      <span>Score: <b style={{ color: 'var(--text-primary)' }}>
                        {c.final_score}
                      </b></span>
                      <span>Dist: <b style={{ color: 'var(--text-primary)' }}>
                        {c.distance_km ? `${c.distance_km}km` : '—'}
                      </b></span>
                      <span>{c.stage}</span>
                    </div>
                    {c.raw_reply && (
                      <div style={{
                        marginTop: 6, fontSize: 12,
                        color: 'var(--blue)',
                        fontStyle: 'italic'
                      }}>
                        "{c.raw_reply}"
                      </div>
                    )}
                    {c.parsed_intent && c.parsed_intent !== c.response && (
                      <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>
                        AI: {c.parsed_intent}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
