import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { dashboard } from '../services/api'

const CLUSTER_COORDS = [
  [17.385, 78.4867],  // Hyderabad
  [13.0827, 80.2707], // Chennai
  [12.9716, 77.5946], // Bangalore
  [19.0760, 72.8777], // Mumbai
  [17.6868, 83.2185], // Vizag
  [16.5062, 80.6480], // Vijayawada
  [15.3173, 75.7139], // Hubli
  [11.0168, 76.9558], // Coimbatore
]

const COLORS = { CRITICAL: 'var(--red)', WARNING: 'var(--orange)', OK: 'var(--green)' }

function LegendControl() {
  return (
    <div style={{
      position: 'absolute', bottom: 30, right: 10,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 10, padding: '12px 16px',
      zIndex: 1000, minWidth: 140
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10
      }}>Blood Supply</div>
      {[
        { color: 'var(--red)', label: 'Critical shortage' },
        { color: 'var(--orange)', label: 'Warning level'    },
        { color: 'var(--green)', label: 'Adequate supply'  },
      ].map(({ color, label }) => (
        <div key={label} style={{
          display: 'flex', alignItems: 'center',
          gap: 8, marginBottom: 6
        }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%', background: color
          }}/>
          <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

export default function ScarcityMap() {
  const [scarcity,  setScarcity]  = useState(null)
  const [selected,  setSelected]  = useState(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    dashboard.scarcity().then(r => {
      setScarcity(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Group by cluster
  const clusterMap = {}
  if (scarcity) {
    const all = [
      ...(scarcity.critical || []),
      ...(scarcity.warning  || []),
    ]
    all.forEach(z => {
      if (!clusterMap[z.city_cluster]) {
        clusterMap[z.city_cluster] = {
          worst: z.warning_level,
          zones: []
        }
      }
      clusterMap[z.city_cluster].zones.push(z)
      if (z.warning_level === 'CRITICAL') {
        clusterMap[z.city_cluster].worst = 'CRITICAL'
      }
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Blood Supply Scarcity Map
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Real-time city-level blood availability across donor network
        </p>
      </div>

      {/* Summary Cards */}
      {scarcity && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: 12, marginBottom: 20
        }}>
          {[
            { label: 'Critical Zones', value: scarcity.summary.critical_zones, color: 'var(--red)', bg: 'var(--red-soft)' },
            { label: 'Warning Zones',  value: scarcity.summary.warning_zones,  color: 'var(--orange)', bg: 'var(--orange-soft)' },
            { label: 'OK Zones',       value: scarcity.summary.ok_zones,       color: 'var(--green)', bg: 'var(--green-soft)' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="card" style={{
              display: 'flex', alignItems: 'center', gap: 16
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 10,
                background: bg,
                display: 'flex', alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22, fontWeight: 700, color
              }}>{value}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  city zones
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ position: 'relative', height: 480 }}>
          <MapContainer
            center={[17.0, 79.0]} zoom={6}
            style={{ height: '100%', width: '100%', background: 'var(--bg-primary)' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution="BloodBridge · Blood Warriors"
            />
            {CLUSTER_COORDS.map((coords, i) => {
              const cluster = clusterMap[i]
              const color   = cluster
                ? COLORS[cluster.worst]
                : 'var(--green)'
              const radius  = cluster?.worst === 'CRITICAL' ? 28
                            : cluster?.worst === 'WARNING'  ? 22
                            : 16

              return (
                <CircleMarker
                  key={i} center={coords}
                  radius={radius}
                  pathOptions={{
                    color, fillColor: color,
                    fillOpacity: 0.35, weight: 2,
                    opacity: 0.9
                  }}
                  eventHandlers={{
                    click: () => setSelected({ index: i, cluster, coords })
                  }}
                >
                  <Popup>
                    <div style={{
                      background: 'var(--bg-card)', color: 'var(--text-primary)',
                      padding: 12, borderRadius: 8, minWidth: 200
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>
                        Zone {i} — {['Hyderabad','Chennai','Bangalore',
                          'Mumbai','Vizag','Vijayawada','Hubli','Coimbatore'][i]}
                      </div>
                      {cluster?.zones?.map((z, j) => (
                        <div key={j} style={{
                          display: 'flex', justifyContent: 'space-between',
                          fontSize: 12, marginBottom: 4,
                          color: COLORS[z.warning_level]
                        }}>
                          <span>{z.blood_group}</span>
                          <span>{z.eligible_donors} donors · {z.warning_level}</span>
                        </div>
                      ))}
                      {!cluster && (
                        <div style={{ color: 'var(--green)', fontSize: 12 }}>
                          Supply adequate
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
            <LegendControl/>
          </MapContainer>
        </div>
      </div>

      {/* Detail Table */}
      {scarcity?.critical?.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
            Critical Shortage Details
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Zone','Blood Group','Eligible Donors','Status'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 12px',
                    fontSize: 11, color: 'var(--text-muted)',
                    fontWeight: 600, textTransform: 'uppercase'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scarcity.critical.map((z, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>Zone {z.city_cluster}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{z.blood_group}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>
                    {z.eligible_donors}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className="badge badge-critical">CRITICAL</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
