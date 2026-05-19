const LIQUID = [
  'SPY','QQQ','IWM','DIA','XLF','XLK','XLE','ARKK',
  'AAPL','MSFT','NVDA','TSLA','AMD','META','AMZN','GOOGL','NFLX',
  'COIN','PLTR','ARM','SMCI','MSTR','HOOD','SOFI','RIVN','NIO','UBER',
  'JPM','BAC','GS','MS','LLY','MRNA','XOM','CVX',
]

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
}

async function getChain(symbol) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/options/${symbol}`,
      { headers: YF_HEADERS, signal: AbortSignal.timeout(9000) }
    )
    if (!res.ok) return null
    const d = await res.json()
    const result = d.optionChain?.result?.[0]
    if (!result) return null
    return {
      symbol,
      price: result.quote?.regularMarketPrice,
      calls: result.options?.[0]?.calls || [],
      puts:  result.options?.[0]?.puts  || [],
    }
  } catch { return null }
}

function score(contracts, type) {
  return contracts
    .filter(c => {
      const vol = c.volume || 0
      const oi  = c.openInterest || 1
      const ask = c.ask || c.lastPrice || 0
      return vol >= 500 && vol / oi >= 2.5 && ask > 0
    })
    .map(c => {
      const vol      = c.volume || 0
      const oi       = c.openInterest || 1
      const premium  = c.lastPrice || c.ask || 0
      const notional = Math.round(vol * premium * 100)
      const expMs    = c.expiration * 1000
      const daysOut  = Math.round((expMs - Date.now()) / 86400000)
      return {
        type, strike: c.strike,
        expiry: new Date(expMs).toLocaleDateString('es-ES', { day:'numeric', month:'short' }),
        daysOut, volume: vol, openInt: oi,
        volOiRatio: (vol / oi).toFixed(1),
        premium, notional,
        iv: c.impliedVolatility ? (c.impliedVolatility * 100).toFixed(0) + '%' : '—',
        inMoney: c.inTheMoney || false,
        sentiment: type === 'CALL' ? 'ALCISTA' : 'BAJISTA',
      }
    })
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY
  const targets = LIQUID.slice(0, 24)
  const chains  = await Promise.allSettled(targets.map(getChain))

  const unusual = []
  for (const r of chains) {
    if (r.status !== 'fulfilled' || !r.value) continue
    const { symbol, price, calls, puts } = r.value
    const hits = [...score(calls, 'CALL', price), ...score(puts, 'PUT', price)]
    for (const h of hits) unusual.push({ symbol, underlyingPrice: price, ...h })
  }

  unusual.sort((a, b) => b.notional - a.notional)
  const top = unusual.slice(0, 25)

  let interpretation = null
  if (apiKey && top.length > 0) {
    try {
      const snippet = top.slice(0, 10).map(u =>
        `${u.symbol} ${u.type} $${u.strike} (${u.expiry}): vol ${u.volume?.toLocaleString()} — ${u.volOiRatio}x OI — notional $${(u.notional/1000).toFixed(0)}K`
      ).join('\n')
      const cr = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', max_tokens: 350,
          messages: [{ role: 'user', content: `Analiza este flujo de opciones inusual. En 3-4 oraciones en español: ¿qué sectores están activos? ¿Predomina el sentimiento alcista o bajista? ¿Hay alguna apuesta notable?\n\n${snippet}` }],
        }),
      })
      const cd = await cr.json()
      interpretation = cd.content?.[0]?.text || null
    } catch {}
  }

  res.json({ flows: top, interpretation, scanned: targets.length, fetchedAt: new Date().toISOString() })
}
