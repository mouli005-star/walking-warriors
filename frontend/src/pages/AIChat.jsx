import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Database, Zap, Trash2 } from 'lucide-react'
import { ai } from '../services/api'

const DEFAULT_SUGGESTIONS = [
  "How many donors are at high churn risk?",
  "Which blood groups have the lowest donor count?",
  "How many patients have transfusions in the next 14 days?",
  "Show me the top 5 bridge donors by RFMT score",
  "Which city zone has the most critical blood shortage?",
  "How many Bridge Donors are currently eligible?",
]

export default function AIChat() {
  const [sessions,    setSessions]    = useState([
    { id: 1, title: 'New conversation', messages: [
      {
        role: 'assistant',
        content: "Namaste! I'm your NGO Intelligence Assistant. Ask me anything about donors, patients, cascades, or blood supply. I query the live database and give you real answers.",
        time: new Date(),
        suggestions: DEFAULT_SUGGESTIONS.slice(0,4)
      }
    ]}
  ])
  const [activeSession, setActiveSession] = useState(1)
  const [input,         setInput]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const bottomRef = useRef(null)

  const session  = sessions.find(s => s.id === activeSession)
  const messages = session?.messages || []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function newSession() {
    const id = Date.now()
    setSessions(s => [...s, {
      id, title: 'New conversation',
      messages: [{
        role: 'assistant',
        content: "Namaste! Ask me anything about the Blood Warriors donor network.",
        time: new Date(),
        suggestions: DEFAULT_SUGGESTIONS.slice(0,4)
      }]
    }])
    setActiveSession(id)
  }

  function deleteSession(id) {
    if (sessions.length === 1) return
    setSessions(s => s.filter(x => x.id !== id))
    if (activeSession === id) {
      setActiveSession(sessions.find(s => s.id !== id)?.id)
    }
  }

  function updateSession(id, updater) {
    setSessions(s => s.map(x => x.id === id ? updater(x) : x))
  }

  async function send(question) {
    const q = (question || input).trim()
    if (!q || loading) return
    setInput('')

    const userMsg = { role: 'user', content: q, time: new Date() }
    updateSession(activeSession, s => ({
      ...s,
      title: s.messages.length <= 1 ? q.slice(0,35) + '...' : s.title,
      messages: [...s.messages, userMsg]
    }))
    setLoading(true)

    try {
      const res = await ai.ngoChat(q)
      const assistantMsg = {
        role: 'assistant',
        content: res.data.answer,
        data: res.data.data,
        sql: res.data.sql_used,
        count: res.data.row_count,
        suggestions: res.data.suggestions || [],
        time: new Date()
      }
      updateSession(activeSession, s => ({
        ...s,
        messages: [...s.messages, assistantMsg]
      }))
    } catch {
      updateSession(activeSession, s => ({
        ...s,
        messages: [...s.messages, {
          role: 'assistant',
          content: 'Sorry, I could not process that. Please try again.',
          time: new Date(), suggestions: []
        }]
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', gap: 0, margin: '0', overflow: 'hidden' }}>

      {/* Left Sidebar — Chat History */}
      <div style={{
        width: 260, flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '16px 0'
      }}>
        <div style={{ padding: '0 12px 12px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <button onClick={newSession} className="btn-primary"
            style={{ width: '100%', padding: '8px', fontSize: 13 }}>
            + New conversation
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          {sessions.map(s => (
            <div key={s.id}
              onClick={() => setActiveSession(s.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                background: activeSession === s.id ? 'var(--bg-elevated)' : 'transparent',
                border: activeSession === s.id ? '1px solid var(--border-light)' : '1px solid transparent',
                transition: 'all 0.15s'
              }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 500,
                  color: activeSession === s.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {s.messages.length - 1} messages
                </div>
              </div>
              {sessions.length > 1 && (
                <button onClick={e => { e.stopPropagation(); deleteSession(s.id) }}
                  style={{
                    background: 'none', color: 'var(--text-muted)',
                    padding: 4, opacity: 0, transition: 'opacity 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                  <Trash2 size={12}/>
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{
          padding: '12px', borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-muted)', textAlign: 'center'
        }}>
          Powered by Amazon Bedrock
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, background: 'var(--bg-primary)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Bot size={16} color="white"/>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>NGO Intelligence Assistant</div>
            <div style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }}/>
              Live database · Amazon Bedrock
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, marginBottom: 20,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              animation: 'slide-up 0.2s ease'
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-card)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {msg.role === 'user'
                  ? <User size={14}/>
                  : <Bot size={14} color="var(--blue)"/>
                }
              </div>

              <div style={{ maxWidth: '72%' }}>
                <div style={{
                  background: msg.role === 'user'
                    ? 'var(--accent)'
                    : 'var(--bg-card)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                  borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                  padding: '12px 16px', fontSize: 14, lineHeight: 1.65
                }}>
                  {msg.content}
                </div>

                {/* Data table */}
                {msg.data?.length > 0 && (
                  <div style={{
                    marginTop: 8,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 10, overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '7px 12px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 11, color: 'var(--text-muted)'
                    }}>
                      <Database size={10}/>
                      <span>{msg.count} row{msg.count !== 1 ? 's' : ''} from database</span>
                    </div>
                    <div style={{ overflowX: 'auto', maxHeight: 180 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr>
                            {Object.keys(msg.data[0]).map(k => (
                              <th key={k} style={{
                                padding: '6px 12px', textAlign: 'left',
                                color: 'var(--text-muted)', fontWeight: 700,
                                borderBottom: '1px solid var(--border)',
                                textTransform: 'uppercase', fontSize: 10,
                                background: 'var(--bg-card)'
                              }}>{k.replace(/_/g, ' ')}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {msg.data.slice(0,8).map((row, ri) => (
                            <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                              {Object.values(row).map((v, vi) => (
                                <td key={vi} style={{
                                  padding: '7px 12px',
                                  color: 'var(--text-secondary)'
                                }}>
                                  {String(v ?? '—')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Dynamic follow-up suggestions */}
                {msg.role === 'assistant' && msg.suggestions?.length > 0 && i === messages.length - 1 && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {msg.suggestions.map((s, si) => (
                      <button key={si} onClick={() => send(s)}
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-secondary)',
                          borderRadius: 8, padding: '5px 10px',
                          fontSize: 11, cursor: 'pointer',
                          transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--blue)'
                          e.currentTarget.style.color = 'var(--text-primary)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--border-light)'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }}>
                        <Zap size={9} color="var(--orange)"/>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{
                  fontSize: 10, color: 'var(--text-muted)', marginTop: 4,
                  textAlign: msg.role === 'user' ? 'right' : 'left'
                }}>
                  {msg.time?.toLocaleTimeString('en-IN', {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Bot size={14} color="var(--blue)"/>
              </div>
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '4px 12px 12px 12px',
                padding: '14px 18px', display: 'flex', gap: 5, alignItems: 'center'
              }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--blue)',
                    animation: `bounce 1s ${i * 0.15}s infinite`
                  }}/>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 24px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-secondary)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 12, padding: '10px 14px',
            display: 'flex', gap: 10, alignItems: 'center',
            transition: 'border-color 0.2s'
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about donors, patients, cascades, blood supply..."
              style={{
                flex: 1, background: 'transparent',
                border: 'none', fontSize: 14, padding: 0
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: input.trim() && !loading ? 'var(--accent)' : 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s'
              }}>
              <Send size={14} color="white"/>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  )
}
