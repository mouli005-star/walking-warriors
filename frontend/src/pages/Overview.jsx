import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import { Heart, Users, Zap, AlertTriangle, TrendingUp, Clock } from 'lucide-react'
import { patients, donors, cascade, dashboard } from '../services/api'

const COLORS = {
  LOW:    'var(--green)',
  MEDIUM: 'var(--orange)',
  HIGH:   'var(--red)',
}

const BG_COLORS = ['var(--blue)','var(--accent)','var(--green)','var(--orange)','var(--text-muted)','var(--border-light)','var(--text-secondary)','var(--red)']

function MetricCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 10, marginBottom: 16
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--bg-elevated)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={18} color={color}/>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
      {trend && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 12, color: 'var(--green)', marginTop: 8
        }}>
          <TrendingUp size={12}/> {trend}
        </div>
      )}
    </div>
  )
}

export default function Overview() {
  const [stats,    setStats]    = useState(null)
  const [churn,    setChurn]    = useState(null)
  const [roles,    setRoles]    = useState(null)
  const [scarcity, setScarcity] = useState(null)
  const [runs,     setRuns]     = useState([])

  useEffect(() => {
    patients.list({ limit: 1 }).then(r => setStats(s => ({
      ...s, patients: r.data.length
    }))).catch(() => {})

    donors.churn().then(r => setChurn(r.data)).catch(() => {})
    donors.byRole().then(r => setRoles(r.data)).catch(() => {})
    dashboard.scarcity().then(r => setScarcity(r.data)).catch(() => {})
    cascade.runs({ limit: 5 }).then(r => setRuns(r.data)).catch(() => {})

    patients.list({ limit: 100 }).then(r => setStats(s => ({
      ...s, patients: r.data.length
    }))).catch(() => {})
  }, [])

  const churnData = churn ? [
    { name: 'Low Risk',    value: churn.churn_summary?.LOW    || 0, key: 'LOW'    },
    { name: 'Medium Risk', value: churn.churn_summary?.MEDIUM || 0, key: 'MEDIUM' },
    { name: 'High Risk',   value: churn.churn_summary?.HIGH   || 0, key: 'HIGH'   },
  ] : []

  const rolesData = roles ? Object.entries(roles).map(([role, data]) => ({
    name: role.replace(' Donor', ''),
    donors: data.count,
    avg_score: data.avg_rfmt
  })) : []

  const activeRuns = runs.filter(r => r.status === 'ACTIVE').length

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Operations Overview
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Blood Warriors · Real-time NGO Intelligence Dashboard
        </p>
      </div>

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16, marginBottom: 24
      }}>
        <MetricCard
          icon={Heart} label="Active Patients"
          value={84} color="var(--accent)"
          sub="Thalassemia patients"
          trend="Transfusions tracked"
        />
        <MetricCard
          icon={Users} label="Eligible Donors"
          value={churn ? (churn.total_donors - (churn.churn_summary?.HIGH || 0)) : '—'}
          color="var(--blue)"
          sub={churn ? `${churn.high_risk_pct}% high churn risk` : ''}
        />
        <MetricCard
          icon={Zap} label="Active Cascades"
          value={activeRuns}
          color="var(--orange)"
          sub="Running right now"
        />
        <MetricCard
          icon={AlertTriangle} label="Critical Zones"
          value={scarcity?.summary?.critical_zones || 0}
          color="var(--red)"
          sub={`${scarcity?.summary?.warning_zones || 0} warning zones`}
        />
      </div>

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16, marginBottom: 24
      }}>
        {/* Donor Role Distribution */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            Donor Distribution by Role
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            Count and average RFMT score per role
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rolesData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}/>
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}/>
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 13
                }}
              />
              <Bar dataKey="donors" fill="var(--blue)" radius={[4,4,0,0]} name="Donors"/>
              <Bar dataKey="avg_score" fill="var(--accent)" radius={[4,4,0,0]} name="Avg RFMT"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Churn Risk */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            Donor Churn Risk Analysis
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            Retention risk across donor pool
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={churnData} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="value"
                >
                  {churnData.map((entry) => (
                    <Cell key={entry.key} fill={COLORS[entry.key]}/>
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8, fontSize: 13
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {churnData.map(d => (
                <div key={d.key} style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: COLORS[d.key]
                    }}/>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {d.name}
                    </span>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>
                    {d.value.toLocaleString()}
                  </span>
                </div>
              ))}
              {churn && (
                <div style={{
                  marginTop: 16, padding: '10px 14px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    HIGH RISK
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>
                    {churn.high_risk_pct}%
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    of donor pool needs intervention
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Cascades */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 20
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Live Cascade Feed</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Auto-refreshing
          </span>
        </div>

        {runs.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px 0',
            color: 'var(--text-muted)', fontSize: 14
          }}>
            No cascades triggered yet.
            <br/>
            <span style={{ fontSize: 12 }}>
              Trigger one from the Cascades page to see it here.
            </span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Patient ID','Transfusion Date','Stage','Status','Confirmed/Needed'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 12px',
                    fontSize: 11, color: 'var(--text-muted)',
                    fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id} style={{
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.1s'
                }}>
                  <td style={{ padding: '12px', fontSize: 13 }}>
                    {run.patient_id?.slice(0,8)}...
                  </td>
                  <td style={{ padding: '12px', fontSize: 13 }}>
                    {run.transfusion_date
                      ? new Date(run.transfusion_date).toLocaleDateString('en-IN')
                      : '—'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <StageProgress stage={run.current_stage}/>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={`badge badge-${run.status?.toLowerCase()}`}>
                      {run.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: 13 }}>
                    {run.units_confirmed} / {run.units_needed} units
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Scarcity Alert Bar */}
      {scarcity?.critical?.length > 0 && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--red)',
          borderRadius: 12, padding: '16px 20px'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: 8, marginBottom: 12
          }}>
            <AlertTriangle size={16} color="var(--red)"/>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
              {scarcity.critical.length} Critical Blood Shortage Zones
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {scarcity.critical.slice(0,6).map((z, i) => (
              <span key={i} style={{
                background: 'var(--red-soft)',
                border: '1px solid var(--red)',
                color: 'var(--text-primary)', borderRadius: 6,
                padding: '4px 10px', fontSize: 12
              }}>
                Zone {z.city_cluster} · {z.blood_group} ({z.eligible_donors} donors)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const STAGES = ['BLOOD_FAMILY','BACKUP_POOL','EXPANDED','BLOOD_BANK','NGO_ALERT']
const STAGE_COLORS = {
  BLOOD_FAMILY: 'var(--green)',
  BACKUP_POOL:  'var(--blue)',
  EXPANDED:     'var(--orange)',
  BLOOD_BANK:   'var(--text-secondary)',
  NGO_ALERT:    'var(--red)'
}

function StageProgress({ stage }) {
  const idx = STAGES.indexOf(stage)
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {STAGES.map((s, i) => (
        <div key={s} style={{
          width: 20, height: 4, borderRadius: 2,
          background: i <= idx
            ? STAGE_COLORS[stage]
            : 'var(--border)'
        }}/>
      ))}
      <span style={{
        fontSize: 11, color: 'var(--text-muted)',
        marginLeft: 4
      }}>{idx + 1}/5</span>
    </div>
  )
}
