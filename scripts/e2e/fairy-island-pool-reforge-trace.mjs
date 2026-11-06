import assert from 'node:assert/strict'
import { installErrandObserver } from './errand-observer.mjs'
import { ERRAND_TRACE_TARGETS, instrumentErrandTrace } from './errand-trace-plugin.mjs'
import { createEvidenceRecorder } from './evidence-recorder.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'
import { createSnapshotGraph } from './snapshot-graph.mjs'

const scene = 's016'
const relevant = ['party', 'e212', 'e213', 'e216', 'e217', 'e218', 'e219', 'e220', 'e221', 'e233']
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const leaf = (event) => event.occurrence?.command?.command

function replaceAnchor(source, before, after, count = 1) {
  assert.equal(source.split(before).length - 1, count, 'pool trace anchor changed')
  return source.replaceAll(before, after)
}

function installPoolCausal(createCausal, options) {
  return createCausal({
    ...options,
    append(list, event, limit) {
      // Each command and paint retains its actual clock. Recording every
      // idle clock and cadence report again obscures the scene evidence.
      if (!['clock', 'cadence'].includes(event.phase)) return options.append(list, event, limit)
    },
  })
}

/** Keep every s016 presentation draw. A retained text slot can outlive its active page. */
export function fairyIslandPoolObserverScript() {
  const observer = replaceAnchor(
    installErrandObserver.toString(),
    "['s001', 's002', 's003', 's004', 's005', 's014']",
    JSON.stringify([scene]),
    2,
  )
  const causal = replaceAnchor(
    createScriptCausalObserver.toString(),
    'globalThis.__openingCauseFrame = (data) => {\n    snapshotReforge()',
    'globalThis.__openingCauseFrame = (data) => {',
  )
  return (
    '(' +
    observer +
    ')(options => (' +
    installPoolCausal +
    ')((' +
    causal +
    '), options), ' +
    createEvidenceRecorder +
    ', ' +
    createSnapshotGraph +
    ')'
  )
}

export function fairyIslandPoolTracePlugin() {
  return {
    name: 'isolated-fairy-island-pool-trace',
    enforce: 'pre',
    apply: 'serve',
    transform(source, id) {
      const file = ERRAND_TRACE_TARGETS.find(
        (path) => path.startsWith('packages/reforge/') && id.endsWith(`/${path}`),
      )
      if (!file) return null
      let { code } = instrumentErrandTrace(source, file)
      if (file.endsWith('/main.ts')) {
        code = replaceAnchor(
          code,
          "['s001','s002','s003','s004','s005','s014']",
          JSON.stringify([scene]),
        )
        code = replaceAnchor(
          code,
          'for(const e of activeScene.scene.entities) {\n          actors[e.id]=',
          'for(const e of activeScene.scene.entities) {\n          if(!' +
            JSON.stringify(relevant) +
            '.includes(e.id)) continue;\n          actors[e.id]=',
        )
      }
      return { code, map: null }
    },
  }
}

function exactlyOne(values, label) {
  assert.equal(values.length, 1, `expected exactly one ${label}`)
  return values[0]
}

function commandsFor(trace, run) {
  return trace.causes.filter((event) => event.runId === run.runId && event.phase === 'command')
}

function ended(trace, run) {
  const end = exactlyOne(
    trace.causes.filter((event) => event.runId === run.runId && event.phase === 'run-ended'),
    `${run.author.entity} run end`,
  )
  assert.equal(end.resolved, true)
  assert.equal(end.aborted, false)
  return end
}

// Original visible text order. Fast lightning lines also have actual automatic page draws.
const pagesByTrigger = {
  e233: [12449],
  e212: [
    1901, 1902, 1903, 1904, 1905, 1906, 1908, 1909, 1911, 1912, 1913, 1914, 1916, 1917, 1918, 1919,
    1921, 1922, 1923, 1925, 1926, 1928, 1929, 1930, 1931, 1932, 1933, 1934, 1935,
  ],
  e213: [
    1936, 1937, 1938, 1939, 1941, 1942, 1943, 1945, 1946, 1948, 1949, 1951, 1952, 1953, 1954, 1955,
    1956, 1957, 1958, 1959, 1961, 1962, 1964, 1965, 1966, 1968, 1970, 1972, 1974, 1975, 1977, 1979,
  ],
}

function observedPages(trace, run, end) {
  const pages = trace.pages.filter(
    ({ order, page }) => page && run.order < order && order < end.order,
  )
  const id = run.author.entity
  assert.deepEqual(
    pages.flatMap(({ page }) => page.pageTextIds),
    pagesByTrigger[id].map((number) => `dlg.${number}`),
    `${id} visible story dialogue changed`,
  )
  return pages.map(({ page, order }) => {
    const draw = trace.causes.find(
      (event) =>
        event.phase === 'dialogue-presentation' &&
        event.slots.some(
          (slot) =>
            slot.owner.runId === run.runId &&
            slot.pageStartedAtMs === page.pageStartedAtMs &&
            slot.visibleText === page.pageText,
        ),
    )
    assert(draw && draw.renderId !== null, `${id} page lacks its actual caller and complete draw`)
    return { order, renderId: draw.renderId, rows: page.pageTextIds }
  })
}

function actorDraws(trace, id, { after = -1, through = trace.order } = {}) {
  return trace.events.filter(
    (event) =>
      event.kind === 'actor-render' &&
      event.id === id &&
      event.state.drawStatus === 'drawn' &&
      event.throughOrder > after &&
      event.order <= through,
  )
}

function firstInputReady(trace, after, through) {
  const ready = trace.events.find(
    (event) =>
      event.kind === 'control' &&
      event.state === true &&
      event.order > after &&
      event.order < through,
  )
  assert(ready, 'foreground did not return control in the expected interval')
  const paint = trace.causes.find(
    (event) =>
      event.phase === 'dialogue-presentation' &&
      event.order > ready.order &&
      event.order < through &&
      event.slots.length === 0,
  )
  assert(paint?.renderId, 'control returned without a dialogue-free world draw')
  return { order: ready.order, atMs: ready.atMs, clearDraw: paint.order }
}

function entryReceipt(run, first) {
  return {
    author: run.author,
    stage: run.stage,
    runId: run.runId,
    runStartedOrder: run.order,
    firstCommandOrder: first.order,
    firstCommandPath: first.occurrence.path,
    poses: Object.fromEntries(relevant.map((id) => [id, first.poses[id].state])),
  }
}

/** Lightning-site oracle is independent of the current commands' position literals.
 * One site can be cut off by the next strike, but its own frame must actually paint.
 */
const strikeSites = [
  [123, 53, 0],
  [120, 58, 0],
  [120, 48, 0],
  [120, 53, 0],
  [117, 52, 0],
  [114, 46, 0],
  [113, 46, 0],
  [113, 48, 0],
]

function verifyLightning(trace, runs, lightning, end) {
  const sounds = commandsFor(trace, lightning).filter(
    (event) => leaf(event)?.kind === 'playSound' && leaf(event).asset === 'sound.pal.107',
  )
  assert.equal(sounds.length, strikeSites.length, 'pool lightning cue count')
  const draws = actorDraws(trace, 'e218', { after: lightning.order, through: end.order })
  const animationStarts = runs
    .flatMap((run) => commandsFor(trace, run))
    .filter((event) => leaf(event)?.kind === 'setEntityFrame' && leaf(event).frame === 0)
  return sounds.map((sound, index) => {
    const position = strikeSites[index]
    assert.deepEqual(
      sound.poses.e218.state.position,
      position,
      `lightning strike site ${index + 1}`,
    )
    const from = index === 0 ? lightning.order : sounds[index - 1].order
    const to = sounds[index + 1]?.order ?? end.order
    const withinStrike = (event) => from < event.order && event.order < to
    const start = animationStarts.find(
      (event) => withinStrike(event) && same(event.poses.e218.state.position, position),
    )
    assert(start, `no native animation began at lightning site ${index + 1}`)
    const painted = draws.filter(
      ({ order, state }) => order > start.order && order < to && same(state.position, position),
    )
    assert(
      painted.some(({ state }) => state.frame === 0),
      `no first flash frame at site ${index + 1}`,
    )
    return {
      position,
      soundOrder: sound.order,
      startOrder: start.order,
      frames: painted.map(({ order, renderId, state }) => ({
        order,
        renderId,
        frame: state.frame,
        frameResourceId: state.frameResourceId,
      })),
    }
  })
}

function verifyClothesMotion(trace, clothes, end) {
  const bath = actorDraws(trace, 'e217', { after: clothes.order, through: end.order })
  for (const [position, frames] of [
    [
      [136, 56, 0],
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
    ],
    [
      [128, 56, 0],
      [10, 9, 10, 11, 12, 13, 14, 15, 16],
    ],
  ]) {
    let previous = -1
    for (const frame of frames) {
      const draw = bath.find(
        (event) =>
          event.order > previous &&
          same(event.state.position, position) &&
          event.state.assetId === 'sprite-339' &&
          event.state.facing === 'down' &&
          event.state.frame === frame,
      )
      assert(draw, `missing bathing pose ${position.join(',')} frame ${frame}`)
      previous = draw.order
    }
  }
  const commands = commandsFor(trace, clothes)
  const cameraPan = commands.find((event) => leaf(event)?.kind === 'cameraPan')
  const panDone = trace.causes.find(
    (event) => event.phase === 'leaf-completed' && event.occurrence.id === cameraPan?.occurrence.id,
  )
  assert(panDone, 'missing completed reveal camera pan')
  const cameras = trace.worldRenders.filter(
    (event) => cameraPan.order < event.order && event.order < panDone.order,
  )
  assert(
    new Set(cameras.map(({ view }) => JSON.stringify(view.camera))).size > 1,
    'pool reveal camera stayed fixed',
  )
  const route = exactlyOne(
    commands.filter((event) => leaf(event)?.kind === 'moveParty'),
    'running away from the pool',
  )
  const steps = trace.events.filter(
    (event) =>
      event.id === 'party' &&
      event.kind === 'actor' &&
      event.source === 'commit:player.pos' &&
      route.order < event.order &&
      event.order < end.order &&
      !same(event.before?.position, event.state.position),
  )
  assert.deepEqual(
    steps.map(({ state }) => state.position),
    Array.from({ length: 26 }, (_, i) => [122 - i, 55, 0]),
  )
  assert(
    actorDraws(trace, 'party', { after: route.order, through: end.order }).some(
      ({ state }) => state.position[0] < 123 && state.position[0] > 97 && state.facing === 'left',
    ),
    'missing the actual running retreat',
  )
  return {
    cameraStartOrder: cameraPan.order,
    cameraEndOrder: panDone.order,
    retreatSteps: steps.length,
  }
}

function verifyLingerApproach(trace, lightning, end, glide) {
  const glideEnd = ended(trace, glide)
  const moves = trace.events.filter(
    (event) =>
      event.id === 'e219' &&
      event.kind === 'actor' &&
      event.source === 'commit:meta.entity.pos' &&
      glide.order < event.order &&
      event.order < glideEnd.order &&
      !same(event.before?.position, event.state.position),
  )
  const increments = moves.map(({ before, state }) => {
    assert.equal(state.position[1], 49)
    return state.position[0] - before.position[0]
  })
  assert.deepEqual(increments, [...Array(10).fill(0.5), 0.25, 0.25, ...Array(4).fill(0.125)])
  assert.deepEqual(moves[0].before.position, [105, 49, 0])
  assert.deepEqual(moves.at(-1).state.position, [111, 49, 0])
  const raised = actorDraws(trace, 'e219', { after: lightning.order, through: end.order })
  assert(
    raised.some(({ state }) => state.position[0] < 111 && state.position[1] === 49),
    'missing visible Ling’er approach',
  )
  assert(
    raised.some(({ state }) => state.frame === 10 && same(state.position, [111, 49, 0])),
    'missing Ling’er reaction',
  )
  return { startOrder: moves[0].order, endOrder: moves.at(-1).order, steps: increments }
}

export function verifyFairyIslandPoolTrace(trace) {
  const runs = trace.causes.filter(
    (event) =>
      event.phase === 'run-started' &&
      event.author?.kind === 'entity-behavior' &&
      event.author.scene === scene,
  )
  const named = (id, channel) =>
    runs.filter(({ author }) => author.entity === id && author.channel === channel)
  const herb = exactlyOne(named('e233', 'trigger'), 'herb pickup')
  const clothes = exactlyOne(named('e212', 'trigger'), 'pool clothing interaction')
  const lightning = exactlyOne(named('e213', 'trigger'), 'pool lightning encounter')
  const departure = exactlyOne(named('e221', 'auto'), 'Ling’er departure')
  const [herbEnd, clothesEnd, lightningEnd, departureEnd] = [
    herb,
    clothes,
    lightning,
    departure,
  ].map((run) => ended(trace, run))
  assert(herbEnd.order < clothes.order && clothesEnd.order < lightning.order)
  assert(lightning.order < departure.order && departure.order < lightningEnd.order)
  const clothesReady = firstInputReady(trace, clothesEnd.order, lightning.order)
  const lightningReady = firstInputReady(trace, lightningEnd.order, trace.order)
  assert(
    departureEnd.order > lightningReady.order,
    'missing visible departure after foreground release',
  )

  assert.equal(herb.poses.e233.state.state, 1)
  assert.equal(herb.poses.e233.state.visible, true)
  assert(
    actorDraws(trace, 'e233', { through: herb.order }).some(
      ({ state }) => state.assetId === 'sprite-69',
    ),
  )
  const grant = exactlyOne(
    commandsFor(trace, herb).filter((event) => leaf(event)?.kind === 'giveItem'),
    'item grant',
  )
  assert.equal(leaf(grant).itemId, '99')
  assert.equal(herbEnd.poses.e233.state.state, 0)
  assert.equal(herbEnd.world.inventory.find(({ itemId }) => itemId === '99')?.count, 1)
  assert.equal(clothesEnd.poses.e213.state.state, 1)
  assert.deepEqual(clothesEnd.poses.party.state.position, [97, 55, 0])

  const bathing = verifyClothesMotion(trace, clothes, clothesEnd)
  const flashes = verifyLightning(trace, named('e218', 'auto'), lightning, lightningEnd)
  const approach = verifyLingerApproach(
    trace,
    lightning,
    lightningEnd,
    exactlyOne(named('e220', 'auto'), 'Ling’er slide control'),
  )

  const departureMoves = trace.events.filter(
    (event) =>
      event.id === 'e221' &&
      event.kind === 'actor' &&
      event.source === 'commit:meta.entity.pos' &&
      departure.order < event.order &&
      event.order < departureEnd.order &&
      !same(event.before?.position, event.state.position),
  )
  assert(departureMoves.length > 1, 'Ling’er departure never moved through the world')
  assert.deepEqual(departureMoves.at(-1).state.position, [123, 1, 0])
  assert.equal(departureEnd.poses.e221.state.state, 0)
  assert(
    actorDraws(trace, 'e221', { after: lightningReady.order, through: departureEnd.order }).length >
      0,
  )
  assert.equal(trace.final.scene, scene)
  assert.equal(trace.final.control, true)
  assert.deepEqual(trace.final.actors.party.position, [114, 48, 0])
  assert.equal(trace.final.actors.party.facing, 'up')

  return {
    entries: runs.flatMap((run) => {
      const first = commandsFor(trace, run).find((event) => leaf(event))
      return first ? [entryReceipt(run, first)] : []
    }),
    setupOnly: runs
      .filter((run) => !commandsFor(trace, run).some((event) => leaf(event)))
      .map(({ author, stage, runId, order }) => ({ author, stage, runId, order })),
    dialogue: [herb, clothes, lightning].map((run, index) => ({
      entity: run.author.entity,
      pages: observedPages(trace, run, [herbEnd, clothesEnd, lightningEnd][index]),
    })),
    bathing,
    flashes,
    approach,
    boundaries: {
      clothesReady,
      lightningReady,
      departure: {
        runStartedOrder: departure.order,
        endedOrder: departureEnd.order,
        atMs: departureEnd.atMs,
      },
    },
  }
}
