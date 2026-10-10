import { checkTerminalSubdivision } from './motion-refinement.mjs'

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** The approved extra motion tick also advances the party camera once. Prove that exact
 * projection correspondence before retaining an offscreen terminal draw as a pose anchor.
 * No trace is changed, and every later pose/visibility observation remains compared.
 */
export function approvedOpeningTerminalViewport(approval, game, reforge) {
  if (!approval) return null
  const viewAt = (side, draw) => {
    const view = side.worldRenders.find((clock) => clock.renderId === draw?.renderId)?.view
    if (!view || !Array.isArray(view.transform) || !Array.isArray(view.canvasSize)) return null
    const [a, b, c, d, e, f] = view.transform
    if (!(a > 0 && a === d && b === 0 && c === 0 && e === 0 && f === 0)) return null
    const camera = Array.isArray(view.camera) ? view.camera : [view.camera?.x, view.camera?.y]
    if (!camera.every(Number.isFinite)) return null
    return { camera, viewport: view.canvasSize.map((n) => n / a) }
  }
  const tail = (side, atom, engine) => {
    const rows = side.renders.filter((row) => row.order >= atom.firstEndpointRenderOrder)
    const first = rows[0],
      hidden = rows.find((row) => row.visible === false)
    if (!first || !hidden || hidden.tick !== first.tick + 2) return null
    const interval = rows.filter((row) => row.order <= hidden.order)
    const clocks = side.worldRenders.filter(
      (clock) => clock.renderId >= first.renderId && clock.renderId <= hidden.renderId,
    )
    if (
      clocks.length !== interval.length ||
      interval.some((row, index) => {
        const clock = clocks[index]
        return (
          row.scene !== first.scene ||
          row.sceneVisit !== first.sceneVisit ||
          row.renderId !== first.renderId + index ||
          clock.renderId !== row.renderId ||
          clock.scene !== row.scene ||
          clock.sceneVisit !== row.sceneVisit ||
          clock.tick !== row.tick ||
          clock.atMs !== row.atMs
        )
      })
    )
      return null
    const stableRows = rows.filter((row) => row.order < hidden.order)
    if (
      stableRows.some(
        (row, index) =>
          row.sceneVisit !== first.sceneVisit ||
          row.scene !== first.scene ||
          !same(row.position, first.position) ||
          row.facing !== 'down' ||
          row.visible !== true ||
          !same(row.geometry?.worldRect, first.geometry?.worldRect) ||
          (index > 0 && row.renderId !== stableRows[index - 1].renderId + 1) ||
          !(
            (row.frame === 0 && row.frameSource === 'drawn' && row.drawStatus === 'drawn') ||
            (engine === 'game' &&
              row.frame === null &&
              row.frameSource === 'none' &&
              row.drawStatus === 'not-drawn' &&
              row.screenVisible === false)
          ),
      )
    )
      return null
    const exit = stableRows.find((row) => row.tick === first.tick + 1)
    if (!exit || exit.screenVisible !== false) return null
    return { first, exit, hidden }
  }
  const a = tail(game, approval.game, 'game'),
    b = tail(reforge, approval.reforge, 'reforge')
  if (!a || !b || a.first.screenVisible !== true || b.first.screenVisible !== false) return null
  const middle = approval.reforge.windows.at(-2)?.[0]
  const av = viewAt(game, a.first),
    ax = viewAt(game, a.exit),
    bv = viewAt(reforge, b.first)
  const mv = viewAt(reforge, middle)
  if (
    !av ||
    !ax ||
    !bv ||
    !mv ||
    !same(ax, bv) ||
    !same(av, mv) ||
    !same(a.first.geometry?.worldRect, b.first.geometry?.worldRect) ||
    !same(
      a.exit.screenRect,
      b.first.screenRect.map(
        (n) =>
          n /
          (reforge.worldRenders.find((r) => r.renderId === b.first.renderId)?.view.transform[0] ??
            NaN),
      ),
    )
  )
    return null
  return {
    gameAnchor: a.first.order,
    reforgeAnchor: b.first.order,
    gameExit: a.exit.order,
    reforgeIntermediate: middle.order,
    hideAfterArrivalTicks: 2,
    viewport: bv.viewport,
  }
}

/** This binding selects the user's approval; the relation itself has no story identities. */
export function approvedOpeningTerminalMotion({ fragment, id, game, reforge }) {
  if (fragment !== '001' || id !== 'e10') return null
  const sprite = (value) => Number(String(value).replace(/^sprite-/u, ''))
  const proof = checkTerminalSubdivision(
    { ...game, sprite },
    { ...reforge, sprite },
    {
      rule: 'normal-half-step',
      target: [60, -12],
      facing: 'down',
      sprite: 21,
      framesPerDirection: 3,
    },
  )
  if (proof.status !== 'proved') return null
  return {
    type: 'accepted-difference',
    fragment,
    id,
    scene: 's001',
    field: 'terminal-uniform-motion',
    approval: '2026-10-07: 001李大娘离房末半格保留匀速并登记差异',
    proof: { model: proof.model, status: proof.status },
    ...proof.alignment,
  }
}
