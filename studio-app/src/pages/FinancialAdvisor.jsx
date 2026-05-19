import { useState, useRef, useEffect } from 'react'

// ─── Shared helpers ───────────────────────────────────────────────────────────

const fmt$ = v => v != null ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
const fmtK = v => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : `$${(v/1e3).toFixed(0)}K`
const fmtPct = v => v != null ? `${v > 0 ? '+' : ''}${Number(v).toFixed(1)}%` : '—'

function Spinner({ color = 'var(--blue)' }) {
  return (
    <div style={{ width: 18, height: 18, border: `2px solid ${color}33`, borderTop: `2px solid ${color}`, borderRadius: '50%', animation: 'spin 0.75s linear infinite', flexShrink: 0 }} />
  )
}

function Tag({ label, color, bg }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: bg || `${color}1A`, padding: '3px 9px', borderRadius: 6, letterSpacing: '0.03em' }}>
      {label}
    </span>
  )
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-mute)', marginBottom: 8 }}>{children}</div>
}

function EmptyState({ icon, title, body, children }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      {body && <div style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.6, marginBottom: 20, maxWidth: 280, margin: '0 auto 20px' }}>{body}</div>}
      {children}
    </div>
  )
}

function LoadingFull({ lines }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 20px', gap: 14 }}>
      <Spinner color="var(--blue)" />
      <div style={{ fontSize: 14, fontWeight: 600 }}>{lines[0]}</div>
      {lines[1] && <div style={{ fontSize: 12, color: 'var(--text-mute)', textAlign: 'center', maxWidth: 260 }}>{lines[1]}</div>}
    </div>
  )
}

// ─── Screener Tab ─────────────────────────────────────────────────────────────

const SCREENER_SUGGESTIONS = [
  'Acciones abajo -5% con ingresos creciendo hoy',
  'Busca oportunidades en tecnología',
  'Las 3 mejores opciones CALL de hoy',
  'Análisis completo del mercado ahora',
]

function ProbBar({ value }) {
  const color = value >= 70 ? 'var(--green)' : value >= 50 ? 'var(--amber)' : 'var(--red)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-mute)' }}>PROBABILIDAD</span>
        <span style={{ fontSize: 14, fontWeight: 800, color }}>{value}%</span>
      </div>
      <div style={{ height: 5, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3, transition: 'width 1.2s cubic-bezier(.16,1,.3,1)' }} />
      </div>
    </div>
  )
}

function StockCard({ pick, idx }) {
  const actionColor = { COMPRAR: 'var(--green)', ESPECULAR: 'var(--amber)', OBSERVAR: 'var(--text-mute)' }[pick.action] || 'var(--text-mute)'
  const riskColor   = { BAJO: 'var(--green)', MEDIO: 'var(--amber)', ALTO: 'var(--red)' }[pick.riskLevel] || 'var(--text-mute)'
  const hasOpts     = pick.optionsPlay?.strategy && pick.optionsPlay.strategy !== 'N/A'

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 16px 14px', marginBottom: 12, animation: `fadeIn 0.35s ease ${idx * 0.1}s both` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{pick.symbol}</span>
            <Tag label={`${pick.changePercent?.toFixed(1)}%`} color="var(--red)" />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>{pick.name}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          <Tag label={pick.action} color={actionColor} />
          <span style={{ fontSize: 10, fontWeight: 600, color: riskColor }}>RIESGO {pick.riskLevel}</span>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <ProbBar value={pick.probability} />
        {pick.probabilityReason && <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 5, lineHeight: 1.4 }}>{pick.probabilityReason}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
        {[
          { l: 'PRECIO',    v: fmt$(pick.currentPrice) },
          { l: 'ENTRADA',   v: `${fmt$(pick.entryLow)?.replace('$','')}-${fmt$(pick.entryHigh)}` },
          { l: 'OBJETIVO',  v: fmt$(pick.target30d),  c: 'var(--green)' },
          { l: 'STOP LOSS', v: fmt$(pick.stopLoss),   c: 'var(--red)' },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background: 'var(--bg3)', borderRadius: 9, padding: '7px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-mute)', marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: c || 'var(--text)' }}>{v}</div>
          </div>
        ))}
      </div>

      {(pick.revenueGrowth != null || pick.earningsGrowth != null) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[{ l: 'INGRESOS YoY', v: pick.revenueGrowth }, { l: 'GANANCIAS YoY', v: pick.earningsGrowth }].map(({ l, v }) =>
            v != null ? (
              <div key={l} style={{ flex: 1, background: v >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${v >= 0 ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)'}`, borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-mute)', marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: v >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPct(v)} {v >= 0 ? '↑' : '↓'}</div>
              </div>
            ) : null
          )}
        </div>
      )}

      <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.65, marginBottom: hasOpts ? 10 : 0 }}>{pick.reasoning}</div>

      {hasOpts && (
        <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '9px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)' }}>OPCIONES · {pick.optionsPlay.strategy}</span>
            <span style={{ fontSize: 10, color: 'var(--text-mute)' }}>~{pick.optionsPlay.daysToExpiry}d</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Strike <b>${pick.optionsPlay.strike}</b></span>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Prima ~{pick.optionsPlay.estimatedPremium}</span>
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>Max +{pick.optionsPlay.maxGainPct}</span>
          </div>
          {pick.optionsPlay.reason && <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 5 }}>{pick.optionsPlay.reason}</div>}
        </div>
      )}
    </div>
  )
}

function ScreenerTab() {
  const [input, setInput]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError]   = useState(null)

  const run = async (q) => {
    const query = (q ?? input).trim()
    if (!query || busy) return
    setInput(''); setBusy(true); setResult(null); setError(null)
    try {
      const r = await fetch('/api/financial-screener', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
      setResult(d)
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px' }}>
        {!busy && !result && !error && (
          <EmptyState icon="📊" title="Screener de Acciones" body="Escaneo en tiempo real de +160 acciones. Siempre te doy las 3 mejores oportunidades con probabilidad y opciones.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340, margin: '0 auto' }}>
              {SCREENER_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => run(s)} style={{ padding: '11px 14px', textAlign: 'left', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.09)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.28)' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
                  {s}
                </button>
              ))}
            </div>
          </EmptyState>
        )}

        {busy && <LoadingFull lines={['Analizando mercados…', 'Escaneando Yahoo Finance · Filtrando candidatos · Calculando probabilidades']} />}
        {error && <div style={{ margin: '16px 0', padding: '13px 15px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, fontSize: 13, color: 'var(--red)' }}>{error}</div>}

        {result && !busy && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {result.marketOverview && (
              <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 13, padding: '11px 13px', marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--blue)', marginBottom: 4 }}>
                  CONTEXTO · {new Date(result.fetchedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{result.marketOverview}</div>
                {result.scanned > 0 && <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 5 }}>Escaneadas: {result.scanned} · Caídas ≥5%: {result.losersFound}</div>}
              </div>
            )}
            {result.picks?.length > 0
              ? result.picks.map((p, i) => <StockCard key={p.symbol} pick={p} idx={i} />)
              : <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-mute)', fontSize: 13 }}>No se encontraron acciones con los criterios. Intenta más tarde.</div>
            }
            {result.disclaimer && (
              <div style={{ marginTop: 8, padding: '9px 13px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                ⚠️ {result.disclaimer}
              </div>
            )}
            <button onClick={() => setResult(null)} style={{ width: '100%', marginTop: 10, padding: '11px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-mute)', fontSize: 13, cursor: 'pointer' }}>
              Nueva búsqueda
            </button>
          </div>
        )}
        <div style={{ height: 80 }} />
      </div>

      {/* Bottom input */}
      <div style={{ padding: '10px 12px', paddingBottom: 'calc(10px + 72px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); run() } }}
          placeholder="Ej: Tecnología abajo 5% con ventas subiendo…"
          disabled={busy}
          style={{ flex: 1, padding: '11px 13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 13, color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
          onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.45)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
        <button onClick={() => run()} disabled={!input.trim() || busy} style={{ width: 42, height: 42, flexShrink: 0, background: input.trim() && !busy ? 'var(--blue)' : 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 12, cursor: input.trim() && !busy ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {busy ? <Spinner /> : <svg width="17" height="17" fill="none" stroke={input.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>}
        </button>
      </div>
    </>
  )
}

// ─── Ballenas (Whale Options Flow) Tab ────────────────────────────────────────

function FlowRow({ f, idx }) {
  const isBull = f.type === 'CALL'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 8, animation: `fadeIn 0.25s ease ${idx * 0.04}s both` }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: isBull ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 8, fontWeight: 800, color: isBull ? 'var(--green)' : 'var(--red)', letterSpacing: '0.05em' }}>{f.type}</span>
        <span style={{ fontSize: 10 }}>{isBull ? '🟢' : '🔴'}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>{f.symbol}</span>
          <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>${f.strike} · {f.expiry}</span>
          {f.daysOut <= 7 && <Tag label="URGENTE" color="var(--amber)" />}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Vol <b>{f.volume?.toLocaleString()}</b></span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>OI {f.openInt?.toLocaleString()}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)' }}>{f.volOiRatio}x</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>IV {f.iv}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: isBull ? 'var(--green)' : 'var(--red)' }}>{fmtK(f.notional)}</div>
        <div style={{ fontSize: 9, color: 'var(--text-mute)' }}>notional</div>
      </div>
    </div>
  )
}

function WhaleTab() {
  const [busy, setBusy]     = useState(false)
  const [data, setData]     = useState(null)
  const [error, setError]   = useState(null)

  const scan = async () => {
    setBusy(true); setData(null); setError(null)
    try {
      const r = await fetch('/api/options-flow', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
      setData(d)
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  const bulls = data?.flows?.filter(f => f.type === 'CALL') || []
  const bears = data?.flows?.filter(f => f.type === 'PUT')  || []

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {!busy && !data && !error && (
        <EmptyState icon="🐋" title="Flujo de Ballenas" body="Detecta dónde están apostando los institucionales analizando opciones con volumen anormal vs. open interest.">
          <button onClick={scan} style={{ padding: '13px 28px', background: 'var(--blue)', border: 'none', borderRadius: 13, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Escanear ahora
          </button>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-mute)' }}>Escanea ~24 activos líquidos (SPY, QQQ, AAPL, NVDA…)</div>
        </EmptyState>
      )}

      {busy && <LoadingFull lines={['Escaneando flujo de opciones…', 'Analizando volumen vs. open interest en 24 activos']} />}
      {error && <div style={{ padding: '13px 15px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, fontSize: 13, color: 'var(--red)' }}>{error}</div>}

      {data && !busy && (
        <div>
          {/* AI interpretation */}
          {data.interpretation && (
            <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 13, padding: '11px 13px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--blue)', marginBottom: 4 }}>
                INTERPRETACIÓN IA · {new Date(data.fetchedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{data.interpretation}</div>
              <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 5 }}>
                Escaneados: {data.scanned} activos · Señales alcistas: {bulls.length} · Bajistas: {bears.length}
              </div>
            </div>
          )}

          {/* Summary chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>{bulls.length}</div>
              <div style={{ fontSize: 10, color: 'var(--text-mute)' }}>CALLS alcistas</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)' }}>{bears.length}</div>
              <div style={{ fontSize: 10, color: 'var(--text-mute)' }}>PUTS bajistas</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--amber)' }}>{fmtK(data.flows?.reduce((s, f) => s + f.notional, 0) || 0)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-mute)' }}>total notional</div>
            </div>
          </div>

          <SectionTitle>TOP FLUJOS POR NOTIONAL</SectionTitle>
          {data.flows?.map((f, i) => <FlowRow key={`${f.symbol}-${f.type}-${f.strike}-${i}`} f={f} idx={i} />)}

          <button onClick={() => { setData(null) }} style={{ width: '100%', marginTop: 10, padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-mute)', fontSize: 13, cursor: 'pointer' }}>
            Volver a escanear
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Portfolio Tab ────────────────────────────────────────────────────────────

const PORTFOLIO_KEY = 'fin_portfolio_v1'

function loadPortfolio() {
  try { return JSON.parse(localStorage.getItem(PORTFOLIO_KEY)) || { positions: [] } } catch { return { positions: [] } }
}
function savePortfolio(p) {
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(p))
}

function PortfolioTab() {
  const fileRef                     = useRef(null)
  const [portfolio, setPortfolio]   = useState(loadPortfolio)
  const [busy, setBusy]             = useState(false)
  const [error, setError]           = useState(null)
  const [preview, setPreview]       = useState(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [form, setForm]             = useState({ symbol: '', name: '', shares: '', avgCost: '' })

  const totalValue    = portfolio.positions.reduce((s, p) => s + (p.currentValue || (p.avgCost * p.shares) || 0), 0)
  const totalCost     = portfolio.positions.reduce((s, p) => s + ((p.avgCost || 0) * (p.shares || 0)), 0)
  const totalGainLoss = totalValue - totalCost

  const persist = (p) => { setPortfolio(p); savePortfolio(p) }

  const handleFile = async (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const b64 = e.target.result.split(',')[1]
      const mt  = file.type || 'image/jpeg'
      setPreview(e.target.result)
      setBusy(true); setError(null)
      try {
        const r = await fetch('/api/portfolio-analyze', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ imageBase64: b64, mediaType: mt }),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
        if (d.portfolio?.positions?.length) {
          persist({ ...d.portfolio, uploadedAt: new Date().toISOString() })
        }
      } catch (e) { setError(e.message) }
      finally { setBusy(false) }
    }
    reader.readAsDataURL(file)
  }

  const refreshPrices = async () => {
    if (!portfolio.positions?.length) return
    setBusy(true)
    try {
      const r = await fetch('/api/portfolio-analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshOnly: true, positions: portfolio.positions }),
      })
      const d = await r.json()
      if (d.positions) persist({ ...portfolio, positions: d.positions, refreshedAt: new Date().toISOString() })
    } catch {}
    finally { setBusy(false) }
  }

  const addManual = () => {
    if (!form.symbol || !form.shares || !form.avgCost) return
    const pos = {
      symbol: form.symbol.toUpperCase().trim(),
      name: form.name || form.symbol.toUpperCase(),
      shares: parseFloat(form.shares),
      avgCost: parseFloat(form.avgCost),
      currentPrice: parseFloat(form.avgCost),
      currentValue: parseFloat(form.shares) * parseFloat(form.avgCost),
      gainLoss: 0, gainLossPct: 0,
    }
    const updated = { ...portfolio, positions: [...portfolio.positions, pos] }
    persist(updated)
    setForm({ symbol: '', name: '', shares: '', avgCost: '' })
    setShowAdd(false)
  }

  const removePosition = (idx) => {
    const updated = { ...portfolio, positions: portfolio.positions.filter((_, i) => i !== idx) }
    persist(updated)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>

      {/* Upload area if empty */}
      {!portfolio.positions?.length && !busy && (
        <EmptyState icon="💼" title="Tu Portafolio" body="Sube una foto de tu portafolio y la IA extrae todo automáticamente, o agrega posiciones manualmente.">
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
            <button onClick={() => fileRef.current?.click()} style={{ padding: '13px', background: 'var(--blue)', border: 'none', borderRadius: 13, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              📷 Subir foto del portafolio
            </button>
            <button onClick={() => setShowAdd(true)} style={{ padding: '12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 13, color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer' }}>
              + Agregar posición manual
            </button>
          </div>
        </EmptyState>
      )}

      {busy && <LoadingFull lines={['Analizando portafolio…', 'Claude Vision extrae tus posiciones']} />}
      {error && <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>}

      {/* Portfolio summary */}
      {portfolio.positions?.length > 0 && !busy && (
        <div>
          {/* Summary card */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt$(totalValue)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Valor total del portafolio</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: totalGainLoss >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {totalGainLoss >= 0 ? '+' : ''}{fmt$(totalGainLoss)}
                </div>
                <div style={{ fontSize: 11, color: totalGainLoss >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {fmtPct(totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0)} total
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={refreshPrices} style={{ flex: 1, padding: '8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, color: 'var(--blue)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                ↻ Actualizar precios
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
              <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>
                📷 Nueva foto
              </button>
              <button onClick={() => setShowAdd(s => !s)} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>
                + Agregar
              </button>
            </div>
          </div>

          {/* Add form */}
          {showAdd && (
            <div style={{ background: 'var(--bg2)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
              <SectionTitle>AGREGAR POSICIÓN</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                {[
                  { k: 'symbol', pl: 'Ticker (AAPL)', upper: true },
                  { k: 'name',   pl: 'Nombre (opcional)' },
                  { k: 'shares', pl: 'Acciones', num: true },
                  { k: 'avgCost', pl: 'Costo promedio $', num: true },
                ].map(({ k, pl, upper, num }) => (
                  <input key={k} value={form[k]} placeholder={pl}
                    onChange={e => setForm(f => ({ ...f, [k]: upper ? e.target.value.toUpperCase() : e.target.value }))}
                    type={num ? 'number' : 'text'}
                    style={{ padding: '9px 11px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.45)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addManual} style={{ flex: 1, padding: '10px', background: 'var(--blue)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Agregar</button>
                <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-mute)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Positions list */}
          <SectionTitle>POSICIONES ({portfolio.positions.length})</SectionTitle>
          {portfolio.positions.map((p, i) => {
            const gl   = p.gainLoss ?? ((p.currentPrice - p.avgCost) * p.shares)
            const glPct = p.gainLossPct ?? (p.avgCost > 0 ? (gl / (p.avgCost * p.shares)) * 100 : 0)
            const isUp = gl >= 0
            return (
              <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: '12px 13px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{p.symbol}</span>
                    {p.changeToday != null && (
                      <Tag label={fmtPct(p.changeToday)} color={p.changeToday >= 0 ? 'var(--green)' : 'var(--red)'} />
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 4 }}>{p.shares} acciones · Costo {fmt$(p.avgCost)}</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{fmt$(p.currentPrice)} actual</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isUp ? 'var(--green)' : 'var(--red)' }}>
                      {isUp ? '+' : ''}{fmt$(gl)} ({fmtPct(glPct)})
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt$(p.currentValue || p.avgCost * p.shares)}</div>
                  <button onClick={() => removePosition(i)} style={{ fontSize: 10, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', opacity: 0.6 }}>eliminar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────

const GOAL_EXAMPLES = [
  'Quiero 50% de retorno en 10 años',
  'Llegar a $1,000,000 en 20 años',
  'Quiero ingresos pasivos de $2,000/mes',
  'Proteger mi capital contra inflación',
]

function GoalMilestone({ m }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--blue)' }}>{m.year}</span>
      </div>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt$(m.expectedValue)}</div>
        <div style={{ fontSize: 10, color: 'var(--green)' }}>+{m.cumulativeReturnPct?.toFixed(0)}%</div>
      </div>
    </div>
  )
}

function GoalsTab() {
  const portfolio = loadPortfolio()
  const [goal, setGoal]     = useState('')
  const [busy, setBusy]     = useState(false)
  const [plan, setPlan]     = useState(null)
  const [error, setError]   = useState(null)

  const generate = async (g) => {
    const q = (g ?? goal).trim()
    if (!q || busy) return
    setBusy(true); setPlan(null); setError(null)
    try {
      const r = await fetch('/api/portfolio-analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ goal: q, positions: portfolio.positions }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
      setPlan(d.plan)
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  const feasColor = { FACTIBLE: 'var(--green)', DESAFIANTE: 'var(--amber)', 'MUY AMBICIOSO': 'var(--red)' }

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px' }}>
        {!busy && !plan && !error && (
          <EmptyState icon="🎯" title="Planificador de Metas" body="Descríbeme tu meta de inversión y te genero un plan personalizado con probabilidades, hitos y recomendaciones específicas.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320, margin: '0 auto' }}>
              {GOAL_EXAMPLES.map(s => (
                <button key={s} onClick={() => { setGoal(s); generate(s) }} style={{ padding: '11px 14px', textAlign: 'left', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.09)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.28)' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
                  {s}
                </button>
              ))}
              {portfolio.positions?.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4, textAlign: 'center' }}>Tip: agrega tu portafolio en la pestaña Portafolio para planes más precisos</div>
              )}
            </div>
          </EmptyState>
        )}

        {busy && <LoadingFull lines={['Generando tu plan…', 'Analizando portafolio · Calculando retornos · Diseñando hoja de ruta']} />}
        {error && <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>}

        {plan && !busy && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* Feasibility header */}
            <div style={{ background: 'var(--bg2)', border: `1px solid ${feasColor[plan.feasibility] || 'var(--border)'}44`, borderRadius: 16, padding: '16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <Tag label={plan.feasibility} color={feasColor[plan.feasibility] || 'var(--text-mute)'} />
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 7, lineHeight: 1.5 }}>{plan.goalSummary}</div>
                </div>
                <div style={{ textAlign: 'center', marginLeft: 14, flexShrink: 0 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: feasColor[plan.feasibility] || 'var(--text)' }}>{plan.probability}%</div>
                  <div style={{ fontSize: 9, color: 'var(--text-mute)' }}>prob. éxito</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {[
                  { l: 'ACTUAL', v: fmt$(plan.currentValue) },
                  { l: 'OBJETIVO', v: fmt$(plan.targetValue), c: 'var(--green)' },
                  { l: 'RETORNO ANUAL', v: `${plan.requiredAnnualReturn?.toFixed(1)}%` },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ background: 'var(--bg3)', borderRadius: 9, padding: '7px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-mute)', marginBottom: 2 }}>{l}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: c || 'var(--text)' }}>{v}</div>
                  </div>
                ))}
              </div>
              {plan.monthlyContributionNeeded > 0 && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 9 }}>
                  <span style={{ fontSize: 12, color: 'var(--amber)' }}>
                    💡 Para asegurar la meta: <b>{fmt$(plan.monthlyContributionNeeded)}/mes</b> de aportación adicional
                  </span>
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 8 }}>{plan.feasibilityReason}</div>
            </div>

            {/* Allocation */}
            {plan.recommendedAllocation?.length > 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', marginBottom: 12 }}>
                <SectionTitle>ASIGNACIÓN RECOMENDADA</SectionTitle>
                {plan.recommendedAllocation.map((a, i) => (
                  <div key={i} style={{ marginBottom: i < plan.recommendedAllocation.length - 1 ? 12 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{a.type}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--blue)' }}>{a.percentage}%</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 2, marginBottom: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${a.percentage}%`, background: 'var(--blue)', borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                      {a.examples?.join(' · ')} — {a.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Milestones */}
            {plan.milestones?.length > 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', marginBottom: 12 }}>
                <SectionTitle>HITOS DE LA META</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {plan.milestones.map((m, i) => <GoalMilestone key={i} m={m} />)}
                </div>
              </div>
            )}

            {/* Top picks */}
            {plan.topPicks?.length > 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', marginBottom: 12 }}>
                <SectionTitle>ACCIONES RECOMENDADAS PARA ESTA META</SectionTitle>
                {plan.topPicks.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < plan.topPicks.length - 1 ? 10 : 0 }}>
                    <div style={{ width: 36, height: 36, background: 'rgba(59,130,246,0.12)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--blue)' }}>{p.symbol}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{p.name} <span style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600 }}>({p.suggestedAllocationPct}%)</span></div>
                      <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>{p.why}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action steps */}
            {plan.actionSteps?.length > 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', marginBottom: 12 }}>
                <SectionTitle>PLAN DE ACCIÓN</SectionTitle>
                {plan.actionSteps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < plan.actionSteps.length - 1 ? 8 : 0 }}>
                    <div style={{ width: 20, height: 20, background: 'rgba(34,197,94,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--green)' }}>{i + 1}</span>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.55 }}>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Risks */}
            {plan.risks?.length > 0 && (
              <div style={{ padding: '10px 13px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--amber)', marginBottom: 6 }}>RIESGOS A CONSIDERAR</div>
                {plan.risks.map((r, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-mute)', marginBottom: 2 }}>⚠️ {r}</div>
                ))}
              </div>
            )}

            <button onClick={() => setPlan(null)} style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-mute)', fontSize: 13, cursor: 'pointer' }}>
              Nueva meta
            </button>
          </div>
        )}
        <div style={{ height: 80 }} />
      </div>

      {/* Bottom input */}
      <div style={{ padding: '10px 12px', paddingBottom: 'calc(10px + 72px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: 8 }}>
        <input value={goal} onChange={e => setGoal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); generate() } }}
          placeholder="Describe tu meta (ej: quiero 50% en 10 años)…"
          disabled={busy}
          style={{ flex: 1, padding: '11px 13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 13, color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
          onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.45)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
        <button onClick={() => generate()} disabled={!goal.trim() || busy} style={{ width: 42, height: 42, flexShrink: 0, background: goal.trim() && !busy ? 'var(--blue)' : 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 12, cursor: goal.trim() && !busy ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {busy ? <Spinner /> : <svg width="17" height="17" fill="none" stroke={goal.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>}
        </button>
      </div>
    </>
  )
}

// ─── Main container ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'screener',   label: 'Screener',   icon: '📊' },
  { id: 'whales',     label: 'Ballenas',   icon: '🐋' },
  { id: 'portfolio',  label: 'Portafolio', icon: '💼' },
  { id: 'goals',      label: 'Metas',      icon: '🎯' },
]

export default function FinancialAdvisor() {
  const [tab, setTab] = useState('screener')
  const activeTab = TABS.find(t => t.id === tab)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)' }}>

      {/* Header */}
      <div style={{ padding: 'calc(env(safe-area-inset-top) + 12px) 16px 0', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(59,130,246,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" fill="none" stroke="var(--blue)" strokeWidth="2.2" viewBox="0 0 24 24">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Asesor de Mercados IA</div>
            <div style={{ fontSize: 10, color: 'var(--text-mute)' }}>Yahoo Finance · Claude AI · No es asesoría financiera</div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '7px 14px', flexShrink: 0,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? 'var(--blue)' : 'var(--text-mute)',
              borderBottom: tab === t.id ? '2px solid var(--blue)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'screener'  && <ScreenerTab  key="screener"  />}
      {tab === 'whales'    && <WhaleTab     key="whales"    />}
      {tab === 'portfolio' && <PortfolioTab key="portfolio" />}
      {tab === 'goals'     && <GoalsTab     key="goals"     />}
    </div>
  )
}
