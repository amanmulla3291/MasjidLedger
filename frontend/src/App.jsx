import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Collections from './pages/Collections'
import Expenses from './pages/Expenses'
import Ledger from './pages/Ledger'
import Ramzan from './pages/Ramzan'
import Reports from './pages/Reports'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-success" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted" style={{ fontFamily: 'Amiri, serif', fontSize: '1.1rem' }}>
            Loading Masjid Ledger...
          </p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="collections" element={<Collections />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="ramzan" element={<Ramzan />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
