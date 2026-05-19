// Scans ~160 major stocks via Yahoo Finance, filters to down 5%+,
// enriches with revenue/earnings growth, then uses Claude to pick the top 3.

const TOP_STOCKS = [
  'AAPL','MSFT','NVDA','GOOGL','META','AMZN','TSLA','AMD','INTC','AVGO',
  'CRM','ORCL','ADBE','QCOM','TXN','MU','AMAT','KLAC','INTU','SNPS',
  'CDNS','PANW','FTNT','CRWD','ZS','NET','DDOG','SNOW','PLTR','COIN',
  'RBLX','U','SHOP','SQ','PYPL','UBER','ARM','SMCI','APP','HOOD',
  'JPM','BAC','WFC','GS','MS','C','AXP','V','MA','BLK','SCHW',
  'COF','USB','BX','KKR','APO','SOFI','AFRM','UPST',
  'JNJ','UNH','PFE','ABBV','MRK','LLY','TMO','DHR','ABT','AMGN',
  'GILD','BIIB','REGN','VRTX','ISRG','ELV','CI','SYK','MDT','MRNA','BNTX','NVAX',
  'WMT','COST','HD','MCD','NKE','SBUX','TGT','LOW','ORLY','CMG','YUM','LULU','RH','ULTA',
  'XOM','CVX','COP','EOG','SLB','PSX','VLO','MPC','OXY','DVN',
  'GE','BA','RTX','LMT','NOC','CAT','DE','ETN','HON','MMM','EMR','PH',
  'T','VZ','TMUS','DIS','NFLX','CMCSA',
  'BRK-B','PM','KO','PEP','PG','CL','NEE','DUK','SO','SPG','AMT','PLD',
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
      ? (s.regularMarketVolume / s.averageDailyVolume10Day).toFixed(1) : 'N/A'
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

  return `Fecha: ${today}\nConsulta: ${query}\n\nACCIONES CANDIDATAS (caída ≥5% hoy, datos Yahoo Finance):\n${stocksText || 'No se encontraron acciones con los criterios exactos. Usa las más representativas disponibles.'}\n\nDevuelve EXACTAMENTE este JSON (3 picks, en español):\n{\n  "marketOverview": "Contexto de mercado hoy en 2 oraciones",\n  "picks": [\n    {\n      "rank": 1,\n      "symbol": "TICKER",\n      "name": "Nombre completo",\n      "action": "COMPRAR" | "ESPECULAR" | "OBSERVAR",\n      "currentPrice": 0.00,\n      "changePercent": -5.0,\n      "entryLow": 0.00,\n      "entryHigh": 0.00,\n      "target30d": 0.00,\n      "stopLoss": 0.00,\n      "probability": 72,\n      "probabilityReason": "Breve razón del % (1 oración)",\n      "reasoning": "Análisis del por qué es una oportunidad (3-4 oraciones)",\n      "revenueGrowth": 12.3,\n      "earningsGrowth": 8.5,\n      "riskLevel": "BAJO" | "MEDIO" | "ALTO",\n      "optionsPlay": {\n        "strategy": "CALL alcista" | "PUT bajista" | "N/A",\n        "strike": 0.00,\n        "daysToExpiry": 30,\n        "estimatedPremium": "$X.XX",\n        "maxGainPct": "X%",\n        "reason": "Por qué esta estrategia"\n      }\n    }\n  ],\n  "disclaimer": "Análisis informativo basado en datos públicos. No constituye asesoría financiera. Consulta con un asesor certificado antes de invertir."\n}`
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

  const batches = []
  for (let i = 0; i < TOP_STOCKS.length; i += BATCH) batches.push(TOP_STOCKS.slice(i, i + BATCH))
  const batchResults = await Promise.allSettled(batches.map(fetchQuotes))
  const allQuotes = batchResults.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  let bigLosers = allQuotes
    .filter(q => typeof q.regularMarketChangePercent === 'number')
    .sort((a, b) => a.regularMarketChangePercent - b.regularMarketChangePercent)

  const hardLosers = bigLosers.filter(q => q.regularMarketChangePercent <= -5)
  const candidates5 = hardLosers.length >= 3 ? hardLosers.slice(0, 12) : bigLosers.slice(0, 10)

  const enriched = await Promise.allSettled(
    candidates5.map(async s => ({ ...s, financials: await fetchFinancials(s.symbol) }))
  )
  let finalCandidates = enriched.filter(r => r.status === 'fulfilled').map(r => r.value)
  const withRevGrowth = finalCandidates.filter(s => s.financials?.revenueGrowth > 0)
  if (withRevGrowth.length >= 3) finalCandidates = withRevGrowth

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
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

  return res.json({ ...analysis, fetchedAt: new Date().toISOString(), scanned: allQuotes.length, losersFound: hardLosers.length })
}
