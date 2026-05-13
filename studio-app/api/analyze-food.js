import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PROMPT = `Analyze this food image and estimate its nutritional content.

Return ONLY a valid JSON object — no markdown, no explanation, just JSON:
{
  "description": "Brief description of what you see in the image",
  "foods": [
    {
      "name": "Food name (be specific, e.g. 'Grilled Chicken Breast')",
      "estimatedGrams": 150,
      "per100g": {
        "calories": 165,
        "protein": 31.0,
        "carbs": 0.0,
        "fat": 3.6,
        "fiber": 0.0
      }
    }
  ]
}

Rules:
- List each distinct food item separately
- Estimate grams based on visual portion size
- Use standard nutritional values per 100g
- If unsure of exact food, give your best estimate with realistic macros
- calories must be > 0`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { image, mediaType } = req.body ?? {}
  if (!image) return res.status(400).json({ error: 'No image provided' })

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: image },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    })

    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const result = JSON.parse(jsonMatch[0])

    // Validate structure
    if (!Array.isArray(result.foods) || result.foods.length === 0) {
      throw new Error('Invalid response structure')
    }

    return res.status(200).json(result)
  } catch (err) {
    console.error('analyze-food error:', err)
    return res.status(500).json({ error: 'Failed to analyze image. Please try again.' })
  }
}
