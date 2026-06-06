import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../services/api'

export default function Login() {
  const [email, setEmail]       = useState('admin@bloodwarriors.in')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await auth.login(email, password)
      localStorage.setItem('bb_token', res.data.access_token)
      localStorage.setItem('bb_admin', JSON.stringify({
        name: res.data.admin_name,
        role: res.data.role
      }))
      navigate('/dashboard')
    } catch {
      setError('Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #1a0a1a 100%)'
    }}>
      <div style={{ width: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #e11d48, #9333ea)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 28
          }}>🩸</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
            BloodBridge
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            NGO Intelligence Platform — Blood Warriors
          </p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>
            Admin Login
          </h2>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 12,
                color: 'var(--text-secondary)', marginBottom: 6,
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>Email</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@bloodwarriors.in"
                required
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block', fontSize: 12,
                color: 'var(--text-secondary)', marginBottom: 6,
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>Password</label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            {error && (
              <div style={{
                background: 'var(--red-soft)', color: '#fca5a5',
                padding: '10px 14px', borderRadius: 8,
                fontSize: 13, marginBottom: 16
              }}>{error}</div>
            )}
            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '12px' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center', color: 'var(--text-muted)',
          fontSize: 12, marginTop: 24
        }}>
          Blood Warriors Foundation · AI4Good 2.0 Hackathon
        </p>
      </div>
    </div>
  )
}
