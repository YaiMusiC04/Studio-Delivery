// Scans ~160 major stocks via Yahoo Finance, filters to down 5%+,
// enriches with revenue/earnings growth, then uses Claude to pick the top 3.

const TOP_STOCKS = [
  // Mega-cap tech
  'AAPL','MSFT','NVDA','GOOGL','META','AMZN','TSLA','AMD','INTC','AVGO',
  'CRM','ORCL','ADBE','QCOM','TXN','MU','AMAT','KLAC','INTU','SNPS',
  'CDNS','PANW','FTNT','CRWD','ZS','NET','DDOG','SNOW','PLTR','COIN',
  'RBLX','U','SHOP','SQ','PYPL','UBER','ARM','SMCI','APP','HOOD',
  // Finance
  'JPM','BAC','WFC','GS','MS','C','AXP','V','MA','BLK','SCHW',
  'COF','USB','BX','KKR','APO','SOFI','AFRM','UPST',
  // Healthcare / Biotech
  'JNJ','UNH','PFE','ABBV','MRK','LLY','TMO','DHR','ABT','AMGN',
  'GILD','BIIB','REGN','VRTX','ISRG','ELV','CI','SYK','MDT','MRNA',
  'BNTX','NVAX',
  // Consumer
  'WMT','COST','HD','MCD','NKE','SBUX','TGT','LOW','ORLY','CMG',
  'YUM','LULU','RH','ULTA',
  // Energy
  'XOM','CVX','COP','EOG','SLB','PSX','VLO','MPC','OXY','DVN',
  // Industrial / Defense
  'GE','BA','RTX','LMT','NOC','CAT','DE','ETN','HON','MMM','EMR','PH',
  // Telecom / Media
  'T','VZ','TMUS','DIS','NFLX','CMCSA',
  // Other
  'BRK-B','PM','KO','PEP','PG','CL','NEE','DUK','SO','SPG','AMT','PLD',
  // Chinese ADRs / volatile growth
  'BIDU','JD','PDD','BABA','NIO','XPEV','LI','RIVN','LCID',
]

const BATCH = 50

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
}

async function fetchQuotes(symbols) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`
  const res = await fetch(url, { headers: YF_HEADERS, signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error(`YF quotes ${res.status}`)
  const d = await res.json()
  return d.quoteResponse?.result || []
}

async function fetchFinancials(symbol) {
  try {
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=financialData`
    const res = await fetch(url, { headers: YF_HEADERS, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const d = await res.json()
    const fd = d.quoteSummary?.result?.[0]?.financialData
    if (!fd) return null
    return {
      revenueGrowth:    fd.revenueGrowth?.raw    ?? null,
      earningsGrowth:   fd.earningsGrowth?.raw   ?? null,
      grossMargins:     fd.grossMargins?.raw      ?? null,
      operatingMargins: fd.operatingMargins?.raw  ?? null,
      freeCashflow:     fd.freeCashflow?.raw      ?? null,
      totalRevenue:     fd.totalRevenue?.raw      ?? null,
      recommendationKey: fd.recommendationKey     ?? null,
    }
  } catch { return null }
}

async function fetchOptions(symbol, price) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/options/${symbol}`
    const res = await fetch(url, { headers: YF_HEADERS, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const d = await res.json()
    const chain = d.optionChain?.result?.[0]
    if (!chain) return null
    const calls = chain.options?.[0]?.calls || []
    // ATM+OTM calls: strike between +2% and +10% of current price
    const relevant = calls
      .filter(c => c.strike > price * 1.02 && c.strike < price * 1.10 && c.ask > 0)
      .slice(0, 3)
    return { calls: relevant }
  } catch { return null }
}

function buildSystem() {
  return `Eres un analista financiero cuantitativo especializado en trading de acciones y opciones en mercados americanos.
Respondes SIEMPRE en español.
DEBES retornar JSON válido y nada más — ningún texto fuera del JSON.
La probabilidad (0-100) debe reflejar el potencial de rebote basado en: fortaleza del crecimiento de ingresos, profundidad de la caída vs. soportes técnicos, volumen relativo, y sentimiento del mercado de opciones.
DISCLAIMER: Esto es análisis informativo, no asesoría financiera regulada.`
}

function buildPrompt(candidates, query) {
  const today = new Date().toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

  const stocksText = candidates.map(s => {
    const volRatio = s.regularMarketVolume && s.averageDailyVolume10Day
      ? (s.regularMarketVolume / s.averageDailyVolume10Day).toFixed(1)
      : 'N/A'
    const fin = s.financials
    return [
      `• ${s.symbol} — ${s.longName || s.shortName}`,
      `  Cambio: ${s.regularMarketChangePercent?.toFixed(2)}%  Precio: $${s.regularMarketPrice?.toFixed(2)}`,
      `  Cap: $${s.marketCap ? (s.marketCap/1e9).toFixed(1)+'B' : 'N/A'}  P/E: ${s.trailingPE?.toFixed(1) || 'N/A'}`,
      `  Volumen vs prom: ${volRatio}x`,
      `  Ingresos YoY: ${fin?.revenueGrowth != null ? (fin.revenueGrowth*100).toFixed(1)+'%' : 'sin dato'}`,
      `  Ganancias YoY: ${fin?.earningsGrowth != null ? (fin.earningsGrowth*100).toFixed(1)+'%' : 'sin dato'}`,
      `  Margen bruto: ${fin?.grossMargins != null ? (fin.grossMargins*100).toFixed(1)+'%' : 'N/A'}`,
      `  Recomendación analistas: ${fin?.recommendationKey || 'N/A'}`,
      `  52-sem mín $${s.fiftyTwoWeekLow?.toFixed(2)} / máx $${s.fiftyTwoWeekHigh?.toFixed(2)}`,
      `  SMA50 $${s.fiftyDayAverage?.toFixed(2)} / SMA200 $${s.twoHundredDayAverage?.toFixed(2)}`,
    ].join('\n')
  }).join('\n\n')

  return `Fecha: ${today}
Consulta: ${query}

ACCIONES CANDIDATAS (caída ≥5% hoy, datos Yahoo Finance):
${stocksText || 'No se encontraron acciones con los criterios exactos. Usa las más representativas disponibles.'}

Devuelve EXACTAMENTE este JSON (3 picks, en español):
{
  "marketOverview": "Contexto de mercado hoy en 2 oraciones",
  "picks": [
    {
      "rank": 1,
      "symbol": "TICKER",
      "name": "Nombre completo",
      "action": "COMPRAR" | "ESPECULAR" | "OBSERVAR",
      "currentPrice": 0.00,
      "changePercent": -5.0,
      "entryLow": 0.00,
      "entryHigh": 0.00,
      "target30d": 0.00,
      "stopLoss": 0.00,
      "probability": 72,
      "probabilityReason": "Breve razón del % (1 oración)",
      "reasoning": "Análisis del por qué es una oportunidad (3-4 oraciones)",
      "revenueGrowth": 12.3,
      "earningsGrowth": 8.5,
      "riskLevel": "BAJO" | "MEDIO" | "ALTO",
      "optionsPlay": {
        "strategy": "CALL alcista" | "PUT bajista" | "N/A",
        "strike": 0.00,
        "daysToExpiry": 30,
        "estimatedPremium": "$X.XX",
        "maxGainPct": "X%",
        "reason": "Por qué esta estrategia"
      }
    }
  ],
  "disclaimer": "Análisis informativo basado en datos públicos. No constituye asesoría financiera. Consulta con un asesor certificado antes de invertir."
}`
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { query = 'Busca las mejores oportunidades: acciones abajo 5% con ventas creciendo' } = req.body || {}
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' })

  // ── 1. Fetch all quotes in parallel batches ──
  const batches = []
  for (let i = 0; i < TOP_STOCKS.length; i += BATCH) batches.push(TOP_STOCKS.slice(i, i + BATCH))

  const batchResults = await Promise.allSettled(batches.map(fetchQuotes))
  const allQuotes = batchResults.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  // ── 2. Filter to biggest losers ──
  let bigLosers = allQuotes
    .filter(q => typeof q.regularMarketChangePercent === 'number')
    .sort((a, b) => a.regularMarketChangePercent - b.regularMarketChangePercent)

  // Prefer down ≥5%, fallback to top 10 losers if market is closed
  const hardLosers = bigLosers.filter(q => q.regularMarketChangePercent <= -5)
  const candidates5 = hardLosers.length >= 3 ? hardLosers.slice(0, 12) : bigLosers.slice(0, 10)

  // ── 3. Enrich with financials (parallel, best-effort) ──
  const enriched = await Promise.allSettled(
    candidates5.map(async s => ({
      ...s,
      financials: await fetchFinancials(s.symbol),
    }))
  )
  let finalCandidates = enriched
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)

  // Prefer stocks where revenue growth is positive (user's core criterion)
  const withRevGrowth = finalCandidates.filter(s => s.financials?.revenueGrowth > 0)
  if (withRevGrowth.length >= 3) finalCandidates = withRevGrowth

  // ── 4. Claude analysis ──
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2800,
      system: buildSystem(),
      messages: [{ role: 'user', content: buildPrompt(finalCandidates, query) }],
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    return res.status(claudeRes.status).json({ error: err.slice(0, 300) })
  }

  const claudeData = await claudeRes.json()
  const text = claudeData.content?.[0]?.text || '{}'

  let analysis
  try {
    const m = text.match(/\{[\s\S]*\}/)
    analysis = m ? JSON.parse(m[0]) : { marketOverview: text, picks: [] }
  } catch {
    analysis = { marketOverview: text, picks: [] }
  }

  return res.json({
    ...analysis,
    fetchedAt: new Date().toISOString(),
    scanned: allQuotes.length,
    losersFound: hardLosers.length,
  })
}
