import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { donors } from '../services/api'
import RakshaChat from '../components/RakshaChat'

export default function DonorPortal() {
  const { donorId } = useParams()
  const [donor, setDonor] = useState(null)

  useEffect(() => {
    if (!donorId) return
    donors.get(donorId).then(r => setDonor(r.data)).catch(() => {})
  }, [donorId])

  const daysUntilEligible = () => {
    if (!donor?.next_eligible_date) return null
    const days = Math.ceil(
      (new Date(donor.next_eligible_date) - new Date()) / 86400000
    )
    return days
  }

  const eligible = daysUntilEligible()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B1221',
      padding: '20px 16px'
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 12, marginBottom: 20
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #C0392B, #922B21)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 20
          }}>🩸</div>
          <div>
            <div style={{
              fontWeight: 700, fontSize: 18, color: '#ECF0F1'
            }}>
              {donor?.name || 'Donor Portal'}
            </div>
            <div style={{ fontSize: 12, color: '#95A5A6' }}>
              Blood Warriors · {donor?.role || 'Donor'}
            </div>
          </div>
        </div>

        {donor && (
          <div style={{
            background: eligible !== null && eligible <= 0
              ? 'linear-gradient(135deg, #1A3A2A, #162032)'
              : 'linear-gradient(135deg, #2C1A1A, #162032)',
            border: `1px solid ${eligible !== null && eligible <= 0
              ? 'rgba(39,174,96,0.4)' : 'rgba(192,57,43,0.4)'}`,
            borderRadius: 14, padding: 20, marginBottom: 16
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: '#95A5A6',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              marginBottom: 8
            }}>
              Donation Eligibility
            </div>

            {eligible !== null ? (
              eligible <= 0 ? (
                <>
                  <div style={{
                    fontSize: 24, fontWeight: 800,
                    color: '#27AE60', marginBottom: 4
                  }}>
                    You can donate today!
                  </div>
                  <div style={{ fontSize: 13, color: '#95A5A6' }}>
                    You are eligible to donate blood right now
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    fontSize: 24, fontWeight: 800,
                    color: '#E67E22', marginBottom: 4
                  }}>
                    {eligible} days until eligible
                  </div>
                  <div style={{ fontSize: 13, color: '#95A5A6' }}>
                    Next eligible:{' '}
                    {new Date(donor.next_eligible_date)
                      .toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long'
                      })}
                  </div>
                </>
              )
            ) : (
              <div style={{
                fontSize: 20, fontWeight: 700,
                color: '#27AE60'
              }}>
                Eligible to donate
              </div>
            )}

            <div style={{
              marginTop: 14, display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr', gap: 10
            }}>
              {[
                { label: 'Blood Group', value: donor.blood_group },
                { label: 'Total Donations', value: donor.donations_till_date || 0 },
                { label: 'RFMT Score', value: donor.base_rfmt_score },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 8, padding: '8px 10px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: 16, fontWeight: 700, color: '#ECF0F1'
                  }}>
                    {value || '—'}
                  </div>
                  <div style={{ fontSize: 10, color: '#5D6D7E', marginTop: 2 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {donor?.role === 'Bridge Donor' && (
          <div style={{
            background: 'rgba(52,152,219,0.1)',
            border: '1px solid rgba(52,152,219,0.3)',
            borderRadius: 12, padding: '14px 16px',
            marginBottom: 16
          }}>
            <div style={{
              fontWeight: 600, fontSize: 14,
              color: '#3498DB', marginBottom: 4
            }}>
              🤝 You are a Bridge Donor
            </div>
            <div style={{ fontSize: 12, color: '#95A5A6', lineHeight: 1.5 }}>
              You are permanently assigned to specific Thalassemia patients.
              They depend on you every 20-25 days. When they need blood,
              we will reach you first.
            </div>
          </div>
        )}

        {donor?.churn_risk === 'HIGH' && (
          <div style={{
            background: 'rgba(192,57,43,0.1)',
            border: '1px solid rgba(192,57,43,0.3)',
            borderRadius: 12, padding: '14px 16px',
            marginBottom: 16
          }}>
            <div style={{
              fontWeight: 600, fontSize: 13,
              color: '#E74C3C', marginBottom: 4
            }}>
              ⚠️ We miss you
            </div>
            <div style={{ fontSize: 12, color: '#95A5A6' }}>
              It has been a while since we connected.
              Patients are waiting for donors like you.
            </div>
          </div>
        )}

        <RakshaChat userId={donorId} userType="donor" />

        <a
          href="https://wa.me/919959601905?text=Namaste%20Blood%20Warriors!"
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: 'none', display: 'block', marginTop: 16 }}>
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
            Continue on WhatsApp
          </button>
        </a>

        <p style={{
          textAlign: 'center', color: '#5D6D7E',
          fontSize: 11, marginTop: 8
        }}>
          Blood Warriors · Every drop counts. Every life matters.
        </p>

      </div>

      <style>{`\n        @keyframes bounce {\n          0%, 60%, 100% { transform: translateY(0); }\n          30% { transform: translateY(-5px); }\n        }\n      `}</style>
    </div>
  )
}