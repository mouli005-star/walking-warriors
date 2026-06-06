import { useEffect, useState } from 'react'
import { Heart, Search, Users, Zap, X } from 'lucide-react'
import { patients, cascade } from '../services/api'

export default function Patients() {
  const [list,      setList]      = useState([])
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState(null)
  const [family,    setFamily]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [triggering,setTriggering]= useState(false)

  useEffect(() => {
    patients.list({ limit: 100 }).then(r => {
      setList(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function openPatient(p) {
    setSelected(p)
    setFamily(null)
    try {
      const r = await patients.bloodFamily(p.id)
      setFamily(r.data)
    } catch {}
  }

  async function triggerCascade(p) {
    setTriggering(true)
    const date = p.expected_next_transfusion_date
      || new Date(Date.now() + 10 * 86400000).toISOString()
    try {
      await cascade.trigger({
        patient_id: p.id,
        transfusion_date: date
      })
      alert(`Cascade triggered for patient ${p.id.slice(0,8)}`)
    } catch (e) {
      alert('Cascade error: ' + (e.response?.data?.detail || e.message))
    } finally {
      setTriggering(false)
    }
  }

  const filtered = list.filter(p =>
    !search ||
    p.blood_group?.toLowerCase().includes(search.toLowerCase()) ||
    p.id?.includes(search)
  )

  const daysUntil = (date) => {
    if (!date) return null
    const days = Math.ceil((new Date(date) - new Date()) / 86400000)
    return days
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 80px)' }}>
      {/* Left — Patient List */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="page-header">
          <h1>Patients</h1>
          <p>84 Thalassemia patients · Blood Bridge program</p>
        </div>

        {/* Search */}
        <div className="search-bar" style={{ marginBottom: 16 }}>
          <Search size={14} color="var(--text-muted)"/>
          <input
            placeholder="Search by blood group or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['O Positive','B Positive','A Positive','AB Positive'].map(bg => (
            <button key={bg} onClick={() => setSearch(bg)}
              className="stat-pill" style={{ cursor: 'pointer' }}>
              {bg} · {list.filter(p => p.blood_group === bg).length}
            </button>
          ))}
          <button onClick={() => setSearch('')} className="btn-ghost">
            Clear
          </button>
        </div>

        {/* List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading patients...
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Blood Group</th>
                  <th>Required</th>
                  <th>Next Transfusion</th>
                  <th>Blood Family</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const days = daysUntil(p.expected_next_transfusion_date)
                  const urgent = days !== null && days <= 10
                  return (
                    <tr key={p.id}
                      onClick={() => openPatient(p)}
                      style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: urgent
                              ? 'var(--red-soft)'
                              : 'var(--blue-soft)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <Heart size={12} color={urgent ? 'var(--red)' : 'var(--blue)'}/>
                          </div>
                          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {p.id?.slice(0,12)}...
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-active">{p.blood_group || '—'}</span>
                      </td>
                      <td style={{ color: 'var(--text-primary)' }}>
                        {p.required_blood_group || '—'}
                      </td>
                      <td>
                        {p.expected_next_transfusion_date ? (
                          <div>
                            <div style={{
                              color: urgent ? 'var(--red)' : 'var(--text-secondary)',
                              fontWeight: urgent ? 600 : 400
                            }}>
                              {new Date(p.expected_next_transfusion_date)
                                .toLocaleDateString('en-IN')}
                            </div>
                            {days !== null && (
                              <div style={{
                                fontSize: 11,
                                color: urgent ? 'var(--red)' : 'var(--text-muted)'
                              }}>
                                {days < 0 ? `${Math.abs(days)}d overdue`
                                  : days === 0 ? 'Today'
                                  : `in ${days} days`}
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={12} color="var(--blue)"/>
                          <span>{p.blood_family_count || 0} donors</span>
                        </div>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => triggerCascade(p)}
                          disabled={triggering}
                          className="btn-primary"
                          style={{ padding: '5px 12px', fontSize: 11 }}>
                          <Zap size={10} style={{ marginRight: 4 }}/>
                          Cascade
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right — Detail Panel */}
      {selected && (
        <div style={{
          width: 360, flexShrink: 0,
          animation: 'slide-up 0.2s ease'
        }}>
          <div className="card" style={{ marginBottom: 0 }}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: 20
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                  Patient Details
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                  {selected.id}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost"
                style={{ padding: 4 }}>
                <X size={16}/>
              </button>
            </div>

            {/* Info */}
            {[
              { label: 'Blood Group',    value: selected.blood_group },
              { label: 'Required Group', value: selected.required_blood_group },
              { label: 'Units/Session',  value: selected.quantity_required },
              { label: 'Frequency',      value: selected.frequency_in_days
                ? `Every ${selected.frequency_in_days} days` : '—' },
              { label: 'City Cluster',   value: `Zone ${selected.city_cluster}` },
              { label: 'Status',         value: selected.status },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid var(--border)'
              }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{value || '—'}</span>
              </div>
            ))}

            {/* Transfusion */}
            {selected.expected_next_transfusion_date && (
              <div style={{
                marginTop: 16, padding: '12px 14px',
                background: daysUntil(selected.expected_next_transfusion_date) <= 10
                  ? 'var(--red-soft)' : 'var(--blue-soft)',
                borderRadius: 10
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  NEXT TRANSFUSION
                </div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>
                  {new Date(selected.expected_next_transfusion_date)
                    .toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {daysUntil(selected.expected_next_transfusion_date)} days from now
                </div>
              </div>
            )}

            {/* Blood Family */}
            <div style={{ marginTop: 20 }}>
              <div style={{
                fontWeight: 600, fontSize: 14,
                marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <Users size={14} color="var(--blue)"/>
                Blood Family
                {family && (
                  <span className="badge badge-active" style={{ marginLeft: 4 }}>
                    {family.family_size} donors
                  </span>
                )}
              </div>

              {!family ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Loading...
                </div>
              ) : family.blood_family.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  No blood family assigned yet
                </div>
              ) : (
                <div style={{
                  maxHeight: 280, overflowY: 'auto',
                  display: 'flex', flexDirection: 'column', gap: 8
                }}>
                  {family.blood_family.map((bf, i) => (
                    <div key={bf.donor_id} style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 10, padding: '10px 12px',
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          {bf.donor_id?.slice(0,10)}...
                        </div>
                        <div style={{ fontSize: 12, marginTop: 2 }}>
                          <span className="badge badge-active" style={{ marginRight: 4 }}>
                            {bf.donor_blood_group}
                          </span>
                          {bf.donor_role?.replace(' Donor', '')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: 16, fontWeight: 700,
                          color: bf.base_rfmt_score >= 50
                            ? 'var(--green)' : 'var(--orange)'
                        }}>
                          {bf.base_rfmt_score}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          RFMT
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trigger button */}
            <button
              onClick={() => triggerCascade(selected)}
              className="btn-primary"
              style={{ width: '100%', marginTop: 20, padding: '11px' }}>
              <Zap size={14} style={{ marginRight: 6 }}/>
              Trigger Cascade Now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
