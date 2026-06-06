import { useEffect, useRef, useState } from 'react'
import { ai } from '../services/api'

export default function RakshaChat({ userId, userType = 'donor' }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Namaste! I'm Raksha from Blood Warriors. Ask me anything — in Telugu, Hindi or English."
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function sendMessage(question) {
    if (loading) return
    const q = question?.trim() || input.trim()
    if (!q) return

    const nextMessages = [...messages, { role: 'user', content: q }]
    setInput('')
    setMessages(nextMessages)
    setLoading(true)

    try {
      const response = await ai.chat({
        question: q,
        user_type: userType || 'donor',
        user_id: userId,
        conversation_history: messages.slice(-4).map(m => ({
          role: m.role,
          content: m.content
        }))
      })

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.answer || 'Sorry, I could not answer that.'
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, try again.'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #C0392B, #9B59B6)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            color: 'white',
            boxShadow: '0 4px 20px rgba(192,57,43,0.4)',
            zIndex: 1000,
            animation: 'float 3s ease-in-out infinite'
          }}
          aria-label="Open Raksha chat"
        >
          💬
        </button>
      )}

      {open && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 340,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: '76vh',
          borderRadius: 18,
          background: '#0D1726',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 70px rgba(0,0,0,0.35)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 200ms ease'
        }}>
          <div style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #C0392B, #9B59B6)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 18
              }}>🤖</div>
              <div>
                <div style={{ fontWeight: 700, color: '#ECF0F1' }}>Raksha</div>
                <div style={{ fontSize: 11, color: '#95A5A6' }}>Blood Warriors AI</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#95A5A6',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1
              }}
              aria-label="Close Raksha chat"
            >
              ×
            </button>
          </div>

          <div style={{
            padding: '12px 14px',
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '82%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user'
                    ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #C0392B, #9B59B6)'
                    : '#162032',
                  color: '#ECF0F1',
                  fontSize: 13,
                  lineHeight: 1.6,
                  border: msg.role === 'assistant' ? '1px solid #1E2D45' : 'none'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 6, padding: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#C0392B',
                    animation: `bounce 1s ${i * 0.15}s infinite`
                  }}/>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{
            padding: '10px 14px',
            borderTop: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {['When can I donate?', 'Mera patient?', 'నా వివరాలు'].map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{
                    background: '#162032',
                    border: '1px solid #1E2D45',
                    borderRadius: 12,
                    padding: '6px 10px',
                    fontSize: 11,
                    color: '#95A5A6',
                    cursor: 'pointer'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Ask in any language..."
                style={{
                  flex: 1,
                  background: '#162032',
                  border: '1px solid #1E2D45',
                  borderRadius: 10,
                  padding: '10px 12px',
                  color: '#ECF0F1',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading}
                style={{
                  width: 44,
                  borderRadius: 10,
                  border: 'none',
                  background: '#C0392B',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 18
                }}
                aria-label="Send message"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  )
}
