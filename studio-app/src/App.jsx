import { Routes, Route, Navigate } from 'react-router-dom'
import TrackerHome from './pages/TrackerHome'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TrackerHome />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
