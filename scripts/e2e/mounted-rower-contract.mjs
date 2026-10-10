import assert from 'node:assert/strict'
import { isDeepStrictEqual as same } from 'node:util'
import source from '../../data/extracted/events/all.json' with { type: 'json' }
import {
  authoredAutomaticLanguage,
  compareAutomaticLanguages,
  sourceAutomaticLanguage,
} from './automatic-language-contract.mjs'
import { verifyAutomaticBindings } from './automatic-language-receipts.mjs'
import { assertBoatRouteTerminal } from './boat-terminal-contract.mjs'
import { canonicalScenes } from './entity-action-contract.mjs'

const binding = { scene: 's005', entity: 'e117', channel: 'auto', behavior: 'legacy-001' }
const leaf = (event) => event.occurrence?.command?.command

export function mountedRowerGraphs() {
  const commands = source.segments[0].commands
  assert.deepEqual(commands[1515], { op: 'raw', opcode: 0x24, operands: [118, 36147, 0] })
  const flow = canonicalScenes.s005.entities.find((entity) => entity.id === 'e117').behaviors.auto[
    'legacy-001'
  ].flow
  const stage = flow.stages.find((value) => value.id === flow.initial)
  const primary = sourceAutomaticLanguage(commands, 36147, { self: 118 })
  const authored = authoredAutomaticLanguage(stage.body, { scene: 's005', entity: 'e117' })
  return {
    source: primary,
    authored,
    label: 'L_36147',
    stage: stage.id,
    proof: compareAutomaticLanguages(primary, authored),
  }
}

/** Check each actual display index against its own most recent observation. A
 * resource-legal frame substitution is still false evidence. This check grants no
 * cross-engine equality and is also used by the actual-draw counter. */
export function verifyMountedRowerDraws(reforge, renders) {
  const draws = renders(reforge, 'e117', 's005')
  const actors = reforge.events.filter((event) => event.kind === 'actor' && event.id === 'e117')
  for (const draw of draws) {
    if (draw.frame === null) continue
    const actor = actors.findLast(
      (event) => event.sceneVisit === draw.sceneVisit && event.order <= draw.order,
    )
    assert(
      actor && draw.frame === actor.state.frame,
      'mounted rower actual draw differs from latest same-visit actor frame',
    )
  }
  return draws.length
}

/** The native rower advances once per source update; the authored rower runs the
 * same finite effect word with actual 100ms deadlines. Carrier movement uses its
 * own world cadence. Only the animation progress at matching carrier positions
 * may differ; the caller retains all position/facing/state/visibility obligations.
 */
export function verifyMountedRower(game, reforge, receipts, { renders, moves }) {
  const installed = game.causes.filter(
    (event) =>
      event.phase === 'auto-selection-committed' &&
      event.entity === 117 &&
      event.label === 'L_36147',
  )
  if (!installed.length) return null
  assert.equal(installed.length, 1, 'mounted rower mixes source installations')
  const selection = installed[0]
  const primarySetter = game.causes.find(
    (event) =>
      event.phase === 'command' &&
      event.ip === 1515 &&
      event.order < selection.order &&
      event.sceneVisit === selection.sceneVisit,
  )
  assert(
    primarySetter &&
      same(primarySetter.command, source.segments[0].commands[1515]) &&
      selection.entry === 36147 &&
      selection.operand === 118 &&
      same(selection.cursor, { ip: 36147 }),
    'mounted rower lost actual primary selector/cursor',
  )
  const selected = reforge.causes.filter(
    (event) =>
      event.phase === 'command' &&
      leaf(event)?.kind === 'selectEntityBehavior' &&
      same(leaf(event).target, { scene: 's005', entity: 'e117' }) &&
      leaf(event).channel === 'auto' &&
      same(leaf(event).selection, { kind: 'use', value: 'legacy-001' }),
  )
  assert.equal(selected.length, 1, 'mounted rower lacks its actual authored selector')
  const authoredSetter = selected[0]
  const drawCount = verifyMountedRowerDraws(reforge, renders)
  const language = verifyAutomaticBindings(
    game,
    reforge,
    [binding],
    {
      ...receipts,
      gameCycles: receipts.gameCycles.filter(
        (call) =>
          call.actor === 'e117' &&
          call.sceneVisit === selection.sceneVisit &&
          call.from > selection.order,
      ),
    },
    mountedRowerGraphs,
  )
  assert.equal(language.bindings.length, 1, 'mounted rower has no actual language execution')
  const bound = language.bindings[0]
  assert.equal(bound.runs.length, 1, 'mounted rower mixes authored runs')
  const run = bound.runs[0]
  const start = reforge.causes.find(
    (event) => event.phase === 'run-started' && event.runId === run.runId,
  )
  assert(
    start.order > authoredSetter.order && start.sceneVisit === authoredSetter.sceneVisit,
    'mounted rower run predates selection',
  )
  const nudges = reforge.causes.filter(
    (event) =>
      event.runId === run.runId && event.phase === 'command' && leaf(event)?.kind === 'nudgeEntity',
  )
  assert(nudges.length, 'mounted rower has no executed stroke')
  for (const event of nudges)
    assert.deepEqual(
      event.lifecycle?.authority?.e117,
      { kind: 'mount', parent: 'e116', dx: -2, dy: 2.25 },
      'rower stroke lacks actual carrier authority',
    )
  const terminal = assertBoatRouteTerminal(reforge, 'reforge', {
    startOrder: authoredSetter.order,
    endOrder: reforge.renderScope.throughOrder,
  })
  assert.equal(
    terminal.sceneVisit,
    start.sceneVisit,
    'mounted rower borrowed another terminal visit',
  )
  const movementOrders = (trace, selector, visit) => {
    const movements = moves(trace, 'e117', 's005')
    assert(movements.length, 'mounted rower lacks actual carrier movement')
    for (const movement of movements)
      assert(
        movement.order > selector &&
          movement.sceneVisit === visit &&
          same(movement.delta, [0, -0.25]) &&
          movement.from[0] === 124 &&
          movement.to[0] === 124,
        'mounted rower movement escaped exact installed carrier stride',
      )
    return movements.map((movement) => movement.order)
  }
  return {
    status: 'proved',
    entity: 'e117',
    scene: 's005',
    primarySetter: primarySetter.order,
    authoredSetter: authoredSetter.order,
    language: bound,
    terminal,
    movements: {
      game: movementOrders(game, selection.order, selection.sceneVisit),
      reforge: movementOrders(reforge, authoredSetter.order, start.sceneVisit),
    },
    gameDraws: renders(game, 'e117', 's005').length,
    reforgeDraws: drawCount,
  }
}
