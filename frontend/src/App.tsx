import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { PageSpinner } from './components/ui/misc'
import { homePathFor, useAuth } from './lib/auth'
import type { Role } from './lib/types'

const AdminActivity = lazy(() => import('./pages/admin/Activity'))
const AdminAudit = lazy(() => import('./pages/admin/Audit'))
const AdminUsers = lazy(() => import('./pages/admin/Users'))
const CitizenDashboard = lazy(() => import('./pages/citizen/Dashboard'))
const ReportForm = lazy(() => import('./pages/citizen/ReportForm'))
const Communication = lazy(() => import('./pages/Communication'))
const IncidentDetailPage = lazy(() => import('./pages/IncidentDetail'))
const MapPage = lazy(() => import('./pages/MapPage'))
const ResponderAssignments = lazy(() => import('./pages/responder/Assignments'))
const ResponderDashboard = lazy(() => import('./pages/responder/Dashboard'))
const Analytics = lazy(() => import('./pages/staff/Analytics'))
const IncidentTable = lazy(() => import('./pages/staff/IncidentTable'))
const Overview = lazy(() => import('./pages/staff/Overview'))
const RespondersPage = lazy(() => import('./pages/staff/Responders'))
const DemoGuide = lazy(() => import('./pages/DemoGuide'))
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.Register })))

function Guard({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />
  return <>{children}</>
}

function Public({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageSpinner />
  if (user) return <Navigate to={homePathFor(user.role)} replace />
  return <>{children}</>
}

const STAFF: Role[] = ['DISPATCHER', 'ADMIN']

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
    <Routes>
      <Route path="/" element={<Public><Landing /></Public>} />
      <Route path="/login" element={<Public><Login /></Public>} />
      <Route path="/register" element={<Public><Register /></Public>} />
      <Route element={<Guard><Layout /></Guard>}>
        <Route path="/citizen" element={<Guard roles={['CITIZEN']}><CitizenDashboard /></Guard>} />
        <Route path="/citizen/report" element={<Guard roles={['CITIZEN']}><ReportForm /></Guard>} />

        <Route path="/dispatch" element={<Guard roles={STAFF}><Overview /></Guard>} />
        <Route path="/dispatch/map" element={<Guard roles={STAFF}><MapPage mode="staff" /></Guard>} />
        <Route path="/dispatch/incidents" element={<Guard roles={STAFF}><IncidentTable /></Guard>} />
        <Route path="/dispatch/responders" element={<Guard roles={STAFF}><RespondersPage /></Guard>} />
        <Route path="/dispatch/analytics" element={<Guard roles={STAFF}><Analytics /></Guard>} />

        <Route path="/responder" element={<Guard roles={['RESPONDER']}><ResponderDashboard /></Guard>} />
        <Route path="/responder/assignments" element={<Guard roles={['RESPONDER']}><ResponderAssignments /></Guard>} />
        <Route path="/responder/map" element={<Guard roles={['RESPONDER']}><MapPage mode="responder" /></Guard>} />

        <Route path="/admin/users" element={<Guard roles={['ADMIN']}><AdminUsers /></Guard>} />
        <Route path="/admin/activity" element={<Guard roles={['ADMIN']}><AdminActivity /></Guard>} />
        <Route path="/admin/audit" element={<Guard roles={['ADMIN']}><AdminAudit /></Guard>} />

        <Route path="/demo" element={<DemoGuide />} />
        <Route path="/incidents/:id" element={<IncidentDetailPage />} />
        <Route path="/chat" element={<Guard roles={['DISPATCHER', 'RESPONDER', 'ADMIN']}><Communication /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}
