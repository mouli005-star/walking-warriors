import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'

const Login = lazy(() => import('./pages/Login'))
const Overview = lazy(() => import('./pages/Overview'))
const Patients = lazy(() => import('./pages/Patients'))
const Donors = lazy(() => import('./pages/Donors'))
const Cascades = lazy(() => import('./pages/Cascades'))
const ScarcityMap = lazy(() => import('./pages/ScarcityMap'))
const AIChat = lazy(() => import('./pages/AIChat'))
const AuditLog = lazy(() => import('./pages/AuditLog'))

function PrivateLayout({ children }) {
  const token = localStorage.getItem('bb_token')
  if (!token) return <Navigate to="/login" replace/>
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar/>
      <main style={{
        marginLeft: 240, flex: 1,
        padding: '28px 32px',
        minHeight: '100vh'
      }}>
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login/>}/>
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
          <Route path="/dashboard/audit-log" element={
            <PrivateLayout><AuditLog/></PrivateLayout>
          }/>
          <Route path="/" element={<Navigate to="/login" replace/>}/>
          <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
