import { useContext, useMemo, useState } from 'react'
import { AuthContext } from '../AppRouter'
import { Link, useNavigate } from 'react-router-dom'
import './auth.css'

function PasswordStrength({ password }) {
  const score = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
  return (
    <div className="pwStrength">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`pwBar ${score >= i ? (score === 1 ? 'weak' : score === 2 ? 'medium' : 'strong') : ''}`}
        />
      ))}
    </div>
  )
}

function EmergencySOSModal({ isOpen, onClose, isLoading, error }) {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [emergencyError, setEmergencyError] = useState(null)
  const [emergencyLoading, setEmergencyLoading] = useState(false)

  const handleEmergencySOS = async () => {
    setEmergencyError(null)
    setEmergencyLoading(true)

    try {
      // Get user's location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude })
          },
          (err) => {
            reject(new Error('Unable to get location. Enable location services.'))
          },
        )
      })

      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
      const response = await fetch(`${apiBase}/api/sos/emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: position.lat,
          lon: position.lon,
          phone: phone || undefined,
          name: name || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit emergency SOS')
      }

      const data = await response.json()
      onClose()
      // Redirect to emergency tracking page
      navigate(`/sos-tracking/${data.requestId}`)
    } catch (err) {
      setEmergencyError(err?.message || 'Emergency SOS submission failed')
    } finally {
      setEmergencyLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="authModalOverlay">
      <div className="authModal">
        <div className="authModalHeader">
          <h2 style={{ margin: 0, color: '#dc2626' }}>🚨 EMERGENCY SOS</h2>
          <button
            className="authModalClose"
            onClick={onClose}
            disabled={emergencyLoading}
            style={{ color: '#dc2626' }}
          >
            ✕
          </button>
        </div>

        <div className="authModalContent">
          <p style={{ color: '#dc2626', fontWeight: 'bold', margin: '0 0 16px 0' }}>
            Ambulance will be dispatched to your current location
          </p>

          <div className="authField">
            <label className="authLabel">Your Name (optional)</label>
            <div className="authInputWrap">
              <span className="authInputIcon">👤</span>
              <input
                className="authInput"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                type="text"
                disabled={emergencyLoading}
              />
            </div>
          </div>

          <div className="authField">
            <label className="authLabel">Contact Phone (optional)</label>
            <div className="authInputWrap">
              <span className="authInputIcon">📱</span>
              <input
                className="authInput"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your phone number"
                type="tel"
                disabled={emergencyLoading}
              />
            </div>
          </div>

          {emergencyError && (
            <div className="authError">
              <span>⚠</span> {emergencyError}
            </div>
          )}

          <div className="authActions" style={{ marginTop: 16 }}>
            <button
              className="authPrimary"
              onClick={handleEmergencySOS}
              disabled={emergencyLoading}
              style={{
                backgroundColor: emergencyLoading ? '#666' : '#dc2626',
                cursor: emergencyLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {emergencyLoading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Dispatching...
                </>
              ) : (
                <>Call Ambulance Now →</>
              )}
            </button>
            <button
              className="authSecondary"
              onClick={onClose}
              disabled={emergencyLoading}
              style={{ marginTop: 8 }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const auth = useContext(AuthContext)
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false)

  const canSubmit = useMemo(() => email.trim().length > 3 && password.length >= 1, [email, password])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await auth.login({ email, password })
      navigate('/dashboard')
    } catch (err) {
      setError(err?.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="authShell">
      <div className="authCard">
        <div className="authHeader">
          <div className="authBrand">
            <div className="authLogoWrap">🚑</div>
            <div>
              <div className="authTitle">MediRoute</div>
              <div className="authSubtitle">Intelligent Ambulance Dispatch</div>
            </div>
          </div>
          <div className="authHint">
            Real-time routing with traffic-aware A* optimization.
          </div>
          <div className="authFeatures">
            <span className="authFeatureBadge">🔒 JWT Secured</span>
            <span className="authFeatureBadge">📍 GPS Dispatch</span>
            <span className="authFeatureBadge">⚡ Live Tracking</span>
          </div>
        </div>

        <div className="authDivider" />

        <form onSubmit={onSubmit}>
          <div className="authField">
            <label className="authLabel">Email Address</label>
            <div className="authInputWrap">
              <span className="authInputIcon">✉</span>
              <input
                className="authInput"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="authField">
            <label className="authLabel">Password</label>
            <div className="authPasswordRow">
              <span
                className="authInputIcon"
                style={{ position: 'absolute', left: 12, zIndex: 1, color: 'var(--text-muted)', pointerEvents: 'none' }}
              >
                🔑
              </span>
              <input
                className="authInput"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                style={{ paddingLeft: 36 }}
              />
              <button type="button" className="authTinyBtn" onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          {error && (
            <div className="authError">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="authActions">
            <button className="authPrimary" disabled={!canSubmit || submitting} type="submit">
              {submitting ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Authenticating...
                </>
              ) : (
                <>Sign In →</>
              )}
            </button>
          </div>

          <div className="authLinks">
            <button
              type="button"
              className="authLink"
              onClick={() => setError('Password reset is not available in demo mode.')}
            >
              Forgot password?
            </button>
            <div className="authLinkText">
              No account? <Link to="/signup">Create one</Link>
            </div>
          </div>
        </form>

        <div className="authDivider" />

        <button
          type="button"
          className="authEmergencyBtn"
          onClick={() => setEmergencyModalOpen(true)}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--border-radius)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = '#b91c1c')}
          onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc2626')}
        >
          🚨 IN EMERGENCY? Call Ambulance Now
        </button>
      </div>

      <EmergencySOSModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        isLoading={submitting}
      />
    </div>
  )
}
