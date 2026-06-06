import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Heart, Zap,
  MapPin, MessageSquare, FileText, LogOut,
  ChevronLeft, ChevronRight
} from 'lucide-react'

const links = [
  { to: '/dashboard',          icon: LayoutDashboard, label: 'Overview'     },
  { to: '/dashboard/patients', icon: Heart,           label: 'Patients'     },
  { to: '/dashboard/donors',   icon: Users,           label: 'Donors'       },
  { to: '/dashboard/cascades', icon: Zap,             label: 'Cascades'     },
  { to: '/dashboard/scarcity', icon: MapPin,          label: 'Scarcity Map' },
  { to: '/dashboard/ai-chat',  icon: MessageSquare,   label: 'AI Analytics' },
  { to: '/dashboard/audit',    icon: FileText,        label: 'Audit Log'    },
]

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate()
  const adminRaw = localStorage.getItem('bb_admin')
  const admin = adminRaw ? JSON.parse(adminRaw) : { name: 'Admin' }
  const width = collapsed ? 64 : 240

  function logout() {
    localStorage.removeItem('bb_token')
    localStorage.removeItem('bb_admin')
    navigate('/login')
  }

  return (
    <aside style={{
      width: width, minHeight: '100vh',
      background: '#111C2D',
      borderRight: '1px solid #1E2D45',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, zIndex: 100,
      transition: 'width 0.2s ease',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: collapsed ? '20px 0' : '20px 16px',
        borderBottom: '1px solid #1E2D45',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 10
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, #C0392B, #922B21)',
              borderRadius: 8, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 16
            }}>🩸</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#ECF0F1' }}>
                BloodBridge
              </div>
              <div style={{ fontSize: 10, color: '#5D6D7E' }}>NGO Platform</div>
            </div>
          </div>
        )}

        {collapsed && (
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #C0392B, #922B21)',
            borderRadius: 8, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 16
          }}>🩸</div>
        )}

        <button
          onClick={onToggle}
          style={{
            background: '#162032', border: '1px solid #1E2D45',
            borderRadius: 6, width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#95A5A6', flexShrink: 0
          }}>
          {collapsed ? <ChevronRight size={13}/> : <ChevronLeft size={13}/>}
        </button>
      </div>

      {!collapsed && (
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid #1E2D45',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#27AE60',
            animation: 'pulse-dot 2s infinite'
          }}/>
          <span style={{ fontSize: 11, color: '#27AE60' }}>System Live</span>
        </div>
      )}

      <nav style={{ flex: 1, padding: '10px 0' }}>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : 10,
              padding: collapsed ? '11px 0' : '10px 16px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              textDecoration: 'none', fontSize: 13, fontWeight: 500,
              color: isActive ? '#ECF0F1' : '#95A5A6',
              background: isActive ? '#162032' : 'transparent',
              borderLeft: isActive ? '2px solid #C0392B' : '2px solid transparent',
              transition: 'all 0.15s',
              position: 'relative'
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} color={isActive ? '#C0392B' : '#5D6D7E'}/>
                {!collapsed && label}
                {collapsed && (
                  <div style={{
                    position: 'absolute', left: 70,
                    background: '#162032',
                    border: '1px solid #1E2D45',
                    borderRadius: 6, padding: '4px 10px',
                    fontSize: 12, whiteSpace: 'nowrap',
                    pointerEvents: 'none', opacity: 0,
                    color: '#ECF0F1', zIndex: 200
                  }} className="sidebar-tooltip">
                    {label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{
        padding: collapsed ? '12px 0' : '14px 16px',
        borderTop: '1px solid #1E2D45',
        display: 'flex', flexDirection: 'column',
        alignItems: collapsed ? 'center' : 'flex-start'
      }}>
        {!collapsed && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#ECF0F1', marginBottom: 2 }}>
              {admin.name}
            </div>
            <div style={{ fontSize: 10, color: '#5D6D7E', marginBottom: 10 }}>
              NGO Administrator
            </div>
          </>
        )}
        <button
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 7,
            background: 'none', color: '#5D6D7E',
            fontSize: 12, padding: collapsed ? '6px' : '6px 0',
            border: 'none', cursor: 'pointer',
            justifyContent: 'center'
          }}>
          <LogOut size={14}/>
          {!collapsed && 'Sign out'}
        </button>
      </div>

      <style>{`\n        @keyframes pulse-dot {\n          0%, 100% { opacity: 1; }\n          50% { opacity: 0.4; }\n        }\n        nav a:hover .sidebar-tooltip {\n          opacity: 1 !important;\n        }\n      `}</style>
    </aside>
  )
}