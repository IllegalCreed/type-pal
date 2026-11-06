import assert from 'node:assert/strict'
import ts from 'typescript'
import { installErrandObserver } from './errand-observer.mjs'
import { ERRAND_TRACE_TARGETS, instrumentErrandTrace } from './errand-trace-plugin.mjs'
import { createEvidenceRecorder } from './evidence-recorder.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'
import { createSnapshotGraph } from './snapshot-graph.mjs'

const scenes = ['s016', 's019', 's020']
const actors = [
  'e211',
  'e216',
  'e221',
  'e267',
  'e268',
  'e270',
  'e341',
  'e342',
  'e348',
  'e362',
  'e363',
]

function replaceAnchor(source, before, after, count = 1) {
  assert.equal(source.split(before).length - 1, count, 'palace trace anchor changed')
  return source.replaceAll(before, after)
}

function installPalaceCausal(createCausal, options, observedActors) {
  const ambientRuns = new Set()
  return createCausal({
    ...options,
    append(list, event, limit) {
      // Waterfall animation tracks are unrelated to the route. Keep every
      // action sample for the story subjects and all actual scene paints.
      if (event.phase.startsWith('action-frame-')) {
        const installed = event.installed.filter(({ entity }) => observedActors.includes(entity))
        if (!installed.length) return
        event = { ...event, installed }
      }
      if (
        event.phase.startsWith('action-') &&
        event.entity &&
        !observedActors.includes(event.entity)
      )
        return
      if (
        event.phase === 'run-started' &&
        event.author?.channel === 'auto' &&
        !observedActors.includes(event.author.entity)
      ) {
        ambientRuns.add(event.runId)
      }
      if (ambientRuns.has(event.runId)) {
        if (event.phase === 'run-ended') ambientRuns.delete(event.runId)
        return
      }
      if (!['clock', 'cadence'].includes(event.phase)) return options.append(list, event, limit)
    },
  })
}

/** Record the story actors and successful presentation draws across the three actual visits. */
export function waterMoonPalaceObserverScript() {
  let observer = replaceAnchor(
    installErrandObserver.toString(),
    "['s001', 's002', 's003', 's004', 's005', 's014']",
    JSON.stringify(scenes),
    2,
  )
  observer = replaceAnchor(
    observer,
    'const appendObserved = (value) => append(events, value)',
    'const appendObserved = (value) => append(events, value)\n' +
      'globalThis.__palaceRecovery = (data) => appendObserved({ kind: "party-recovery", ...data })',
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
    installPalaceCausal +
    ')((' +
    causal +
    '), options, ' +
    JSON.stringify(actors) +
    '), ' +
    createEvidenceRecorder +
    ', ' +
    createSnapshotGraph +
    ')'
  )
}

// The story starts with full pools. Observe the actual production host call so
// a completed dialogue and unchanged maxima cannot stand in for restoration.
function observeRecoveryHost(source, file) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const handlers = []
  const visit = (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(ast) === 'increaseHpMp' &&
      ts.isArrowFunction(node.initializer) &&
      ts.isBlock(node.initializer.body)
    ) {
      handlers.push(node.initializer.body)
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(handlers.length, 1, 'palace resource host anchor changed')
  const body = handlers[0]
  const start = body.getStart(ast) + 1
  const end = body.end - 1
  return (
    source.slice(0, start) +
    '\n      const palacePools = () => world.party.map(({ id, hp, maxHP, mp, maxMP }) => ({ id, hp, maxHP, mp, maxMP }));' +
    '\n      const palacePoolsBefore = palacePools();' +
    source.slice(start, end) +
    '  globalThis.__palaceRecovery?.({source:"commit:increaseHpMp",scene:activeScene.scene.id,amount,pools,before:palacePoolsBefore,after:palacePools()});\n    ' +
    source.slice(end)
  )
}

export function waterMoonPalaceTracePlugin() {
  return {
    name: 'isolated-water-moon-palace-trace',
    enforce: 'pre',
    apply: 'serve',
    transform(source, id) {
      const file = ERRAND_TRACE_TARGETS.find(
        (candidate) => candidate.startsWith('packages/reforge/') && id.endsWith(`/${candidate}`),
      )
      if (!file) return null
      let { code } = instrumentErrandTrace(source, file)
      if (file.endsWith('/main.ts')) {
        code = replaceAnchor(
          code,
          "['s001','s002','s003','s004','s005','s014']",
          JSON.stringify(scenes),
        )
        code = replaceAnchor(
          code,
          'for(const e of activeScene.scene.entities) {\n          actors[e.id]=',
          'for(const e of activeScene.scene.entities) {\n          if(!' +
            JSON.stringify(actors) +
            '.includes(e.id)) continue;\n          actors[e.id]=',
        )
        code = observeRecoveryHost(code, file)
      }
      return { code, map: null }
    },
  }
}

const guideRows = [['dlg.1615', 'dlg.1616'], ['dlg.1618'], ['dlg.1620', 'dlg.1621', 'dlg.1622']]
const pelletRows = [
  [1624, 1625],
  [1627, 1628],
  [1630, 1631],
  [1633, 1634],
  [1636, 1637, 1638],
  [1640],
  [1642],
  [1644],
  [1646, 1647, 1648],
  [1650],
  [1652, 1653, 1654],
  [1656],
  [1658, 1659, 1660, 1661],
  [1663, 1664],
  [1666, 1667],
  [1669],
].map((rows) => rows.map((id) => `dlg.${id}`))

function one(rows, label) {
  assert.equal(rows.length, 1, `expected exactly one ${label}`)
  return rows[0]
}

const inside = (row, visit) => row.order > visit.start.order && row.order < visit.end.order
const leaf = (event) => event.occurrence?.command?.command

/** Rebuild the story from actual callers, commands, successful paints, and control receipts. */
export function verifyWaterMoonPalaceReforgeTrace(trace) {
  const { causes, events, pages, resources } = trace
  const draws = causes.filter(({ phase }) => phase === 'dialogue-presentation')
  const byRender = new Map(draws.map((draw) => [draw.renderId, draw]))
  const frames = new Map(resources.map((resource) => [resource.order, resource]))
  const starts = causes.filter(
    ({ phase, author }) => phase === 'run-started' && author?.channel === 'trigger',
  )
  const calls = (scene, entity) =>
    starts.filter(({ author }) => author.scene === scene && author.entity === entity)
  const visit = (start) => {
    const run = causes.filter(({ runId }) => runId === start.runId)
    const end = one(
      run.filter(({ phase }) => phase === 'run-ended'),
      `${start.author.entity} run end`,
    )
    assert.equal(end.resolved, true)
    assert.equal(end.aborted, false)
    return { start, end, run }
  }
  const single = (scene, entity) => visit(one(calls(scene, entity), `${scene}/${entity} trigger`))
  const commands = (story, kind, phase = 'command') =>
    story.run.filter((event) => event.phase === phase && leaf(event)?.kind === kind)
  const heldPages = (story, expected, mode = 'waiting-input') => {
    const shown = pages.filter((page) => page.page && inside(page, story))
    assert.deepEqual(
      shown.map(({ page }) => page.pageTextIds),
      expected,
      `${story.start.author.entity} pages changed`,
    )
    return shown.map(({ page, order }) => {
      assert.equal(page.phase, mode)
      const draw = draws.find(
        (event) =>
          inside(event, story) &&
          event.slots.some(
            (slot) =>
              slot.active &&
              slot.owner.runId === story.start.runId &&
              slot.pageStartedAtMs === page.pageStartedAtMs &&
              slot.visibleText === page.pageText,
          ),
      )
      assert(draw?.renderId, `${story.start.author.entity} page lacks a complete drawn caller`)
      return {
        order,
        drawOrder: draw.order,
        renderId: draw.renderId,
        rows: page.pageTextIds,
        text: page.pageText,
        phase: page.phase,
        slots: draw.slots.map(({ slot, active, speaker, portraitAsset, visibleText }) => ({
          slot,
          active,
          speaker,
          portraitAsset,
          visibleText,
        })),
      }
    })
  }
  const worldDraws = (entity, from, through) =>
    events.filter(
      (row) =>
        row.kind === 'actor-render' &&
        row.id === entity &&
        row.state.drawStatus === 'drawn' &&
        row.throughOrder > from &&
        row.order < through,
    )
  const pixels = (draw) => {
    const frame = frames.get(draw.state.frameResourceId)
    assert(frame?.pixels?.length, `missing actual selected pixels for ${draw.id}`)
    return frame.pixels
  }
  const readyAfter = (story, through) => {
    const control = events.find(
      (row) =>
        row.kind === 'control' &&
        row.sceneVisit === story.start.sceneVisit &&
        row.state === true &&
        row.order > story.end.order &&
        row.order < through,
    )
    assert(control, `${story.start.author.entity} did not return control`)
    // A timed narration can clear during the paint that wakes its caller.
    // The clear and the observed return of control have independent order.
    const inVisit = (draw) =>
      draw.sceneVisit === control.sceneVisit &&
      draw.order > story.start.order &&
      draw.order < through
    const lastVisible = draws.findLast((draw) => inVisit(draw) && draw.slots.length > 0)
    assert(lastVisible, `${story.start.author.entity} has no drawn dialogue`)
    const clear = draws.find(
      (draw) => inVisit(draw) && draw.order > lastVisible.order && draw.slots.length === 0,
    )
    assert(clear?.renderId, `${story.start.author.entity} did not draw a dialogue-free ending`)
    return { order: control.order, atMs: control.atMs, clearDraw: clear.order }
  }
  const issuedRewards = (story) =>
    commands(story, 'giveItem', 'leaf-completed').map((event) => {
      const { itemId, count = 1 } = leaf(event)
      const stored = event.world.inventory.find((item) => item.itemId === itemId)?.count ?? 0
      assert.equal(stored, count, `incorrect post-commit reward ${itemId}`)
      return { order: event.order, itemId, count }
    })

  const outerPortal = single('s016', 'e211')
  const innerPortal = single('s019', 'e268')
  const guide = single('s019', 'e270')
  assert(outerPortal.end.order < guide.start.order && guide.end.order < innerPortal.start.order)
  const portals = [
    [outerPortal, 's019'],
    [innerPortal, 's020'],
  ].map(([story, to]) => {
    const command = one(commands(story, 'loadScene'), `${to} portal command`)
    assert.equal(leaf(command).scene, to)
    return { start: story.start.order, order: command.order, from: story.start.author.scene, to }
  })
  const guidePages = heldPages(guide, guideRows)
  const departure = one(
    events.filter(
      (row) =>
        row.kind === 'actor' &&
        row.id === 'e270' &&
        inside(row, guide) &&
        row.before?.visible &&
        row.state.state === 0 &&
        !row.state.visible,
    ),
    'guide departure',
  )
  const walkDraws = worldDraws('e270', guidePages.at(-1).drawOrder, departure.order).filter(
    ({ state }) => state.position[0] !== 77 || state.position[1] !== 23,
  )
  assert(walkDraws.length >= 2, 'missing guide walking draws')
  for (const draw of walkDraws) pixels(draw)
  const firstWalkDialogue = byRender.get(walkDraws[0].renderId)?.slots ?? null
  const readyGuide = readyAfter(guide, innerPortal.start.order)

  const chestStarts = calls('s020', 'e363')
  assert.deepEqual(
    chestStarts.map(({ stage }) => stage),
    ['initial', 'legacy-002', 'legacy-003', 'legacy-004'],
  )
  assert(innerPortal.end.order < chestStarts[0].order)
  const closed = worldDraws('e363', innerPortal.start.order, chestStarts[0].order).find(
    ({ state }) => state.frame === 0,
  )
  assert(closed, 'missing initially closed chest draw')
  const water = single('s020', 'e362')
  const chestRewards = [{ itemId: '61', count: 3 }, null, { itemId: '179', count: 1 }, null]
  const chest = chestStarts.map((start, index) => {
    const story = visit(start)
    const shown = heldPages(story, [[`dlg.${1891 + index}`]], 'auto-advance')
    assert.equal(shown[0].slots.find(({ active }) => active)?.slot, 'narration')
    const gifts = issuedRewards(story)
    assert.deepEqual(
      gifts.map(({ itemId, count }) => ({ itemId, count })),
      chestRewards[index] ? [chestRewards[index]] : [],
    )
    const openDraws = worldDraws('e363', start.order, story.end.order)
    assert(
      openDraws.length && openDraws.every(({ state }) => state.frame === 1),
      'chest must draw open throughout the interaction',
    )
    const [opened] = openDraws
    assert.notDeepEqual(pixels(opened), pixels(closed), 'lid frames must draw different pixels')
    return {
      start: start.order,
      stage: start.stage,
      end: story.end.order,
      pages: shown,
      gifts,
      opened,
      ready: readyAfter(story, chestStarts[index + 1]?.order ?? water.start.order),
    }
  })

  const waterPages = heldPages(water, [['dlg.1576'], ['dlg.1577', 'dlg.1578.v-717e1675']])
  assert.deepEqual(
    waterPages.map(({ slots }) => slots.find(({ active }) => active)?.slot),
    ['bottom', 'center'],
  )
  const command = one(commands(water, 'increaseHpMp'), 'water resource command')
  const completed = one(
    commands(water, 'increaseHpMp', 'leaf-completed'),
    'water resource completion',
  )
  const recovery = one(
    events.filter(({ kind }) => kind === 'party-recovery'),
    'actual resource host call',
  )
  assert(command.order < recovery.order && recovery.order < completed.order)
  assert.equal(recovery.source, 'commit:increaseHpMp')
  assert.equal(recovery.scene, 's020')
  assert.equal(recovery.amount, 999)
  assert.equal(recovery.pools, 'both')
  assert(recovery.before.length > 0, 'recovery requires a real party')
  assert.deepEqual(
    recovery.after,
    recovery.before.map((role) => ({ ...role, hp: role.maxHP, mp: role.maxMP })),
  )

  const pellet = single('s020', 'e342')
  assert.deepEqual(calls('s020', 'e348'), [], '010 continued into the separate departure story')
  const readyWater = readyAfter(water, pellet.start.order)
  const pelletPages = heldPages(pellet, pelletRows)
  const medicine = issuedRewards(pellet)
  assert.deepEqual(
    medicine.map(({ itemId, count }) => ({ itemId, count })),
    [{ itemId: '273', count: 1 }],
  )
  const gate = one(
    events.filter(
      (row) =>
        row.kind === 'actor' &&
        row.id === 'e348' &&
        inside(row, pellet) &&
        row.before?.state !== 2 &&
        row.state.state === 2,
    ),
    'enabled next story gate',
  )
  const readyPellet = readyAfter(pellet, trace.order + 1)
  assert.deepEqual(draws.at(-1).slots, [], '010 ended with retained dialogue')
  assert.equal(trace.final.scene, 's020')
  assert.deepEqual(trace.final.actors.party.position, [96, 24, 0])
  assert.equal(trace.final.actors.party.facing, 'left')
  assert(
    !events.some(
      (row) =>
        row.order > readyPellet.order &&
        row.kind === 'actor' &&
        row.id === 'party' &&
        (row.state.position[0] !== 96 || row.state.position[1] !== 24),
    ),
    'player moved after the 010 endpoint',
  )

  return {
    portals,
    guide: {
      start: guide.start.order,
      end: guide.end.order,
      pages: guidePages,
      departure,
      walkDraws,
      firstWalkDialogue,
      ready: readyGuide,
    },
    chest: { closed, visits: chest },
    water: {
      start: water.start.order,
      end: water.end.order,
      pages: waterPages,
      commandOrder: command.order,
      recovery,
      ready: readyWater,
    },
    pellet: {
      start: pellet.start.order,
      end: pellet.end.order,
      pages: pelletPages,
      medicine,
      gateOrder: gate.order,
      ready: readyPellet,
    },
  }
}
