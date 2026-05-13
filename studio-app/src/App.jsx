import { useState } from 'react'
import { getProfile } from './lib/storage'
import Onboarding from './pages/Onboarding'
import TrackerHome from './pages/TrackerHome'

export default function App() {
  const [ready, setReady] = useState(() => !!getProfile())

  if (!ready) return <Onboarding onComplete={() => setReady(true)} />
  return <TrackerHome />
}
