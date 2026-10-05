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
  return (
    !!actual && !!expected && Math.hypot(actual[0] - expected[0], actual[1] - expected[1]) < 0.05
  )
}

/** A receipt records the input release and the script's settled endpoint separately. */
export function receiptRouteTargets(report) {
  const inputs = report.route?.inputs ?? []
  const steps = report.route?.steps ?? []
  const targets = new Map()
  for (const [index, input] of inputs.entries()) {
    if (input.kind !== 'down') continue
    const remaining = inputs.slice(index + 1)
    const up = remaining.find((value) => value.kind === 'up' && value.key === input.key)
    assert(up, 'route receipt missing key release')
    const next = remaining.find((value) => value.kind === 'down')
    const moves = steps.filter(
      (step) => step.scene === input.scene && step.atMs >= input.atMs && step.atMs <= up.atMs,
    )
    const followingMove =
      next && steps.find((step) => step.scene === next.scene && step.atMs >= next.atMs)
    const effect = /route effect|touch\/scene boundary/u.test(up.reason ?? '')
    const changesScene = effect && next && next.scene !== input.scene
    const target = {
      startScene: input.scene,
      scene: changesScene ? next.scene : input.scene,
      position: changesScene ? null : (moves.at(-1)?.to ?? null),
      committedSteps: moves.length,
      inputKey: input.key,
      effect,
      ...(effect && followingMove?.from
        ? { settled: { scene: next.scene, position: followingMove.from } }
        : {}),
    }
    targets.set(`${input.kind}:${input.key}:${input.atMs}`, target)
    targets.set(`${up.kind}:${up.key}:${up.atMs}`, target)
  }
  return targets
}
