import { useContext, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '../AppRouter'
import { useNavigate } from 'react-router-dom'

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

function bloodColor(group) {
  if (!group) return { bg: 'rgba(99,130,190,0.1)', color: '#8b9dc3', border: 'rgba(99,130,190,0.2)' }
  if (group.startsWith('O')) return { bg: 'rgba(34,197,94,0.12)', color: '#86efac', border: 'rgba(34,197,94,0.25)' }
  if (group.startsWith('A')) return { bg: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: 'rgba(239,68,68,0.25)' }
  if (group.startsWith('B')) return { bg: 'rgba(245,158,11,0.12)', color: '#fcd34d', border: 'rgba(245,158,11,0.25)' }
  return { bg: 'rgba(59,130,246,0.12)', color: '#93c5fd', border: 'rgba(59,130,246,0.25)' }
}

function SectionCard({ icon, title, iconBg, iconBorder, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      backdropFilter: 'blur(20px)',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: iconBg, border: `1px solid ${iconBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>{icon}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  borderRadius: 8,
  background: 'rgba(6,11,22,0.6)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  padding: '10px 12px',
  outline: 'none',
  fontSize: 13,
  fontFamily: "'Inter', sans-serif",
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

export default function ProfilePage() {
  const auth = useContext(AuthContext)
  const navigate = useNavigate()
  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE || 'http://localhost:4000', [])

  const [profile, setProfile] = useState({
    name: '', age: null, gender: '', phone: '', address: '',
    blood_group: '', allergies: '', conditions_text: '',
  })
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', phone: '', relationship: '', is_primary: false })
  const [contactError, setContactError] = useState(null)
  const [addingContact, setAddingContact] = useState(false)

  const fetchContacts = async () => {
    const res = await fetch(`${apiBase}/api/users/me/contacts`, { headers: auth.authHeaders })
    if (!res.ok) return
    setContacts((await res.json()).contacts ?? [])
  }

  const fetchProfile = async () => {
    const res = await fetch(`${apiBase}/api/users/me`, { headers: auth.authHeaders })
    if (!res.ok) return
    const { user: u } = await res.json()
    setProfile({
      name: u?.name ?? '', age: u?.age ?? null, gender: u?.gender ?? '',
      phone: u?.phone ?? '', address: u?.address ?? '', blood_group: u?.blood_group ?? '',
      allergies: u?.allergies ?? '', conditions_text: u?.conditions_text ?? '',
    })
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      await fetchProfile()
      await fetchContacts()
      if (mounted) setLoading(false)
    })()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSave = async () => {
    setSaving(true)
    const body = {
      name: profile.name,
      age: profile.age === null || profile.age === '' ? null : Number(profile.age),
      gender: profile.gender || null, phone: profile.phone || null,
      address: profile.address || null, blood_group: profile.blood_group || null,
      allergies: profile.allergies || null, conditions_text: profile.conditions_text || null,
    }
    const res = await fetch(`${apiBase}/api/users/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.authHeaders },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      auth.refreshMe()
    }
  }

  const onAddContact = async () => {
    setContactError(null)
    setAddingContact(true)
    const res = await fetch(`${apiBase}/api/users/me/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeaders },
      body: JSON.stringify({ name: contactForm.name, phone: contactForm.phone, relationship: contactForm.relationship || null, is_primary: contactForm.is_primary }),
    })
    setAddingContact(false)
    if (!res.ok) { setContactError('Failed to add contact. Check all fields.'); return }
    setContactForm({ name: '', phone: '', relationship: '', is_primary: false })
    await fetchContacts()
  }

  const setPrimary = async (id) => {
    await fetch(`${apiBase}/api/users/me/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.authHeaders },
      body: JSON.stringify({ is_primary: true }),
    })
    await fetchContacts()
  }

  const deleteContact = async (id) => {
    await fetch(`${apiBase}/api/users/me/contacts/${id}`, { method: 'DELETE', headers: auth.authHeaders })
    await fetchContacts()
  }

  const bc = bloodColor(profile.blood_group)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <div style={{
        background: 'rgba(10,17,32,0.95)', borderBottom: '1px solid var(--border)',
        padding: '0 24px', height: 60, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="buttonSecondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>My Profile</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {saveSuccess && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8,
              background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
              fontSize: 12, fontWeight: 700, color: '#86efac',
              animation: 'fadeIn 0.3s ease',
            }}>✓ Profile saved</div>
          )}
          <button className="button" onClick={onSave} disabled={saving || loading} style={{ padding: '7px 16px', fontSize: 13 }}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</> : '💾 Save Profile'}
          </button>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Personal Details */}
        <SectionCard icon="👤" title="Personal Details" iconBg="rgba(59,130,246,0.12)" iconBorder="rgba(59,130,246,0.25)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <FormField label="Full Name">
              <input style={inputStyle} value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="John Doe" />
            </FormField>
            <FormField label="Age">
              <input style={inputStyle} value={profile.age ?? ''} onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value }))} placeholder="e.g. 32" type="number" />
            </FormField>
            <FormField label="Gender">
              <select style={{ ...inputStyle, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a5a7a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30, appearance: 'none' }} value={profile.gender} onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}>
                <option value="">Select gender</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 14 }}>
            <FormField label="Phone Number">
              <input style={inputStyle} value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 555 0000" />
            </FormField>
            <FormField label="Address">
              <input style={inputStyle} value={profile.address} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} placeholder="123 Main St, City" />
            </FormField>
          </div>
        </SectionCard>

        {/* Medical Info */}
        <SectionCard icon="🩺" title="Medical Information" iconBg="rgba(239,68,68,0.12)" iconBorder="rgba(239,68,68,0.25)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <FormField label="Blood Group">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: bc.bg, border: `1px solid ${bc.border}`,
                  fontSize: 16, fontWeight: 800, color: bc.color,
                  minWidth: 60, textAlign: 'center',
                }}>
                  {profile.blood_group || '—'}
                </div>
                <select style={{ ...inputStyle, flex: 1, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a5a7a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30, appearance: 'none' }} value={profile.blood_group} onChange={(e) => setProfile((p) => ({ ...p, blood_group: e.target.value }))}>
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </FormField>
            <FormField label="Known Allergies">
              <input style={inputStyle} value={profile.allergies} onChange={(e) => setProfile((p) => ({ ...p, allergies: e.target.value }))} placeholder="e.g. penicillin, latex" />
            </FormField>
            <FormField label="Existing Conditions">
              <input style={inputStyle} value={profile.conditions_text} onChange={(e) => setProfile((p) => ({ ...p, conditions_text: e.target.value }))} placeholder="e.g. diabetes, hypertension" />
            </FormField>
          </div>
        </SectionCard>

        {/* Emergency Contacts */}
        <SectionCard icon="📞" title="Emergency Contacts" iconBg="rgba(34,197,94,0.12)" iconBorder="rgba(34,197,94,0.25)">
          {/* Add form */}
          <div style={{
            background: 'rgba(6,11,22,0.4)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 16, marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              Add New Contact
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <FormField label="Name">
                <input style={inputStyle} value={contactForm.name} onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" />
              </FormField>
              <FormField label="Phone">
                <input style={inputStyle} value={contactForm.phone} onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 555 0000" />
              </FormField>
              <FormField label="Relationship">
                <input style={inputStyle} value={contactForm.relationship} onChange={(e) => setContactForm((f) => ({ ...f, relationship: e.target.value }))} placeholder="e.g. Spouse" />
              </FormField>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  className={`switch switchButton ${contactForm.is_primary ? 'switchOn' : ''}`}
                  onClick={() => setContactForm((f) => ({ ...f, is_primary: !f.is_primary }))}
                  role="switch"
                  aria-checked={contactForm.is_primary}
                >
                  <div className="switchInner" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: contactForm.is_primary ? '#86efac' : 'var(--text-muted)' }}>
                  {contactForm.is_primary ? '✓ Primary contact' : 'Set as primary'}
                </span>
              </div>
              {contactError && <div style={{ fontSize: 12, color: '#fca5a5', fontWeight: 600 }}>⚠ {contactError}</div>}
              <button
                className="button"
                onClick={onAddContact}
                disabled={addingContact || !contactForm.name || !contactForm.phone}
                style={{ padding: '8px 16px', fontSize: 12 }}
              >
                {addingContact ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Adding...</> : '+ Add Contact'}
              </button>
            </div>
          </div>

          {/* Contact list */}
          <div className="miniList">
            {contacts.map((c) => (
              <div key={c.id} className="miniItem">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: c.is_primary ? 'rgba(34,197,94,0.12)' : 'rgba(99,130,190,0.1)',
                    border: c.is_primary ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
                  }}>👤</div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {c.name}
                      {c.is_primary ? <span style={{ fontSize: 10, fontWeight: 700, color: '#86efac', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', padding: '1px 6px', borderRadius: 999 }}>PRIMARY</span> : null}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone} · {c.relationship || 'Contact'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!c.is_primary && (
                    <button className="buttonSecondary" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => setPrimary(c.id)}>
                      Set Primary
                    </button>
                  )}
                  <button
                    onClick={() => deleteContact(c.id)}
                    style={{
                      padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#fca5a5', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.2s',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!contacts.length && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
                No emergency contacts added yet
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
