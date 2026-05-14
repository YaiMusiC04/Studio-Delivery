const PROMPT = `Analyze this food image and estimate its nutritional content.

Return ONLY a valid JSON object — no markdown, no explanation, just the raw JSON:
{
  "description": "Brief description of what you see",
  "foods": [
    {
      "name": "Food name (specific, e.g. 'Fried Chicken')",
      "estimatedGrams": 150,
      "per100g": {
        "calories": 250,
        "protein": 18.0,
        "carbs": 12.0,
        "fat": 14.0,
        "fiber": 0.5
      }
    }
  ]
}

Rules:
- List each distinct food item separately
- Estimate grams based on visual portion size
- Use accurate standard nutritional values per 100g
- calories must be greater than 0`

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { image, mediaType } = req.body || {}
  if (!image) return res.status(400).json({ error: 'No image provided' })

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: image,
                },
              },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(502).json({ error: `Anthropic error ${response.status}: ${errText.slice(0, 100)}` })
    }

    const data = await response.json()
    const text = (data.content && data.content[0] && data.content[0].text) || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(500).json({ error: 'Could not parse AI response' })

    const result = JSON.parse(jsonMatch[0])
    if (!Array.isArray(result.foods) || result.foods.length === 0) {
      return res.status(500).json({ error: 'No foods detected' })
    }

    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' })
  }
}
