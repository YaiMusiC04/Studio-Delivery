import { useState } from 'react'
import { signIn, signUp } from '../lib/supabase'

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 30% 50%, rgba(201,169,110,0.05) 0%, transparent 60%), var(--bg)',
    padding: '24px',
  },
  card: {
    width: '100%', maxWidth: '420px',
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '48px 40px',
    animation: 'fadeIn 0.5s ease',
  },
  logo: { marginBottom: '40px', textAlign: 'center' },
  logoName: {
    fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 300,
    letterSpacing: '0.08em', color: 'var(--text)',
  },
  logoTag: {
    fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase',
    color: 'var(--gold)', marginTop: '6px', fontWeight: 600,
  },
  tabs: { display: 'flex', marginBottom: '32px', borderBottom: '1px solid var(--border)' },
  tab: {
    flex: 1, padding: '10px', border: 'none', background: 'none',
    fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
    color: 'var(--text-mute)', transition: 'all var(--transition)',
    borderBottom: '2px solid transparent', marginBottom: '-1px',
  },
  tabActive: { color: 'var(--gold)', borderBottomColor: 'var(--gold)' },
  group: { marginBottom: '18px' },
  label: {
    display: 'block', fontSize: '10px', letterSpacing: '0.15em',
    textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px',
  },
  input: {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '13px 16px',
    fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--text)',
    outline: 'none', transition: 'border-color var(--transition)',
  },
  select: {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '13px 16px',
    fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--text)',
    outline: 'none', transition: 'border-color var(--transition)', appearance: 'none',
  },
  btn: {
    width: '100%', padding: '14px', marginTop: '8px',
    background: 'var(--gold)', color: '#000', border: 'none',
    borderRadius: 'var(--radius)', fontFamily: 'var(--font-ui)',
    fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', cursor: 'pointer',
    transition: 'all var(--transition)',
  },
  error: {
    background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)',
    borderRadius: 'var(--radius)', padding: '12px 16px',
    fontSize: '13px', color: '#E05C5C', marginBottom: '20px',
  },
  success: {
    background: 'rgba(92,224,168,0.1)', border: '1px solid rgba(92,224,168,0.3)',
    borderRadius: 'var(--radius)', padding: '12px 16px',
    fontSize: '13px', color: 'var(--green)', marginBottom: '20px',
  },
}

export default function AuthPage({ onAuth }) {
  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'client' })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (tab === 'login') {
        const data = await signIn(form.email, form.password)
        onAuth(data.user)
      } else {
        if (!form.name) { setError('Please enter your name.'); setLoading(false); return }
        await signUp(form.email, form.password, form.name, form.role)
        setSuccess('Account created! Check your email to confirm, then log in.')
        setTab('login')
      }
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoName}>STUDIO</div>
          <div style={s.logoTag}>Creative Delivery Platform</div>
        </div>

        <div style={s.tabs}>
          {['login', 'signup'].map((t) => (
            <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
              onClick={() => { setTab(t); setError(''); setSuccess('') }}>
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}

        {tab === 'signup' && (
          <div style={s.group}>
            <label style={s.label}>Full Name</label>
            <input style={s.input} placeholder="Your name" value={form.name}
              onChange={set('name')} onKeyDown={handleKey}
              onFocus={e => e.target.style.borderColor = 'var(--gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </div>
        )}

        <div style={s.group}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" placeholder="your@email.com" value={form.email}
            onChange={set('email')} onKeyDown={handleKey}
            onFocus={e => e.target.style.borderColor = 'var(--gold)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>

        <div style={s.group}>
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" placeholder="••••••••" value={form.password}
            onChange={set('password')} onKeyDown={handleKey}
            onFocus={e => e.target.style.borderColor = 'var(--gold)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>

        {tab === 'signup' && (
          <div style={s.group}>
            <label style={s.label}>I am a...</label>
            <select style={s.select} value={form.role} onChange={set('role')}
              onFocus={e => e.target.style.borderColor = 'var(--gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}>
              <option value="client">Client — I receive files</option>
              <option value="artist">Artist — I send files</option>
            </select>
          </div>
        )}

        <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}
          onClick={handleSubmit} disabled={loading}
          onMouseEnter={e => { if (!loading) e.target.style.background = 'var(--gold2)' }}
          onMouseLeave={e => e.target.style.background = 'var(--gold)'}>
          {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </div>
    </div>
  )
}
