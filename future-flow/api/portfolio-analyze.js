const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
}

async function refreshPrices(positions) {
  if (!positions?.length) return positions
  const syms = positions.map(p => p.symbol).filter(Boolean).join(',')
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${syms}`,
      { headers: YF_HEADERS, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return positions
    const d = await res.json()
    const quotes = {}
    for (const q of (d.quoteResponse?.result || [])) quotes[q.symbol] = q
    return positions.map(p => {
      const q = quotes[p.symbol]
      if (!q) return p
      const currentPrice = q.regularMarketPrice
      const currentValue = currentPrice * (p.shares || 0)
      const gainLoss     = currentValue - (p.avgCost || 0) * (p.shares || 0)
      const costBasis    = (p.avgCost || 0) * (p.shares || 0)
      return { ...p, currentPrice, currentValue, gainLoss, gainLossPct: costBasis > 0 ? (gainLoss / costBasis) * 100 : 0, changeToday: q.regularMarketChangePercent }
    })
  } catch { return positions }
}

async function claudeCall(apiKey, model, system, userMsg, maxTokens = 1800) {
  const body = { model, max_tokens: maxTokens, messages: [{ role: 'user', content: userMsg }] }
  if (system) body.system = system
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const d = await res.json()
  return d.content?.[0]?.text || ''
}

function parseJson(text) {
  try {
    const m = text.match(/\{[\s\S]*\}/)
    return m ? JSON.parse(m[0]) : null
  } catch { return null }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imageBase64, mediaType, positions: rawPositions, goal, refreshOnly } = req.body || {}
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' })

  if (refreshOnly && rawPositions) {
    const updated = await refreshPrices(rawPositions)
    return res.json({ positions: updated })
  }

  let extractedPortfolio = null
  if (imageBase64) {
    const text = await claudeCall(apiKey, 'claude-sonnet-4-6', null, [
      { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
      { type: 'text', text: `Extrae TODOS los datos de portafolio de esta imagen. Devuelve SOLO JSON:\n{\n  "broker": "nombre del broker o app (si visible)",\n  "portfolioValue": number | null,\n  "cash": number | null,\n  "positions": [\n    { "symbol": "AAPL", "name": "Apple Inc.", "shares": 10, "avgCost": 150.00, "currentPrice": 185.00, "currentValue": 1850.00, "gainLoss": 350.00, "gainLossPct": 23.3 }\n  ],\n  "totalGainLoss": number | null,\n  "totalGainLossPct": number | null\n}\nIncluye TODAS las posiciones visibles. Si un valor no aparece, usa null.` },
    ])
    extractedPortfolio = parseJson(text)
    if (extractedPortfolio?.positions) {
      extractedPortfolio.positions = await refreshPrices(extractedPortfolio.positions)
      const total = extractedPortfolio.positions.reduce((s, p) => s + (p.currentValue || 0), 0)
      if (total > 0) extractedPortfolio.portfolioValue = total
    }
  }

  let plan = null
  const workingPositions = extractedPortfolio?.positions || rawPositions
  if (goal) {
    const portfolioStr = workingPositions?.length
      ? JSON.stringify(workingPositions.map(p => ({ symbol: p.symbol, shares: p.shares, avgCost: p.avgCost, currentValue: p.currentValue, gainLossPct: p.gainLossPct })))
      : 'Sin posiciones registradas'
    const totalValue = workingPositions?.reduce((s, p) => s + (p.currentValue || 0), 0) || 0
    const text = await claudeCall(
      apiKey, 'claude-sonnet-4-6',
      'Eres un planificador financiero de largo plazo. Responde en español. Devuelve SOLO JSON válido.',
      `Portafolio actual (valor total: $${totalValue.toLocaleString()}):\n${portfolioStr}\n\nMeta del usuario: "${goal}"\n\nAnaliza si la meta es alcanzable y genera un plan. Devuelve este JSON exacto:\n{\n  "goalSummary": "Qué quiere lograr el usuario en 1 oración",\n  "currentValue": ${totalValue},\n  "targetValue": number,\n  "timeHorizonYears": number,\n  "requiredAnnualReturn": number,\n  "probability": number (0-100),\n  "feasibility": "FACTIBLE" | "DESAFIANTE" | "MUY AMBICIOSO",\n  "feasibilityReason": "Por qué esa factibilidad",\n  "monthlyContributionNeeded": number,\n  "recommendedAllocation": [{ "type": "Nombre", "percentage": number, "examples": ["VTI","QQQ"], "reason": "Por qué" }],\n  "milestones": [{ "year": 2027, "expectedValue": number, "cumulativeReturnPct": number }],\n  "topPicks": [{ "symbol": "TICKER", "name": "Nombre", "why": "Por qué para esta meta", "suggestedAllocationPct": number }],\n  "risks": ["Riesgo inflación"],\n  "actionSteps": ["Paso concreto 1"]\n}`,
      2200
    )
    plan = parseJson(text)
  }

  res.json({ portfolio: extractedPortfolio, plan, analyzedAt: new Date().toISOString() })
}
