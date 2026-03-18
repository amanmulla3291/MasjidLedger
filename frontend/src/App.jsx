import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Collections from './pages/Collections'
import Expenses from './pages/Expenses'
import Income from './pages/Income'
import Ledger from './pages/Ledger'
import Ramzan from './pages/Ramzan'
import JamatMembers from './pages/JamatMembers'
import Reports from './pages/Reports'
import Users from './pages/Users'
import AuditLog from './pages/AuditLog'

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="d-flex align-items-center justify-content-center" style={{ height: '100vh' }}>
      <div className="spinner-border text-success" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="collections" element={<Collections />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="income" element={<Income />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="ramzan" element={<Ramzan />} />
        <Route path="jamat-members" element={<JamatMembers />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
        <Route path="audit-log" element={<AuditLog />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { fontSize: '0.875rem' },
            success: { iconTheme: { primary: '#1a5c2a', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}