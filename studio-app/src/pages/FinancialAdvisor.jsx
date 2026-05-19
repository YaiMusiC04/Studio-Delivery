import { useState } from 'react'

const SUGGESTIONS = [
  'Acciones abajo -5% con ingresos creciendo hoy',
  'Busca oportunidades en tecnología',
  'Las 3 mejores opciones CALL de hoy',
  'Análisis completo del mercado',
]

const RISK_COLOR = { BAJO: 'var(--green)', MEDIO: 'var(--amber)', ALTO: 'var(--red)' }
const ACTION_COLOR = { COMPRAR: 'var(--green)', ESPECULAR: 'var(--amber)', OBSERVAR: 'var(--text-mute)' }

function ProbBar({ value }) {
  const color = value >= 70 ? 'var(--green)' : value >= 50 ? 'var(--amber)' : 'var(--red)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-mute)' }}>PROBABILIDAD</span>
        <span style={{ fontSize: 14, fontWeight: 800, color }}>{value}%</span>
      </div>
      <div style={{ height: 5, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value}%`,
          background: color, borderRadius: 3,
          transition: 'width 1.2s cubic-bezier(.16,1,.3,1)',
        }} />
      </div>
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '8px 10px', textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-mute)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
    </div>
  )
}

function GrowthPill({ label, value }) {
  if (value == null) return null
  const isPos = value >= 0
  return (
    <div style={{
      flex: 1,
      background: isPos ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
      border: `1px solid ${isPos ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)'}`,
      borderRadius: 8, padding: '6px 10px',
    }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-mute)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: isPos ? 'var(--green)' : 'var(--red)' }}>
        {isPos ? '+' : ''}{value?.toFixed(1)}% {isPos ? '↑' : '↓'}
      </div>
    </div>
  )
}

function StockCard({ pick, idx }) {
  const actionClr = ACTION_COLOR[pick.action] || 'var(--text-dim)'
  const riskClr   = RISK_COLOR[pick.riskLevel] || 'var(--text-mute)'
  const hasOpts   = pick.optionsPlay?.strategy && pick.optionsPlay.strategy !== 'N/A'

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 18,
      padding: '18px 18px 16px',
      animation: `fadeIn 0.35s ease ${idx * 0.12}s both`,
    }}>
      {/* ── Top row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>{pick.symbol}</span>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: 'var(--red)', background: 'rgba(239,68,68,0.14)',
              padding: '2px 8px', borderRadius: 6,
            }}>
              {pick.changePercent?.toFixed(1)}%
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>{pick.name}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: actionClr,
            background: `${actionClr}1A`, padding: '4px 11px', borderRadius: 8,
          }}>
            {pick.action}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: riskClr }}>
            RIESGO {pick.riskLevel}
          </span>
        </div>
      </div>

      {/* ── Probability bar ── */}
      <div style={{ marginBottom: 14 }}>
        <ProbBar value={pick.probability} />
        {pick.probabilityReason && (
          <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 5, lineHeight: 1.4 }}>
            {pick.probabilityReason}
          </div>
        )}
      </div>

      {/* ── Price stats ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <StatBox label="PRECIO HOY" value={`$${pick.currentPrice?.toFixed(2)}`} />
        <StatBox label="ENTRADA" value={`$${pick.entryLow?.toFixed(0)}-${pick.entryHigh?.toFixed(0)}`} />
        <StatBox label="OBJETIVO 30D" value={`$${pick.target30d?.toFixed(2)}`} color="var(--green)" />
        <StatBox label="STOP LOSS"  value={`$${pick.stopLoss?.toFixed(2)}`}  color="var(--red)" />
      </div>

      {/* ── Growth pills ── */}
      {(pick.revenueGrowth != null || pick.earningsGrowth != null) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <GrowthPill label="INGRESOS YoY" value={pick.revenueGrowth} />
          <GrowthPill label="GANANCIAS YoY" value={pick.earningsGrowth} />
        </div>
      )}

      {/* ── Reasoning ── */}
      <div style={{
        fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.65,
        marginBottom: hasOpts ? 12 : 0,
      }}>
        {pick.reasoning}
      </div>

      {/* ── Options play ── */}
      {hasOpts && (
        <div style={{
          background: 'rgba(59,130,246,0.07)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 11, padding: '10px 13px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)' }}>
              OPCIONES · {pick.optionsPlay.strategy}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-mute)' }}>~{pick.optionsPlay.daysToExpiry}d</span>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Strike <strong>${pick.optionsPlay.strike}</strong></span>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Prima ~{pick.optionsPlay.estimatedPremium}</span>
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>Max +{pick.optionsPlay.maxGainPct}</span>
          </div>
          {pick.optionsPlay.reason && (
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 6, lineHeight: 1.45 }}>
              {pick.optionsPlay.reason}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: 16 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16,
        background: 'rgba(59,130,246,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 26, height: 26,
          border: '2.5px solid rgba(59,130,246,0.2)',
          borderTop: '2.5px solid var(--blue)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Analizando mercados…</div>
      <div style={{ fontSize: 13, color: 'var(--text-mute)', textAlign: 'center', lineHeight: 1.6, maxWidth: 260 }}>
        Escaneando Yahoo Finance · Enriqueciendo con datos fundamentales · Calculando probabilidades
      </div>
    </div>
  )
}

export default function FinancialAdvisor() {
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  const run = async (q) => {
    const query = (q ?? input).trim()
    if (!query || loading) return
    setInput('')
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/financial-screener', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', background: 'var(--bg)',
      color: 'var(--text)', fontFamily: 'var(--font)',
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: 'calc(env(safe-area-inset-top) + 14px) 18px 12px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(59,130,246,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" fill="none" stroke="var(--blue)" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Screener Financiero</div>
            <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Yahoo Finance · IA Claude · Datos en vivo</div>
          </div>
          {result && (
            <button onClick={() => { setResult(null); setError(null) }} style={{
              marginLeft: 'auto', fontSize: 11, fontWeight: 600,
              color: 'var(--text-mute)', background: 'var(--bg3)',
              border: '1px solid var(--border)', borderRadius: 8,
              padding: '5px 10px', cursor: 'pointer',
            }}>
              Nueva búsqueda
            </button>
          )}
        </div>
      </div>

      {/* ── Disclaimer banner ── */}
      <div style={{
        padding: '7px 18px',
        background: 'rgba(245,158,11,0.07)',
        borderBottom: '1px solid rgba(245,158,11,0.18)',
        fontSize: 11, color: 'rgba(245,158,11,0.85)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <svg width="12" height="12" fill="var(--amber)" viewBox="0 0 24 24">
          <path d="M12 2L2 22h20L12 2zm0 4l7.5 14h-15L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
        </svg>
        Solo análisis informativo — no es asesoría financiera. Invierte bajo tu propio riesgo.
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>

        {/* Welcome / suggestions */}
        {!loading && !result && !error && (
          <div style={{ textAlign: 'center', padding: '32px 16px 20px', animation: 'fadeIn 0.3s ease' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
              background: 'rgba(59,130,246,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="30" height="30" fill="none" stroke="var(--blue)" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Asesor de Mercados</div>
            <div style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.65, marginBottom: 24, maxWidth: 300, margin: '0 auto 24px' }}>
              Escaneo en tiempo real de +160 acciones. Siempre te doy las <strong style={{ color: 'var(--text-dim)' }}>3 mejores oportunidades</strong> con probabilidad y estrategia de opciones.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340, margin: '0 auto' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => run(s)} style={{
                  padding: '12px 16px', textAlign: 'left',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, color: 'var(--text-dim)',
                  fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.09)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingScreen />}

        {/* Error */}
        {error && (
          <div style={{
            margin: '20px 0', padding: '14px 16px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.22)',
            borderRadius: 12, fontSize: 13, color: 'var(--red)',
          }}>
            {error}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>

            {/* Market overview */}
            {result.marketOverview && (
              <div style={{
                background: 'rgba(59,130,246,0.07)',
                border: '1px solid rgba(59,130,246,0.18)',
                borderRadius: 14, padding: '12px 14px', marginBottom: 16,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--blue)', marginBottom: 5 }}>
                  CONTEXTO DE MERCADO · {new Date(result.fetchedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{result.marketOverview}</div>
                {result.scanned > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 6 }}>
                    Escaneadas: {result.scanned} acciones · Caídas ≥5%: {result.losersFound}
                  </div>
                )}
              </div>
            )}

            {/* Stock picks */}
            {result.picks?.length > 0
              ? result.picks.map((pick, i) => <StockCard key={pick.symbol} pick={pick} idx={i} />)
              : (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-mute)', fontSize: 13 }}>
                  No se encontraron acciones que cumplan los criterios en este momento. Intenta más tarde o cambia los parámetros.
                </div>
              )
            }

            {/* Disclaimer */}
            {result.disclaimer && (
              <div style={{
                marginTop: 8, padding: '10px 14px',
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                fontSize: 11, color: 'var(--text-mute)', lineHeight: 1.55,
              }}>
                ⚠️ {result.disclaimer}
              </div>
            )}
          </div>
        )}

        <div style={{ height: 80 }} />
      </div>

      {/* ── Input ── */}
      <div style={{
        padding: '10px 14px',
        paddingBottom: 'calc(10px + 72px + env(safe-area-inset-bottom))',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg2)',
        display: 'flex', gap: 10, alignItems: 'flex-end',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run() } }}
          placeholder="Ej: Acciones de tecnología abajo 5% con ventas subiendo…"
          disabled={loading}
          style={{
            flex: 1, padding: '12px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, color: 'var(--text)',
            fontSize: 14, outline: 'none',
            fontFamily: 'var(--font)',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.45)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
        <button
          onClick={() => run()}
          disabled={!input.trim() || loading}
          style={{
            width: 44, height: 44, flexShrink: 0,
            background: input.trim() && !loading ? 'var(--blue)' : 'rgba(255,255,255,0.07)',
            border: 'none', borderRadius: 12,
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {loading
            ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid var(--blue)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <svg width="18" height="18" fill="none" stroke={input.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          }
        </button>
      </div>
    </div>
  )
}
