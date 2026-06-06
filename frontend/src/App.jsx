import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Register from './pages/Register'
import Overview from './pages/Overview'
import Patients from './pages/Patients'
import Donors from './pages/Donors'
import Cascades from './pages/Cascades'
import ScarcityMap from './pages/ScarcityMap'
import AIChat from './pages/AIChat'
import AuditLog from './pages/AuditLog'

function PrivateLayout({ children }) {
  const token = localStorage.getItem('bb_token')
  const [collapsed, setCollapsed] = useState(false)

  if (!token) return <Navigate to="/login" replace/>

  const width = collapsed ? 64 : 240

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(value => !value)}/>
      <main style={{
        marginLeft: width,
        flex: 1,
        padding: '28px 32px',
        minHeight: '100vh',
        maxWidth: `calc(100vw - ${width}px)`,
        transition: 'margin-left 0.2s ease, max-width 0.2s ease'
      }}>
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Register/>}/>
        <Route path="/dashboard" element={
          <PrivateLayout><Overview/></PrivateLayout>
        }/>
        <Route path="/dashboard/patients" element={
          <PrivateLayout><Patients/></PrivateLayout>
        }/>
        <Route path="/dashboard/donors" element={
          <PrivateLayout><Donors/></PrivateLayout>
        }/>
        <Route path="/dashboard/cascades" element={
          <PrivateLayout><Cascades/></PrivateLayout>
        }/>
        <Route path="/dashboard/scarcity" element={
          <PrivateLayout><ScarcityMap/></PrivateLayout>
        }/>
        <Route path="/dashboard/ai-chat" element={
          <PrivateLayout><AIChat/></PrivateLayout>
        }/>
        <Route path="/dashboard/audit" element={
          <PrivateLayout><AuditLog/></PrivateLayout>
        }/>
        <Route path="/dashboard/audit-log" element={
          <PrivateLayout><AuditLog/></PrivateLayout>
        }/>
        <Route path="/" element={<Navigate to="/login" replace/>}/>
        <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
      </Routes>
    </BrowserRouter>
  )
}