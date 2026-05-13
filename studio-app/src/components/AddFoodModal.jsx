import { useState, useEffect, useRef } from 'react'
import { searchFoods } from '../lib/foodApi'

function MacroChip({ label, value, unit, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center',
      background: 'var(--bg3)', borderRadius: 10, padding: '8px 4px',
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 1 }}>{unit}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', marginTop: 1 }}>{label}</div>
    </div>
  )
}

export default function AddFoodModal({ meal, onAdd, onClose }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [grams, setGrams]     = useState(100)
  const [noResult, setNoResult] = useState(false)
  const inputRef  = useRef(null)
  const timerRef  = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      setNoResult(false)
      return
    }
    setLoading(true)
    setNoResult(false)
    timerRef.current = setTimeout(async () => {
      const foods = await searchFoods(query)
      setResults(foods)
      setLoading(false)
      setNoResult(foods.length === 0)
    }, 500)
    return () => clearTimeout(timerRef.current)
  }, [query])

  const handleSelect = (food) => {
    setSelected(food)
    setGrams(food.defaultServing || 100)
  }

  const macros = (food, g) => {
    const f = g / 100
    return {
      calories: Math.round(food.per100g.calories * f),
      protein:  +(food.per100g.protein * f).toFixed(1),
      carbs:    +(food.per100g.carbs   * f).toFixed(1),
      fat:      +(food.per100g.fat     * f).toFixed(1),
    }
  }

  const handleAdd = () => {
    if (!selected) return
    onAdd({ ...selected, grams: Number(grams) })
  }

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
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--bg2)',
        borderRadius: '22px 22px 0 0',
        border: '1px solid var(--border)',
        borderBottom: 'none',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.28s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Add to {meal.label}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 2 }}>
                Powered by Open Food Facts
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'var(--bg3)', border: 'none', color: 'var(--text-dim)',
                cursor: 'pointer', borderRadius: 10, width: 34, height: 34,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
              style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setSelected(null); setQuery(e.target.value) }}
              placeholder="chicken breast, apple, oatmeal…"
              style={{
                width: '100%', padding: '13px 42px 13px 40px',
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 12, color: 'var(--text)', fontSize: 14, outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(34,197,94,0.4)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {loading && (
              <div style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)' }}>
                <div style={{ width: 16, height: 16, border: '2px solid var(--bg4)', borderTop: '2px solid var(--green)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              </div>
            )}
          </div>
        </div>

        {/* Selected food */}
        {selected && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(34,197,94,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</div>
                {selected.brand && (
                  <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 2 }}>{selected.brand}</div>
                )}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-mute)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Serving input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>Serving:</span>
              <input
                type="number"
                min="1"
                max="2000"
                value={grams}
                onChange={e => setGrams(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: 76, padding: '8px 10px', textAlign: 'center',
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 9, color: 'var(--text)', fontSize: 15, fontWeight: 600, outline: 'none',
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-mute)' }}>grams</span>
            </div>

            {/* Macro chips */}
            {(() => {
              const m = macros(selected, grams)
              return (
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  <MacroChip label="Calories" value={m.calories} unit="kcal" color="var(--green)" />
                  <MacroChip label="Protein"  value={m.protein}  unit="g"    color="var(--red)" />
                  <MacroChip label="Carbs"    value={m.carbs}    unit="g"    color="var(--amber)" />
                  <MacroChip label="Fat"      value={m.fat}      unit="g"    color="var(--blue)" />
                </div>
              )
            })()}

            <button
              onClick={handleAdd}
              style={{
                width: '100%', padding: '13px', background: 'var(--green)',
                border: 'none', borderRadius: 12, color: '#000',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseOver={e => e.target.style.opacity = '0.88'}
              onMouseOut={e => e.target.style.opacity = '1'}
            >
              Add {grams}g to {meal.label}
            </button>
          </div>
        )}

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Empty state */}
          {!loading && !selected && query.length < 2 && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🥗</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dim)' }}>Search for any food</div>
              <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 6, lineHeight: 1.6 }}>
                Type at least 2 characters.<br/>We'll search millions of foods for you.
              </div>
            </div>
          )}

          {/* No results */}
          {noResult && !loading && !selected && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>🔍</div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 500 }}>No results found</div>
              <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 4 }}>Try a different search term</div>
            </div>
          )}

          {/* Result list */}
          {results.map((food, idx) => {
            const n = food.per100g
            const isSelected = selected?.id === food.id
            return (
              <button
                key={food.id + idx}
                onClick={() => handleSelect(food)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '12px 20px',
                  background: isSelected ? 'rgba(34,197,94,0.07)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text)', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{
                  fontSize: 13, fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 3,
                }}>
                  {food.name}
                </div>
                {food.brand && (
                  <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 4 }}>{food.brand}</div>
                )}
                <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>{n.calories} kcal</span>
                  <span style={{ color: 'var(--text-mute)' }}>P {n.protein}g</span>
                  <span style={{ color: 'var(--text-mute)' }}>C {n.carbs}g</span>
                  <span style={{ color: 'var(--text-mute)' }}>F {n.fat}g</span>
                  <span style={{ color: 'rgba(255,255,255,0.15)', marginLeft: 'auto' }}>per 100g</span>
                </div>
              </button>
            )
          })}

          {/* Bottom safe area */}
          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  )
}
