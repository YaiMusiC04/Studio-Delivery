const LOG_KEY     = 'cft_log_v1'
const GOALS_KEY   = 'cft_goals_v1'
const PROFILE_KEY = 'cft_profile_v1'

export const DEFAULT_GOALS = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
}

// ── Profile ──────────────────────────────────────────────────────────────────

export function getProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null }
  catch { return null }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

// ── Goals ────────────────────────────────────────────────────────────────────

export function getGoals() {
  try {
    const s = localStorage.getItem(GOALS_KEY)
    return s ? { ...DEFAULT_GOALS, ...JSON.parse(s) } : { ...DEFAULT_GOALS }
  } catch {
    return { ...DEFAULT_GOALS }
  }
}

export function saveGoals(goals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
}

// ── Log ──────────────────────────────────────────────────────────────────────

function getLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY)) || {} }
  catch { return {} }
}

function saveLog(log) {
  localStorage.setItem(LOG_KEY, JSON.stringify(log))
}

function emptyDay() {
  return { breakfast: [], lunch: [], dinner: [], snacks: [] }
}

export function getDayLog(dateStr) {
  const log = getLog()
  return log[dateStr] ? { ...emptyDay(), ...log[dateStr] } : emptyDay()
}

export function addFoodEntry(dateStr, meal, entry) {
  const log = getLog()
  if (!log[dateStr]) log[dateStr] = emptyDay()
  log[dateStr][meal].push({
    id: entry.id,
    name: entry.name,
    brand: entry.brand,
    grams: Number(entry.grams),
    per100g: entry.per100g,
    addedAt: Date.now(),
  })
  saveLog(log)
}

export function removeFoodEntry(dateStr, meal, index) {
  const log = getLog()
  if (!log[dateStr]?.[meal]) return
  log[dateStr][meal].splice(index, 1)
  saveLog(log)
}

// ── Computations ─────────────────────────────────────────────────────────────

export function computeMacros(entries) {
  const acc = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  for (const e of entries) {
    const f = e.grams / 100
    acc.calories += e.per100g.calories * f
    acc.protein  += e.per100g.protein  * f
    acc.carbs    += e.per100g.carbs    * f
    acc.fat      += e.per100g.fat      * f
    acc.fiber    += (e.per100g.fiber || 0) * f
  }
  return {
    calories: Math.round(acc.calories),
    protein:  +acc.protein.toFixed(1),
    carbs:    +acc.carbs.toFixed(1),
    fat:      +acc.fat.toFixed(1),
    fiber:    +acc.fiber.toFixed(1),
  }
}
