import { useState, useEffect, useCallback } from 'react'
import {
  getDayLog, addFoodEntry, removeFoodEntry,
  computeMacros, getGoals, saveGoals, DEFAULT_GOALS,
} from '../lib/storage'
import AddFoodModal from '../components/AddFoodModal'

const MEALS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { id: 'snacks',    label: 'Snacks',    emoji: '🍎' },
]

function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

function formatDate(d) {
  const today     = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (toDateStr(d) === toDateStr(today))     return 'Today'
  if (toDateStr(d) === toDateStr(yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}

// ── SVG Donut Ring ────────────────────────────────────────────────────────────

function CalorieRing({ consumed, goal, size = 130 }) {
  const sw = 13
  const r  = (size - sw) / 2
  const circ   = 2 * Math.PI * r
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const offset   = circ * (1 - progress)
  const cx = size / 2
  const cy = size / 2

  const color = progress >= 1 ? 'var(--red)' : progress >= 0.9 ? 'var(--amber)' : 'var(--green)'

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1), stroke 0.3s ease' }}
      />
    </svg>
  )
}

// ── Macro Progress Bar ────────────────────────────────────────────────────────

function MacroBar({ label, value, goal, color }) {
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>
          {Math.round(value)}g
        </span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct * 100}%`,
          background: color, borderRadius: 3,
          transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 3 }}>
        goal: {goal}g
      </div>
    </div>
  )
}

// ── Goals Modal ───────────────────────────────────────────────────────────────

const GOAL_FIELDS = [
  { key: 'calories', label: 'Calories',       unit: 'kcal', min: 1000, max: 5000, step: 50  },
  { key: 'protein',  label: 'Protein',         unit: 'g',    min: 0,    max: 400,  step: 5   },
  { key: 'carbs',    label: 'Carbohydrates',   unit: 'g',    min: 0,    max: 600,  step: 5   },
  { key: 'fat',      label: 'Fat',             unit: 'g',    min: 0,    max: 250,  step: 5   },
]

function GoalsModal({ goals, onChange, onSave, onClose }) {
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }
  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--bg2)',
        borderRadius: '22px 22px 0 0',
        border: '1px solid var(--border)',
        borderBottom: 'none',
        padding: '0 20px 32px',
        animation: 'slideUp 0.28s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Daily Goals</h2>
            <p style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 3 }}>Set your nutrition targets</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg3)', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {GOAL_FIELDS.map(({ key, label, unit, min, max, step }) => (
          <div key={key} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 500 }}>{label}</label>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>
                {goals[key]} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-mute)' }}>{unit}</span>
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={goals[key]}
              onChange={e => onChange(prev => ({ ...prev, [key]: Number(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>
        ))}

        <button
          onClick={onSave}
          style={{
            width: '100%', padding: '14px',
            background: 'var(--green)', border: 'none',
            borderRadius: 13, color: '#000',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            marginTop: 4,
          }}
        >
          Save Goals
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TrackerHome() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dayLog, setDayLog]           = useState({ breakfast: [], lunch: [], dinner: [], snacks: [] })
  const [goals, setGoals]             = useState(() => getGoals())
  const [addingTo, setAddingTo]       = useState(null)
  const [showGoals, setShowGoals]     = useState(false)
  const [goalsDraft, setGoalsDraft]   = useState(null)

  const dateStr = toDateStr(currentDate)
  const isToday = dateStr === toDateStr(new Date())

  const reload = useCallback(() => {
    setDayLog(getDayLog(dateStr))
  }, [dateStr])

  useEffect(() => { reload() }, [reload])

  const allEntries = Object.values(dayLog).flat()
  const totals     = computeMacros(allEntries)
  const remaining  = goals.calories - totals.calories

  const changeDate = (delta) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + delta)
    if (d <= new Date()) setCurrentDate(d)
  }

  const handleAdd = (meal, entry) => {
    addFoodEntry(dateStr, meal, entry)
    reload()
    setAddingTo(null)
  }

  const handleRemove = (meal, index) => {
    removeFoodEntry(dateStr, meal, index)
    reload()
  }

  const handleSaveGoals = () => {
    saveGoals(goalsDraft)
    setGoals(goalsDraft)
    setShowGoals(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      maxWidth: 480,
      margin: '0 auto',
      paddingBottom: 40,
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 20px 4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'var(--green)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" fill="none" stroke="#000" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" strokeWidth="0" fill="#000" opacity=".0"/>
              <path d="M4.5 9.5a9 9 0 0 1 15 0M9 15l1.5 3 1.5-3 1.5 3 1.5-3"/>
            </svg>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#000', letterSpacing: '-0.02em' }}>C</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>CalTrack</span>
        </div>
        <button
          onClick={() => { setGoalsDraft({ ...goals }); setShowGoals(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--bg3)', border: '1px solid var(--border)',
            color: 'var(--text-dim)', cursor: 'pointer',
            borderRadius: 10, padding: '7px 13px',
            fontSize: 12, fontWeight: 500,
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
          </svg>
          Goals
        </button>
      </div>

      {/* ── Date Nav ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 18, padding: '14px 20px 18px',
      }}>
        <button
          onClick={() => changeDate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 8, borderRadius: 8 }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, minWidth: 80, textAlign: 'center' }}>
          {formatDate(currentDate)}
        </span>
        <button
          onClick={() => changeDate(1)}
          disabled={isToday}
          style={{
            background: 'none', border: 'none',
            color: isToday ? 'rgba(255,255,255,0.1)' : 'var(--text-dim)',
            cursor: isToday ? 'default' : 'pointer',
            padding: 8, borderRadius: 8,
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* ── Summary Card ── */}
      <div style={{
        margin: '0 16px 12px',
        background: 'var(--bg2)',
        borderRadius: 18, border: '1px solid var(--border)',
        padding: '22px 20px',
        animation: 'fadeIn 0.4s ease',
      }}>
        {/* Ring + calorie numbers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <CalorieRing consumed={totals.calories} goal={goals.calories} size={120} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {totals.calories.toLocaleString()}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2, letterSpacing: '0.04em', fontWeight: 500 }}>EATEN</span>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>
              Remaining
            </div>
            <div style={{
              fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1,
              color: remaining >= 0 ? 'var(--green)' : 'var(--red)',
            }}>
              {Math.abs(Math.round(remaining)).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 5 }}>
              {remaining >= 0 ? 'kcal left today' : 'kcal over goal'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>
              Goal · {goals.calories.toLocaleString()} kcal
            </div>
          </div>
        </div>

        {/* Macro bars */}
        <div style={{ display: 'flex', gap: 14 }}>
          <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color="var(--red)"   />
          <MacroBar label="Carbs"   value={totals.carbs}   goal={goals.carbs}   color="var(--amber)" />
          <MacroBar label="Fat"     value={totals.fat}     goal={goals.fat}     color="var(--blue)"  />
        </div>

        {/* Fiber row */}
        {totals.fiber > 0 && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)' }}>
            <span>Fiber</span>
            <span style={{ fontWeight: 600 }}>{totals.fiber}g</span>
          </div>
        )}
      </div>

      {/* ── Meal Sections ── */}
      <div style={{ padding: '4px 16px 0' }}>
        {MEALS.map(meal => {
          const entries    = dayLog[meal.id] || []
          const mealTotals = computeMacros(entries)

          return (
            <div key={meal.id} style={{
              marginBottom: 10,
              background: 'var(--bg2)',
              borderRadius: 14, border: '1px solid var(--border)',
              overflow: 'hidden',
              animation: 'fadeIn 0.4s ease',
            }}>
              {/* Meal header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 17 }}>{meal.emoji}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{meal.label}</div>
                    {mealTotals.calories > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 1 }}>
                        {Math.round(mealTotals.calories)} kcal
                        &nbsp;·&nbsp; P {mealTotals.protein}g
                        &nbsp;C {mealTotals.carbs}g
                        &nbsp;F {mealTotals.fat}g
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setAddingTo(meal.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'var(--green-dim)', border: '1px solid var(--green-border)',
                    color: 'var(--green)', cursor: 'pointer',
                    borderRadius: 9, padding: '6px 13px',
                    fontSize: 12, fontWeight: 700,
                  }}
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Add
                </button>
              </div>

              {/* Food entries */}
              {entries.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {entries.map((entry, i) => {
                    const f    = entry.grams / 100
                    const kcal = Math.round(entry.per100g.calories * f)
                    const p    = +(entry.per100g.protein * f).toFixed(1)
                    const c    = +(entry.per100g.carbs   * f).toFixed(1)
                    const fat  = +(entry.per100g.fat     * f).toFixed(1)

                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center',
                        padding: '10px 16px',
                        borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
                        gap: 10,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 500,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {entry.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>
                            {entry.grams}g
                            &nbsp;·&nbsp; P {p}g &nbsp;C {c}g &nbsp;F {fat}g
                          </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', flexShrink: 0 }}>
                          {kcal} kcal
                        </div>
                        <button
                          onClick={() => handleRemove(meal.id, i)}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.18)', cursor: 'pointer', padding: 6, flexShrink: 0, borderRadius: 6 }}
                          onMouseOver={e => e.currentTarget.style.color = 'var(--red)'}
                          onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.18)'}
                        >
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: '20px 20px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)', lineHeight: 1.6 }}>
          Nutrition data via Open Food Facts · Data saved locally in your browser
        </p>
      </div>

      {/* ── Modals ── */}
      {addingTo && (
        <AddFoodModal
          meal={MEALS.find(m => m.id === addingTo)}
          onAdd={entry => handleAdd(addingTo, entry)}
          onClose={() => setAddingTo(null)}
        />
      )}
      {showGoals && goalsDraft && (
        <GoalsModal
          goals={goalsDraft}
          onChange={setGoalsDraft}
          onSave={handleSaveGoals}
          onClose={() => setShowGoals(false)}
        />
      )}
    </div>
  )
}
