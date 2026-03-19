import { useContext, useMemo, useState } from 'react'
import { AuthContext } from '../AppRouter'
import { Link, useNavigate } from 'react-router-dom'
import './auth.css'

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

function PasswordStrength({ password }) {
  const score = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
  const label = ['', 'Weak', 'Fair', 'Strong'][score]
  const color = ['', 'var(--accent-red)', 'var(--accent-amber)', 'var(--accent-green)'][score]
  return (
    <div>
      <div className="pwStrength">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`pwBar ${score >= i ? (score === 1 ? 'weak' : score === 2 ? 'medium' : 'strong') : ''}`}
          />
        ))}
      </div>
      {password.length > 0 && (
        <div style={{ fontSize: 11, fontWeight: 600, color, marginTop: 4 }}>{label} password</div>
      )}
    </div>
  )
}

export default function SignupPage() {
  const auth = useContext(AuthContext)
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const passwordMatch = confirmPassword.length > 0 && confirmPassword === password

  const canSubmit = useMemo(() => {
    return (
      name.trim().length >= 2 &&
      email.trim().includes('@') &&
      phone.trim().length >= 6 &&
      password.length >= 8 &&
      confirmPassword === password
    )
  }, [name, email, phone, password, confirmPassword])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await auth.register({
        name, email, phone, password, confirmPassword,
        age: age ? Number(age) : null,
        gender: gender || null,
        address: address || null,
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err?.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="authShell">
      <div className="authCard" style={{ width: 'min(540px, 100%)' }}>
        <div className="authHeader">
          <div className="authBrand">
            <div className="authLogoWrap green">🏥</div>
            <div>
              <div className="authTitle">Create Account</div>
              <div className="authSubtitle">Patient profile & emergency contacts</div>
            </div>
          </div>
          <div className="authHint">Your data is encrypted and used only for emergency dispatch.</div>
        </div>

        <div className="authDivider" />

        <form onSubmit={onSubmit}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>
            Personal Information
          </div>

          <div className="authField">
            <label className="authLabel">Full Name</label>
            <div className="authInputWrap">
              <span className="authInputIcon">👤</span>
              <input className="authInput" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
            </div>
          </div>

          <div className="row2">
            <div className="authField">
              <label className="authLabel">Email</label>
              <div className="authInputWrap">
                <span className="authInputIcon">✉</span>
                <input className="authInput" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
              </div>
            </div>
            <div className="authField">
              <label className="authLabel">Phone</label>
              <div className="authInputWrap">
                <span className="authInputIcon">📱</span>
                <input className="authInput" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0000" />
              </div>
            </div>
          </div>

          <div className="row2">
            <div className="authField">
              <label className="authLabel">Age (optional)</label>
              <input className="authInput noIcon" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 32" type="number" min="1" max="120" />
            </div>
            <div className="authField">
              <label className="authLabel">Gender (optional)</label>
              <select className="authInput noIcon" value={gender} onChange={(e) => setGender(e.target.value)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a5a7a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30, appearance: 'none' }}>
                <option value="">Select</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="authField">
            <label className="authLabel">Address (optional)</label>
            <div className="authInputWrap">
              <span className="authInputIcon">📍</span>
              <input className="authInput" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City" />
            </div>
          </div>

          <div className="authDivider" />
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>
            Security
          </div>

          <div className="authField">
            <label className="authLabel">Password</label>
            <div className="authPasswordRow">
              <span style={{ position: 'absolute', left: 12, zIndex: 1, color: 'var(--text-muted)', pointerEvents: 'none', fontSize: 14 }}>🔑</span>
              <input
                className="authInput"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                style={{ paddingLeft: 36 }}
              />
              <button type="button" className="authTinyBtn" onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          <div className="authField">
            <label className="authLabel">Confirm Password</label>
            <div className="authInputWrap">
              <span className="authInputIcon">{confirmPassword.length > 0 ? (passwordMatch ? '✅' : '❌') : '🔒'}</span>
              <input
                className="authInput"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                style={{ borderColor: confirmPassword.length > 0 ? (passwordMatch ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)') : undefined }}
              />
            </div>
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
                  Creating account...
                </>
              ) : (
                <>Create Account →</>
              )}
            </button>
          </div>

          <div className="authLinks">
            <div />
            <div className="authLinkText">
              Already registered? <Link to="/login">Sign in</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
