import { useState } from 'react'
import { getProfile } from './lib/storage'
import Onboarding from './pages/Onboarding'
import TrackerHome from './pages/TrackerHome'
import ChatPage from './pages/ChatPage'
import FinancialAdvisor from './pages/FinancialAdvisor'

function BottomNav({ tab, onChange }) {
  const tabs = [
    {
      id: 'tracker', label: 'Tracker',
      icon: (active) => (
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
      ),
    },
    {
      id: 'chat', label: 'AI Coach',
      icon: (active) => (
        <svg width="22" height="22" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
        </svg>
      ),
    },
    {
      id: 'finance', label: 'Mercados',
      icon: (active) => (
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(13,13,16,0.94)', backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, padding: '10px 0 8px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer',
          color: tab === t.id ? 'var(--green)' : 'rgba(255,255,255,0.35)',
          transition: 'color 0.2s',
        }}>
          {t.icon(tab === t.id)}
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.02em' }}>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(() => !!getProfile())
  const [tab, setTab] = useState('tracker')

  if (!ready) return <Onboarding onComplete={() => setReady(true)} />

  const Page = tab === 'tracker' ? TrackerHome : tab === 'chat' ? ChatPage : FinancialAdvisor

  return (
    <>
      <Page />
      <BottomNav tab={tab} onChange={setTab} />
    </>
  )
}
