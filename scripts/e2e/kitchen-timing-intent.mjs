import assert from 'node:assert/strict'
import original from '../../data/extracted/events/all.json' with { type: 'json' }
import { originalSpriteNumber } from './game-pose-semantics.mjs'
import { verifyInnGamePresentation } from './inn-presentation-intent.mjs'
import { verifyInnMotionCadence } from './inn-timing-intent.mjs'
import {
  kitchenTargets,
  kitchenTerminalCursor,
  verifyKitchenAutomaticWaits,
  verifyKitchenBindings,
  verifyKitchenHolds,
  verifyKitchenPresentation,
  verifyKitchenSourceCycle,
  verifyKitchenSourceWalk,
} from './kitchen-presentation-intent.mjs'
import { checkTerminalSubdivision } from './motion-refinement.mjs'
import {
  verifyOpeningDialogue,
  verifyOpeningDrawClocks,
  verifyOpeningGameDialogue,
  verifyOpeningWaitReceipt,
} from './opening-hold-intent.mjs'

const leaf = (event) => event.occurrence?.command?.command
const sourceWaits = [
  ...[35684, 35686, 35688, 35690, 35693, 35695, 35697, 35699, 35701, 35703, 35705, 35707].map(
    (ip) => [ip, 9, 0, 'e47', 100],
  ),
  [356, 5, 0, 'e56', 100],
  [364, 9, 6, 'e56', 600],
  [366, 9, 4, 'e56', 400],
  [368, 9, 2, 'e56', 200],
]

/** Source exploration frames are 100ms; dialog-clearing 0x05 is not an extra delay. */
export function verifyKitchenWaitPlan(game, reforge) {
  const a = game.filter((event) => event.phase === 'wait-start')
  const b = reforge.filter(
    (event) =>
      event.phase === 'wait-start' &&
      event.occurrence?.timing === 'interactive' &&
      leaf(event)?.kind === 'wait',
  )
  assert.equal(a.length, sourceWaits.length, '003 source fixed wait count changed')
  assert.equal(b.length, sourceWaits.length, '003 missing/extra authored fixed wait')
  return sourceWaits.map(([ip, opcode, operand, owner, ms], index) => {
    const source = original.segments[0].commands[ip]
    assert.equal(source.opcode, opcode, `L${ip}: source opcode changed`)
    assert.deepEqual(source.operands, [operand, 0, 0], `L${ip}: source operands changed`)
    assert.equal(a[index].occurrence?.ip, ip, '003 source wait order changed')
    assert.deepEqual(a[index].occurrence.command, source, '003 wait is not the source command')
    assert.equal(a[index].type, opcode === 9 ? 'frames' : 'redraw')
    assert.equal(
      opcode === 9 ? a[index].frames : a[index].ms,
      opcode === 9 ? Math.max(1, operand) : 60,
    )
    assert.equal(b[index].occurrence?.self?.entity, owner, '003 wait belongs to wrong actor')
    assert.equal(b[index].ms, ms, `L${ip}: wrong authored wait duration`)
    assert.deepEqual(leaf(b[index]), { kind: 'wait', ms }, '003 timer differs from command')
    return { ip, ms, game: a[index].order, reforge: b[index].order }
  })
}

/** Local causal receipt, not a waiver for the separate full-pose/movement comparison. */
export function compareKitchenTimingIntent(game, reforge, renders, moves, states, position) {
  const result = { status: 'needs-review', fixedWaits: [], errors: [] }
  const check = (name, fn) => {
    try {
      result[name] = fn()
    } catch (error) {
      result.errors.push(`${name}: ${error.message}`)
    }
  }
  check('automaticTake', () => {
    const pauses = reforge.causes.filter(
      (event) => event.phase === 'wait-pause' && event.occurrence?.self?.entity === 'e62',
    )
    assert.equal(
      pauses.length,
      1,
      '003 first Taoist conversation must pause its live automatic wait',
    )
    const pause = pauses[0]
    const start = reforge.causes.find(
      (event) => event.phase === 'wait-start' && event.waitId === pause.waitId,
    )
    assert(start, '003 paused wait has no start')
    const receipt = verifyOpeningWaitReceipt(start, reforge.causes, reforge.worldRenders)
    const resume = reforge.causes.find(
      (event) => event.phase === 'wait-resume' && event.waitId === pause.waitId,
    )
    assert(resume, '003 automatic wait never released')
    assert(
      !reforge.causes.some(
        (event) =>
          event.phase === 'command' &&
          event.runId === start.runId &&
          event.order > pause.order &&
          event.order < resume.order,
      ),
      '003 taken Taoist auto kept executing',
    )
    return {
      status: 'passed',
      start: start.order,
      pause: pause.order,
      remainingMs: pause.remainingMs,
      resume: resume.order,
      end: receipt.end.order,
      nextCommand: receipt.resumed.order,
    }
  })
  check('drawClocks', () => {
    assert(game.causes?.length && reforge.causes?.length, 'missing 003 causal observations')
    for (const trace of [game, reforge]) {
      const draws = trace.worldRenders.filter(
        (draw) =>
          draw.order > trace.renderScope.afterOrder && draw.order <= trace.renderScope.throughOrder,
      )
      verifyOpeningDrawClocks(trace.causes, draws)
      for (const [index, draw] of draws.entries())
        if (index && draw.sceneVisit === draws[index - 1].sceneVisit)
          assert.equal(draw.renderId, draws[index - 1].renderId + 1, '003 world draw missing')
    }
    return 'passed'
  })
  check('fixedWaits', () => verifyKitchenWaitPlan(game.causes, reforge.causes))
  check('waitReceipts', () => {
    const receipts = []
    for (const trace of [game, reforge]) {
      const waits = trace.causes.filter(
        (event) =>
          event.phase === 'wait-start' &&
          (event.engine === 'game' ||
            (event.occurrence?.timing === 'interactive' && leaf(event)?.kind === 'wait')),
      )
      for (const wait of waits) {
        try {
          const receipt = verifyOpeningWaitReceipt(
            wait,
            trace.causes,
            trace.worldRenders,
            kitchenTerminalCursor(wait),
          )
          receipts.push({
            engine: wait.engine,
            start: wait.order,
            end: receipt.end.order,
            next: receipt.resumed.order,
          })
        } catch (error) {
          result.errors.push(`wait ${wait.engine}/${wait.order}: ${error.message}`)
        }
      }
    }
    return receipts
  })
  check('dialogues', () =>
    verifyOpeningDialogue(
      reforge.causes,
      reforge.worldRenders,
      reforge.pages.filter((event) => event.page),
    ),
  )
  check('gameDialogueInputs', () => verifyOpeningGameDialogue(game.causes))
  check('bindings', () => verifyKitchenBindings(reforge))
  check('automaticWaits', () => verifyKitchenAutomaticWaits(reforge))
  check('sourceCycle', () => verifyKitchenSourceCycle(game, renders))
  check('sourceWalk', () => verifyKitchenSourceWalk(game, moves, states, position))
  check('motionCadence', () => {
    const motion = verifyInnMotionCadence(reforge, moves, renders, { actors: ['e56'], routes: 3 })
    assert.deepEqual(
      motion.map((e) => e.to),
      kitchenTargets,
      '003 wrong exact movement targets',
    )
    return motion
  })
  check('gamePresentation', () => [
    ...verifyInnGamePresentation(game, renders, states, position, { actors: ['e56', 'e62'] }),
    ...verifyInnGamePresentation(game, renders, states, position, {
      scene: 's001',
      actors: ['e19'],
    }),
  ])
  check('terminalRefinement', () => {
    assert(
      result.sourceWalk && result.motionCadence,
      'motion refinement requires independent source/author bindings',
    )
    const gameStates = states(game, 'e56', 's003')
    return result.motionCadence.map((route, index) => {
      const proof = checkTerminalSubdivision(
        {
          moves: moves(game, 'e56', 's003').filter(
            (m) =>
              gameStates.find((e) => e.order === m.order)?.state.autoIp ===
              result.sourceWalk.ips[index],
          ),
          states: gameStates,
          renders: renders(game, 'e56', 's003'),
          worldRenders: game.worldRenders,
          sprite: originalSpriteNumber,
        },
        {
          moves: moves(reforge, 'e56', 's003').filter(
            (m) => m.order > route.command && m.order < route.continuation,
          ),
          states: states(reforge, 'e56', 's003'),
          renders: renders(reforge, 'e56', 's003'),
          worldRenders: reforge.worldRenders,
          sprite: originalSpriteNumber,
        },
        {
          rule: 'normal-half-step',
          target: kitchenTargets[index],
          facing: index === 1 ? 'up' : 'left',
          sprite: 21,
          framesPerDirection: 3,
        },
      )
      assert.equal(proof.status, 'proved', JSON.stringify(proof.witness))
      return {
        status: proof.status,
        model: proof.model,
        sourceIP: result.sourceWalk.ips[index],
        command: route.command,
        target: kitchenTargets[index],
        game: proof.alignment.game.moves.map((m) => m.order),
        reforge: proof.alignment.reforge.moves.map((m) => m.order),
      }
    })
  })
  check('presentation', () =>
    verifyKitchenPresentation(reforge, renders, moves, states, result.motionCadence ?? []),
  )
  check('holdSchedule', () => verifyKitchenHolds(reforge, result))
  if (!result.errors.length) result.status = 'passed'
  return result
}
