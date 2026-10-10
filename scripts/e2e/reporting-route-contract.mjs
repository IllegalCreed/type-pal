import assert from 'node:assert/strict'
import { isDeepStrictEqual as same } from 'node:util'
import source from '../../data/extracted/events/all.json' with { type: 'json' }
import { canonicalPosition } from './coordinate-evidence.mjs'
import { canonicalScenes } from './entity-action-contract.mjs'

const leaf = (event) => event.occurrence?.command?.command
const primary = source.segments[0].commands
const target = { scene: 's004', entity: 'e83' }
const own = (trace, event, id) => {
  const actor = trace.events.findLast(
    (value) =>
      value.kind === 'actor' &&
      value.id === id &&
      value.scene === event.scene &&
      value.sceneVisit === event.sceneVisit &&
      value.order < event.order,
  )
  assert(
    actor &&
      event.poses?.[id]?.commitOrder === actor.order &&
      same(event.poses[id].state, actor.state),
    'report route lost latest same-visit actor provenance',
  )
  return actor.state
}

/** Approved report stop is the native twelve-step prefix and actual nine lines,
 * not L886's unexecuted eventual target. This proves only reset + foreground
 * approach. Default patrol prefixes still require the separate authored-route
 * leg/stride proof; neither proof may borrow the other's endpoint or phase. */
export function verifyReportingRoute(game, reforge, receipts, { moves, renders }) {
  const setters = game.causes.filter(
    (event) => event.phase === 'command' && event.ip === 903 && event.scene === 's004',
  )
  if (!setters.length) return null
  assert.equal(setters.length, 1, 'report route mixes primary invocations')
  const setter = setters[0]
  assert.deepEqual(setter.command, primary[903], 'report reset differs from primary')
  assert.deepEqual(primary[903].operands, [84, 65408, 56])
  const sourceParty = own(game, setter, 'party').position
  const resetPixel = [sourceParty[0] - 128, sourceParty[1] + 56]
  const origin = canonicalPosition(resetPixel)
  assert.deepEqual(origin, [139.5, 38.5], 'report reset is not the actual relative-party origin')
  const next = game.causes.find(
    (event) =>
      event.phase === 'command' && event.runId === setter.runId && event.order > setter.order,
  )
  assert.equal(next?.ip, 904, 'report source reset lacks its primary successor')
  const sourceReset = moves(game, 'e83', 's004').filter(
    (movement) =>
      movement.order > setter.order &&
      movement.order < next.order &&
      movement.sceneVisit === setter.sceneVisit,
  )
  assert.equal(sourceReset.length, 1, 'report source reset has no unique actual position effect')
  assert.deepEqual(sourceReset[0].from, canonicalPosition(own(game, setter, 'e83').position))
  assert.deepEqual(sourceReset[0].to, origin, 'report source reset borrowed its target')
  assert.deepEqual(own(game, next, 'e83').position, resetPixel)
  const select = game.causes.find(
    (event) => event.phase === 'command' && event.runId === setter.runId && event.ip === 905,
  )
  const installed = game.causes.find(
    (event) =>
      event.phase === 'auto-selection-committed' &&
      event.entity === 83 &&
      event.order > select?.order &&
      event.sceneVisit === setter.sceneVisit,
  )
  assert(
    select &&
      same(select.command, primary[905]) &&
      installed?.label === 'L_886' &&
      installed.operand === 84 &&
      installed.entry === 886 &&
      same(installed.cursor, { ip: 886 }),
    'report route lacks actual source selection/cursor',
  )
  const wait = game.causes.find(
    (event) =>
      event.phase === 'wait-start' && event.runId === setter.runId && event.occurrence?.ip === 907,
  )
  const end = game.causes.find(
    (event) => event.phase === 'wait-end' && event.waitId === wait?.waitId,
  )
  assert(
    wait && end && wait.frames === 12 && wait.order > installed.order,
    'report approach lacks actual twelve-frame primary wait',
  )
  const calls = game.causes.filter(
    (event) =>
      event.phase === 'auto-step' &&
      event.actor === 83 &&
      event.sceneVisit === setter.sceneVisit &&
      event.order > wait.order &&
      event.order < end.order,
  )
  assert.equal(calls.length, 12, 'report source approach is not twelve actual calls')
  const sourceMoveOrders = []
  for (const [index, call] of calls.entries()) {
    assert(
      call.before.ip === 886 &&
        call.after.ip === 886 &&
        receipts.gameCycles.some(
          (cycle) => cycle.to === call.order && cycle.commands.includes(886),
        ),
      'report approach escaped its proved primary call',
    )
    assert.deepEqual(call.before.position, [resetPixel[0] + index * 6, resetPixel[1] - index * 3])
    assert.deepEqual(
      call.after.position,
      [resetPixel[0] + (index + 1) * 6, resetPixel[1] - (index + 1) * 3],
      'report source approach changed exact stride',
    )
    assert.equal(
      call.tick,
      calls[0].tick + index,
      'report source approach skipped an eligible update',
    )
    assert.deepEqual(own(game, call, 'e83').position, call.after.position)
    const cycle = receipts.gameCycles.find((value) => value.to === call.order)
    const movement = moves(game, 'e83', 's004').filter(
      (value) => value.order > cycle.from && value.order < cycle.to,
    )
    assert.equal(movement.length, 1, 'report source call lost its actual position transition')
    sourceMoveOrders.push(movement[0].order)
  }
  const stop = canonicalPosition(calls.at(-1).after.position)
  assert.deepEqual(stop, [139.5, 34], 'report stop differs from approved actual prefix')
  const entity = canonicalScenes.s004.entities.find((actor) => actor.id === 'e83')
  const stage = entity.behaviors.trigger['report-aunt-illness'].flow.stages.find(
    (value) => value.id === 'report',
  )
  const starts = reforge.causes.filter(
    (event) =>
      event.phase === 'run-started' &&
      event.author?.entity === 'e83' &&
      event.author.behavior === 'report-aunt-illness' &&
      event.stage === 'report',
  )
  assert.equal(starts.length, 1, 'report lacks one actual canonical report run')
  const run = starts[0]
  const commands = reforge.causes.filter(
    (event) =>
      event.phase === 'command' &&
      event.runId === run.runId &&
      event.occurrence?.command?.kind === 'leaf',
  )
  const commandAt = (index) => {
    const matches = commands.filter((event) => same(event.occurrence.path, ['report', index]))
    assert.equal(matches.length, 1, 'report lacks unique actual authored occurrence')
    assert.deepEqual(
      leaf(matches[0]),
      stage.body[index],
      'report occurrence differs from canonical author',
    )
    assert.equal(matches[0].sceneVisit, run.sceneVisit, 'report occurrence borrowed another visit')
    return matches[0]
  }
  const disabled = commandAt(0),
    relative = commandAt(1),
    walk = commandAt(5)
  assert.deepEqual(leaf(disabled), {
    kind: 'selectEntityBehavior',
    target,
    channel: 'auto',
    selection: { kind: 'disabled' },
  })
  assert.deepEqual(leaf(relative), { dcol: -0.5, drow: 7.5, kind: 'setEntityPosRelParty', target })
  const party = canonicalPosition(own(reforge, relative, 'party').position)
  assert.deepEqual(
    [party[0] - 0.5, party[1] + 7.5],
    origin,
    'report author reset differs from actual party',
  )
  const relativeEnd = reforge.causes.find(
    (event) =>
      event.phase === 'leaf-completed' &&
      event.runId === run.runId &&
      event.occurrence?.id === relative.occurrence.id,
  )
  assert(relativeEnd, 'report relative placement never completed')
  const authoredReset = moves(reforge, 'e83', 's004').filter(
    (movement) =>
      movement.order > relative.order &&
      movement.order < relativeEnd.order &&
      movement.sceneVisit === run.sceneVisit,
  )
  assert.equal(authoredReset.length, 1, 'report author reset has no unique actual effect')
  assert.deepEqual(authoredReset[0].from, canonicalPosition(own(reforge, relative, 'e83').position))
  assert.deepEqual(authoredReset[0].to, origin, 'report author reset borrowed its target')
  assert.deepEqual(
    leaf(walk),
    { kind: 'moveEntity', target, to: { col: stop[0], row: stop[1], height: 0 }, speed: 'normal' },
    'report author approach differs from approved source prefix',
  )
  const routes = receipts.motion.filter(
    (route) =>
      route.registration.runId === run.runId &&
      route.registration.occurrence.id === walk.occurrence.id,
  )
  assert.equal(routes.length, 1, 'report approach lacks its own actual slot')
  const route = routes[0]
  assert.equal(route.terminal, 'motion-slot-settled', 'report approach did not actually arrive')
  assert.equal(route.commits.length, 12, 'report author approach changed actual step count')
  for (const [index, commit] of route.commits.entries()) {
    assert.deepEqual(commit.from, [origin[0], origin[1] - index * 0.375])
    assert.deepEqual(
      commit.to.slice(0, 2),
      [origin[0], origin[1] - (index + 1) * 0.375],
      'report author changed exact normal stride',
    )
    assert.equal(commit.arrived, index === 11, 'report author arrived at a different step')
  }
  const result = {
    status: 'proved',
    entity: 'e83',
    scene: 's004',
    stop,
    resets: { game: sourceReset[0].order, reforge: authoredReset[0].order },
    report: { game: [], reforge: [] },
  }
  for (const [engine, trace, reset, approach, visit] of [
    ['game', game, sourceReset[0], sourceMoveOrders, setter.sceneVisit],
    [
      'reforge',
      reforge,
      authoredReset[0],
      route.commits.map((commit) => commit.order),
      run.sceneVisit,
    ],
  ]) {
    const movement = moves(trace, 'e83', 's004').filter((value) => value.order > reset.order)
    assert.deepEqual(
      movement.map((value) => value.order),
      approach,
      'report contains an unproved movement after relative reset',
    )
    const pages = trace.pages.filter(
      (page) =>
        page.scene === 's004' &&
        page.sceneVisit === visit &&
        page.page &&
        page.order > reset.order &&
        page.order <= trace.renderScope.throughOrder,
    )
    assert(pages.length, 'report lacks actual dialogue pages')
    const rows = [282, 283, 284, 286, 288, 289, 290, 292, 293]
    const sourcePages = stage.body
      .filter((command) => command.kind === 'dialog')
      .flatMap((command) => {
        const texts = command.cue.rows.map(
          (row) =>
            primary.find(
              (value) => value.op === 'showDialog' && `dlg.${value.messageIndex}` === row.text,
            ).text,
        )
        return texts.map((_, index) => texts.slice(0, index + 1))
      })
    assert.deepEqual(
      engine === 'game'
        ? pages.map((page) => page.page.lines)
        : pages.flatMap((page) => page.page.pageTextIds),
      engine === 'game' ? sourcePages : rows.map((id) => `dlg.${id}`),
      'report lacks the complete approved dialogue',
    )
    for (const page of pages) {
      const actor = trace.events.findLast(
        (event) =>
          event.kind === 'actor' &&
          event.id === 'e83' &&
          event.sceneVisit === visit &&
          event.order < page.order,
      )
      assert(
        actor &&
          same(canonicalPosition(actor.state.position), stop) &&
          same(page.actors.e83.position, actor.state.position) &&
          page.actors.e83.facing === actor.state.facing &&
          actor.state.facing === 'up',
        'report page borrowed its standing actor',
      )
    }
    const draws = renders(trace, 'e83', 's004').length
    const coverage = engine === 'game' ? receipts.gamePresentation : receipts.presentation.actors
    assert(
      coverage.some((proof) => proof.id === 'e83' && proof.draws === draws),
      'report lacks complete actual draw coverage',
    )
    result[`${engine}Draws`] = draws
    result.report[engine] = approach
  }
  return result
}
