import assert from 'node:assert/strict'

/** Recorded interaction opens a dialogue; confirmation consumes one already rendered. */
export function manualInteractionTarget(action) {
  const match = String(action.reason ?? '').match(
    /^(?:normal interaction|interact)\s+(?:(s\d+)\/)?(e\d+)$/iu,
  )
  return match ? { entity: match[2], ...(match[1] ? { scene: match[1] } : {}) } : null
}

export function continuousJourneyBudget(fragments, hold = false) {
  assert(Number.isInteger(fragments) && fragments > 0 && fragments <= 6)
  return hold ? 12 * 60 * 60 * 1000 : fragments * 240_000
}
