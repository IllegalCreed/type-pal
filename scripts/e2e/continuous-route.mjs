import assert from 'node:assert/strict'

export const continuousScene = (state, engine) =>
  engine === 'game' ? `s${String(state.scene - 1).padStart(3, '0')}` : state.scene

export function continuousGrid(position, engine) {
  if (!Array.isArray(position) || position.length < 2) return null
  return engine === 'game'
    ? [(position[0] / 16 + position[1] / 8) / 2, (position[1] / 8 - position[0] / 16) / 2]
    : position.slice(0, 2)
}

/** Compare the same footpoint in both coordinate systems; height is not a shape discriminator. */
export function continuousRouteReached(state, target, engine) {
  assert(['game', 'reforge'].includes(engine), 'unknown route engine')
  if (continuousScene(state, engine) !== target.scene) return false
  if (!target.position) return true
  const actual = continuousGrid(state.position, engine)
  const expected = continuousGrid(target.position, engine)
  return !!actual && !!expected && actual[0] === expected[0] && actual[1] === expected[1]
}
