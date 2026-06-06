import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Heart, Zap,
  MapPin, MessageSquare, FileText, LogOut, Activity
} from 'lucide-react'

const links = [
  { to: '/dashboard',           icon: LayoutDashboard, label: 'Overview'      },
  { to: '/dashboard/patients',  icon: Heart,           label: 'Patients'      },
  { to: '/dashboard/donors',    icon: Users,           label: 'Donors'        },
  { to: '/dashboard/cascades',  icon: Zap,             label: 'Cascades'      },
  { to: '/dashboard/scarcity',  icon: MapPin,          label: 'Scarcity Map'  },
  { to: '/dashboard/ai-chat',   icon: MessageSquare,   label: 'AI Analytics'  },
  { to: '/dashboard/audit',     icon: FileText,        label: 'Audit Log'     },
]

export default function Sidebar() {
  const navigate  = useNavigate()
  const adminRaw  = localStorage.getItem('bb_admin')
  const admin     = adminRaw ? JSON.parse(adminRaw) : { name: 'Admin' }

  function logout() {
    localStorage.removeItem('bb_token')
    localStorage.removeItem('bb_admin')
    navigate('/login')
  }

  return (
    <aside style={{
      width: 240, minHeight: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, zIndex: 100
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div style={{
          width: 36, height: 36,
          background: 'linear-gradient(135deg, #e11d48, #9333ea)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 18
        }}>🩸</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>BloodBridge</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>NGO Platform</div>
        </div>
      </div>

      {/* Live indicator */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--green)',
          boxShadow: '0 0 6px var(--green)',
          animation: 'pulse 2s infinite'
        }}/>
        <span style={{ fontSize: 12, color: 'var(--green)' }}>System Live</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/dashboard'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', textDecoration: 'none',
              fontSize: 14, fontWeight: 500,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-card)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.15s'
            })}>
            <Icon size={16}/>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Admin */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border)'
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          {admin.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
          NGO Administrator
        </div>
        <button
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', color: 'var(--text-secondary)',
            fontSize: 13, padding: 0, border: 'none'
          }}>
          <LogOut size={14}/> Sign out
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </aside>
  )
}
