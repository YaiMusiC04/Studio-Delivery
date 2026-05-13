import { useState, useEffect, useRef } from 'react'
import { searchFoods } from '../lib/foodApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 1024
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width >= height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.78)
      resolve({ base64: dataUrl.split(',')[1], preview: dataUrl, mediaType: 'image/jpeg' })
    }
    img.src = URL.createObjectURL(file)
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MacroChip({ label, value, unit, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg3)', borderRadius: 10, padding: '8px 4px' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 1 }}>{unit}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', marginTop: 1 }}>{label}</div>
    </div>
  )
}

function ScannedFoodCard({ food, onAdd }) {
  const [grams, setGrams] = useState(food.estimatedGrams || 100)
  const f = grams / 100
  const cal = Math.round(food.per100g.calories * f)
  const p   = +(food.per100g.protein * f).toFixed(1)
  const c   = +(food.per100g.carbs   * f).toFixed(1)
  const fat = +(food.per100g.fat     * f).toFixed(1)

  return (
    <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: '14px 14px 12px', marginBottom: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{food.name}</div>

      {/* Macro chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <MacroChip label="Calories" value={cal}  unit="kcal" color="var(--green)" />
        <MacroChip label="Protein"  value={p}    unit="g"    color="var(--red)"   />
        <MacroChip label="Carbs"    value={c}    unit="g"    color="var(--amber)" />
        <MacroChip label="Fat"      value={fat}  unit="g"    color="var(--blue)"  />
      </div>

      {/* Serving adjust */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>Grams:</span>
        <input
          type="number" min="1" max="2000" value={grams}
          onChange={e => setGrams(Math.max(1, parseInt(e.target.value) || 1))}
          style={{
            width: 72, padding: '7px 10px', textAlign: 'center',
            background: 'var(--bg4)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text)', fontSize: 14, fontWeight: 600, outline: 'none',
          }}
        />
        <button
          onClick={() => onAdd({ ...food, grams })}
          style={{
            flex: 1, padding: '8px 0', background: 'var(--green)',
            border: 'none', borderRadius: 9, color: '#000',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          + Add
        </button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AddFoodModal({ meal, onAdd, onClose }) {
  const [mode, setMode]       = useState('search') // 'search' | 'scan'

  // Search
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [grams, setGrams]     = useState(100)
  const [noResult, setNoResult] = useState(false)

  // Scan
  const [scanPreview, setScanPreview]   = useState(null)
  const [scanLoading, setScanLoading]   = useState(false)
  const [scanResults, setScanResults]   = useState(null)
  const [scanError, setScanError]       = useState(null)

  const inputRef = useRef(null)
  const fileRef  = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => { if (mode === 'search') inputRef.current?.focus() }, [mode])

  // Search debounce
  useEffect(() => {
    clearTimeout(timerRef.current)
    if (query.trim().length < 2) { setResults([]); setLoading(false); setNoResult(false); return }
    setLoading(true); setNoResult(false)
    timerRef.current = setTimeout(async () => {
      const foods = await searchFoods(query)
      setResults(foods); setLoading(false); setNoResult(foods.length === 0)
    }, 500)
    return () => clearTimeout(timerRef.current)
  }, [query])

  const handleSelect = (food) => { setSelected(food); setGrams(food.defaultServing || 100) }

  const macros = (food, g) => {
    const f = g / 100
    return {
      calories: Math.round(food.per100g.calories * f),
      protein:  +(food.per100g.protein * f).toFixed(1),
      carbs:    +(food.per100g.carbs   * f).toFixed(1),
      fat:      +(food.per100g.fat     * f).toFixed(1),
    }
  }

  const handleAdd = () => { if (selected) onAdd({ ...selected, grams: Number(grams) }) }

  // Photo scan
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setScanResults(null); setScanError(null); setScanLoading(true)
    const compressed = await compressImage(file)
    setScanPreview(compressed.preview)

    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressed.base64, mediaType: compressed.mediaType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)
      setScanResults(data)
    } catch (err) {
      setScanError(`Error: ${err.message || 'Could not analyze the image. Try again.'}`)
    } finally {
      setScanLoading(false)
    }
  }

  const handleAddScanned = (food, grams) => {
    onAdd({
      id: `ai_${Date.now()}_${Math.random()}`,
      name: food.name,
      brand: 'AI Estimate',
      grams,
      per100g: food.per100g,
    })
  }

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div onClick={handleBackdrop} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 480, background: 'var(--bg2)',
        borderRadius: '22px 22px 0 0', border: '1px solid var(--border)', borderBottom: 'none',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.28s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Add to {meal.label}</h2>
            </div>
            <button onClick={onClose} style={{ background: 'var(--bg3)', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 11, padding: 3, gap: 3 }}>
            {[
              { id: 'search', label: '🔍 Search' },
              { id: 'scan',   label: '📷 AI Scan' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setMode(tab.id)} style={{
                flex: 1, padding: '8px 0',
                background: mode === tab.id ? 'var(--bg2)' : 'transparent',
                border: mode === tab.id ? '1px solid var(--border)' : '1px solid transparent',
                borderRadius: 9, color: mode === tab.id ? 'var(--text)' : 'var(--text-mute)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                transition: 'all 0.2s',
              }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── SEARCH MODE ── */}
        {mode === 'search' && (
          <>
            {/* Search input */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                  style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  ref={inputRef} type="text" value={query}
                  onChange={e => { setSelected(null); setQuery(e.target.value) }}
                  placeholder="chicken breast, apple, pasta…"
                  style={{
                    width: '100%', padding: '13px 42px 13px 40px',
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 12, color: 'var(--text)', fontSize: 14, outline: 'none',
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
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(34,197,94,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ flex: 1, paddingRight: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.name}</div>
                    {selected.brand && <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 2 }}>{selected.brand}</div>}
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-mute)', cursor: 'pointer', padding: 4 }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>Serving:</span>
                  <input type="number" min="1" max="2000" value={grams}
                    onChange={e => setGrams(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: 76, padding: '8px 10px', textAlign: 'center', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text)', fontSize: 15, fontWeight: 600, outline: 'none' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-mute)' }}>grams</span>
                </div>
                {(() => {
                  const m = macros(selected, grams)
                  return (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      <MacroChip label="Calories" value={m.calories} unit="kcal" color="var(--green)" />
                      <MacroChip label="Protein"  value={m.protein}  unit="g"    color="var(--red)"   />
                      <MacroChip label="Carbs"    value={m.carbs}    unit="g"    color="var(--amber)" />
                      <MacroChip label="Fat"      value={m.fat}      unit="g"    color="var(--blue)"  />
                    </div>
                  )
                })()}
                <button onClick={handleAdd} style={{ width: '100%', padding: '13px', background: 'var(--green)', border: 'none', borderRadius: 12, color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Add {grams}g to {meal.label}
                </button>
              </div>
            )}

            {/* Results */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!loading && !selected && query.length < 2 && (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🥗</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dim)' }}>Search for any food</div>
                  <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 6, lineHeight: 1.6 }}>
                    Type at least 2 characters.<br/>Millions of foods available.
                  </div>
                </div>
              )}
              {noResult && !loading && !selected && (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 30, marginBottom: 10 }}>🔍</div>
                  <div style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 500 }}>No results found</div>
                  <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 4 }}>Try a different search term</div>
                </div>
              )}
              {results.map((food, idx) => {
                const n = food.per100g
                const isSel = selected?.id === food.id
                return (
                  <button key={food.id + idx} onClick={() => handleSelect(food)} style={{
                    width: '100%', textAlign: 'left', padding: '12px 20px',
                    background: isSel ? 'rgba(34,197,94,0.07)' : 'transparent',
                    border: 'none', borderBottom: '1px solid var(--border)',
                    color: 'var(--text)', cursor: 'pointer', transition: 'background 0.15s',
                  }}
                    onMouseOver={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseOut={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{food.name}</div>
                    {food.brand && <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 4 }}>{food.brand}</div>}
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
              <div style={{ height: 24 }} />
            </div>
          </>
        )}

        {/* ── SCAN MODE ── */}
        {mode === 'scan' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {/* Upload / Camera button */}
            {!scanPreview && !scanLoading && (
              <div>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: '100%', padding: '32px 20px',
                    background: 'var(--bg3)',
                    border: '2px dashed var(--border)',
                    borderRadius: 16, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 12,
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)'; e.currentTarget.style.background = 'rgba(34,197,94,0.04)' }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg3)' }}
                >
                  <div style={{ fontSize: 44 }}>📷</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Take or upload a photo</div>
                  <div style={{ fontSize: 12, color: 'var(--text-mute)', textAlign: 'center', lineHeight: 1.6 }}>
                    AI will identify the food and<br/>estimate the calories & macros
                  </div>
                  <div style={{ marginTop: 4, padding: '8px 20px', background: 'var(--green)', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#000' }}>
                    Open Camera / Gallery
                  </div>
                </button>

                <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: 'rgba(147,197,253,0.9)', lineHeight: 1.6 }}>
                    <strong>Tip:</strong> Works best with a clear photo of the plate from above. The AI gives estimated values — adjust grams as needed.
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {scanLoading && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                {scanPreview && (
                  <div style={{ position: 'relative', marginBottom: 20, display: 'inline-block' }}>
                    <img src={scanPreview} alt="food" style={{ width: '100%', maxWidth: 300, borderRadius: 14, opacity: 0.6 }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, border: '3px solid rgba(34,197,94,0.3)', borderTop: '3px solid var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>Analyzing your food…</div>
                <div style={{ fontSize: 12, color: 'var(--text-mute)', animation: 'pulse 1.5s ease infinite' }}>AI is identifying nutrients</div>
              </div>
            )}

            {/* Error */}
            {scanError && !scanLoading && (
              <div>
                {scanPreview && <img src={scanPreview} alt="food" style={{ width: '100%', borderRadius: 14, marginBottom: 16, opacity: 0.5 }} />}
                <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: '#FCA5A5' }}>{scanError}</div>
                </div>
                <button onClick={() => { setScanPreview(null); setScanError(null) }}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Try Again
                </button>
              </div>
            )}

            {/* Results */}
            {scanResults && !scanLoading && (
              <div>
                {scanPreview && (
                  <img src={scanPreview} alt="food" style={{ width: '100%', borderRadius: 14, marginBottom: 16, maxHeight: 220, objectFit: 'cover' }} />
                )}

                {scanResults.description && (
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16, padding: '10px 14px', background: 'var(--bg3)', borderRadius: 10, lineHeight: 1.5 }}>
                    🤖 <em>{scanResults.description}</em>
                  </div>
                )}

                <div style={{ fontSize: 11, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 10 }}>
                  Detected Foods
                </div>

                {scanResults.foods.map((food, i) => (
                  <ScannedFoodCard
                    key={i}
                    food={food}
                    onAdd={(foodWithGrams) => handleAddScanned(foodWithGrams, foodWithGrams.grams)}
                  />
                ))}

                <button
                  onClick={() => { setScanPreview(null); setScanResults(null); setScanError(null) }}
                  style={{ width: '100%', marginTop: 4, padding: '11px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-dim)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  Scan another photo
                </button>
              </div>
            )}

            <div style={{ height: 24 }} />
          </div>
        )}
      </div>
    </div>
  )
}
