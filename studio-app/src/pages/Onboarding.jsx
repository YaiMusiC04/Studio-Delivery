import { useState } from 'react'
import { saveProfile, saveGoals } from '../lib/storage'

// ── TDEE calculation (Mifflin-St Jeor) ───────────────────────────────────────

function calcGoals({ gender, age, weightLbs, heightFt, heightIn, weightKg: wKg, heightCm: hCm, useMetric, activity, goal }) {
  const kg  = useMetric ? Number(wKg)  : Number(weightLbs) / 2.2046
  const cm  = useMetric ? Number(hCm)  : (Number(heightFt) * 12 + Number(heightIn)) * 2.54
  const bmr = gender === 'male'
    ? 10 * kg + 6.25 * cm - 5 * Number(age) + 5
    : 10 * kg + 6.25 * cm - 5 * Number(age) - 161
  const mult  = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9 }
  const adj   = { lose: -500, maintain: 0, gain: 300 }
  const tdee  = Math.round(bmr * (mult[activity] || 1.55))
  const cals  = Math.max(1200, Math.round(tdee + (adj[goal] || 0)))
  const prot  = Math.round(kg * (goal === 'gain' ? 2.2 : goal === 'lose' ? 2.0 : 1.8))
  const fat   = Math.round((cals * 0.25) / 9)
  const carbs = Math.max(50, Math.round((cals - prot * 4 - fat * 9) / 4))
  return { calories: cals, protein: prot, fat, carbs, fiber: 25 }
}

// ── Small UI helpers ──────────────────────────────────────────────────────────

function OptionCard({ selected, onClick, children, style }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '16px 18px', textAlign: 'left', cursor: 'pointer',
      background: selected ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
      border: `1.5px solid ${selected ? 'var(--green)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 14, color: 'var(--text)', transition: 'all 0.18s',
      display: 'flex', alignItems: 'center', gap: 14, ...style,
    }}>
      {children}
    </button>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  )
}

function NumInput({ value, onChange, placeholder, min, max, suffix }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="number" inputMode="decimal" value={value} placeholder={placeholder}
        min={min} max={max}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1, padding: '14px 16px', background: 'rgba(255,255,255,0.06)',
          border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 12,
          color: 'var(--text)', fontSize: 17, fontWeight: 600, outline: 'none',
        }}
        onFocus={e => e.target.style.borderColor = 'rgba(34,197,94,0.5)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
      />
      {suffix && <span style={{ fontSize: 14, color: 'var(--text-mute)', minWidth: 28 }}>{suffix}</span>}
    </div>
  )
}

function UnitToggle({ value, onChange, a, b }) {
  return (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 3, gap: 3, marginBottom: 12 }}>
      {[a, b].map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          flex: 1, padding: '7px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          background: value === opt ? 'rgba(34,197,94,0.18)' : 'transparent',
          border: value === opt ? '1px solid rgba(34,197,94,0.4)' : '1px solid transparent',
          borderRadius: 8, color: value === opt ? 'var(--green)' : 'var(--text-mute)',
          transition: 'all 0.15s',
        }}>{opt}</button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5  // not counting welcome (0)

export default function Onboarding({ onComplete }) {
  const [step, setStep]   = useState(0)
  const [unit, setUnit]   = useState('imperial')  // 'imperial' | 'metric'
  const [data, setData]   = useState({
    gender: null,
    age: '', weightLbs: '', heightFt: '', heightIn: '',
    weightKg: '', heightCm: '',
    activity: null,
    goal: null,
  })

  const set = (k, v) => setData(d => ({ ...d, [k]: v }))

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => s - 1)

  const canNext = () => {
    if (step === 1) return !!data.gender
    if (step === 2) {
      if (unit === 'imperial') return data.age && data.weightLbs && data.heightFt
      return data.age && data.weightKg && data.heightCm
    }
    if (step === 3) return !!data.activity
    if (step === 4) return !!data.goal
    return true
  }

  const handleFinish = () => {
    const goals = calcGoals({ ...data, useMetric: unit === 'metric' })
    saveProfile({ ...data, unit, completedAt: Date.now() })
    saveGoals(goals)
    onComplete()
  }

  const goals = (step === 5 && canNext()) ? calcGoals({ ...data, useMetric: unit === 'metric' }) : null

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        maxWidth: 480, margin: '0 auto', width: '100%',
        padding: 'calc(env(safe-area-inset-top) + 24px) 24px calc(env(safe-area-inset-bottom) + 32px)',
      }}>

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 0 }}>
            <img src="/icon-192.png" alt="CalsTrack" style={{ width: 96, height: 96, borderRadius: 22, marginBottom: 28, boxShadow: '0 8px 32px rgba(34,197,94,0.35)' }} />
            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>CalsTrack</h1>
            <p style={{ fontSize: 16, color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: 300, marginBottom: 48 }}>
              Tu tracker personal de calorías y macros.<br/>Vamos a configurar tu perfil para calcular exactamente cuánto debes comer.
            </p>
            <button onClick={next} style={{
              width: '100%', padding: '18px', background: 'var(--green)', border: 'none',
              borderRadius: 16, color: '#000', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
            }}>
              Empezar →
            </button>
          </div>
        )}

        {/* Progress dots (steps 1-5) */}
        {step >= 1 && step <= 5 && (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 36 }}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} style={{
                width: i + 1 === step ? 22 : 7, height: 7, borderRadius: 4,
                background: i + 1 <= step ? 'var(--green)' : 'rgba(255,255,255,0.12)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        )}

        {/* ── Step 1: Gender ── */}
        {step === 1 && (
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>¿Cuál es tu sexo?</h2>
            <p style={{ fontSize: 14, color: 'var(--text-mute)', marginBottom: 32 }}>Necesario para calcular tu metabolismo basal</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <OptionCard selected={data.gender === 'male'} onClick={() => set('gender', 'male')}>
                <span style={{ fontSize: 28 }}>♂️</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>Masculino</div>
                </div>
              </OptionCard>
              <OptionCard selected={data.gender === 'female'} onClick={() => set('gender', 'female')}>
                <span style={{ fontSize: 28 }}>♀️</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>Femenino</div>
                </div>
              </OptionCard>
            </div>
          </div>
        )}

        {/* ── Step 2: Age / Weight / Height ── */}
        {step === 2 && (
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>Tu cuerpo</h2>
            <p style={{ fontSize: 14, color: 'var(--text-mute)', marginBottom: 24 }}>Usamos esto para calcular tu gasto calórico</p>

            <UnitToggle value={unit} onChange={setUnit} a="imperial" b="metric" />

            <Field label="Edad">
              <NumInput value={data.age} onChange={v => set('age', v)} placeholder="25" min={10} max={100} suffix="años" />
            </Field>

            <Field label="Peso">
              {unit === 'imperial'
                ? <NumInput value={data.weightLbs} onChange={v => set('weightLbs', v)} placeholder="165" min={50} max={700} suffix="lbs" />
                : <NumInput value={data.weightKg} onChange={v => set('weightKg', v)} placeholder="75" min={20} max={300} suffix="kg" />
              }
            </Field>

            <Field label="Estatura">
              {unit === 'imperial'
                ? <div style={{ display: 'flex', gap: 10 }}>
                    <NumInput value={data.heightFt} onChange={v => set('heightFt', v)} placeholder="5" min={3} max={8} suffix="ft" />
                    <NumInput value={data.heightIn} onChange={v => set('heightIn', v)} placeholder="10" min={0} max={11} suffix="in" />
                  </div>
                : <NumInput value={data.heightCm} onChange={v => set('heightCm', v)} placeholder="175" min={100} max={250} suffix="cm" />
              }
            </Field>
          </div>
        )}

        {/* ── Step 3: Activity ── */}
        {step === 3 && (
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>Nivel de actividad</h2>
            <p style={{ fontSize: 14, color: 'var(--text-mute)', marginBottom: 28 }}>¿Cuánto ejercicio haces por semana?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'sedentary',  emoji: '🪑', label: 'Sedentario',        desc: 'Trabajo de escritorio, poco movimiento' },
                { key: 'light',      emoji: '🚶', label: 'Ligero',             desc: 'Ejercicio 1-3 días/semana' },
                { key: 'moderate',   emoji: '🏃', label: 'Moderado',           desc: 'Ejercicio 3-5 días/semana' },
                { key: 'active',     emoji: '💪', label: 'Activo',             desc: 'Ejercicio fuerte 6-7 días/semana' },
                { key: 'veryActive', emoji: '🔥', label: 'Muy activo',         desc: 'Entrenamiento doble o trabajo físico intenso' },
              ].map(opt => (
                <OptionCard key={opt.key} selected={data.activity === opt.key} onClick={() => set('activity', opt.key)}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{opt.emoji}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>{opt.desc}</div>
                  </div>
                </OptionCard>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 4: Goal ── */}
        {step === 4 && (
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>¿Cuál es tu meta?</h2>
            <p style={{ fontSize: 14, color: 'var(--text-mute)', marginBottom: 28 }}>Ajustamos tus calorías según tu objetivo</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'lose',     emoji: '📉', label: 'Bajar de peso',   desc: '-500 kcal del mantenimiento' },
                { key: 'maintain', emoji: '⚖️',  label: 'Mantener peso',   desc: 'Calorías de mantenimiento' },
                { key: 'gain',     emoji: '📈', label: 'Ganar músculo',   desc: '+300 kcal del mantenimiento' },
              ].map(opt => (
                <OptionCard key={opt.key} selected={data.goal === opt.key} onClick={() => set('goal', opt.key)}>
                  <span style={{ fontSize: 28 }}>{opt.emoji}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>{opt.desc}</div>
                  </div>
                </OptionCard>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 5: Results ── */}
        {step === 5 && goals && (
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>Tu plan diario 🎯</h2>
            <p style={{ fontSize: 14, color: 'var(--text-mute)', marginBottom: 28 }}>Basado en tu perfil, estos son tus goals recomendados</p>

            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1.5px solid rgba(34,197,94,0.25)', borderRadius: 18, padding: '24px', marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Calorías diarias</div>
              <div style={{ fontSize: 52, fontWeight: 800, color: 'var(--green)', letterSpacing: '-0.03em', lineHeight: 1 }}>{goals.calories.toLocaleString()}</div>
              <div style={{ fontSize: 13, color: 'var(--text-mute)', marginTop: 4 }}>kcal / día</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
              {[
                { label: 'Proteína', value: goals.protein, unit: 'g', color: '#EF4444' },
                { label: 'Carbos',   value: goals.carbs,   unit: 'g', color: '#F59E0B' },
                { label: 'Grasa',    value: goals.fat,     unit: 'g', color: '#3B82F6' },
              ].map(m => (
                <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{m.unit}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-mute)', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
              Puedes ajustar estos valores manualmente después desde Goals.
            </p>
          </div>
        )}

        {/* ── Navigation buttons ── */}
        {step >= 1 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 24 }}>
            {step > 1 && (
              <button onClick={back} style={{
                flex: 1, padding: '16px', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
                color: 'var(--text-dim)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}>← Atrás</button>
            )}
            {step < 5 ? (
              <button onClick={next} disabled={!canNext()} style={{
                flex: 2, padding: '16px',
                background: canNext() ? 'var(--green)' : 'rgba(255,255,255,0.08)',
                border: 'none', borderRadius: 14,
                color: canNext() ? '#000' : 'var(--text-mute)',
                fontSize: 15, fontWeight: 700, cursor: canNext() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: canNext() ? '0 4px 16px rgba(34,197,94,0.3)' : 'none',
              }}>Siguiente →</button>
            ) : (
              <button onClick={handleFinish} style={{
                flex: 2, padding: '16px', background: 'var(--green)', border: 'none',
                borderRadius: 14, color: '#000', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(34,197,94,0.35)',
              }}>🚀 Empezar a trackear</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
