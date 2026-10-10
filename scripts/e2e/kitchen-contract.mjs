import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { repoRoot, sha256 } from './browser-journey.mjs'
import { assertInnHandoffPayload, readInnContract } from './inn-contract.mjs'
import { openingFrameMatches } from './opening-frame.mjs'
import { openingSaveView } from './reforge-opening-policy.mjs'

export const KITCHEN_ROWS = Object.freeze([
  56, 57, 58, 145, 146, 148, 149, 150, 152, 153, 155, 156, 126, 127,
])
export const kitchenGrid = (position, engine) =>
  engine === 'game'
    ? [(position[0] / 16 + position[1] / 8) / 2, (position[1] / 8 - position[0] / 16) / 2]
    : position.slice(0, 2)
export const kitchenReady = (s, engine) =>
  engine === 'game'
    ? s.mode === 'explore' && !s.event && !s.dialog && !s.menu && !s.loading && !s.fading
    : !!s.runtime &&
      !s.runtime.scriptRunning &&
      !s.runtime.dialogue &&
      !s.runtime.presentationBusy &&
      !s.runtime.menuActive &&
      !s.runtime.battleActive &&
      s.runtime.fadeBlack === 0 &&
      !s.runtime.ditherActive
export const kitchenScene = (s, engine, scene) =>
  s.scene === (engine === 'game' ? (scene === 's001' ? 2 : 4) : scene)
export const kitchenHandoffReady = (trace) =>
  trace.final?.scene === 's003' &&
  trace.final.control === true &&
  trace.final.persistent.e19?.state === 2 &&
  trace.final.persistent.e56?.state === 0

/** Same persistent projection as the reviewed first-stage readWorld observer. */
function predecessorView(payload, engine) {
  if (engine === 'reforge') return openingSaveView(payload)
  const gs = payload.gs
  for (const key of [
    'party',
    'partyMembers',
    'PlayerRolesRuntime',
    'inventory',
    'rgScene',
    'rgObject',
    'rgEventObject',
    'allEventObjects',
  ])
    assert(gs[key] !== undefined, `missing predecessor world field: ${key}`)
  return JSON.parse(
    JSON.stringify({
      scene: gs.wNumScene,
      party: gs.party,
      members: gs.partyMembers,
      roles: gs.PlayerRolesRuntime,
      cash: gs.dwCash,
      inventory: gs.inventory,
      scenes: gs.rgScene,
      objects: gs.rgObject,
      eventObjects: gs.rgEventObject,
      actors: gs.allEventObjects.map(
        ({
          id,
          x,
          y,
          sState,
          facing,
          triggerLabel,
          triggerResume,
          triggerMode,
          spriteNum,
          autoTriggerOnce,
        }) => ({
          id,
          x,
          y,
          sState,
          facing,
          triggerLabel,
          triggerResume,
          triggerMode,
          spriteNum,
          autoTriggerOnce,
        }),
      ),
    }),
  )
}

export function kitchenArguments(args, both = false) {
  const options = { headless: false }
  for (let i = 0; i < args.length; i++) {
    const key = args[i]
    if (key === '--capture') {
      assert(!both && !options.capture, 'capture requires one single-engine story run')
      options.capture = true
    } else if (['--headless', '--headed'].includes(key)) {
      assert(options.mode === undefined, 'choose one browser mode')
      options.mode = key
      options.headless = key === '--headless'
    } else {
      assert(
        (both ? ['--game-report', '--reforge-report'] : ['--from']).includes(key),
        `unknown argument ${key}`,
      )
      assert(args[i + 1] && !args[i + 1].startsWith('--'), `missing value for ${key}`)
      assert(options[key] === undefined, `duplicate ${key}`)
      options[key] = resolve(args[++i])
    }
  }
  for (const key of both ? ['--game-report', '--reforge-report'] : ['--from'])
    assert(options[key], `required ${key}: genuine passed 002 report`)
  return options
}

/** Distinct 002 admission: no relaxation of the existing 001 -> 002 validator. */
export function validateKitchenPredecessor(report, payload, engine, bytes) {
  assert.notEqual(report.profile, 'capture', 'capture is not a verify predecessor')
  assert.equal(report.status, 'passed', '002 predecessor did not pass')
  assert.equal(report.fragment, '002', 'wrong predecessor fragment')
  assert.equal(report.engine, engine, 'wrong predecessor engine')
  assert.equal(report.name, `${engine}-002`, 'wrong predecessor name')
  assert.equal(report.core?.status, 'passed', '002 core not verified')
  assert.equal(report.route?.status, 'passed', '002 route not verified')
  assert.equal(report.choreography?.status, 'passed', '002 choreography not verified')
  assert.match(report.revision, /^[a-f0-9]{40}$/)
  assert.equal(report.restoredWorldHash, report.endWorldHash, '002 restore not verified')
  assert.match(report.endWorldHash, /^[a-f0-9]{64}$/)
  assert.equal(
    report.checkpoint?.path,
    '002.end.save.json',
    'unexpected predecessor checkpoint path',
  )
  assert.equal(report.checkpoint.sha256, sha256(bytes), '002 predecessor bytes differ')
  assert.deepEqual(payload, JSON.parse(bytes), '002 predecessor payload is not checkpoint bytes')
  assert.equal(
    report.endWorldHash,
    sha256(JSON.stringify(report.endWorld)),
    '002 end world hash differs',
  )
  assert.equal(
    report.restoredWorldHash,
    sha256(JSON.stringify(report.restoredWorld)),
    '002 restored world hash differs',
  )
  assert.deepEqual(
    predecessorView(payload, engine),
    report.endWorld,
    '002 checkpoint differs from actual end world',
  )
  assert.deepEqual(report.restoredWorld, report.endWorld, '002 actual restore differs')
  for (const frame of [report.endFrame, report.restoredFrame]) {
    assert(
      frame && Number.isSafeInteger(frame.width) && Number.isSafeInteger(frame.height),
      'missing 002 actual restore canvas evidence',
    )
    assert.match(frame.sha256, /^[a-f0-9]{64}$/)
    assert(Number.isSafeInteger(frame.nonBlack) && frame.nonBlack <= frame.width * frame.height)
    assert(openingFrameMatches(frame), '002 actual canvas was black or invalid')
  }
  assert(
    openingFrameMatches(report.restoredFrame, report.endFrame),
    '002 actual restored canvas differs',
  )
  if (engine === 'game') {
    assert.equal(payload.format, 'type-pal-save')
    const gs = payload.gs
    assert.equal(gs.wNumScene, 4)
    assert.equal(gs.dwCash, 500)
    assert.deepEqual(gs.partyMembers, [0])
    for (const id of [59, 60, 61])
      assert.equal(gs.allEventObjects.find((e) => e.id === id)?.sState, 0)
    for (const id of [24, 25, 26])
      assert.equal(gs.allEventObjects.find((e) => e.id === id)?.sState, 2)
    assert.equal(
      gs.allEventObjects.find((e) => e.id === 19)?.sState,
      0,
      'kitchen aunt prematurely active',
    )
    assert.equal(gs.allEventObjects.find((e) => e.id === 20)?.sState, 0, 'food prematurely active')
    assert.equal(gs.PlayerRolesRuntime.rgwSpriteNum[0], 2)
  } else {
    assert.equal(payload.version, 12)
    assert.equal(payload.contentVersion, 22)
    assert.equal(payload.projectId, 'pal')
    assert.equal(payload.position.sceneId, 's003')
    assert.equal(payload.world.money, 500)
    assert.deepEqual(
      payload.world.party.map((a) => a.id),
      ['li-xiaoyao'],
    )
    for (const id of ['e59', 'e60', 'e61'])
      assert.equal(payload.world.script.entityState.s003[id], 0)
    for (const id of ['e24', 'e25', 'e26'])
      assert.equal(payload.world.script.entityState.s001[id], 2)
    assert.equal(payload.world.script.entityState.s001.e19 ?? 0, 0)
    assert.equal(payload.world.script.entityState.s001.e20 ?? 0, 0)
  }
  assertInnHandoffPayload(payload, engine)
  return {
    revision: report.revision,
    sha256: report.checkpoint.sha256,
    source: report.checkpoint.source,
  }
}

export async function readKitchenPredecessor(path, engine) {
  const report = JSON.parse(await readFile(path, 'utf8'))
  const bytes = await readFile(resolve(dirname(path), '002.end.save.json'), 'utf8'),
    payload = JSON.parse(bytes)
  return {
    path,
    bytes,
    payload,
    report,
    ...validateKitchenPredecessor(report, payload, engine, bytes),
  }
}

export async function readKitchenContract(root = repoRoot) {
  const inn = await readInnContract(root)
  const files = [
    'scripts/e2e/kitchen-contract.mjs',
    'scripts/e2e/kitchen-observer.mjs',
    'scripts/e2e/kitchen-trace-plugin.mjs',
    'scripts/e2e/kitchen-journey.mjs',
    'scripts/e2e/kitchen-input-plan.mjs',
    'scripts/e2e/kitchen-game.mjs',
    'scripts/e2e/kitchen-reforge.mjs',
    'scripts/e2e/kitchen-both.mjs',
    'scripts/e2e/kitchen-timing-intent.mjs',
    'scripts/e2e/kitchen-presentation-intent.mjs',
    'scripts/e2e/inn-timing-intent.mjs',
    'scripts/e2e/inn-presentation-intent.mjs',
    'scripts/e2e/opening-hold-intent.mjs',
    'scripts/e2e/script-terminal-intent.mjs',
    'scripts/e2e/npc-transition-contract.mjs',
    'scripts/e2e/npc-story-scope.mjs',
    'scripts/e2e/opening-causal-instrumentation.mjs',
    'scripts/e2e/script-causal-observer.mjs',
    'scripts/e2e/kitchen-game.config.mts',
    'scripts/e2e/kitchen-reforge.config.mts',
    'package.json',
    'packages/reforge/src/runtime-frame-session.ts',
    'packages/reforge/src/sprite-anim.ts',
    'packages/game/src/core/mode.ts',
    'packages/game/src/core/scene-system-search.ts',
    'packages/game/src/shell/main-loop.ts',
    'packages/shared/src/index.ts',
  ]
  const hashes = { ...inn.hashes }
  for (const f of files) hashes[f] = sha256(await readFile(resolve(root, f)))
  const original = JSON.parse(
    await readFile(resolve(root, 'data/extracted/events/all.json'), 'utf8'),
  ).segments[0].commands
  const rows = [],
    speakers = new Map()
  for (const [start, end] of [
    [355, 370],
    [604, 626],
    [560, 565],
  ]) {
    let speaker
    for (const c of original.slice(start, end))
      if (c.op === 'showDialog') {
        if (c.text.endsWith('∶')) speaker = c.text.slice(0, -1)
        else if (KITCHEN_ROWS.includes(c.messageIndex)) {
          assert.equal(inn.locale[`dlg.${c.messageIndex}`], c.text)
          rows.push({ id: `dlg.${c.messageIndex}`, text: c.text, speaker })
          speakers.set(c.messageIndex, speaker)
        }
      }
  }
  assert.deepEqual(
    rows.map((r) => Number(r.id.slice(4))),
    KITCHEN_ROWS,
  )
  assert.deepEqual(original[563].operands, [21, 583, 0], 'kitchen end handoff source changed')
  assert.deepEqual(original[619].operands, [20, 560, 0])
  assert.deepEqual(original[620].operands, [21, 1, 0])
  const scenes = Object.fromEntries(
    await Promise.all(
      ['s001', 's003'].map(async (id) => [
        id,
        JSON.parse(await readFile(resolve(root, `projects/pal/content/scenes/${id}.json`), 'utf8')),
      ]),
    ),
  )
  return { hashes, rows, locale: inn.locale, scenes }
}

const normalize = (text) => text.replace(/\s/g, '').replace(/[∶：:]$/u, '')
export function assertKitchenDialogue(trace, engine, contract, complete = true) {
  const shown = new Map()
  let previousLines = [],
    previousInstance = null,
    maxRow = -1
  for (const event of trace.pages) {
    assert.equal(event.engine, engine)
    const page = event.page
    if (!page) {
      previousLines = []
      previousInstance = null
      continue
    }
    const instance =
      engine === 'game'
        ? page.instance
        : JSON.stringify([page.dialogueId, page.cueIndex, page.pageIndex, page.pageStartedAtMs])
    if (engine === 'game')
      assert(Number.isSafeInteger(instance), 'missing game rendered page instance')
    else {
      assert(typeof page.dialogueId === 'string')
      assert(Number.isFinite(page.pageStartedAtMs))
      assert(Number.isInteger(page.cueIndex) && Number.isInteger(page.pageIndex))
    }
    if (instance !== previousInstance) previousLines = []
    const lines = engine === 'game' ? page.lines : page.pageText.split('\n')
    const speakerId = engine === 'game' ? page.title : page.speaker
    const speaker = contract.locale[speakerId] ?? speakerId ?? ''
    const rows = lines.map((line) => {
      const row = contract.rows.find((r) => normalize(r.text) === normalize(line))
      assert(row, `unexpected displayed 003 line: ${line}`)
      return row
    })
    const ids = rows.map((r) => r.id)
    assert.equal(new Set(ids).size, ids.length, 'duplicate rendered line')
    if (shown.has(ids[0]))
      assert.deepEqual(
        ids.slice(0, previousLines.length),
        previousLines,
        'rendered page rolled back',
      )
    for (const row of rows) {
      assert.equal(normalize(speaker), normalize(row.speaker), `wrong speaker for ${row.id}`)
      const index = contract.rows.indexOf(row)
      assert(index > maxRow || previousLines.includes(row.id), 'replayed rendered cue')
      if (!shown.has(row.id)) {
        assert.equal(index, maxRow + 1, 'missing/reordered rendered row')
        shown.set(row.id, event.order)
        maxRow = index
      }
    }
    previousLines = ids
    previousInstance = instance
  }
  if (complete)
    assert.deepEqual(
      [...shown.keys()],
      contract.rows.map((r) => r.id),
      'missing fully rendered 003 dialogue',
    )
  return shown
}

function commandsOf(flow) {
  const result = []
  const walk = (v) => {
    if (!v || typeof v !== 'object') return
    if (v.kind && v.kind !== 'dialog' && v.cue === undefined) result.push(v)
    for (const c of Object.values(v))
      if (Array.isArray(c)) c.forEach(walk)
      else if (typeof c === 'object') walk(c)
  }
  walk(flow)
  return result
}
export function selectedKitchenFlow(payload, contract, scene, id) {
  const value = payload.world.script.behaviors?.entities?.[scene]?.[id]?.trigger?.selection
  assert.equal(value?.kind, 'use', `missing explicit ${scene}/${id} trigger selection`)
  const flow = contract.scenes[scene].entities.find((e) => e.id === id)?.behaviors?.trigger?.[
    value.value
  ]?.flow
  assert(flow, `selected ${scene}/${id} flow is missing`)
  return flow
}
function flowRows(flow) {
  const rows = []
  const walk = (v) => {
    if (!v || typeof v !== 'object') return
    if (v.kind === 'dialog') rows.push(...v.cue.rows.map((r) => r.text))
    for (const c of Object.values(v))
      if (Array.isArray(c)) c.forEach(walk)
      else if (typeof c === 'object') walk(c)
  }
  walk(flow)
  return rows
}
export function assertKitchenEndPayload(payload, engine, predecessor, contract) {
  if (engine !== 'game') {
    assert.equal(payload.version, 12)
    assert.equal(payload.contentVersion, 22)
  }
  return assertKitchenStoryEnd(payload, engine, predecessor, contract)
}

export function assertKitchenStoryEnd(payload, engine, predecessor, contract) {
  if (engine === 'game') {
    const gs = payload.gs,
      actors = gs.allEventObjects
    const get = (id) => {
      const actor = actors.find((e) => e.id === id)
      assert(actor)
      return actor
    }
    assert.equal(gs.wNumScene, 2)
    assert.equal(gs.dwCash, 500)
    assert.deepEqual(gs.inventory, predecessor.gs.inventory, 'food was taken or inventory changed')
    assert.equal(gs.PlayerRolesRuntime.rgwSpriteNum[0], 2, 'carrying-food sprite active')
    assert.equal(get(56).sState, 0)
    assert.equal(get(19).sState, 2)
    assert.equal(get(20).sState, 1)
    assert.equal(get(19).triggerLabel, 'L_560')
    assert.equal(get(20).triggerLabel, 'L_583')
    assert.equal(get(62).triggerLabel, 'L_604')
    assert.equal(get(62).triggerResume?.ip, 626)
    for (const id of [59, 60, 61]) assert.equal(get(id).sState, 0)
    for (const id of [24, 25, 26]) assert.equal(get(id).sState, 2)
  } else {
    assert.equal(payload.position.sceneId, 's001')
    const world = payload.world
    assert.equal(world.money, 500)
    assert.deepEqual(world.script.flags, predecessor.world.script.flags, '003 changed story flags')
    assert.deepEqual(
      world.script.vars,
      predecessor.world.script.vars,
      '003 changed story variables',
    )
    assert.deepEqual(
      world.inventory,
      predecessor.world.inventory,
      'food was taken or inventory changed',
    )
    assert.deepEqual(
      JSON.parse(JSON.stringify(world.party)),
      predecessor.world.party,
      '003 changed persistent party before pickup',
    )
    assert.notEqual(world.party[0].appearance?.spriteId, 'sprite-208', 'food already carried')
    assert.equal(world.script.entityState.s003.e56, 0)
    assert.equal(world.script.entityState.s001.e19, 2)
    assert.equal(world.script.entityState.s001.e20, 1)
    assert.deepEqual(flowRows(selectedKitchenFlow(payload, contract, 's001', 'e19')), [
      'dlg.126',
      'dlg.127',
    ])
    const ready = selectedKitchenFlow(payload, contract, 's001', 'e20'),
      commands = commandsOf(ready)
    assert(
      flowRows(ready).includes('dlg.141') && flowRows(ready).includes('dlg.142'),
      'fake carry-ready placeholder',
    )
    assert(
      commands.some(
        (c) =>
          c.kind === 'setActorAppearance' &&
          c.actor === 'li-xiaoyao' &&
          c.spriteId === 'sprite-208',
      ),
      'carry-ready body missing persistent pickup',
    )
    assert(
      commands.some(
        (c) =>
          c.kind === 'setEntityState' &&
          c.target.scene === 's001' &&
          c.target.entity === 'e20' &&
          c.state === 0,
      ),
    )
    assert.equal(
      world.script.behaviors.entities.s001.e20.trigger.cursor,
      undefined,
      'food ready behavior already activated',
    )
    for (const id of ['e59', 'e60', 'e61']) assert.equal(world.script.entityState.s003[id], 0)
    for (const id of ['e24', 'e25', 'e26']) assert.equal(world.script.entityState.s001[id], 2)
  }
}

export function kitchenEndPresented(trace) {
  const f = trace.final
  const p = trace.presented
  return (
    f?.scene === 's001' &&
    f.control === true &&
    f.money === 500 &&
    f.actors.e19?.visible === true &&
    f.actors.e20?.visible === true &&
    f.persistent.e56?.state === 0 &&
    p?.scene === 's001' &&
    p.control === true &&
    f.actors.e19?.facing === 'up' &&
    p.actors.e19?.facing === 'up' &&
    p.renderEvidence?.actors?.e19?.frame === 6
  )
}

export function assertKitchenTrace(trace, engine, contract, stairs) {
  assert.equal(trace.overflow, false, 'kitchen collector overflow')
  assert.deepEqual(trace.errors, [], 'kitchen collector error')
  assert(Array.isArray(trace.worldRenders), 'missing current world render observations')
  assert(Array.isArray(trace.causes), 'missing current causal observations')
  const lists = [
    trace.events,
    trace.pages,
    trace.frames,
    trace.worldRenders,
    trace.causes,
    trace.restoreCommits ?? [],
    trace.resources ?? [],
  ]
  const timeline = lists.flat().sort((a, b) => a.order - b.order)
  for (const list of lists)
    list.forEach((e, i) => {
      assert.equal(e.seq, i, 'kitchen sequence gap')
    })
  timeline.forEach((e, i) => {
    assert.equal(e.order, i, 'kitchen global order gap')
    assert(Number.isFinite(e.atMs) && (!i || e.atMs >= timeline[i - 1].atMs))
  })
  const prior = new Map()
  for (const e of trace.events)
    if (e.kind === 'actor') {
      const key = `${e.sceneVisit}/${e.scene}/${e.id}`
      assert.deepEqual(e.before, prior.get(key) ?? null, 'lost kitchen actor continuity')
      prior.set(key, e.state)
    }
  const shown = assertKitchenDialogue(trace, engine, contract)
  assert(
    trace.events.filter((e) => e.kind === 'progress').every((e) => e.state.money === 500),
    '003 changed reward money',
  )
  const movements = trace.events.filter(
    (e) =>
      e.kind === 'actor' &&
      e.id === 'party' &&
      e.source === (engine === 'game' ? 'commit:applyRawOpcode' : 'commit:nudgeParty') &&
      e.order > stairs.startOrder &&
      e.order <= stairs.endOrder &&
      e.before &&
      JSON.stringify(e.before.position) !== JSON.stringify(e.state.position),
  )
  assert.equal(movements.length, 12, 'stairs must commit all twelve authored fragments')
  const drawnIndices = new Set()
  movements.forEach((e, i) => {
    assert(e.source.startsWith('commit:'), 'stairs movement lacks actual commit')
    const a = kitchenGrid(e.before.position, engine),
      b = kitchenGrid(e.state.position, engine)
    const dx = 16 * (b[0] - b[1] - (a[0] - a[1])),
      dy = 8 * (b[0] + b[1] - (a[0] + a[1]))
    assert.deepEqual([dx, dy], i % 2 ? [6, 6] : [10, 10], 'stairs fragment/path changed')
    const frame = trace.frames.find(
      (f) =>
        f.order > e.order &&
        f.order < (movements[i + 1]?.order ?? stairs.endOrder) &&
        JSON.stringify(f.frame.position) === JSON.stringify(e.state.position),
    )
    assert(frame, 'authored stair fragment never drawn')
    assert.equal(frame.frame.facing, 'right')
    assert.equal(frame.frame.walking, true, 'stairs slid in standing pose')
    assert.equal(e.state.walking, true, 'committed stair fragment is not walking')
    assert.equal(
      frame.frame.stepFrame,
      e.state.stepFrame,
      'drawn stair phase differs from committed movement state',
    )
    if (i)
      assert.equal(
        e.state.stepFrame,
        (movements[i - 1].state.stepFrame + 1) % 4,
        'committed stair phases did not rotate modulo four',
      )
    assert.equal(frame.frame.layer, 0)
    assert.equal(frame.frame.sprite, engine === 'game' ? 2 : 'li-xiaoyao', 'wrong stair sprite')
    assert(
      Number.isInteger(frame.frame.stepFrame) &&
        frame.frame.stepFrame >= 0 &&
        frame.frame.stepFrame <= 3,
    )
    assert.equal(
      frame.frame.frameIndex,
      9 + [0, 1, 0, 2][frame.frame.stepFrame],
      'actual drawn stair frame is not the walking cycle',
    )
    drawnIndices.add(frame.frame.frameIndex)
    assert(
      frame.frame.frame.width > 0 && frame.frame.frame.height > 0,
      'actual stair frame missing',
    )
  })
  assert(drawnIndices.size >= 3, 'stairs did not present all three walking frames')
  assert(
    trace.frames.every((f) => ![208, 'sprite-208'].includes(f.frame.sprite)),
    '004 food sprite entered 003',
  )
  assert(kitchenEndPresented(trace), 'kitchen end presentation not complete')
  const progress = trace.events.filter((e) => e.kind === 'progress')
  const visibleFood = progress.find((e) => e.state.persistent.e20?.state === 1)
  assert(
    visibleFood &&
      shown.get('dlg.153') < visibleFood.order &&
      visibleFood.order < shown.get('dlg.155'),
    'food enable not between refusal and last plea',
  )
  const aunt = trace.events.filter(
    // Restoring the genuine 002 checkpoint can place the actor after the template was observed.
    // Keep those events in the global continuity oracle, but start story ordering at admission.
    (e) =>
      e.kind === 'actor' && e.scene === 's003' && e.id === 'e56' && e.order > stairs.startOrder,
  )
  const auntMoves = aunt.filter(
    (e) => e.before && JSON.stringify(e.before.position) !== JSON.stringify(e.state.position),
  )
  assert(
    auntMoves.length > 0 && auntMoves[0].order > shown.get('dlg.58'),
    'aunt moved before finishing initial instruction',
  )
  let endpointOrder = shown.get('dlg.58')
  for (const endpoint of [
    [129, 66],
    [129, 61],
    [124, 61],
  ]) {
    const reached = auntMoves.find(
      (e) =>
        e.order > endpointOrder &&
        JSON.stringify(kitchenGrid(e.state.position, engine)) === JSON.stringify(endpoint),
    )
    assert(reached?.source.startsWith('commit:'), 'aunt kitchen route endpoint lacks actual commit')
    endpointOrder = reached.order
  }
  const hiddenAunt = aunt.find((e) => e.state.visible === false)
  const kitchenAunt = progress.find((e) => e.state.persistent.e19?.state === 2)
  assert(
    hiddenAunt && hiddenAunt.order > endpointOrder,
    'aunt hidden before real kitchen route finished',
  )
  assert(
    kitchenAunt && kitchenAunt.order < hiddenAunt.order,
    'kitchen aunt not activated before hall aunt hidden',
  )
  return {
    status: 'passed',
    rows: [...shown.keys()],
    stairs: movements.map((e) => e.order),
    stairsTiming: {
      firstCommitMs: movements[0].atMs,
      lastCommitMs: movements.at(-1).atMs,
      firstToLastCommitMs: movements.at(-1).atMs - movements[0].atMs,
      intervalsMs: movements.slice(1).map((e, i) => e.atMs - movements[i].atMs),
    },
    sourceHashes: contract.hashes,
  }
}
