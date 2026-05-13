export async function searchFoods(query) {
  if (!query || query.trim().length < 2) return []

  try {
    const params = new URLSearchParams({
      search_terms: query.trim(),
      json: '1',
      page_size: '25',
      sort_by: 'popularity',
      fields: 'code,product_name,brands,nutriments,serving_quantity',
    })

    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?${params}`,
      { signal: AbortSignal.timeout(9000) }
    )
    if (!res.ok) throw new Error('API error')

    const data = await res.json()

    return (data.products || [])
      .filter(p => {
        if (!p.product_name?.trim()) return false
        const n = p.nutriments
        if (!n) return false
        const cal = n['energy-kcal_100g']
        return cal && cal > 0 && cal < 950
      })
      .map(p => {
        const n = p.nutriments
        return {
          id: p.code,
          name: p.product_name.trim(),
          brand: (p.brands || '').split(',')[0].trim(),
          defaultServing: Math.max(1, Math.round(parseFloat(p.serving_quantity) || 100)),
          per100g: {
            calories: Math.round(n['energy-kcal_100g'] || 0),
            protein:  +parseFloat(n['proteins_100g']      || 0).toFixed(1),
            carbs:    +parseFloat(n['carbohydrates_100g'] || 0).toFixed(1),
            fat:      +parseFloat(n['fat_100g']           || 0).toFixed(1),
            fiber:    +parseFloat(n['fiber_100g']         || 0).toFixed(1),
            sugar:    +parseFloat(n['sugars_100g']        || 0).toFixed(1),
          },
        }
      })
      .slice(0, 15)
  } catch {
    return []
  }
}
