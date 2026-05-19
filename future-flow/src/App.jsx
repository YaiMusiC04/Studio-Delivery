import { useState, useRef } from 'react'

const fmt$   = v => v != null ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
const fmtK   = v => v >= 1e6  ? `$${(v/1e6).toFixed(1)}M` : `$${(v/1e3).toFixed(0)}K`
const fmtPct = v => v != null ? `${v > 0 ? '+' : ''}${Number(v).toFixed(1)}%` : '—'

function Spinner({ size = 18, color = 'var(--blue)' }) {
  return <div style={{ width: size, height: size, border: `2px solid ${color}33`, borderTop: `2px solid ${color}`, borderRadius: '50%', animation: 'spin 0.75s linear infinite', flexShrink: 0 }} />
}

function Tag({ label, color }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}1A`, padding: '3px 9px', borderRadius: 6, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{label}</span>
}

function MiniLabel({ children }) {
  return <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-mute)', marginBottom: 5 }}>{children}</div>
}

function Card({ children, style }) {
  return <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', ...style }}>{children}</div>
}

function EmptyHero({ icon, title, sub, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 20px 24px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 7 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.65, maxWidth: 300, marginBottom: 24 }}>{sub}</div>}
      {children}
    </div>
  )
}

function LoadingState({ title, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 20px', gap: 14 }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={24} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-mute)', textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>{sub}</div>}
    </div>
  )
}

function SuggestionList({ items, onPick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 360, margin: '0 auto' }}>
      {items.map(s => (
        <button key={s} onClick={() => onPick(s)} style={{ padding: '12px 15px', textAlign: 'left', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseOver={e => { e.currentTarget.style.background='rgba(59,130,246,0.09)'; e.currentTarget.style.borderColor='rgba(59,130,246,0.28)' }}
          onMouseOut={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}>
          {s}
        </button>
      ))}
    </div>
  )
}

function BottomInput({ value, onChange, onSubmit, placeholder, busy, accentColor = 'var(--blue)' }) {
  return (
    <div style={{ padding: '10px 14px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: 8 }}>
      <input value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSubmit() } }}
        placeholder={placeholder} disabled={busy}
        style={{ flex: 1, padding: '11px 13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
        onFocus={e => e.target.style.borderColor = `${accentColor}77`}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
      />
      <button onClick={onSubmit} disabled={!value.trim() || busy} style={{ width: 42, height: 42, flexShrink: 0, background: value.trim() && !busy ? accentColor : 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 11, cursor: value.trim() && !busy ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
        {busy ? <Spinner size={16} /> : <svg width="16" height="16" fill="none" stroke={value.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>}
      </button>
    </div>
  )
}

function ProbBar({ value }) {
  const color = value >= 70 ? 'var(--green)' : value >= 50 ? 'var(--amber)' : 'var(--red)'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <MiniLabel>PROBABILIDAD DE ÉXITO</MiniLabel>
        <span style={{ fontSize: 14, fontWeight: 800, color }}>{value}%</span>
      </div>
      <div style={{ height: 5, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3, transition: 'width 1.2s cubic-bezier(.16,1,.3,1)' }} />
      </div>
    </div>
  )
}

function StockCard({ pick, idx }) {
  const actionClr = { COMPRAR:'var(--green)', ESPECULAR:'var(--amber)', OBSERVAR:'var(--text-mute)' }[pick.action] || 'var(--text-mute)'
  const riskClr   = { BAJO:'var(--green)', MEDIO:'var(--amber)', ALTO:'var(--red)' }[pick.riskLevel] || 'var(--text-mute)'
  const hasOpts   = pick.optionsPlay?.strategy && pick.optionsPlay.strategy !== 'N/A'

  return (
    <Card style={{ marginBottom: 12, animation: `fadeIn 0.35s ease ${idx * 0.1}s both` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 20, fontWeight: 900 }}>{pick.symbol}</span>
            <Tag label={`${pick.changePercent?.toFixed(1)}%`} color="var(--red)" />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>{pick.name}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          <Tag label={pick.action} color={actionClr} />
          <span style={{ fontSize: 10, fontWeight: 600, color: riskClr }}>RIESGO {pick.riskLevel}</span>
        </div>
      </div>

      <ProbBar value={pick.probability} />
      {pick.probabilityReason && <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: -6, marginBottom: 12, lineHeight: 1.45 }}>{pick.probabilityReason}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
        {[
          { l:'PRECIO',    v: fmt$(pick.currentPrice) },
          { l:'ENTRADA',   v: `${fmt$(pick.entryLow)?.replace('$','')}-${fmt$(pick.entryHigh)}` },
          { l:'OBJETIVO',  v: fmt$(pick.target30d),  c:'var(--green)' },
          { l:'STOP LOSS', v: fmt$(pick.stopLoss),   c:'var(--red)'   },
        ].map(({ l,v,c }) => (
          <div key={l} style={{ background:'var(--bg3)', borderRadius:9, padding:'7px 6px', textAlign:'center' }}>
            <div style={{ fontSize:8, fontWeight:700, letterSpacing:'0.06em', color:'var(--text-mute)', marginBottom:2 }}>{l}</div>
            <div style={{ fontSize:11, fontWeight:700, color:c||'var(--text)' }}>{v}</div>
          </div>
        ))}
      </div>

      {(pick.revenueGrowth != null || pick.earningsGrowth != null) && (
        <div style={{ display:'flex', gap:8, marginBottom:10 }}>
          {[{l:'INGRESOS YoY',v:pick.revenueGrowth},{l:'GANANCIAS YoY',v:pick.earningsGrowth}].map(({l,v}) =>
            v != null ? (
              <div key={l} style={{ flex:1, background:v>=0?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${v>=0?'rgba(34,197,94,0.22)':'rgba(239,68,68,0.22)'}`, borderRadius:8, padding:'6px 10px' }}>
                <div style={{ fontSize:9, fontWeight:600, letterSpacing:'0.05em', color:'var(--text-mute)', marginBottom:2 }}>{l}</div>
                <div style={{ fontSize:13, fontWeight:700, color:v>=0?'var(--green)':'var(--red)' }}>{fmtPct(v)} {v>=0?'↑':'↓'}</div>
              </div>
            ) : null
          )}
        </div>
      )}

      <div style={{ fontSize:13, color:'var(--text-dim)', lineHeight:1.65, marginBottom:hasOpts?10:0 }}>{pick.reasoning}</div>

      {hasOpts && (
        <div style={{ background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:10, padding:'9px 12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--blue)' }}>OPCIONES · {pick.optionsPlay.strategy}</span>
            <span style={{ fontSize:10, color:'var(--text-mute)' }}>~{pick.optionsPlay.daysToExpiry}d</span>
          </div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, color:'var(--text-dim)' }}>Strike <b>${pick.optionsPlay.strike}</b></span>
            <span style={{ fontSize:12, color:'var(--text-dim)' }}>Prima ~{pick.optionsPlay.estimatedPremium}</span>
            <span style={{ fontSize:12, color:'var(--green)', fontWeight:700 }}>Max +{pick.optionsPlay.maxGainPct}</span>
          </div>
          {pick.optionsPlay.reason && <div style={{ fontSize:11, color:'var(--text-mute)', marginTop:5 }}>{pick.optionsPlay.reason}</div>}
        </div>
      )}
    </Card>
  )
}

const SCREENER_TIPS = [
  'Acciones abajo -5% con ingresos creciendo hoy',
  'Busca oportunidades en tecnología',
  'Las 3 mejores opciones CALL de hoy',
  'Análisis completo del mercado',
]

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
      const r = await fetch('/api/financial-screener', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ query }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
      setResult(d)
    } catch(e) { setError(e.message) }
    finally { setBusy(false) }
  }

  return (
    <>
      <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 8px' }}>
        {!busy && !result && !error && (
          <EmptyHero icon="📊" title="Screener Inteligente" sub="Escaneo en tiempo real de +160 acciones. Siempre 3 oportunidades con probabilidad y estrategia de opciones.">
            <SuggestionList items={SCREENER_TIPS} onPick={run} />
          </EmptyHero>
        )}
        {busy && <LoadingState title="Analizando mercados…" sub="Escaneando Yahoo Finance · Filtrando candidatos · Calculando probabilidades con IA" />}
        {error && <div style={{ margin:'16px 0', padding:'12px 14px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12, fontSize:13, color:'var(--red)' }}>{error}</div>}

        {result && !busy && (
          <div style={{ animation:'fadeIn 0.3s ease' }}>
            {result.marketOverview && (
              <div style={{ background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.18)', borderRadius:13, padding:'11px 13px', marginBottom:14 }}>
                <MiniLabel>CONTEXTO DE MERCADO · {new Date(result.fetchedAt).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</MiniLabel>
                <div style={{ fontSize:13, color:'var(--text-dim)', lineHeight:1.6 }}>{result.marketOverview}</div>
                {result.scanned > 0 && <div style={{ fontSize:11, color:'var(--text-mute)', marginTop:5 }}>Escaneadas: {result.scanned} · Caídas ≥5%: {result.losersFound}</div>}
              </div>
            )}
            {result.picks?.length > 0
              ? result.picks.map((p,i) => <StockCard key={p.symbol} pick={p} idx={i} />)
              : <div style={{ textAlign:'center', padding:'28px', color:'var(--text-mute)', fontSize:13 }}>Sin acciones con ese criterio ahora. Intenta más tarde.</div>
            }
            {result.disclaimer && <div style={{ marginTop:8, padding:'9px 13px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, fontSize:11, color:'var(--text-mute)', lineHeight:1.5 }}>⚠️ {result.disclaimer}</div>}
            <button onClick={() => setResult(null)} style={{ width:'100%', marginTop:10, padding:'11px', background:'transparent', border:'1px solid var(--border)', borderRadius:12, color:'var(--text-mute)', fontSize:13, cursor:'pointer' }}>Nueva búsqueda</button>
          </div>
        )}
        <div style={{ height:16 }} />
      </div>
      <BottomInput value={input} onChange={setInput} onSubmit={() => run()} placeholder="Ej: Tecnología abajo 5% con ventas subiendo…" busy={busy} />
    </>
  )
}

function FlowRow({ f, idx }) {
  const isBull = f.type === 'CALL'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, marginBottom:8, animation:`fadeIn 0.25s ease ${idx*0.04}s both` }}>
      <div style={{ width:40, height:40, borderRadius:10, background:isBull?'rgba(34,197,94,0.12)':'rgba(239,68,68,0.12)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontSize:8, fontWeight:800, color:isBull?'var(--green)':'var(--red)', letterSpacing:'0.05em' }}>{f.type}</span>
        <span style={{ fontSize:12 }}>{isBull?'🟢':'🔴'}</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
          <span style={{ fontSize:15, fontWeight:800 }}>{f.symbol}</span>
          <span style={{ fontSize:11, color:'var(--text-mute)' }}>${f.strike} · {f.expiry}</span>
          {f.daysOut <= 7 && <Tag label="PRONTO" color="var(--amber)" />}
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'var(--text-dim)' }}>Vol <b>{f.volume?.toLocaleString()}</b></span>
          <span style={{ fontSize:11, color:'var(--text-dim)' }}>OI {f.openInt?.toLocaleString()}</span>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--amber)' }}>{f.volOiRatio}x OI</span>
          <span style={{ fontSize:11, color:'var(--text-dim)' }}>IV {f.iv}</span>
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:14, fontWeight:800, color:isBull?'var(--green)':'var(--red)' }}>{fmtK(f.notional)}</div>
        <div style={{ fontSize:9, color:'var(--text-mute)' }}>notional</div>
      </div>
    </div>
  )
}

function WhaleTab() {
  const [busy, setBusy]   = useState(false)
  const [data, setData]   = useState(null)
  const [error, setError] = useState(null)

  const scan = async () => {
    setBusy(true); setData(null); setError(null)
    try {
      const r = await fetch('/api/options-flow', { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
      setData(d)
    } catch(e) { setError(e.message) }
    finally { setBusy(false) }
  }

  const bulls = data?.flows?.filter(f => f.type==='CALL') || []
  const bears = data?.flows?.filter(f => f.type==='PUT')  || []
  const total = data?.flows?.reduce((s,f) => s + f.notional, 0) || 0

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'14px 14px', paddingBottom:'calc(16px + env(safe-area-inset-bottom))' }}>
      {!busy && !data && !error && (
        <EmptyHero icon="🐋" title="Flujo de Ballenas" sub="Detecta apuestas institucionales analizando volumen de opciones vs. open interest. Cuanto mayor el ratio, más inusual la actividad.">
          <button onClick={scan} style={{ padding:'13px 32px', background:'var(--blue)', border:'none', borderRadius:13, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:10 }}>
            Escanear ahora
          </button>
          <div style={{ fontSize:11, color:'var(--text-mute)' }}>Analiza ~24 activos: SPY, QQQ, AAPL, NVDA, TSLA…</div>
        </EmptyHero>
      )}

      {busy && <LoadingState title="Escaneando flujo de opciones…" sub="Analizando volumen vs. open interest en 24 activos líquidos" />}
      {error && <div style={{ padding:'12px 14px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12, fontSize:13, color:'var(--red)' }}>{error}</div>}

      {data && !busy && (
        <>
          {data.interpretation && (
            <div style={{ background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.18)', borderRadius:13, padding:'11px 13px', marginBottom:14 }}>
              <MiniLabel>INTERPRETACIÓN IA · {new Date(data.fetchedAt).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</MiniLabel>
              <div style={{ fontSize:13, color:'var(--text-dim)', lineHeight:1.6 }}>{data.interpretation}</div>
              <div style={{ fontSize:11, color:'var(--text-mute)', marginTop:5 }}>Escaneados: {data.scanned} activos</div>
            </div>
          )}

          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {[
              { n:bulls.length, l:'CALLS alcistas', c:'var(--green)' },
              { n:bears.length, l:'PUTS bajistas',  c:'var(--red)'   },
              { n:fmtK(total),  l:'total notional', c:'var(--amber)' },
            ].map(({n,l,c}) => (
              <div key={l} style={{ flex:1, background:`${c}0F`, border:`1px solid ${c}33`, borderRadius:11, padding:'9px 10px', textAlign:'center' }}>
                <div style={{ fontSize:17, fontWeight:800, color:c }}>{n}</div>
                <div style={{ fontSize:9, color:'var(--text-mute)', marginTop:1 }}>{l}</div>
              </div>
            ))}
          </div>

          <MiniLabel>TOP FLUJOS POR TAMAÑO DE APUESTA</MiniLabel>
          {data.flows?.map((f,i) => <FlowRow key={`${f.symbol}-${f.type}-${f.strike}-${i}`} f={f} idx={i} />)}

          <button onClick={() => setData(null)} style={{ width:'100%', marginTop:10, padding:'11px', background:'transparent', border:'1px solid var(--border)', borderRadius:12, color:'var(--text-mute)', fontSize:13, cursor:'pointer' }}>
            Volver a escanear
          </button>
        </>
      )}
    </div>
  )
}

const PORT_KEY = 'mktai_portfolio_v1'
const loadPort = () => { try { return JSON.parse(localStorage.getItem(PORT_KEY)) || { positions:[] } } catch { return { positions:[] } } }
const savePort = p => localStorage.setItem(PORT_KEY, JSON.stringify(p))

function PortfolioTab() {
  const fileRef                    = useRef(null)
  const [port, setPort]            = useState(loadPort)
  const [busy, setBusy]            = useState(false)
  const [error, setError]          = useState(null)
  const [showAdd, setShowAdd]      = useState(false)
  const [form, setForm]            = useState({ symbol:'', name:'', shares:'', avgCost:'' })

  const persist = p => { setPort(p); savePort(p) }

  const totalVal  = port.positions.reduce((s,p) => s + (p.currentValue || p.avgCost*p.shares || 0), 0)
  const totalCost = port.positions.reduce((s,p) => s + (p.avgCost*p.shares || 0), 0)
  const totalGL   = totalVal - totalCost

  const handleFile = file => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async e => {
      const b64 = e.target.result.split(',')[1]
      setBusy(true); setError(null)
      try {
        const r = await fetch('/api/portfolio-analyze', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ imageBase64:b64, mediaType:file.type||'image/jpeg' }) })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
        if (d.portfolio?.positions?.length) persist({ ...d.portfolio, uploadedAt: new Date().toISOString() })
        else throw new Error('No pude leer posiciones de la imagen. Intenta con una foto más clara.')
      } catch(e) { setError(e.message) }
      finally { setBusy(false) }
    }
    reader.readAsDataURL(file)
  }

  const refresh = async () => {
    if (!port.positions?.length) return
    setBusy(true)
    try {
      const r = await fetch('/api/portfolio-analyze', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ refreshOnly:true, positions:port.positions }) })
      const d = await r.json()
      if (d.positions) persist({ ...port, positions:d.positions, refreshedAt:new Date().toISOString() })
    } catch {}
    finally { setBusy(false) }
  }

  const addManual = () => {
    if (!form.symbol||!form.shares||!form.avgCost) return
    const cost = parseFloat(form.avgCost), shares = parseFloat(form.shares)
    persist({ ...port, positions:[...port.positions,{ symbol:form.symbol.toUpperCase().trim(), name:form.name||form.symbol.toUpperCase(), shares, avgCost:cost, currentPrice:cost, currentValue:shares*cost, gainLoss:0, gainLossPct:0 }] })
    setForm({ symbol:'', name:'', shares:'', avgCost:'' }); setShowAdd(false)
  }

  const remove = idx => persist({ ...port, positions:port.positions.filter((_,i)=>i!==idx) })

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'14px 14px', paddingBottom:'calc(16px + env(safe-area-inset-bottom))' }}>
      {!busy && !port.positions?.length && (
        <EmptyHero icon="💼" title="Tu Portafolio" sub="Sube una foto de tu brokerage y la IA extrae todo automáticamente, o agrega posiciones a mano.">
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => handleFile(e.target.files[0])} />
          <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:300, margin:'0 auto' }}>
            <button onClick={() => fileRef.current?.click()} style={{ padding:'13px', background:'var(--blue)', border:'none', borderRadius:13, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              📷 Subir foto del portafolio
            </button>
            <button onClick={() => setShowAdd(true)} style={{ padding:'12px', background:'transparent', border:'1px solid var(--border)', borderRadius:13, color:'var(--text-dim)', fontSize:13, cursor:'pointer' }}>
              + Agregar posición manual
            </button>
          </div>
        </EmptyHero>
      )}

      {busy && <LoadingState title="Analizando portafolio…" sub="Claude Vision está extrayendo tus posiciones de la imagen" />}
      {error && <div style={{ padding:'12px 14px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12, fontSize:13, color:'var(--red)', marginBottom:12 }}>{error}</div>}

      {port.positions?.length > 0 && !busy && (
        <>
          <Card style={{ marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div>
                <div style={{ fontSize:24, fontWeight:800 }}>{fmt$(totalVal)}</div>
                <div style={{ fontSize:11, color:'var(--text-mute)' }}>Valor total del portafolio</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:17, fontWeight:700, color:totalGL>=0?'var(--green)':'var(--red)' }}>{totalGL>=0?'+':''}{fmt$(totalGL)}</div>
                <div style={{ fontSize:11, color:totalGL>=0?'var(--green)':'var(--red)' }}>{fmtPct(totalCost>0?(totalGL/totalCost)*100:0)}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => handleFile(e.target.files[0])} />
              {[
                { l:'↻ Precios', fn:refresh },
                { l:'📷 Nueva foto', fn:()=>fileRef.current?.click() },
                { l:'+ Agregar', fn:()=>setShowAdd(s=>!s) },
              ].map(({l,fn}) => (
                <button key={l} onClick={fn} style={{ flex:1, padding:'8px 6px', background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text-dim)', fontSize:12, cursor:'pointer' }}>{l}</button>
              ))}
            </div>
          </Card>

          {showAdd && (
            <Card style={{ border:'1px solid rgba(59,130,246,0.25)', marginBottom:14 }}>
              <MiniLabel>NUEVA POSICIÓN</MiniLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                {[{k:'symbol',pl:'Ticker (AAPL)',upper:true},{k:'name',pl:'Nombre (opcional)'},{k:'shares',pl:'Acciones',t:'number'},{k:'avgCost',pl:'Costo promedio $',t:'number'}].map(({k,pl,upper,t})=>(
                  <input key={k} value={form[k]} placeholder={pl} type={t||'text'}
                    onChange={e=>setForm(f=>({...f,[k]:upper?e.target.value.toUpperCase():e.target.value}))}
                    style={{ padding:'9px 11px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font)' }}
                    onFocus={e=>e.target.style.borderColor='rgba(59,130,246,0.45)'}
                    onBlur={e=>e.target.style.borderColor='var(--border)'}
                  />
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={addManual} style={{ flex:1, padding:'10px', background:'var(--blue)', border:'none', borderRadius:10, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>Agregar</button>
                <button onClick={()=>setShowAdd(false)} style={{ flex:1, padding:'10px', background:'transparent', border:'1px solid var(--border)', borderRadius:10, color:'var(--text-mute)', fontSize:13, cursor:'pointer' }}>Cancelar</button>
              </div>
            </Card>
          )}

          <MiniLabel>POSICIONES ({port.positions.length})</MiniLabel>
          {port.positions.map((p,i) => {
            const gl    = p.gainLoss ?? ((p.currentPrice-p.avgCost)*p.shares)
            const glPct = p.gainLossPct ?? (p.avgCost>0?(gl/(p.avgCost*p.shares))*100:0)
            const isUp  = gl >= 0
            return (
              <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:13, padding:'12px 13px', marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:15, fontWeight:800 }}>{p.symbol}</span>
                    {p.changeToday != null && <Tag label={fmtPct(p.changeToday)} color={p.changeToday>=0?'var(--green)':'var(--red)'} />}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-mute)', marginBottom:3 }}>{p.shares} acciones · Costo {fmt$(p.avgCost)}</div>
                  <span style={{ fontSize:12, fontWeight:700, color:isUp?'var(--green)':'var(--red)' }}>{isUp?'+':''}{fmt$(gl)} ({fmtPct(glPct)})</span>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:14, fontWeight:700 }}>{fmt$(p.currentValue||p.avgCost*p.shares)}</div>
                  <button onClick={()=>remove(i)} style={{ fontSize:10, color:'var(--red)', background:'none', border:'none', cursor:'pointer', opacity:0.6 }}>eliminar</button>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

const GOAL_TIPS = [
  'Quiero 50% de retorno en 10 años',
  'Llegar a $1,000,000 en 20 años',
  'Ingresos pasivos de $2,000/mes',
  'Proteger mi capital contra la inflación',
]

function GoalsTab() {
  const portfolio                 = loadPort()
  const [goal, setGoal]           = useState('')
  const [busy, setBusy]           = useState(false)
  const [plan, setPlan]           = useState(null)
  const [error, setError]         = useState(null)

  const go = async (g) => {
    const q = (g ?? goal).trim()
    if (!q || busy) return
    setBusy(true); setPlan(null); setError(null)
    try {
      const r = await fetch('/api/portfolio-analyze', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ goal:q, positions:portfolio.positions }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
      setPlan(d.plan)
    } catch(e) { setError(e.message) }
    finally { setBusy(false) }
  }

  const feasColor = { FACTIBLE:'var(--green)', DESAFIANTE:'var(--amber)', 'MUY AMBICIOSO':'var(--red)' }

  return (
    <>
      <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 8px' }}>
        {!busy && !plan && !error && (
          <EmptyHero icon="🎯" title="Planificador de Metas" sub="Escribe tu meta de inversión y te genero un plan con probabilidades, hitos, asignación y pasos concretos.">
            <SuggestionList items={GOAL_TIPS} onPick={g => { setGoal(g); go(g) }} />
            {!portfolio.positions?.length && <div style={{ fontSize:11, color:'var(--text-mute)', marginTop:12, textAlign:'center' }}>Tip: agrega tu portafolio para planes más precisos</div>}
          </EmptyHero>
        )}

        {busy && <LoadingState title="Generando tu plan…" sub="Analizando portafolio · Calculando retornos · Diseñando hoja de ruta personalizada" />}
        {error && <div style={{ padding:'12px 14px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12, fontSize:13, color:'var(--red)', marginBottom:12 }}>{error}</div>}

        {plan && !busy && (
          <div style={{ animation:'fadeIn 0.3s ease' }}>
            <Card style={{ border:`1px solid ${feasColor[plan.feasibility]||'var(--border)'}44`, marginBottom:13 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <Tag label={plan.feasibility} color={feasColor[plan.feasibility]||'var(--text-mute)'} />
                  <div style={{ fontSize:13, color:'var(--text-dim)', marginTop:8, lineHeight:1.55 }}>{plan.goalSummary}</div>
                </div>
                <div style={{ textAlign:'center', marginLeft:14, flexShrink:0 }}>
                  <div style={{ fontSize:30, fontWeight:900, color:feasColor[plan.feasibility]||'var(--text)' }}>{plan.probability}%</div>
                  <div style={{ fontSize:9, color:'var(--text-mute)' }}>prob. éxito</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[{l:'ACTUAL',v:fmt$(plan.currentValue)},{l:'OBJETIVO',v:fmt$(plan.targetValue),c:'var(--green)'},{l:'RETORNO/AÑO',v:`${plan.requiredAnnualReturn?.toFixed(1)}%`}].map(({l,v,c})=>(
                  <div key={l} style={{ background:'var(--bg3)', borderRadius:9, padding:'8px 6px', textAlign:'center' }}>
                    <div style={{ fontSize:8, fontWeight:700, letterSpacing:'0.06em', color:'var(--text-mute)', marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:c||'var(--text)' }}>{v}</div>
                  </div>
                ))}
              </div>
              {plan.monthlyContributionNeeded > 0 && (
                <div style={{ marginTop:10, padding:'8px 10px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:9 }}>
                  <span style={{ fontSize:12, color:'var(--amber)' }}>💡 Para asegurar la meta: <b>{fmt$(plan.monthlyContributionNeeded)}/mes</b> adicional</span>
                </div>
              )}
              <div style={{ fontSize:12, color:'var(--text-mute)', marginTop:8, lineHeight:1.5 }}>{plan.feasibilityReason}</div>
            </Card>

            {plan.recommendedAllocation?.length > 0 && (
              <Card style={{ marginBottom:12 }}>
                <MiniLabel>ASIGNACIÓN RECOMENDADA</MiniLabel>
                {plan.recommendedAllocation.map((a,i) => (
                  <div key={i} style={{ marginBottom:i<plan.recommendedAllocation.length-1?14:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:600 }}>{a.type}</span>
                      <span style={{ fontSize:13, fontWeight:800, color:'var(--blue)' }}>{a.percentage}%</span>
                    </div>
                    <div style={{ height:4, background:'var(--bg4)', borderRadius:2, marginBottom:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${a.percentage}%`, background:'var(--blue)', borderRadius:2 }} />
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-mute)' }}>{a.examples?.join(' · ')} — {a.reason}</div>
                  </div>
                ))}
              </Card>
            )}

            {plan.milestones?.length > 0 && (
              <Card style={{ marginBottom:12 }}>
                <MiniLabel>HITOS</MiniLabel>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {plan.milestones.map((m,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(59,130,246,0.14)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ fontSize:10, fontWeight:800, color:'var(--blue)' }}>{m.year}</span>
                      </div>
                      <div style={{ flex:1, height:1, background:'var(--border)' }} />
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:13, fontWeight:700 }}>{fmt$(m.expectedValue)}</div>
                        <div style={{ fontSize:10, color:'var(--green)' }}>+{m.cumulativeReturnPct?.toFixed(0)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {plan.topPicks?.length > 0 && (
              <Card style={{ marginBottom:12 }}>
                <MiniLabel>ACCIONES RECOMENDADAS</MiniLabel>
                {plan.topPicks.map((p,i) => (
                  <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:i<plan.topPicks.length-1?10:0 }}>
                    <div style={{ width:36, height:36, background:'rgba(59,130,246,0.12)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontSize:9, fontWeight:800, color:'var(--blue)' }}>{p.symbol}</span>
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{p.name} <span style={{ fontSize:11, color:'var(--blue)', fontWeight:600 }}>({p.suggestedAllocationPct}%)</span></div>
                      <div style={{ fontSize:11, color:'var(--text-mute)' }}>{p.why}</div>
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {plan.actionSteps?.length > 0 && (
              <Card style={{ marginBottom:12 }}>
                <MiniLabel>PLAN DE ACCIÓN</MiniLabel>
                {plan.actionSteps.map((s,i) => (
                  <div key={i} style={{ display:'flex', gap:10, marginBottom:i<plan.actionSteps.length-1?8:0 }}>
                    <div style={{ width:20, height:20, background:'rgba(34,197,94,0.14)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                      <span style={{ fontSize:9, fontWeight:800, color:'var(--green)' }}>{i+1}</span>
                    </div>
                    <span style={{ fontSize:13, color:'var(--text-dim)', lineHeight:1.6 }}>{s}</span>
                  </div>
                ))}
              </Card>
            )}

            {plan.risks?.length > 0 && (
              <div style={{ padding:'10px 13px', background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.18)', borderRadius:12, marginBottom:12 }}>
                <MiniLabel>RIESGOS</MiniLabel>
                {plan.risks.map((r,i) => <div key={i} style={{ fontSize:12, color:'var(--text-mute)', marginBottom:2 }}>⚠️ {r}</div>)}
              </div>
            )}

            <button onClick={() => setPlan(null)} style={{ width:'100%', padding:'11px', background:'transparent', border:'1px solid var(--border)', borderRadius:12, color:'var(--text-mute)', fontSize:13, cursor:'pointer' }}>
              Nueva meta
            </button>
          </div>
        )}
        <div style={{ height:16 }} />
      </div>
      <BottomInput value={goal} onChange={setGoal} onSubmit={() => go()} placeholder="Ej: Quiero 50% de retorno en 10 años…" busy={busy} />
    </>
  )
}

const TABS = [
  { id:'screener',  label:'Screener',   icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> },
  { id:'whales',    label:'Ballenas',   icon: '🐋' },
  { id:'portfolio', label:'Portafolio', icon: '💼' },
  { id:'goals',     label:'Metas',      icon: '🎯' },
]

export default function App() {
  const [tab, setTab] = useState('screener')

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:'var(--bg)', color:'var(--text)', fontFamily:'var(--font)' }}>
      <div style={{ padding:'calc(env(safe-area-inset-top) + 12px) 16px 0', background:'var(--bg2)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'rgba(59,130,246,0.14)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="17" height="17" fill="none" stroke="var(--blue)" strokeWidth="2.2" viewBox="0 0 24 24">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:'-0.3px' }}>Future Flow</div>
            <div style={{ fontSize:10, color:'var(--text-mute)' }}>Yahoo Finance · IA Claude · Solo análisis informativo</div>
          </div>
          <div style={{ fontSize:10, color:'var(--text-mute)', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 8px' }}>
            {new Date().toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
          </div>
        </div>
        <div style={{ display:'flex', gap:0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, padding:'8px 4px', display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              background:'none', border:'none', cursor:'pointer',
              fontSize:10, fontWeight:tab===t.id?700:500,
              color:tab===t.id?'var(--blue)':'var(--text-mute)',
              borderBottom:tab===t.id?'2px solid var(--blue)':'2px solid transparent',
              transition:'all 0.15s',
            }}>
              <span style={{ fontSize:14, lineHeight:1 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'5px 16px', background:'rgba(245,158,11,0.06)', borderBottom:'1px solid rgba(245,158,11,0.15)', fontSize:10, color:'rgba(245,158,11,0.8)', display:'flex', alignItems:'center', gap:5 }}>
        <span>⚠️</span> Solo análisis informativo. No es asesoría financiera. Invierte bajo tu propio riesgo.
      </div>

      {tab === 'screener'  && <ScreenerTab  key="s" />}
      {tab === 'whales'    && <WhaleTab     key="w" />}
      {tab === 'portfolio' && <PortfolioTab key="p" />}
      {tab === 'goals'     && <GoalsTab     key="g" />}
    </div>
  )
}
