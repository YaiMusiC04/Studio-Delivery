import { useState } from 'react'
import { supabase } from '../lib/supabase'

const s = {
  page: { minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 },
  card: { width:'100%', maxWidth:420, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'48px 40px', animation:'fadeIn 0.4s ease' },
  logo: { textAlign:'center', marginBottom:40 },
  logoName: { fontFamily:'var(--font-display)', fontSize:32, fontWeight:300, letterSpacing:'0.06em', color:'var(--text)' },
  logoTag: { fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gold)', marginTop:6, fontWeight:500 },
  tabs: { display:'flex', marginBottom:32, borderBottom:'1px solid var(--border)' },
  tab: { flex:1, padding:'10px 0', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:600, cursor:'pointer', border:'none', background:'transparent', color:'var(--text-mute)', transition:'all var(--transition)', borderBottom:'2px solid transparent' },
  tabActive: { color:'var(--gold)', borderBottom:'2px solid var(--gold)' },
  label: { display:'block', fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--text-dim)', fontWeight:600, marginBottom:8 },
  input: { width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'12px 14px', fontSize:13, color:'var(--text)', outline:'none', transition:'border-color var(--transition)', marginBottom:16 },
  btn: { width:'100%', background:'var(--gold)', color:'#000', border:'none', borderRadius:'var(--radius)', padding:'13px', fontSize:12, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', transition:'all var(--transition)', marginTop:8 },
  error: { background:'rgba(224,92,92,0.1)', border:'1px solid rgba(224,92,92,0.3)', borderRadius:'var(--radius)', padding:'10px 14px', fontSize:12, color:'var(--red)', marginBottom:16 },
  success: { background:'rgba(92,224,168,0.1)', border:'1px solid rgba(92,224,168,0.3)', borderRadius:'var(--radius)', padding:'10px 14px', fontSize:12, color:'var(--green)', marginBottom:16 },
  divider: { textAlign:'center', fontSize:11, color:'var(--text-mute)', margin:'16px 0', letterSpacing:'0.1em' },
}

export default function Login() {
  const [tab, setTab] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').insert({ id: data.user.id, name, email, role: 'client' })
      setSuccess('Account created! Check your email to confirm.')
    }
    setLoading(false)
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoName}>STUDIO</div>
          <div style={s.logoTag}>Creative Delivery Platform</div>
        </div>

        <div style={s.tabs}>
          <button style={{...s.tab, ...(tab==='login' ? s.tabActive : {})}} onClick={() => { setTab('login'); setError(''); setSuccess('') }}>Sign In</button>
          <button style={{...s.tab, ...(tab==='register' ? s.tabActive : {})}} onClick={() => { setTab('register'); setError(''); setSuccess('') }}>Create Account</button>
        </div>

        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required
              onFocus={e => e.target.style.borderColor='var(--gold)'} onBlur={e => e.target.style.borderColor='var(--border)'} />
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
              onFocus={e => e.target.style.borderColor='var(--gold)'} onBlur={e => e.target.style.borderColor='var(--border)'} />
            <button style={s.btn} type="submit" disabled={loading}
              onMouseEnter={e => e.target.style.background='var(--gold2)'} onMouseLeave={e => e.target.style.background='var(--gold)'}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <label style={s.label}>Your Name</label>
            <input style={s.input} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Isabella Moreno" required
              onFocus={e => e.target.style.borderColor='var(--gold)'} onBlur={e => e.target.style.borderColor='var(--border)'} />
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required
              onFocus={e => e.target.style.borderColor='var(--gold)'} onBlur={e => e.target.style.borderColor='var(--border)'} />
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
              onFocus={e => e.target.style.borderColor='var(--gold)'} onBlur={e => e.target.style.borderColor='var(--border)'} />
            <button style={s.btn} type="submit" disabled={loading}
              onMouseEnter={e => e.target.style.background='var(--gold2)'} onMouseLeave={e => e.target.style.background='var(--gold)'}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <div style={s.divider}>Your artist will send you an invitation link</div>
          </form>
        )}
      </div>
    </div>
  )
}
