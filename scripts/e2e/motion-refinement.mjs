import { isDeepStrictEqual as same } from 'node:util'
import { gameNpcDrawEligible } from './game-pose-semantics.mjs'
import { checkTransitionTrace, requireTrace } from './trace-refinement.mjs'

const point = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)
const facingBase = { down: 0, left: 3, up: 6, right: 9 }

/** The approved normal-speed terminal refinement, in exact grid arithmetic:
 * source .5 -> endpoint; uniform engine .375 -> .125 -> endpoint.
 * This is NOT full-pose stuttering: the extra position/frame remains a witnessed microstep.
 * No fragment, actor, coordinate constant or numeric tolerance belongs in this relation.
 */
export function checkTerminalSubdivision(game, reforge, contract) {
  let alignment
  const proof = checkTransitionTrace(
    {
      id: 'normal-walk-terminal-subdivision/v1',
      initial: {},
      transitions: {
        compare: () => {
          requireTrace(
            contract?.rule === 'normal-half-step' &&
              point(contract.target) &&
              Object.hasOwn(facingBase, contract.facing) &&
              contract.framesPerDirection === 3,
            'refinement-contract',
            'approved normal-half-step with target and directional layout',
            contract,
            'unknown',
          )
          const left = game.moves,
            right = reforge.moves
          requireTrace(
            left.length >= 2 && right.length === left.length + 1,
            'subdivision-cardinality',
            [left.length, left.length + 1],
            [left.length, right.length],
          )
          const path = (moves) => moves.map(({ scene, from, to }) => ({ scene, from, to }))
          requireTrace(
            same(path(left.slice(0, -1)), path(right.slice(0, -2))),
            'exact-movement-prefix',
            path(left.slice(0, -1)),
            path(right.slice(0, -2)),
          )
          const last = left.at(-1),
            split = right.slice(-2),
            start = last.from,
            target = contract.target
          requireTrace(
            point(start) && point(last.to) && same(last.to, target),
            'exact-terminal-target',
            target,
            last.to,
          )
          const delta = target.map((n, i) => n - start[i]),
            axis = delta.findIndex((d) => d !== 0)
          requireTrace(
            axis >= 0 && Math.abs(delta[axis]) === 0.5 && delta[1 - axis] === 0,
            'source-half-grid-step',
            'exactly one axis with distance 1/2',
            delta,
          )
          const middle = start.map((n, i) => n + delta[i] * 0.75)
          requireTrace(
            same(path(split), [
              { scene: last.scene, from: start, to: middle },
              { scene: last.scene, from: middle, to: target },
            ]),
            'bounded-uniform-substeps',
            { start, middle, target },
            path(split),
          )
          const projected = [16 * (delta[0] - delta[1]), 8 * (delta[0] + delta[1])]
          const facing =
            projected[1] < 0
              ? projected[0] < 0
                ? 'left'
                : 'up'
              : projected[0] < 0
                ? 'down'
                : 'right'
          requireTrace(facing === contract.facing, 'motion-facing', facing, contract.facing)
          const validate = (side, phases, engine) => {
            const moves = side.moves.slice(-(phases.length + 1)),
              first = moves[0],
              visit = first.sceneVisit
            requireTrace(
              Number.isSafeInteger(visit) && same(first.to, start),
              'subdivision-entry',
              start,
              first.to,
            )
            requireTrace(
              side.moves.every((m) => m.scene === last.scene && m.sceneVisit === visit),
              'same-visit-action',
              { scene: last.scene, visit },
              side.moves.map((m) => [m.scene, m.sceneVisit]),
            )
            requireTrace(
              moves.every(
                (m, i) => Number.isSafeInteger(m.tick) && (!i || m.tick === moves[i - 1].tick + 1),
              ),
              'one-step-per-logical-tick',
              'consecutive logical ticks',
              moves.map((m) => m.tick),
            )
            const windows = moves.map((move, i) => {
              const draws = side.renders.filter(
                (d) =>
                  d.order >= move.order &&
                  d.order < (moves[i + 1]?.order ?? Infinity) &&
                  d.scene === move.scene &&
                  d.sceneVisit === visit,
              )
              return i === moves.length - 1 ? draws.slice(0, 1) : draws
            })
            const expected = [0, ...phases].map((f) => facingBase[facing] + f)
            for (const [i, draws] of windows.entries()) {
              requireTrace(draws.length > 0, 'substep-first-draw', 'actual draw', draws, 'unknown')
              for (const draw of draws) {
                const [col, row] = moves[i].to
                const drawn =
                  engine !== 'game' ||
                  gameNpcDrawEligible(
                    [16 * (col - row), 8 * (col + row)],
                    draw.geometry,
                    side.worldRenders.find((c) => c.renderId === draw.renderId)?.view,
                  )
                requireTrace(
                  same(draw.position, moves[i].to) &&
                    draw.facing === facing &&
                    draw.visible === true &&
                    draw.frame === (drawn ? expected[i] : null) &&
                    draw.frameSource === (drawn ? 'drawn' : 'none') &&
                    draw.drawStatus === (drawn ? 'drawn' : 'not-drawn') &&
                    draw.tick === moves[i].tick,
                  'substep-rendered-pose',
                  {
                    position: moves[i].to,
                    facing,
                    frame: drawn ? expected[i] : null,
                    tick: moves[i].tick,
                  },
                  draw,
                )
              }
              const clocks = side.worldRenders.filter(
                (c) =>
                  c.order >= moves[i].order &&
                  c.order <= (i === moves.length - 1 ? draws[0].order : moves[i + 1].order - 1),
              )
              requireTrace(
                clocks.length === draws.length &&
                  clocks.every(
                    (c, j) =>
                      c.scene === last.scene &&
                      c.sceneVisit === visit &&
                      c.renderId === draws[j].renderId &&
                      c.tick === draws[j].tick &&
                      c.atMs === draws[j].atMs,
                  ),
                'complete-substep-draws',
                clocks.map((c) => c.renderId),
                draws.map((d) => d.renderId),
                'unknown',
              )
            }
            const draws = windows.flat(),
              endOrder = draws.at(-1).order
            requireTrace(
              draws.every(
                (d, i) =>
                  Number.isSafeInteger(d.renderId) &&
                  Number.isFinite(d.atMs) &&
                  (!i || (d.renderId === draws[i - 1].renderId + 1 && d.atMs >= draws[i - 1].atMs)),
              ),
              'substep-draw-order',
              'contiguous actual draws with monotonic time',
              draws.map((d) => [d.renderId, d.atMs]),
            )
            const states = side.states.filter((e) => e.order >= first.order && e.order <= endOrder)
            requireTrace(
              states.length >= moves.length &&
                states.every(
                  (e) =>
                    e.scene === last.scene &&
                    e.sceneVisit === visit &&
                    side.sprite(e.state.sprite) === contract.sprite &&
                    (e.state.position.length < 3 || e.state.position[2] === 0) &&
                    e.state.visible === true &&
                    e.state.facing === facing,
                ),
              'subdivision-state-invariants',
              { sprite: contract.sprite, height: 0, visible: true, facing },
              states.map((e) => ({ order: e.order, state: e.state })),
            )
            return {
              moves,
              windows,
              endpointOrder: moves.at(-1).order,
              firstEndpointRenderOrder: endOrder,
            }
          }
          alignment = {
            game: validate(game, [0], 'game'),
            reforge: validate(reforge, [1, 0], 'reforge'),
          }
          return { target, prefix: left.length - 1 }
        },
      },
      accept: () => {},
    },
    [{ type: 'compare' }],
  )
  return { ...proof, ...(alignment ? { alignment } : {}) }
}
