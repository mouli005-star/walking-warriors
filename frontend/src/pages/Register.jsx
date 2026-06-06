import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Heart, Users, UserCheck, Phone, ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { donors, patients } from '../services/api'
import API from '../services/api'

// ── CITY OPTIONS with lat/long ──────────────────────────────────────────
const CITIES = [
  { label: 'Hyderabad',   lat: 17.3850, lon: 78.4867 },
  { label: 'Secunderabad',lat: 17.4399, lon: 78.4983 },
  { label: 'Warangal',    lat: 17.9784, lon: 79.5941 },
  { label: 'Vizag',       lat: 17.6868, lon: 83.2185 },
  { label: 'Vijayawada',  lat: 16.5062, lon: 80.6480 },
  { label: 'Chennai',     lat: 13.0827, lon: 80.2707 },
  { label: 'Bangalore',   lat: 12.9716, lon: 77.5946 },
  { label: 'Mumbai',      lat: 19.0760, lon: 72.8777 },
  { label: 'Pune',        lat: 18.5204, lon: 73.8567 },
  { label: 'Delhi',       lat: 28.6139, lon: 77.2090 },
  { label: 'Kolkata',     lat: 22.5726, lon: 88.3639 },
  { label: 'Coimbatore',  lat: 11.0168, lon: 76.9558 },
]

const BLOOD_GROUPS = [
  'A Positive','A Negative','B Positive','B Negative',
  'AB Positive','AB Negative','O Positive','O Negative'
]

// ── OTP MOCK SERVICE ─────────────────────────────────────────────────────
// Locally: returns mock OTP in response
// On AWS: SNS sends real SMS
async function sendOTP(phone) {
  try {
    const res = await API.post('/auth/send-otp', { phone })
    return res.data
  } catch {
    // Mock for local dev
    return { success: true, mock: true, otp: '123456' }
  }
}

async function verifyOTP(phone, otp) {
  try {
    const res = await API.post('/auth/verify-otp', { phone, otp })
    return res.data
  } catch {
    // Mock: accept 123456
    return { verified: otp === '123456' }
  }
}

// ── ROLE SELECTOR ─────────────────────────────────────────────────────────
function RoleSelector({ selected, onSelect }) {
  const roles = [
    {
      key: 'donor',
      icon: '🩸',
      title: 'Blood Donor',
      desc: 'Join as a voluntary donor and save Thalassemia patients'
    },
    {
      key: 'patient',
      icon: '🏥',
      title: 'Patient / Guardian',
      desc: 'Register a Thalassemia patient to receive coordinated blood support'
    },
    {
      key: 'volunteer',
      icon: '🤝',
      title: 'Volunteer',
      desc: 'Help coordinate Blood Warriors operations in your city'
    },
  ]

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        Join Blood Warriors
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>
        Select your role to get started
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {roles.map(r => (
          <div key={r.key}
            onClick={() => onSelect(r.key)}
            style={{
              border: `1px solid ${selected === r.key ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 12, padding: '16px 18px',
              cursor: 'pointer', display: 'flex', gap: 14,
              alignItems: 'center',
              background: selected === r.key ? 'var(--bg-elevated)' : 'var(--bg-primary)',
              transition: 'all 0.15s'
            }}>
            <div style={{ fontSize: 28 }}>{r.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                {r.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {r.desc}
              </div>
            </div>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: `2px solid ${selected === r.key ? 'var(--accent)' : 'var(--border)'}`,
              background: selected === r.key ? 'var(--accent)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              {selected === r.key && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }}/>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── OTP STEP ──────────────────────────────────────────────────────────────
function OTPStep({ phone, setPhone, onVerified }) {
  const [sent,     setSent]     = useState(false)
  const [otp,      setOtp]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [mockOtp,  setMockOtp]  = useState('')

  async function handleSend() {
    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
      setError('Enter a valid 10-digit WhatsApp number')
      return
    }
    setLoading(true)
    setError('')
    const res = await sendOTP(phone)
    if (res.mock) setMockOtp(res.otp)
    setSent(true)
    setLoading(false)
  }

  async function handleVerify() {
    if (!otp || otp.length !== 6) {
      setError('Enter the 6-digit OTP')
      return
    }
    setLoading(true)
    setError('')
    const res = await verifyOTP(phone, otp)
    if (res.verified) {
      onVerified()
    } else {
      setError('Invalid OTP. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        Verify your WhatsApp
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>
        We use WhatsApp to coordinate blood donations
      </p>

      {!sent ? (
        <>
          <label style={{
            display: 'block', fontSize: 12, fontWeight: 600,
            color: 'var(--text-secondary)', marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>WhatsApp Number</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 8, padding: '9px 13px',
              fontSize: 13, color: 'var(--text-secondary)',
              whiteSpace: 'nowrap'
            }}>+91</div>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9876543210"
              style={{ flex: 1 }}
            />
          </div>
          {error && (
            <div style={{
              color: 'var(--red)', fontSize: 12,
              marginBottom: 12
            }}>{error}</div>
          )}
          <button
            onClick={handleSend}
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: 12 }}>
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </>
      ) : (
        <>
          <div style={{
            background: 'var(--green-soft)',
            border: '1px solid rgba(39,174,96,0.3)',
            borderRadius: 8, padding: '10px 14px',
            fontSize: 13, color: 'var(--green)',
            marginBottom: 20
          }}>
            OTP sent to +91 {phone}
            {mockOtp && (
              <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                (Demo OTP: <b style={{ color: 'var(--text-primary)' }}>{mockOtp}</b>)
              </span>
            )}
          </div>

          <label style={{
            display: 'block', fontSize: 12, fontWeight: 600,
            color: 'var(--text-secondary)', marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>Enter OTP</label>
          <input
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit OTP"
            style={{ marginBottom: 16, letterSpacing: '0.3em', fontSize: 18 }}
          />
          {error && (
            <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>
              {error}
            </div>
          )}
          <button
            onClick={handleVerify}
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: 12 }}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button
            onClick={() => { setSent(false); setOtp(''); setError('') }}
            className="btn-ghost"
            style={{ width: '100%', marginTop: 8 }}>
            Change number
          </button>
        </>
      )}
    </div>
  )
}

// ── DONOR FORM ────────────────────────────────────────────────────────────
function DonorForm({ phone, onSuccess }) {
  const [form, setForm] = useState({
    name: '', blood_group: '', gender: '',
    age: '', city: '', willing_bridge_donor: false, consent: false,
    last_donation_date: ''
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function submit() {
    if (!form.name || !form.blood_group || !form.gender || !form.age || !form.city) {
      setError('Please fill all required fields')
      return
    }
    if (!form.consent) {
      setError('You must consent to proceed')
      return
    }
    setLoading(true)
    setError('')
    const city = CITIES.find(c => c.label === form.city)
    try {
      await donors.register({
        name:                 form.name,
        phone:                phone,
        blood_group:          form.blood_group,
        gender:               form.gender,
        age:                  parseInt(form.age),
        city_label:           form.city,
        latitude:             city?.lat,
        longitude:            city?.lon,
        willing_bridge_donor: form.willing_bridge_donor,
        last_donation_date:   form.last_donation_date || null,
        consent:              form.consent
      })
      onSuccess()
    } catch (e) {
      setError(e.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        Donor Details
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
        Your information helps us match you to patients who need your blood group
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Full Name *">
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Your full name"/>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Blood Group *">
            <select value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
              <option value="">Select</option>
              {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Gender *">
            <select value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Age *">
            <input type="number" value={form.age}
              onChange={e => set('age', e.target.value)}
              placeholder="Age (18-65)" min="18" max="65"/>
          </Field>
          <Field label="City *">
            <select value={form.city} onChange={e => set('city', e.target.value)}>
              <option value="">Select city</option>
              {CITIES.map(c => <option key={c.label}>{c.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Last Donation Date (if donated before)">
          <input type="date" value={form.last_donation_date}
            onChange={e => set('last_donation_date', e.target.value)}/>
        </Field>

        <div style={{
          background: 'rgba(192,57,43,0.06)',
          border: '1px solid rgba(192,57,43,0.2)',
          borderRadius: 10, padding: '14px 16px'
        }}>
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer'
          }}>
            <input type="checkbox"
              checked={form.willing_bridge_donor}
              onChange={e => set('willing_bridge_donor', e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 1 }}/>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                Become a Bridge Donor
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Be permanently assigned to a specific Thalassemia patient. They will know your name. You will receive updates about their health every week.
              </div>
            </div>
          </label>
        </div>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer'
        }}>
          <input type="checkbox"
            checked={form.consent}
            onChange={e => set('consent', e.target.checked)}
            style={{ width: 16, height: 16 }}/>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            I consent to Blood Warriors contacting me via WhatsApp for blood donation coordination
          </span>
        </label>
      </div>

      {error && (
        <div style={{
          color: 'var(--red)', fontSize: 12, marginTop: 12
        }}>{error}</div>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="btn-primary"
        style={{ width: '100%', padding: 12, marginTop: 20 }}>
        {loading ? 'Registering...' : 'Complete Registration'}
      </button>
    </div>
  )
}

// ── PATIENT FORM ──────────────────────────────────────────────────────────
function PatientForm({ phone, onSuccess }) {
  const [form, setForm] = useState({
    name: '', guardian_name: '', age: '', gender: '',
    blood_group: '', required_blood_group: '',
    quantity_required: '', hospital_name: '', city: '',
    frequency_in_days: '21', last_transfusion_date: '', consent: false
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function submit() {
    if (!form.name || !form.guardian_name || !form.blood_group ||
        !form.required_blood_group || !form.hospital_name || !form.city) {
      setError('Please fill all required fields')
      return
    }
    if (!form.consent) {
      setError('You must consent to proceed')
      return
    }
    setLoading(true)
    setError('')
    const city = CITIES.find(c => c.label === form.city)
    try {
      await patients.register({
        name:                  form.name,
        guardian_name:         form.guardian_name,
        phone:                 phone,
        age:                   parseInt(form.age) || 0,
        gender:                form.gender,
        blood_group:           form.blood_group,
        required_blood_group:  form.required_blood_group,
        quantity_required:     parseFloat(form.quantity_required) || 2.0,
        hospital_name:         form.hospital_name,
        city_label:            form.city,
        latitude:              city?.lat,
        longitude:             city?.lon,
        frequency_in_days:     parseInt(form.frequency_in_days) || 21,
        last_transfusion_date: form.last_transfusion_date || null,
        consent:               form.consent
      })
      onSuccess()
    } catch (e) {
      setError(e.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        Patient Registration
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
        Register a Thalassemia patient to receive coordinated blood support
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Patient Full Name *">
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Patient's full name"/>
        </Field>

        <Field label="Guardian / Parent Name *">
          <input value={form.guardian_name}
            onChange={e => set('guardian_name', e.target.value)}
            placeholder="Father's / Mother's name"/>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Patient Age">
            <input type="number" value={form.age}
              onChange={e => set('age', e.target.value)}
              placeholder="Age"/>
          </Field>
          <Field label="Gender">
            <select value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Patient Blood Group *">
            <select value={form.blood_group}
              onChange={e => set('blood_group', e.target.value)}>
              <option value="">Select</option>
              {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Blood Required *">
            <select value={form.required_blood_group}
              onChange={e => set('required_blood_group', e.target.value)}>
              <option value="">Select</option>
              {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Units per Transfusion">
            <input type="number" value={form.quantity_required}
              onChange={e => set('quantity_required', e.target.value)}
              placeholder="e.g. 2"/>
          </Field>
          <Field label="Frequency (days)">
            <input type="number" value={form.frequency_in_days}
              onChange={e => set('frequency_in_days', e.target.value)}
              placeholder="e.g. 21"/>
          </Field>
        </div>

        <Field label="Hospital Name *">
          <input value={form.hospital_name}
            onChange={e => set('hospital_name', e.target.value)}
            placeholder="Hospital where transfusion happens"/>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="City *">
            <select value={form.city} onChange={e => set('city', e.target.value)}>
              <option value="">Select city</option>
              {CITIES.map(c => <option key={c.label}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Last Transfusion Date">
            <input type="date" value={form.last_transfusion_date}
              onChange={e => set('last_transfusion_date', e.target.value)}/>
          </Field>
        </div>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer'
        }}>
          <input type="checkbox"
            checked={form.consent}
            onChange={e => set('consent', e.target.checked)}
            style={{ width: 16, height: 16 }}/>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            I consent to Blood Warriors coordinating blood donations for this patient via WhatsApp
          </span>
        </label>
      </div>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 12 }}>
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="btn-primary"
        style={{ width: '100%', padding: 12, marginTop: 20 }}>
        {loading ? 'Registering...' : 'Register Patient'}
      </button>
    </div>
  )
}

// ── VOLUNTEER FORM ────────────────────────────────────────────────────────
function VolunteerForm({ phone, onSuccess }) {
  const [form, setForm] = useState({
    name: '', age: '', gender: '', city: '',
    skills: [], availability: '', consent: false
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const skillOptions = [
    'Donor coordination', 'Patient support',
    'Social media', 'Event management',
    'Medical background', 'Translation/language'
  ]

  function toggleSkill(skill) {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(skill)
        ? f.skills.filter(s => s !== skill)
        : [...f.skills, skill]
    }))
  }

  async function submit() {
    if (!form.name || !form.city) {
      setError('Please fill all required fields')
      return
    }
    if (!form.consent) {
      setError('You must consent to proceed')
      return
    }
    setLoading(true)
    setError('')
    const city = CITIES.find(c => c.label === form.city)
    try {
      await donors.register({
        name:       form.name,
        phone:      phone,
        blood_group: 'Unknown',
        gender:     form.gender || 'Other',
        age:        parseInt(form.age) || 25,
        city_label: form.city,
        latitude:   city?.lat,
        longitude:  city?.lon,
        willing_bridge_donor: false,
        consent:    form.consent,
        role:       'Volunteer'
      })
      onSuccess()
    } catch (e) {
      setError(e.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        Volunteer Registration
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
        Help Blood Warriors coordinate life-saving operations
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Full Name *">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Your full name"/>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Age">
            <input type="number" value={form.age}
              onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
              placeholder="Age"/>
          </Field>
          <Field label="City *">
            <select value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}>
              <option value="">Select city</option>
              {CITIES.map(c => <option key={c.label}>{c.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Your Skills (select all that apply)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
            {skillOptions.map(skill => (
              <div key={skill}
                onClick={() => toggleSkill(skill)}
                style={{
                  padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                  fontSize: 12, fontWeight: 500,
                  border: `1px solid ${form.skills.includes(skill) ? 'var(--accent)' : 'var(--border)'}`,
                  background: form.skills.includes(skill) ? 'var(--red-soft)' : 'transparent',
                  color: form.skills.includes(skill) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'all 0.15s'
                }}>
                {skill}
              </div>
            ))}
          </div>
        </Field>

        <Field label="Availability">
          <select value={form.availability}
            onChange={e => setForm(f => ({ ...f, availability: e.target.value }))}>
            <option value="">Select</option>
            <option>Weekdays only</option>
            <option>Weekends only</option>
            <option>Flexible — anytime</option>
            <option>On-call for emergencies</option>
          </select>
        </Field>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer'
        }}>
          <input type="checkbox"
            checked={form.consent}
            onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))}
            style={{ width: 16, height: 16 }}/>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            I agree to volunteer with Blood Warriors and be contacted via WhatsApp for coordination
          </span>
        </label>
      </div>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 12 }}>
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="btn-primary"
        style={{ width: '100%', padding: 12, marginTop: 20 }}>
        {loading ? 'Registering...' : 'Join as Volunteer'}
      </button>
    </div>
  )
}

// ── SUCCESS SCREEN ────────────────────────────────────────────────────────
function SuccessScreen({ role }) {
  const messages = {
    donor: {
      title: 'Welcome to the Blood Warriors family',
      body: 'You will receive a WhatsApp message shortly. When a patient near you needs your blood group, we will reach out. Thank you for choosing to save lives.',
      icon: '🩸'
    },
    patient: {
      title: 'Patient registered successfully',
      body: 'Blood Warriors will assign a blood family to this patient within 24 hours. You will receive a WhatsApp confirmation. Thank you for trusting us with this responsibility.',
      icon: '🏥'
    },
    volunteer: {
      title: 'Thank you for volunteering',
      body: 'Our team will contact you via WhatsApp within 48 hours to onboard you. Together we can make sure no Thalassemia patient goes without blood.',
      icon: '🤝'
    }
  }

  const msg = messages[role] || messages.donor

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>{msg.icon}</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        {msg.title}
      </h2>
      <p style={{
        color: 'var(--text-secondary)', fontSize: 14,
        lineHeight: 1.7, marginBottom: 28
      }}>
        {msg.body}
      </p>
      <CheckCircle size={48} color="var(--green)" style={{ marginBottom: 20 }}/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link to="/register" style={{ textDecoration: 'none' }}>
          <button className="btn-secondary" style={{ width: '100%', padding: 11 }}>
            Register another person
          </button>
        </Link>
        <Link to="/login" style={{ textDecoration: 'none' }}>
          <button className="btn-ghost" style={{ width: '100%', padding: 11 }}>
            NGO Admin Login
          </button>
        </Link>
      </div>
    </div>
  )
}

// ── FIELD WRAPPER ─────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 600,
        color: 'var(--text-secondary)', marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '0.05em'
      }}>{label}</label>
      {children}
    </div>
  )
}

// ── MAIN REGISTER PAGE ────────────────────────────────────────────────────
export default function Register() {
  const [step,    setStep]    = useState('role')  // role → otp → form → success
  const [role,    setRole]    = useState('')
  const [phone,   setPhone]   = useState('')

  const stepNum = { role: 1, otp: 2, form: 3, success: 4 }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 16px'
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52,
            background: 'var(--accent)',
            borderRadius: 14, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: 24
          }}>🩸</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            Blood Warriors
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Blood Bridge Program · Registration
          </p>
        </div>

        {/* Progress */}
        {step !== 'success' && (
          <div style={{
            display: 'flex', gap: 6, marginBottom: 28
          }}>
            {['Select Role', 'Verify', 'Details'].map((label, i) => (
              <div key={label} style={{ flex: 1 }}>
                <div style={{
                  height: 3, borderRadius: 2, marginBottom: 6,
                  background: stepNum[step] > i + 1
                    ? 'var(--green)'
                    : stepNum[step] === i + 1
                    ? 'var(--accent)'
                    : 'var(--border)'
                }}/>
                <div style={{
                  fontSize: 10, textAlign: 'center',
                  color: stepNum[step] >= i + 1
                    ? 'var(--text-primary)'
                    : 'var(--text-muted)'
                }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          {step === 'role' && (
            <>
              <RoleSelector selected={role} onSelect={setRole}/>
              <button
                onClick={() => role && setStep('otp')}
                disabled={!role}
                className="btn-primary"
                style={{ width: '100%', padding: 12, marginTop: 24,
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8 }}>
                Continue <ArrowRight size={15}/>
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              <OTPStep
                phone={phone}
                setPhone={setPhone}
                onVerified={() => setStep('form')}
              />
              <button onClick={() => setStep('role')}
                className="btn-ghost"
                style={{ width: '100%', marginTop: 10 }}>
                ← Back
              </button>
            </>
          )}

          {step === 'form' && role === 'donor' && (
            <DonorForm phone={phone} onSuccess={() => setStep('success')}/>
          )}
          {step === 'form' && role === 'patient' && (
            <PatientForm phone={phone} onSuccess={() => setStep('success')}/>
          )}
          {step === 'form' && role === 'volunteer' && (
            <VolunteerForm phone={phone} onSuccess={() => setStep('success')}/>
          )}

          {step === 'success' && <SuccessScreen role={role}/>}
        </div>

        {step !== 'success' && (
          <p style={{
            textAlign: 'center', color: 'var(--text-muted)',
            fontSize: 12, marginTop: 20
          }}>
            NGO Admin?{' '}
            <Link to="/login"
              style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              Sign in here
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
