import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import SOSTrackingPage from './pages/SOSTrackingPage'

export const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  )

  const refreshMe = async () => {
    if (!token) {
      setUser(null)
      return
    }
    const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/api/users/me`, {
      headers: { ...authHeaders },
    })
    if (!res.ok) {
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
      return
    }
    const data = await res.json()
    setUser(data.user)
  }

  useEffect(() => {
    refreshMe().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const login = async ({ email, password }) => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const formErr = data?.error?.formErrors?.[0]
      const fieldErr = data?.error?.fieldErrors ? Object.values(data.error.fieldErrors).flat()[0] : null
      const msg = typeof data?.error === 'string' ? data.error : formErr || fieldErr || data?.error || 'Login failed'
      throw new Error(msg)
    }
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
  }

  const register = async ({ name, email, phone, password, confirmPassword, age, gender, address }) => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        phone,
        password,
        confirmPassword,
        age: age ?? null,
        gender: gender ?? null,
        address: address ?? null,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const formErr = data?.error?.formErrors?.[0]
      const fieldErr = data?.error?.fieldErrors ? Object.values(data.error.fieldErrors).flat()[0] : null
      const msg =
        typeof data?.error === 'string'
          ? data.error
          : formErr || fieldErr || data?.error || 'Registration failed'
      throw new Error(msg)
    }
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const value = { token, user, loading, authHeaders, refreshMe, login, register, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function AuthGuard({ children }) {
  const { token, loading } = useAuth()
  const location = useLocation()
  if (loading) return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-deep)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16, fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
      }}>🚑</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 20, height: 20, border: '2px solid rgba(99,130,190,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14 }}>Loading MediRoute...</span>
      </div>
    </div>
  )
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

function useAuth() {
  return useContext(AuthContext)
}

export default function AppRouter() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <DashboardPage />
            </AuthGuard>
          }
        />
        <Route
          path="/profile"
          element={
            <AuthGuard>
              <ProfilePage />
            </AuthGuard>
          }
        />
        <Route
          path="/sos-tracking/:requestId"
          element={<SOSTrackingPage />}
        />
        <Route
          path="/tracking/:requestId"
          element={
            <AuthGuard>
              <SOSTrackingPage />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

