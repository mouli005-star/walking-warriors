import { useEffect, useState } from 'react'
import { Users, Search, TrendingDown, MapPin, Filter } from 'lucide-react'
import { donors } from '../services/api'

const RFMT_COLOR = (score) =>
  score >= 70 ? 'var(--green)'
  : score >= 40 ? 'var(--orange)'
  : 'var(--red)'

const ROLES = ['All', 'Bridge Donor', 'Emergency Donor', 'Guest']
const CHURNS = ['All', 'HIGH', 'MEDIUM', 'LOW']

export default function Donors() {
  const [list,    setList]    = useState([])
  const [search,  setSearch]  = useState('')
  const [role,    setRole]    = useState('All')
  const [churn,   setChurn]   = useState('All')
  const [loading, setLoading] = useState(true)
  const [churnStats, setChurnStats] = useState(null)

  useEffect(() => {
    const params = { limit: 100 }
    if (role  !== 'All') params.role = role
    if (churn !== 'All') params.churn_risk = churn

    donors.list(params).then(r => {
      setList(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))

    donors.churn().then(r => setChurnStats(r.data)).catch(() => {})
  }, [role, churn])

  const filtered = list.filter(d =>
    !search ||
    d.blood_group?.toLowerCase().includes(search.toLowerCase()) ||
    d.role?.toLowerCase().includes(search.toLowerCase()) ||
    d.id?.includes(search)
  )

  return (
    <div>
      <div className="page-header">
        <h1>Donors</h1>
        <p>
          {list.length} donors · ranked by RFMT score ·
          {churnStats ? ` ${churnStats.churn_summary?.HIGH} high churn risk` : ''}
        </p>
      </div>

      {/* Churn risk summary */}
      {churnStats && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: 12, marginBottom: 20
        }}>
          {[
            { key: 'LOW',    label: 'Low Risk',    color: 'var(--green)', bg: 'var(--green-soft)' },
            { key: 'MEDIUM', label: 'Medium Risk', color: 'var(--orange)', bg: 'var(--orange-soft)' },
            { key: 'HIGH',   label: 'High Risk',   color: 'var(--red)', bg: 'var(--red-soft)' },
          ].map(({ key, label, color, bg }) => (
            <div key={key}
              className="card"
              onClick={() => setChurn(key)}
              style={{
                cursor: 'pointer',
                borderColor: churn === key ? color : 'var(--border)',
                background: churn === key ? bg : 'var(--bg-card)'
              }}>
              <div style={{ fontSize: 28, fontWeight: 800, color }}>
                {churnStats.churn_summary?.[key]?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {label}
              </div>
              {key === 'HIGH' && (
                <div style={{
                  fontSize: 11, color, marginTop: 6,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  <TrendingDown size={11}/> Needs intervention
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 16,
        flexWrap: 'wrap', alignItems: 'center'
      }}>
        <div className="search-bar" style={{ flex: 1, maxWidth: 300 }}>
          <Search size={13} color="var(--text-muted)"/>
          <input
            placeholder="Search blood group, role, ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ROLES.map(r => (
            <button key={r}
              onClick={() => setRole(r)}
              className={role === r ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '7px 12px', fontSize: 12 }}>
              {r === 'All' ? 'All Roles' : r.replace(' Donor', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Donor ID</th>
              <th>Role</th>
              <th>Blood Group</th>
              <th>RFMT Score</th>
              <th>Eligibility</th>
              <th>Churn Risk</th>
              <th>Donations</th>
              <th>Last Donated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                Loading...
              </td></tr>
            ) : filtered.map(d => (
              <tr key={d.id}>
                <td>
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                    {d.id?.slice(0,12)}...
                  </span>
                </td>
                <td>
                  <span className={`badge ${
                    d.role === 'Bridge Donor'    ? 'badge-active'   :
                    d.role === 'Emergency Donor' ? 'badge-warning'  :
                    'badge-pending'
                  }`}>
                    {d.role?.replace(' Donor', '') || '—'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {d.blood_group || '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 48, height: 4, borderRadius: 2,
                      background: 'var(--border)', overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(d.base_rfmt_score / 100) * 100}%`,
                        height: '100%',
                        background: RFMT_COLOR(d.base_rfmt_score),
                        borderRadius: 2
                      }}/>
                    </div>
                    <span style={{
                      fontWeight: 700, fontSize: 13,
                      color: RFMT_COLOR(d.base_rfmt_score)
                    }}>
                      {d.base_rfmt_score}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={
                    d.eligibility_status === 'eligible'
                      ? 'badge badge-ok'
                      : 'badge badge-warning'
                  }>
                    {d.eligibility_status || '—'}
                  </span>
                </td>
                <td>
                  <span className={`badge badge-${d.churn_risk?.toLowerCase() || 'low'}`}>
                    {d.churn_risk || '—'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {d.donations_till_date || 0}
                </td>
                <td style={{ fontSize: 12 }}>
                  {d.last_donation_date
                    ? new Date(d.last_donation_date).toLocaleDateString('en-IN')
                    : <span style={{ color: 'var(--text-muted)' }}>Never</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
