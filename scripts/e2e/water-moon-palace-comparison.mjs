import assert from 'node:assert/strict'
import { recompareBoundStory } from './bound-story-comparison.mjs'
import { readBoundStoryRecording } from './bound-story-recording.mjs'
import { committedRouteReceipt } from './committed-route.mjs'
import { continuousGrid } from './continuous-route.mjs'
import { verifyDialoguePresentation } from './dialogue-presentation-contract.mjs'
import { assertErrandCollector } from './errand-contract.mjs'
import { readEvidenceArtifact } from './evidence-artifact.mjs'
import { readLongEvidenceArtifact } from './long-evidence.mjs'
import { assertWaterMoonPalaceGameTrace } from './water-moon-palace-game-observer.mjs'
import { assertWaterMoonPalaceGameStory } from './water-moon-palace-game-oracle.mjs'
import { verifyWaterMoonPalaceReforgeTrace } from './water-moon-palace-reforge-trace.mjs'
import { waterMoonPalaceRoutes } from './water-moon-palace-route.mjs'

const touchDialogues = new Map([
  ['palace-exterior-to-linger-guide', 'e270'],
  ['bath-water-to-linger-medicine', 'e342'],
])

function routeEndsInDialogue({ trace, engine, plan, startOrder, endOrder }) {
  const target = touchDialogues.get(plan.id)
  assert(target, `missing dialogue caller for ${plan.id}`)
  const between = ({ order }) => startOrder < order && order <= endOrder
  return engine === 'game'
    ? trace.events.some(
        (event) =>
          between(event) && event.kind === 'cursor' && `e${event.cursor?.owner}` === target,
      )
    : trace.causes.some(
        (event) =>
          between(event) &&
          event.phase === 'run-started' &&
          event.author?.scene === plan.completion.scene &&
          event.author?.entity === target,
      )
}

function nativeReady(trace, engine, party, endOrder) {
  const sameVisit = (event) =>
    event.order <= endOrder && event.scene === party.scene && event.sceneVisit === party.sceneVisit
  if (engine === 'game')
    return (
      party.ready === true ||
      trace.events.some(
        (event) => sameVisit(event) && event.order >= party.order && event.kind === 'ready',
      )
    )
  return (
    trace.events.findLast((event) => sameVisit(event) && event.kind === 'control')?.state === true
  )
}

export function measureWaterMoonPalaceRoute({ report, trace }) {
  const { engine } = report
  const game = engine === 'game'
  const plans = Object.values(waterMoonPalaceRoutes(engine))
  const { legs, inputs } = report.route
  assert.equal(legs.length, plans.length, '010 route leg count changed')
  assert.equal(new Set(legs.map(({ phase }) => phase)).size, legs.length)
  assert.deepEqual(
    report.actions.filter(({ routeId }) => routeId),
    inputs,
    '010 route lost dispatch receipts',
  )
  const arrows = trace.inputs.filter(
    ({ key, order }) => key.startsWith('Arrow') && order > legs[0].startOrder,
  )
  assert(
    arrows.every(({ repeat }) => !repeat),
    '010 contains keyboard auto-repeat',
  )
  assert.deepEqual(
    arrows.map(({ type, key }) => [type, key]),
    inputs.map(({ kind, key }) => [`key${kind}`, key]),
    '010 native direction keys differ from dispatches',
  )

  const source = game ? 'commit:tickSceneInput' : 'commit:player.input'
  const moves = trace.events.filter(
    (event) =>
      event.kind === 'actor' &&
      event.id === 'party' &&
      event.source === source &&
      event.before?.position.some((value, index) => value !== event.state.position[index]),
  )
  assert.equal(
    moves.length,
    plans.reduce((count, plan) => count + plan.steps.length, 0),
    '010 player moves escaped the fixed legs',
  )

  return legs.map((leg, index) => {
    const { startOrder, endOrder, inputPlan } = leg
    const plan = plans[index]
    assert.deepEqual(inputPlan, plan, '010 used another input plan')
    assert.equal(leg.scene, plan.steps[0].scene)
    assert(
      startOrder < endOrder && (index === 0 || legs[index - 1].endOrder <= startOrder),
      '010 leg evidence windows overlap',
    )
    const lastParty = trace.events.findLast(
      (event) => event.order <= endOrder && event.kind === 'actor' && event.id === 'party',
    )
    assert.equal(lastParty?.scene, plan.completion.scene)
    assert.deepEqual(lastParty.state.position, plan.completion.position)
    const dialogue = plan.completion.mode === 'dialogue'
    if (dialogue)
      assert(routeEndsInDialogue({ trace, engine, plan, startOrder, endOrder }), plan.id)
    else
      assert(nativeReady(trace, engine, lastParty, endOrder), `${plan.id} did not return control`)
    const replay = committedRouteReceipt({
      id: leg.replay.id,
      engine,
      trace,
      startOrder,
      endOrder,
      scene: leg.scene,
      end: game
        ? {
            scene: Number(lastParty.scene.slice(1)) + 1,
            position: lastParty.state.position,
            dialog: dialogue,
          }
        : { scene: lastParty.scene, position: lastParty.state.position, runtime: { dialogue } },
      ready: !dialogue,
      inputCount: inputs.filter(({ phase }) => phase === leg.phase).length,
    })
    assert.deepEqual(replay, leg.replay)
    assert.deepEqual(replay.completion, plan.completion)
    assert.deepEqual(
      replay.steps.map(({ order: _order, ...step }) => step),
      plan.steps,
      `${plan.id} native route diverged`,
    )
    for (const { key, order } of replay.steps) {
      const active = arrows.findLast((event) => event.order < order)
      assert(active?.type === 'keydown' && active.key === key, `unbound 010 walk at ${order}`)
    }
    return {
      id: plan.id,
      steps: replay.steps.map(({ key, from, to }) => ({
        key,
        from: continuousGrid(from, engine),
        to: continuousGrid(to, engine),
      })),
      completion: {
        ...replay.completion,
        position: continuousGrid(replay.completion.position, engine),
      },
    }
  })
}

async function readRecording(path, engine) {
  const game = engine === 'game'
  const result = await readBoundStoryRecording({
    path,
    engine,
    fragment: '010',
    readTrace: game ? readEvidenceArtifact : readLongEvidenceArtifact,
    assertTrace: game ? assertWaterMoonPalaceGameTrace : assertErrandCollector,
  })
  const { report, trace } = result
  assert.equal(report.dependencies.definition.packageName, engine)
  assert.equal(report.dependencies.definition.entry, `scripts/e2e/water-moon-palace-${engine}.mjs`)
  assert.equal(
    report.dependencies.definition.traceConfig,
    game
      ? 'scripts/e2e/fairy-island-pool-game.config.mts'
      : 'scripts/e2e/water-moon-palace-reforge.config.mjs',
  )
  return {
    ...result,
    story: game ? assertWaterMoonPalaceGameStory(trace) : verifyWaterMoonPalaceReforgeTrace(trace),
  }
}

function normalizeDraws(draws, engine) {
  return draws.map(({ position, facing, frame }) => ({
    position: continuousGrid(position, engine),
    facing,
    frame,
  }))
}

export function compareWaterMoonPalaceGuide(game, reforge, gameGuide, reforgeGuide) {
  const moves = (trace, source, endOrder) =>
    trace.events.filter(
      (event) =>
        event.kind === 'actor' &&
        event.id === 'e270' &&
        event.scene === 's019' &&
        event.source === source &&
        event.order < endOrder &&
        event.before?.position.some((value, index) => value !== event.state.position[index]),
    )
  const left = moves(game, 'commit:npcWalkTo', gameGuide.departure.order)
  const right = moves(reforge, 'commit:meta.entity.pos', reforgeGuide.departure.order)
  const path = (steps, engine) =>
    steps.map(({ state, tick }) => ({
      position: continuousGrid(state.position, engine),
      tick: tick - steps[0].tick,
    }))
  const nativePath = path(left, 'game')
  assert.deepEqual(
    nativePath,
    Array.from({ length: 14 }, (_, tick) => ({ position: [77, 23 - (tick + 1) * 0.375], tick })),
    'original guide did not take fourteen fixed steps',
  )
  assert.deepEqual(path(right, 'reforge'), nativePath, 's019/e270 native guide path diverged')
  const drawnGame = normalizeDraws(
    gameGuide.walkDraws.map(({ actors }) => actors.e270),
    'game',
  )
  const drawnReforge = normalizeDraws(
    reforgeGuide.walkDraws.map(({ state }) => state),
    'reforge',
  )
  assert.equal(drawnGame.length, 13, 'Game must hide the guide on the fourteenth step')
  assert.deepEqual(drawnReforge, drawnGame, 's019/e270 guide drawings differ')

  const gameSlots = game.events.filter(
    ({ kind, scene }) => kind === 'dialogue-draw' && scene === 's019',
  )
  const gameCleared = gameSlots.findLast(({ order }) => order < left[0].order)
  assert.deepEqual(gameCleared?.slots, [], 'Game guide walked over the previous dialogue')
  const reforgeDraws = new Map(
    reforge.causes
      .filter(({ phase }) => phase === 'dialogue-presentation')
      .map((draw) => [draw.renderId, draw]),
  )
  for (const draw of reforgeGuide.walkDraws)
    assert.deepEqual(
      reforgeDraws.get(draw.renderId)?.slots,
      [],
      'Reforge guide walked over the previous dialogue',
    )
  const departedGame = game.events.find(
    ({ kind, order }) => kind === 'world-draw' && order > gameGuide.departure.order,
  )
  const departedReforge = reforge.events.find(
    ({ kind, order, id }) =>
      kind === 'actor-render' && order > reforgeGuide.departure.order && id === 'e270',
  )
  assert(departedGame && !departedGame.actors.e270, 'Game kept drawing Zhao Ling’er')
  assert.equal(departedReforge?.state.drawStatus, 'not-drawn', 'Reforge kept drawing Zhao Ling’er')
  for (const [steps, guide, engine] of [
    [left, gameGuide, 'game'],
    [right, reforgeGuide, 'reforge'],
  ]) {
    assert.equal(guide.departure.tick, steps.at(-1).tick)
    assert.equal(guide.departure.state.facing, 'up')
    assert.deepEqual(continuousGrid(guide.departure.state.position, engine), [77, 17.75])
  }
  return {
    status: 'proved',
    path: nativePath,
    drawings: drawnGame,
    game: {
      steps: left.map(({ order }) => order),
      cleared: gameCleared.order,
      departed: departedGame.order,
    },
    reforge: {
      steps: right.map(({ order }) => order),
      cleared: reforgeDraws.get(reforgeGuide.walkDraws[0].renderId).order,
      departed: departedReforge.order,
    },
  }
}

function gamePages(trace, { start, end }) {
  const pages = new Map()
  for (const draw of trace.events) {
    if (draw.kind !== 'dialogue-draw' || draw.order <= start.order || draw.order >= end.order)
      continue
    const active = draw.slots.find(
      (slot) => slot.active && slot.cursor?.owner === start.cursor.owner,
    )
    if (active) pages.set(active.page, draw)
  }
  return [...pages.values()]
}

function comparePages(game, reforge) {
  return ['guide', 'water', 'pellet'].map((story) => {
    const left = gamePages(game.trace, game.story[story])
    const right = reforge.story[story].pages
    const sorted = (slots) => slots.sort((a, b) => a.slot.localeCompare(b.slot))
    const text = (value) => value.replaceAll('\n', '')
    assert.deepEqual(
      right.map(({ slots }) =>
        sorted(
          slots.map(({ slot, active, speaker, portraitAsset, visibleText }) => ({
            slot,
            active,
            speaker: speaker?.replace(/^spk\./u, '') ?? null,
            portrait: portraitAsset ? Number(portraitAsset.split('.').at(-1)) : null,
            text: text(visibleText),
          })),
        ),
      ),
      left.map(({ slots }) =>
        sorted(
          slots.map(({ slot, active, title, portrait, text: visibleText }) => ({
            slot,
            active,
            speaker: title?.replace(/∶$/u, '') ?? null,
            portrait,
            text: text(visibleText),
          })),
        ),
      ),
      `010 ${story} visible dialogue differs`,
    )
    return {
      story,
      game: left.map(({ order }) => order),
      reforge: right.map(({ drawOrder }) => drawOrder),
    }
  })
}

function compareChest(game, reforge) {
  const draws = reforge.trace.causes.filter(({ phase }) => phase === 'dialogue-presentation')
  const enters = reforge.trace.inputs.filter(
    ({ type, key }) => type === 'keydown' && key === 'Enter',
  )
  return game.story.chest.visits.map(({ narration, start, end }, index) => {
    const { pages, ready, start: reforgeStart } = reforge.story.chest.visits[index]
    const before =
      reforge.story.chest.visits[index - 1]?.ready.order ?? reforge.story.portals[1].order
    const input = enters.filter(({ order }) => before < order && order < ready.order)
    assert.equal(input.length, 1, `chest search ${index + 1} required a second confirmation`)
    assert(input[0].order < reforgeStart && !input[0].repeat)
    const shown = draws.find(({ order }) => order === pages[0].drawOrder)
    const cleared = draws.find(
      ({ order, sceneVisit, slots }) =>
        order > shown.order && sceneVisit === shown.sceneVisit && slots.length === 0,
    )
    assert(cleared && cleared.order <= ready.clearDraw, 'missing actual cleared chest narration')
    assert.deepEqual(
      shown.slots.map(({ slot, visibleText }) => [slot, visibleText]),
      narration.slots.map(({ slot, text }) => [slot, text]),
      `chest narration ${index + 1} differs`,
    )
    const gameClear = game.trace.events.find(
      (draw) =>
        draw.kind === 'dialogue-draw' &&
        draw.sceneVisit === narration.sceneVisit &&
        draw.order > narration.order &&
        draw.slots.length === 0,
    )
    assert(gameClear, 'missing Game chest narration end')
    assert.equal(gameClear.tick - narration.tick, 14)
    const gameMs = gameClear.atMs - narration.atMs
    const reforgeMs = cleared.atMs - shown.atMs
    assert(
      Math.abs(reforgeMs - gameMs) <= 100,
      `chest narration ${index + 1} duration differs: Game ${gameMs}ms, Reforge ${reforgeMs}ms`,
    )
    return {
      search: index + 1,
      game: {
        start: start.order,
        end: end.order,
        shown: narration.order,
        cleared: gameClear.order,
        ms: gameMs,
      },
      reforge: {
        start: reforgeStart,
        input: input[0].order,
        shown: shown.order,
        cleared: cleared.order,
        ms: reforgeMs,
      },
    }
  })
}

export async function recompareWaterMoonPalace(root, gamePath, reforgePath) {
  const [game, reforge] = await Promise.all([
    readRecording(gamePath, 'game'),
    readRecording(reforgePath, 'reforge'),
  ])
  return recompareBoundStory({
    root,
    fragment: '010',
    recordings: [game, reforge],
    semanticPaths: [],
    scope:
      '010 native route, guide drawings, dialogue, four chest searches, recovery, medicine and fresh palace restore.',
    compare() {
      const left = measureWaterMoonPalaceRoute(game)
      const right = measureWaterMoonPalaceRoute(reforge)
      assert.deepEqual(right, left, '010 routes differ after normalization')
      const guide = compareWaterMoonPalaceGuide(
        game.trace,
        reforge.trace,
        game.story.guide,
        reforge.story.guide,
      )
      const dialogue = comparePages(game, reforge)
      const presentation = verifyDialoguePresentation(
        reforge.trace.causes,
        reforge.trace.worldRenders,
      )
      const chest = compareChest(game, reforge)
      const gameWater = game.story.water.recovery
      const reforgeWater = reforge.story.water.recovery
      const vitals = (roles) => roles.map(({ hp, mp }) => [hp, mp])
      assert.deepEqual(vitals(gameWater.before), vitals(reforgeWater.before))
      assert.deepEqual(vitals(gameWater.after), vitals(reforgeWater.after))
      return {
        findings: [],
        route: left.map(({ id, steps, completion }) => ({ id, moves: steps.length, completion })),
        guide,
        dialogue,
        presentation,
        chest,
        recovery: {
          game: gameWater.order,
          reforge: reforgeWater.order,
          before: vitals(gameWater.before),
          after: vitals(gameWater.after),
        },
        medicine: {
          game: game.story.pellet.end.order,
          reforge: reforge.story.pellet.ready.order,
          position: [96, 24],
        },
      }
    },
  })
}
