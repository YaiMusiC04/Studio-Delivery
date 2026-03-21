import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import ArtistDashboard from './pages/ArtistDashboard'
import ClientGallery from './pages/ClientGallery'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:32, height:32, border:'2px solid var(--border)', borderTop:'2px solid var(--gold)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
        <div style={{ fontSize:12, color:'var(--text-mute)', letterSpacing:'0.15em', textTransform:'uppercase' }}>Loading</div>
      </div>
    </div>
  )

  if (!session) return <Login />

  if (!profile) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-dim)' }}>
      Setting up your account...
    </div>
  )

  return (
    <Routes>
      <Route path="/" element={
        profile.role === 'artist'
          ? <Navigate to="/dashboard" replace />
          : <Navigate to="/gallery" replace />
      } />
      <Route path="/dashboard/*" element={
        profile.role === 'artist' ? <ArtistDashboard profile={profile} /> : <Navigate to="/gallery" replace />
      } />
      <Route path="/gallery" element={
        <ClientGallery profile={profile} />
      } />
    </Routes>
  )
}
