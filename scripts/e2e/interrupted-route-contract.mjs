import assert from 'node:assert/strict'
import { isDeepStrictEqual as same } from 'node:util'
import source from '../../data/extracted/events/all.json' with { type: 'json' }
import { canonicalPosition } from './coordinate-evidence.mjs'
import { canonicalScenes } from './entity-action-contract.mjs'

const primary = source.segments[0].commands
const leaf = (event) => event.occurrence?.command?.command
const own = (trace, event) => {
  const latest = trace.events.findLast(
    (actor) =>
      actor.kind === 'actor' &&
      actor.id === 'e59' &&
      actor.scene === event.scene &&
      actor.sceneVisit === event.sceneVisit &&
      actor.order < event.order,
  )
  assert(
    latest &&
      event.poses?.e59?.commitOrder === latest.order &&
      same(event.poses.e59.state, latest.state),
    'interrupted route lost latest same-visit source actor',
  )
  return latest.state
}

/** This is one installed two-leg source prefix, not an endpoint tolerance or a
 * certificate for arbitrary selections. Enclosing motion/pose proofs still owe
 * every eligible RF step and every actual draw. Unexecuted later legs are excluded.
 */
export function verifyInterruptedMiaoRoute(game, reforge, receipts, adapters) {
  const triggers = game.causes.filter(
    (event) =>
      event.phase === 'command' &&
      event.actor === 59 &&
      event.channel === 'trigger' &&
      event.ip === 1070,
  )
  if (!triggers.length) return null
  assert.equal(triggers.length, 1, 'interrupted route mixes trigger invocations')
  const trigger = triggers[0]
  assert.deepEqual(trigger.command, primary[1070], 'interrupted route trigger differs from primary')
  const installed = game.causes.find(
    (event) =>
      event.phase === 'auto-selection-committed' &&
      event.entity === 59 &&
      event.sceneVisit === trigger.sceneVisit &&
      event.order > trigger.order,
  )
  const selection = game.causes.find(
    (event) => event.phase === 'command' && event.runId === trigger.runId && event.ip === 1076,
  )
  assert(
    selection &&
      same(selection.command, primary[1076]) &&
      installed?.label === 'L_1168' &&
      installed.entry === 1168 &&
      same(installed.cursor, { ip: 1168 }),
    'interrupted route lacks its actual primary selector',
  )
  const sourceLegs = [1166, 1168].map((ip) => {
    const calls = game.causes.filter(
      (event) =>
        event.phase === 'auto-step' &&
        event.actor === 59 &&
        event.sceneVisit === trigger.sceneVisit &&
        event.before.ip === ip,
    )
    assert(calls.length, 'interrupted route lacks actual source calls')
    const [x, y, height] = primary[ip].operands
    assert.equal(primary[ip].opcode, 0x11, 'interrupted route is not a classified slow walk')
    const target = [x * 32 + height * 16, y * 16 + height * 8]
    let steps = 0
    for (const [index, call] of calls.entries()) {
      const command = game.causes.find(
        (event) =>
          event.phase === 'command' &&
          event.autoCallId === call.autoCallId &&
          event.runId === call.runId,
      )
      const before = game.causes.find(
        (event) =>
          event.phase === 'auto-before' &&
          event.autoCallId === call.autoCallId &&
          event.runId === call.runId,
      )
      assert(
        command?.ip === ip &&
          same(command.command, primary[ip]) &&
          before?.sceneVisit === call.sceneVisit &&
          command.order > before.order &&
          command.order < call.order,
        'interrupted source call lost its actual instruction',
      )
      assert.deepEqual(
        own(game, before).position,
        call.before.position,
        'source route origin differs from actor',
      )
      assert.deepEqual(
        own(game, call).position,
        call.after.position,
        'source route commit differs from actor',
      )
      if (index) {
        assert(call.tick > calls[index - 1].tick, 'source route reordered its native calls')
        assert.deepEqual(call.before, calls[index - 1].after, 'source route retry continuity lost')
      }
      assert.equal(call.clock.frameId, call.tick, 'source route lost its native frame clock')
      assert(
        receipts.gameBatches.some((batch) =>
          batch.calls.some(
            (receipt) => receipt.end.order === call.order && receipt.start.order === before.order,
          ),
        ),
        'source route call is detached from actual scheduler census',
      )
      const eligible = ((59 + 1) & 1) ^ (call.tick & 1)
      const next = eligible
        ? [call.before.position[0] + 4, call.before.position[1] - 2]
        : call.before.position
      assert.deepEqual(
        call.after.position,
        next,
        'interrupted source route differs from exact primary stride',
      )
      assert.deepEqual(
        call.after.frame,
        eligible ? (call.before.frame + 1) % 4 : call.before.frame,
        'interrupted source route lost current phase',
      )
      assert.equal(call.after.ip, ip, 'interrupted route actually completed its source leg')
      assert(
        call.after.position[0] < target[0] && call.after.position[1] > target[1],
        'source prefix escaped its target',
      )
      steps += Number(eligible)
    }
    return {
      ip,
      target: canonicalPosition(target),
      start: canonicalPosition(calls[0].before.position),
      end: canonicalPosition(calls.at(-1).after.position),
      calls: calls.length,
      steps,
      from: calls[0].order,
      to: calls.at(-1).order,
    }
  })
  assert.deepEqual(sourceLegs[0].start, [137, 76], 'source route lacks original installed position')
  assert.deepEqual(sourceLegs[1].start, sourceLegs[0].end, 'source route moved during trigger hold')
  assert(
    sourceLegs[0].to < trigger.order && sourceLegs[1].from > installed.order,
    'source selection does not divide the actual route',
  )
  const entity = canonicalScenes.s003.entities.find((actor) => actor.id === 'e59')
  const routes = receipts.motion.filter(
    (route) =>
      route.actor === 'e59' &&
      route.scene === 's003' &&
      route.registration.occurrence.timing === 'auto' &&
      ['legacy-001', 'legacy-002'].includes(
        reforge.causes.find(
          (event) => event.phase === 'run-started' && event.runId === route.registration.runId,
        )?.author?.behavior,
      ),
  )
  assert.equal(routes.length, 2, 'interrupted route needs exactly two actual authored slots')
  const targetRef = { scene: 's003', entity: 'e59' }
  const visit = routes[0].sceneVisit
  const authoredLegs = routes.map((route, index) => {
    const registration = route.registration
    const start = reforge.causes.find(
      (event) => event.phase === 'run-started' && event.runId === registration.runId,
    )
    const behavior = index ? 'legacy-002' : 'legacy-001'
    const flow = entity.behaviors.auto[behavior].flow
    const stage = flow.stages.find((value) => value.id === flow.initial)
    const command = stage.body[0]
    assert.deepEqual(
      start.author,
      {
        kind: 'entity-behavior',
        ...targetRef,
        channel: 'auto',
        behavior,
        sceneSession: registration.slot.sceneSessionId,
      },
      'route uses another actual authored run',
    )
    assert.deepEqual(
      registration.occurrence.path,
      [stage.id, 0],
      'route uses another authored occurrence',
    )
    assert.deepEqual(leaf(registration), command, 'route differs from canonical selected command')
    assert.deepEqual(
      command,
      {
        kind: 'moveEntity',
        target: targetRef,
        to: { col: sourceLegs[index].target[0], row: sourceLegs[index].target[1], height: 0 },
        speed: 'slow',
      },
      'route target differs from its primary leg',
    )
    assert.equal(route.sceneVisit, visit, 'interrupted route mixes authored visits')
    assert.equal(registration.slot.slowCadence, true, 'route lacks native slow cadence')
    assert.equal(route.terminal, 'motion-slot-cancelled', 'route is not a real cancelled prefix')
    assert(
      route.commits.length &&
        route.commits.every(
          (commit) =>
            same(commit.to.slice(0, 2), [commit.from[0], commit.from[1] - 0.25]) && !commit.arrived,
        ),
      'authored route escaped its exact primary stride',
    )
    const origin = canonicalPosition(own(reforge, registration).position)
    const cancellation = reforge.causes.find((event) => event.order === route.end)
    assert(
      cancellation?.phase === 'motion-slot-cancelled' && cancellation.slotId === route.slotId,
      'route lost actual cancellation',
    )
    const terminal = canonicalPosition(own(reforge, cancellation).position)
    assert.deepEqual(origin, route.commits[0].from, 'route commits lost registration origin')
    assert.deepEqual(
      terminal,
      route.commits.at(-1).to.slice(0, 2),
      'route cancellation borrowed a terminal pose',
    )
    return {
      start: origin,
      end: terminal,
      steps: route.commits.length,
      slot: route.slotId,
      from: registration.order,
      to: cancellation.order,
    }
  })
  assert.deepEqual(
    authoredLegs[0].start,
    sourceLegs[0].start,
    'authored route starts outside primary origin',
  )
  assert.deepEqual(
    authoredLegs[1].start,
    authoredLegs[0].end,
    'authored route moved during trigger hold',
  )
  const commands = reforge.causes.filter(
    (event) => event.phase === 'command' && event.sceneVisit === visit,
  )
  const take = commands.find(
    (event) => leaf(event)?.kind === 'takeEntity' && same(leaf(event).target, targetRef),
  )
  const select = commands.find(
    (event) =>
      leaf(event)?.kind === 'selectEntityBehavior' &&
      same(leaf(event).target, targetRef) &&
      leaf(event).channel === 'auto',
  )
  const release = commands.find(
    (event) => leaf(event)?.kind === 'releaseEntity' && same(leaf(event).target, targetRef),
  )
  assert(
    take &&
      select &&
      release &&
      take.runId === select.runId &&
      take.runId === release.runId &&
      take.order < select.order &&
      select.order < authoredLegs[0].to &&
      release.order < authoredLegs[1].from,
    'route cancellation lacks real foreground take/select/release',
  )
  assert.deepEqual(
    leaf(select).selection,
    { kind: 'use', value: 'legacy-002' },
    'interrupted route uses another selector',
  )
  const cancellation = reforge.causes.find((event) => event.order === authoredLegs[1].to)
  const aborted = reforge.causes.find(
    (event) =>
      event.phase === 'auto-aborted' &&
      event.entity === 'e59' &&
      event.sceneVisit === visit &&
      event.epoch === routes[1].registration.slot.activationEpoch &&
      event.clock?.frameId === cancellation.clock?.frameId,
  )
  const exit = reforge.events.find(
    (event) => event.kind === 'scene' && event.order > cancellation.order,
  )
  assert(
    aborted && exit?.sceneVisit !== visit && exit?.tick === cancellation.tick,
    'interrupted route lacks its actual scene boundary cancellation',
  )
  const sourceExit = game.events.find(
    (event) => event.kind === 'scene' && event.order > sourceLegs[1].to,
  )
  assert(
    sourceExit?.scene === 's004' && sourceExit.sceneVisit !== trigger.sceneVisit,
    'source interrupted route lacks actual scene exit',
  )
  const coverage = (trace, engine, sceneVisit, hold) => {
    const renders = adapters.renders(trace, 'e59', 's003')
    const proved = engine === 'game' ? receipts.gamePresentation : receipts.presentation.actors
    assert.equal(
      proved.find((actor) => actor.id === 'e59')?.draws,
      renders.length,
      'interrupted route lacks complete actual draw coverage',
    )
    const pages = trace.pages.filter(
      (page) =>
        page.scene === 's003' &&
        page.sceneVisit === sceneVisit &&
        page.page &&
        page.actors?.e59?.visible,
    )
    assert(pages.length, 'interrupted route lacks actual leader dialogue pages')
    for (const page of pages)
      assert.deepEqual(
        canonicalPosition(page.actors.e59.position),
        hold,
        'leader projection is detached from interrupted route',
      )
    return renders.length
  }
  return {
    entity: 'e59',
    scene: 's003',
    sourceLegs,
    authoredLegs,
    gameHold: sourceLegs[0].end,
    reforgeHold: authoredLegs[0].end,
    gameDraws: coverage(game, 'game', trigger.sceneVisit, sourceLegs[0].end),
    reforgeDraws: coverage(reforge, 'reforge', visit, authoredLegs[0].end),
  }
}
