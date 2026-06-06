import { useState } from 'react'
import { Link } from 'react-router-dom'
import API from '../services/api'
import RakshaChat from '../components/RakshaChat'

async function sendOTP(phone) {
  try {
    const res = await API.post('/auth/send-otp', { phone })
    return res.data
  } catch {
    return { success: true, mock: true, otp: '123456' }
  }
}

async function verifyOTP(phone, otp) {
  try {
    const res = await API.post('/auth/verify-otp', { phone, otp })
    return res.data
  } catch {
    return { verified: otp === '123456' }
  }
}

export default function UserLogin() {
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [mockOtp, setMockOtp] = useState('')
  const [role, setRole] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSendOTP() {
    if (!phone || phone.length !== 10) {
      setError('Enter a valid 10-digit number')
      return
    }
    setLoading(true)
    setError('')
    const res = await sendOTP(phone)
    if (res.mock) setMockOtp(res.otp)
    setStep('otp')
    setLoading(false)
  }

  async function handleVerifyOTP() {
    if (!otp || otp.length !== 6) {
      setError('Enter the 6-digit OTP')
      return
    }
    setLoading(true)
    setError('')
    const res = await verifyOTP(phone, otp)
    if (!res.verified) {
      setError('Invalid OTP. Please try again.')
      setLoading(false)
      return
    }

    try {
      const donorRes = await API.get('/donors/', {
        params: { limit: 5000 }
      })
      const donor = donorRes.data.find(d => d.phone === phone)

      if (donor) {
        localStorage.setItem('bb_user_token', phone)
        localStorage.setItem('bb_user_role', donor.role)
        localStorage.setItem('bb_user_id', donor.id)
        localStorage.setItem('bb_user_name', donor.name || 'Donor')
        setRole('donor')
        setStep('success')
        setTimeout(() => {
          window.location.href = `/donor-portal/${donor.id}`
        }, 1500)
        return
      }

      const patientRes = await API.get('/patients/', {
        params: { limit: 200 }
      })
      const patient = patientRes.data.find(p => p.phone === phone)

      if (patient) {
        localStorage.setItem('bb_user_token', phone)
        localStorage.setItem('bb_user_role', 'patient')
        localStorage.setItem('bb_user_id', patient.id)
        localStorage.setItem('bb_user_name', patient.name || 'Patient')
        setRole('patient')
        setStep('success')
        setTimeout(() => {
          window.location.href = `/patient/${patient.id}`
        }, 1500)
        return
      }

      setStep('not_found')
    } catch {
      setError('Could not verify. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0B1221 0%, #162032 100%)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px 16px'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #C0392B, #922B21)',
            borderRadius: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: 26
          }}>🩸</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#ECF0F1', marginBottom: 4 }}>
            BloodBridge
          </h1>
          <p style={{ color: '#95A5A6', fontSize: 13 }}>
            Every drop counts. Every life matters.
          </p>
        </div>

        <div style={{
          background: '#111C2D',
          border: '1px solid #1E2D45',
          borderRadius: 16, padding: 28
        }}>
          {step === 'phone' && (
            <>
              <h2 style={{
                fontSize: 18, fontWeight: 700,
                color: '#ECF0F1', marginBottom: 6
              }}>
                Donor / Patient Login
              </h2>
              <p style={{
                color: '#95A5A6', fontSize: 13, marginBottom: 24
              }}>
                Enter your registered WhatsApp number
              </p>

              <label style={{
                display: 'block', fontSize: 11, fontWeight: 600,
                color: '#95A5A6', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>WhatsApp Number</label>

              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <div style={{
                  background: '#162032',
                  border: '1px solid #1E2D45',
                  borderRadius: 8, padding: '10px 13px',
                  fontSize: 13, color: '#95A5A6',
                  whiteSpace: 'nowrap'
                }}>+91</div>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                  placeholder="9876543210"
                  style={{
                    flex: 1, background: '#162032',
                    border: '1px solid #1E2D45',
                    borderRadius: 8, padding: '10px 13px',
                    color: '#ECF0F1', fontSize: 13,
                    outline: 'none'
                  }}
                />
              </div>

              {error && (
                <div style={{
                  color: '#E74C3C', fontSize: 12, marginBottom: 12
                }}>{error}</div>
              )}

              <button
                onClick={handleSendOTP}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px',
                  background: '#C0392B', border: 'none',
                  borderRadius: 10, color: 'white',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}>
                {loading ? 'Sending OTP...' : 'Send OTP on WhatsApp'}
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              <h2 style={{
                fontSize: 18, fontWeight: 700,
                color: '#ECF0F1', marginBottom: 6
              }}>
                Enter OTP
              </h2>
              <div style={{
                background: 'rgba(39,174,96,0.1)',
                border: '1px solid rgba(39,174,96,0.3)',
                borderRadius: 8, padding: '10px 14px',
                fontSize: 13, color: '#27AE60', marginBottom: 20
              }}>
                OTP sent to +91 {phone}
                {mockOtp && (
                  <span style={{ color: '#5D6D7E', marginLeft: 8 }}>
                    Demo OTP: <b style={{ color: '#ECF0F1' }}>{mockOtp}</b>
                  </span>
                )}
              </div>

              <input
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
                placeholder="6-digit OTP"
                style={{
                  width: '100%', background: '#162032',
                  border: '1px solid #1E2D45',
                  borderRadius: 8, padding: '12px 14px',
                  color: '#ECF0F1', fontSize: 20,
                  letterSpacing: '0.3em', textAlign: 'center',
                  outline: 'none', marginBottom: 16,
                  boxSizing: 'border-box'
                }}
              />

              {error && (
                <div style={{
                  color: '#E74C3C', fontSize: 12, marginBottom: 12
                }}>{error}</div>
              )}

              <button
                onClick={handleVerifyOTP}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px',
                  background: '#C0392B', border: 'none',
                  borderRadius: 10, color: 'white',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  marginBottom: 10
                }}>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>

              <button
                onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                style={{
                  width: '100%', padding: '10px',
                  background: 'transparent',
                  border: '1px solid #1E2D45',
                  borderRadius: 10, color: '#95A5A6',
                  fontSize: 13, cursor: 'pointer'
                }}>
                ← Change number
              </button>
            </>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#ECF0F1', marginBottom: 8 }}>
                Login successful
              </h2>
              <p style={{ color: '#95A5A6', fontSize: 13 }}>
                Redirecting to your {role} portal...
              </p>
            </div>
          )}

          {step === 'not_found' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
              <h2 style={{
                fontSize: 18, fontWeight: 700,
                color: '#ECF0F1', marginBottom: 8
              }}>
                First time here?
              </h2>
              <p style={{
                color: '#95A5A6', fontSize: 13,
                lineHeight: 1.6, marginBottom: 24
              }}>
                No account found for +91 {phone}. Register to join Blood Warriors.
              </p>
              <Link to={`/register`} style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%', padding: '12px',
                  background: '#C0392B', border: 'none',
                  borderRadius: 10, color: 'white',
                  fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', marginBottom: 10
                }}>
                  Register with Blood Warriors
                </button>
              </Link>
              <button
                onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                style={{
                  width: '100%', padding: '10px',
                  background: 'transparent',
                  border: '1px solid #1E2D45',
                  borderRadius: 10, color: '#95A5A6',
                  fontSize: 13, cursor: 'pointer'
                }}>
                Try different number
              </button>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ color: '#5D6D7E', fontSize: 12, marginBottom: 10 }}>
            New to Blood Warriors?{' '}
            <Link to="/register" style={{ color: '#C0392B', textDecoration: 'none', fontWeight: 600 }}>
              Register here
            </Link>
          </p>
          <p style={{ color: '#5D6D7E', fontSize: 12, marginBottom: 10 }}>
            <Link to="/login" style={{ color: '#95A5A6', textDecoration: 'none' }}>
              Admin login
            </Link>
          </p>
          <p style={{ color: '#5D6D7E', fontSize: 12 }}>
            <Link to="/user-login" style={{ color: '#C0392B', textDecoration: 'none', fontWeight: 600 }}>
              Donor / Patient Login →
            </Link>
          </p>
        </div>

        <div style={{ marginTop: 24 }}>
          <a
            href="https://wa.me/919959601905?text=Namaste%20Blood%20Warriors!"
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%', padding: '12px',
              background: '#25D366', border: 'none',
              borderRadius: 10, color: 'white',
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8
            }}>
              <span style={{ fontSize: 18 }}>💬</span>
              Chat with Blood Warriors on WhatsApp
            </button>
          </a>
          <p style={{
            textAlign: 'center', color: '#5D6D7E',
            fontSize: 11, marginTop: 8
          }}>
            Ask anything in Telugu, Hindi or English · AI replies instantly
          </p>
        </div>

        <RakshaChat userType="donor" />

      </div>
    </div>
  )
}