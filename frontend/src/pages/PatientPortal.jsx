import { useEffect, useState } from 'react'
import { Heart, Users, Calendar, Clock, Activity } from 'lucide-react'
import { patients } from '../services/api'
import { useParams, Link, useNavigate } from 'react-router-dom'
import RakshaChat from '../components/RakshaChat'

export default function PatientPortal() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const [lookupId, setLookupId] = useState(patientId || '')
  const [patient, setPatient] = useState(null)
  const [family, setFamily] = useState(null)

  useEffect(() => {
    if (!patientId) return
    patients.get(patientId).then(r => setPatient(r.data)).catch(() => {})
    patients.bloodFamily(patientId).then(r => setFamily(r.data)).catch(() => {})
  }, [patientId])

  const daysUntil = (date) => {
    if (!date) return null
    return Math.ceil((new Date(date) - new Date()) / 86400000)
  }

  if (!patientId) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-primary)', padding: 24 }}>
        <div className="card" style={{ width: '100%', maxWidth: 460, padding: 28 }}>
          <div style={{ fontSize: 42, marginBottom: 14 }}>🩸</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Blood Warriors Patient Portal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 18 }}>
            Enter your patient ID to view your blood support details
          </p>
          <input
            value={lookupId}
            onChange={e => setLookupId(e.target.value)}
            placeholder="Enter your Patient ID"
            style={{ marginBottom: 12 }}
          />
          <button
            className="btn-primary"
            style={{ width: '100%', padding: 12 }}
            onClick={() => lookupId.trim() && navigate(`/patient/${lookupId.trim()}`)}
          >
            View My Details
          </button>
          <a
            href="https://wa.me/919959601905?text=Namaste%20Blood%20Warriors!"
            target="_blank"
            rel="noreferrer"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              background: '#25D366',
              color: 'white',
              fontWeight: 700,
              marginTop: 12
            }}>
            💬
            Chat with Blood Warriors on WhatsApp
          </a>
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-header">
        <h1>Patient Portal</h1>
        <p>Blood Warriors · Blood Bridge Program</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18 }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--red-soft)', display: 'grid', placeItems: 'center', fontSize: 22 }}>🩸</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22 }}>{patient?.name || 'Patient Portal'}</h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Blood Warriors · Blood Bridge Program</div>
            </div>
          </div>

          {patient && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
              <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Calendar size={16} />
                  <strong>Next Transfusion</strong>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                  {patient.expected_next_transfusion_date
                    ? new Date(patient.expected_next_transfusion_date).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })
                    : 'Not scheduled'}
                </div>
                {daysUntil(patient.expected_next_transfusion_date) !== null && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    {daysUntil(patient.expected_next_transfusion_date)} days left
                  </div>
                )}
              </div>

              <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Heart size={16} />
                  <strong>Care Plan</strong>
                </div>
                <div>Blood: <strong>{patient.required_blood_group || patient.blood_group}</strong></div>
                <div>Units: <strong>{patient.quantity_required || 2}</strong></div>
                <div>Every: <strong>{patient.frequency_in_days || 21} days</strong></div>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Activity size={18} />
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>Your Blood Family</h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                {family?.family_size ? `${family.family_size} donors` : 'Loading donors...'}
              </div>
            </div>
          </div>

          {family?.blood_family?.slice(0, 5)?.map((bf, i) => (
            <div key={bf.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i === Math.min(family.blood_family.length, 5) - 1 ? 'none' : '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Donor {String.fromCharCode(65 + i)}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {bf.donor_blood_group} · {bf.donor_role?.replace(' Donor', '')}
                </div>
              </div>
              <div style={{ color: bf.base_rfmt_score >= 50 ? '#27AE60' : '#E67E22', fontWeight: 700 }}>
                {bf.base_rfmt_score} RFMT
              </div>
            </div>
          ))}
        </div>
      </div>

      <a
        href="https://wa.me/919959601905?text=Namaste%20Blood%20Warriors!"
        target="_blank"
        rel="noreferrer"
        style={{
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 14px',
          borderRadius: 10,
          background: '#25D366',
          color: 'white',
          fontWeight: 700,
          marginTop: 18
        }}>
        💬
        Chat with Blood Warriors on WhatsApp
      </a>

      <RakshaChat userId={patientId} userType="patient" />
    </div>
  )
}