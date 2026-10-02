import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { repoRoot, sha256 } from './browser-journey.mjs'
import { readKitchenContract } from './kitchen-contract.mjs'
import { openingFrameMatches } from './opening-frame.mjs'
import { openingSaveView } from './reforge-opening-policy.mjs'

export const MEAL_ROWS = Object.freeze([
  141, 142, 95, 96, 98, 99, 101, 102, 103, 104, 106, 107, 109, 111, 112, 172, 173, 175, 176, 178,
  180, 182, 183, 185, 187, 188, 190, 192, 193, 195, 197, 198, 199, 201, 202, 203, 204, 205, 207,
  209,
])
export function mealInventoryCount(inventory, engine, id = '272') {
  assert(['game', 'reforge'].includes(engine), 'unknown inventory engine')
  assert(Array.isArray(inventory), 'inventory must use current array entries')
  const entry = inventory.find((entry) => String(entry.itemId) === id)
  if (!entry) return 0
  assert(Number.isInteger(entry.count) && entry.count >= 0, 'invalid current inventory count')
  return entry.count
}

/** A scene entry can already be in proximity. Enter the actual zone with ordinary held input. */
export const mealServingDestination = (col, row) => col === 108 && row === 29

/** Hash the exact bytes written, not a second serialization with different indentation. */
export function mealTraceArtifact(trace) {
  const bytes = JSON.stringify(trace, null, 2)
  return { bytes, sha256: sha256(bytes) }
}
const normalize = (text) =>
  String(text ?? '')
    .replace(/<\/?[a-z]+>/gu, '')
    .replace(/"/gu, '')
    .replace(/\($/u, '')
    .replace(/\s/g, '')
    .replace(/[∶：:]$/u, '')

export function mealArguments(args, both = false) {
  const options = { headless: false, baseline: false }
  for (let i = 0; i < args.length; i++) {
    const key = args[i]
    if (['--headless', '--headed'].includes(key)) {
      assert(options.mode === undefined, 'choose one browser mode')
      options.mode = key
      options.headless = key === '--headless'
    } else if (key === '--expect-stationary-no-gift') {
      assert(!both && !options.baseline, 'baseline control is single-engine only')
      options.baseline = true
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
    assert(options[key], `required ${key}: genuine 003 report`)
  return options
}

/** Same reviewed persistent game projection as readWorld, not transient animation clocks. */
export function mealSaveView(payload, engine) {
  if (engine === 'reforge') return openingSaveView(payload)
  assert.equal(payload.format, 'type-pal-save')
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
    assert(gs[key] !== undefined, `missing game save ${key}`)
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

export function validateMealPredecessor(report, payload, engine, bytes) {
  assert.equal(report.status, 'passed', '003 predecessor failed')
  assert.equal(report.fragment, '003')
  assert.equal(report.engine, engine)
  assert.equal(report.name, `${engine}-003`)
  assert.equal(report.core?.status, 'passed')
  assert.equal(report.route?.status, 'passed')
  assert.equal(report.sourceHashesStable, true, '003 sources did not freeze')
  assert.match(report.revision, /^[a-f0-9]{40}$/)
  assert.equal(report.checkpoint?.path, '003.end.save.json')
  assert.equal(report.checkpoint.sha256, sha256(bytes), '003 bytes differ')
  assert.deepEqual(payload, JSON.parse(bytes), '003 payload differs')
  assert.deepEqual(
    mealSaveView(payload, engine),
    report.endWorld,
    '003 actual end differs from bytes',
  )
  assert.equal(sha256(JSON.stringify(report.endWorld)), report.endWorldHash)
  assert.equal(sha256(JSON.stringify(report.restoredWorld)), report.restoredWorldHash)
  assert.equal(report.endWorldHash, report.restoredWorldHash, '003 restore not equal')
  assert.deepEqual(report.endWorld, report.restoredWorld)
  for (const f of [report.endFrame, report.restoredFrame])
    assert(openingFrameMatches(f), '003 canvas invalid')
  assert(
    openingFrameMatches(report.restoredFrame, report.endFrame),
    '003 actual restore canvas differs',
  )
  if (engine === 'game') {
    const gs = payload.gs,
      get = (id) => gs.allEventObjects.find((e) => e.id === id)
    assert.equal(gs.wNumScene, 2)
    assert.equal(gs.dwCash, 500)
    assert.deepEqual(gs.partyMembers, [0])
    assert.equal(gs.PlayerRolesRuntime.rgwSpriteNum[0], 2, 'food already carried')
    assert.equal(get(19)?.sState, 2)
    assert.equal(get(20)?.sState, 1)
    assert.equal(get(20)?.triggerLabel, 'L_583')
    assert.equal(get(62)?.sState, 2)
    assert.equal(mealInventoryCount(gs.inventory, engine), 0, 'wine already owned')
  } else {
    assert.equal(payload.position.sceneId, 's001')
    assert.equal(payload.world.money, 500)
    assert.equal(payload.world.script.entityState.s001.e19, 2)
    assert.equal(payload.world.script.entityState.s001.e20, 1)
    assert.equal(
      payload.world.script.behaviors.entities.s001.e20.trigger.selection.value,
      'take-dishes',
    )
    assert.equal(
      payload.world.script.behaviors.entities.s001.e20.trigger.cursor,
      undefined,
      'food already activated',
    )
    assert.notEqual(payload.world.party[0].appearance?.spriteId, 'sprite-208')
    assert.equal(mealInventoryCount(payload.world.inventory, engine), 0)
  }
  return {
    path: report.checkpoint.path,
    sha256: report.checkpoint.sha256,
    revision: report.revision,
    source: report.checkpoint.source,
  }
}

export async function readMealPredecessor(path, engine) {
  const report = JSON.parse(await readFile(path, 'utf8')),
    bytes = await readFile(resolve(dirname(path), '003.end.save.json'), 'utf8'),
    payload = JSON.parse(bytes)
  return {
    path,
    report,
    bytes,
    payload,
    ...validateMealPredecessor(report, payload, engine, bytes),
    reportPath: path,
  }
}

export function mealAuthorTextIds(scenes, item) {
  const textIds = new Map()
  const walk = (v, visit) => {
    if (!v || typeof v !== 'object') return
    visit(v)
    for (const child of Object.values(v)) {
      if (typeof child !== 'object') continue
      if (Array.isArray(child)) {
        for (const value of child) walk(value, visit)
      } else walk(child, visit)
    }
  }
  const recordDialog = (v) => {
    if (v.kind === 'dialog')
      for (const row of v.cue.rows) {
        const m = /^dlg\.(\d+)/.exec(row.text)
        if (m && MEAL_ROWS.includes(Number(m[1]))) textIds.set(Number(m[1]), row.text)
      }
  }
  walk(item.use, (command) => {
    if (command.kind === 'dialog')
      assert(
        command.cue.rows.every((row) => /^dlg\.12538(?:\.|$)/u.test(row.text)),
        'wine private script may only contain its unavailable-use guard dialogue12538',
      )
    assert(
      command.kind !== 'loseItem' || command.itemId !== '272',
      'wine private script must not duplicate the NPC wine consumption',
    )
  })
  walk(
    scenes.s001.entities.find((e) => e.id === 'e20').behaviors.trigger['take-dishes'].flow,
    recordDialog,
  )
  walk(
    scenes.s001.entities.find((e) => e.id === 'e15').behaviors.trigger.default.flow,
    recordDialog,
  )
  // Gift ownership is an authoring contract, not a fallback. Even the stationary baseline
  // keeps the unique full body on e62; its deficient select-only transfer is tested at runtime.
  const gift = scenes.s003.entities.find((e) => e.id === 'e62')?.behaviors?.trigger?.[
    'c8-321c0a7d7de1'
  ]?.flow
  assert(gift, 'NPC e62 gift body is missing')
  const giftRows = []
  let consumption = 0
  walk(gift, (command) => {
    recordDialog(command)
    if (command.kind === 'dialog')
      for (const row of command.cue.rows) {
        const match = /^dlg\.(\d+)/u.exec(row.text)
        assert(match, 'NPC gift dialogue is not a current source row')
        giftRows.push(Number(match[1]))
      }
    if (command.kind === 'loseItem' && command.itemId === '272') consumption++
  })
  assert.deepEqual(giftRows, MEAL_ROWS.slice(15), 'NPC e62 gift body is incomplete or duplicated')
  assert.equal(consumption, 1, 'NPC e62 gift body must own the unique wine consumption')
  for (const id of MEAL_ROWS) assert(textIds.has(id), `current 004 row missing ${id}`)
  return textIds
}

export async function readMealContract(root = repoRoot) {
  const kitchen = await readKitchenContract(root),
    hashes = { ...kitchen.hashes }
  const files = [
    'meal-journey.mjs',
    'meal-contract.mjs',
    'meal-observer.mjs',
    'meal-trace-plugin.mjs',
    'meal-menu.mjs',
    'meal-game.mjs',
    'meal-reforge.mjs',
    'meal-both.mjs',
    'meal-game.config.mts',
    'meal-reforge.config.mts',
  ].map((f) => `scripts/e2e/${f}`)
  files.push(
    'projects/pal/content/items.json',
    'projects/pal/content/shared-scripts.json',
    'projects/pal/content/scenes/index.json',
    'packages/reforge/src/menu/menu-session.ts',
    'packages/reforge/src/menu/item-use-session.ts',
    'packages/reforge/src/item-use-executor.ts',
    'packages/reforge/src/use-menu-state.ts',
    'packages/reforge/src/menu-state.ts',
    'packages/reforge/src/menu/use-box.ts',
    'packages/reforge/src/script-compiler-core.ts',
    'packages/reforge/src/runtime-script-compiler.ts',
    'packages/reforge/src/runtime-script-runner.ts',
    'packages/reforge/src/script-activity-lineage.ts',
    'packages/reforge/src/script-host-adapter.ts',
    'packages/reforge/src/active-scene.ts',
    'packages/content/src/command-validation-options.ts',
    'packages/content/src/runtime-script.ts',
    'packages/content/src/author-script.ts',
    'packages/game/src/core/menu/menu-driver.ts',
    'packages/game/src/core/save/api.ts',
    'packages/game/src/core/save/indexed-db.ts',
    'packages/game/src/core/menu/inventory-menu.ts',
    'packages/game/src/core/menu/inventory-action-menu.ts',
    'packages/game/src/core/menu/in-game-menu.ts',
    'packages/game/src/present/menu/draw-menu.ts',
  )
  const index = JSON.parse(
    await readFile(resolve(root, 'projects/pal/content/scenes/index.json'), 'utf8'),
  )
  files.push(...index.scenes.map((s) => `projects/pal/${s.path}`))
  for (const file of files) hashes[file] = sha256(await readFile(resolve(root, file)))
  const all = JSON.parse(
      await readFile(resolve(root, 'data/extracted/events/all.json'), 'utf8'),
    ).segments.flatMap((s) => s.commands),
    rows = []
  for (const [start, end] of [
    [583, 598],
    [469, 541],
    [650, 734],
  ]) {
    let speaker = null
    for (const c of all.slice(start, end)) {
      if (c.op.startsWith('setDialogStyle')) speaker = null
      if (c.op !== 'showDialog') continue
      if (c.text.endsWith('∶')) speaker = c.text.slice(0, -1)
      else if (MEAL_ROWS.includes(c.messageIndex))
        rows.push({ id: `dlg.${c.messageIndex}`, text: c.text, speaker })
    }
  }
  assert.deepEqual(
    rows.map((r) => Number(r.id.slice(4))),
    MEAL_ROWS,
    'original 004 dialogue closure changed',
  )
  const item = JSON.parse(
    await readFile(resolve(root, 'projects/pal/content/items.json'), 'utf8'),
  ).find((i) => i.id === '272')
  assert(
    item?.use?.target === 'scene' &&
      item.use.consuming === false &&
      item.use.menuAfterUse === 'close',
    'wine item-use contract changed',
  )
  const textIds = mealAuthorTextIds(kitchen.scenes, item)
  for (const row of rows) {
    const id = Number(row.id.slice(4)),
      key = textIds.get(id)
    assert(key, `current 004 row missing ${id}`)
    row.text = kitchen.locale[key]
    assert(typeof row.text === 'string', `current locale missing ${key}`)
  }
  return {
    hashes,
    rows,
    locale: kitchen.locale,
    scenes: kitchen.scenes,
    item,
    sourceRows: MEAL_ROWS,
  }
}

/** Exact, ordered rendered cue closure. Same cue may grow lines; replayed cue instances fail. */
export function assertMealDialogue(trace, engine, contract, complete = true) {
  const seen = new Map()
  let previousInstance = null,
    previous = [],
    index = -1
  for (const e of trace.pages) {
    assert.equal(e.engine, engine)
    const p = e.page
    if (!p) {
      previousInstance = null
      previous = []
      continue
    }
    const instance =
      engine === 'game'
        ? p.instance
        : JSON.stringify([p.dialogueId, p.cueIndex, p.pageIndex, p.pageStartedAtMs])
    assert(instance !== undefined && instance !== null, 'missing rendered cue identity')
    if (instance !== previousInstance) previous = []
    const lines = engine === 'game' ? p.lines : p.pageText.split('\n'),
      speaker = engine === 'game' ? p.title : (contract.locale[p.speaker] ?? p.speaker)
    const rows = lines.map((text) => {
      const r = contract.rows.find((r) => normalize(r.text) === normalize(text))
      assert(r, `unexpected rendered 004 line ${text}`)
      return r
    })
    for (const row of rows) {
      assert.equal(normalize(speaker), normalize(row.speaker), `wrong speaker ${row.id}`)
      const n = contract.rows.indexOf(row)
      if (seen.has(row.id)) assert(previous.includes(row.id), 'replayed 004 cue')
      else {
        assert.equal(n, index + 1, 'missing/reordered 004 cue')
        seen.set(row.id, e.order)
        index = n
      }
    }
    previous = rows.map((r) => r.id)
    previousInstance = instance
  }
  if (complete)
    assert.deepEqual(
      [...seen.keys()],
      contract.rows.map((r) => r.id),
      'incomplete 004 dialogue',
    )
  return seen
}

export function assertMealCollector(trace) {
  assert.equal(trace.overflow, false, 'meal collector overflow')
  assert.deepEqual(trace.errors, [], 'meal observer error')
  const all = [
    ...trace.events,
    ...trace.pages,
    ...trace.frames,
    ...trace.menus,
    ...trace.dispatches,
    ...trace.saveCaptures,
    ...trace.saveCompletions,
  ].sort((a, b) => a.order - b.order)
  for (const list of [
    trace.events,
    trace.pages,
    trace.frames,
    trace.menus,
    trace.dispatches,
    trace.saveCaptures,
    trace.saveCompletions,
  ])
    list.forEach((e, i) => {
      assert.equal(e.seq, i, 'meal sequence gap')
    })
  all.forEach((e, i) => {
    assert.equal(e.order, i, 'meal order gap')
    assert(Number.isFinite(e.atMs) && (!i || e.atMs >= all[i - 1].atMs))
  })
  const prior = new Map()
  for (const e of trace.events)
    if (e.kind === 'actor') {
      const key = e.id === 'party' ? 'party' : `${e.scene}/${e.id}`
      assert.deepEqual(e.before, prior.get(key) ?? null, 'lost meal actor continuity')
      prior.set(key, e.state)
    }
}

export function assertMealGameSaveInput(trace, beforeCount, beforeCompletions, arm, payload) {
  assertMealCollector(trace)
  const captured = trace.saveCaptures.slice(beforeCount),
    completed = trace.saveCompletions.slice(beforeCompletions)
  assert.equal(captured.length, 1, 'F5 did not produce exactly one new save input capture')
  assert.equal(completed.length, 1, 'F5 did not produce exactly one completed save write')
  assert.equal(captured[0].source, 'before:Save.saveSlot:deepClone')
  assert.equal(completed[0].source, 'commit:Save.saveSlot')
  assert.equal(captured[0].slot, arm.slot)
  assert.deepEqual(captured[0].arm, arm, 'save input belongs to staging or another phase')
  assert.equal(completed[0].captureSeq, captured[0].seq)
  assert.equal(completed[0].slot, arm.slot)
  assert.deepEqual(completed[0].arm, arm)
  assert(completed[0].order > captured[0].order, 'save completion preceded its input')
  assert.deepEqual(
    mealSaveView(payload, 'game'),
    captured[0].world,
    'actual saved payload differs from synchronous save input',
  )
  return captured[0]
}

/** Story dependencies from real commits/pages, not command counts or sampled coordinates. */
export function assertMealPhase(trace, engine, shown, phase, startOrder) {
  const events = trace.events.filter((e) => e.order > startOrder)
  const progress = events.filter((e) => e.kind === 'progress')
  const actor = (id) => events.filter((e) => e.kind === 'actor' && e.id === id)
  const count = (e) => mealInventoryCount(e.state.inventory, engine)
  assert(
    progress.every((e) => [0, 1].includes(count(e))),
    'wine count became illegal during scene',
  )
  if (phase === 'pickup') {
    const hidden = actor('e20').find((e) => e.before?.visible && !e.state.visible)
    assert(hidden && hidden.order > shown.get('dlg.142'), 'food hidden before pickup instruction')
    assert(
      trace.frames.some(
        (e) => e.order > shown.get('dlg.142') && [208, 'sprite-208'].includes(e.frame.sprite),
      ),
      'pickup did not draw carrying sprite after instruction',
    )
    assert(
      progress.every((e) => count(e) === 0),
      'pickup prematurely gave wine',
    )
  } else if (phase === 'serve') {
    const disabled = actor('e15').find((e) => e.before?.visible && !e.state.visible)
    assert(
      disabled && disabled.order < shown.get('dlg.95'),
      'serving zone was not one-shot before dialogue',
    )
    const received = progress.find((e) => count(e) === 1)
    assert(
      received && received.order > shown.get('dlg.112'),
      'wine gained before receiving narration',
    )
    const moves = actor('e26').filter(
      (e) => e.before && JSON.stringify(e.before.position) !== JSON.stringify(e.state.position),
    )
    assert(
      moves.length > 0 && moves.every((e) => e.source.startsWith('commit:')),
      'missing real attendant taking-meal motion',
    )
    const taking = moves.filter((e) => e.order < shown.get('dlg.98'))
    assert(
      taking.length > 0 && taking[0].order > shown.get('dlg.96'),
      'attendant meal-taking order changed',
    )
    // The authored final handoff starts the attendant's return route. Those later commits remain
    // in continuity evidence but are not the preceding six-fragment taking-the-tray action.
  } else if (phase === 'wine-gift') {
    const hidden = actor('e62').find((e) => e.before?.visible && !e.state.visible)
    assert(
      hidden && hidden.order > shown.get('dlg.202') && hidden.order < shown.get('dlg.203'),
      'taoist disappeared out of story order',
    )
    const consumed = progress.find((e) => count(e) === 0)
    assert(
      consumed && consumed.order > shown.get('dlg.205') && consumed.order < shown.get('dlg.207'),
      'wine consumption/shout order changed',
    )
    assert.equal(
      progress.filter(
        (e) => e.before && mealInventoryCount(e.before.inventory, engine) === 1 && count(e) === 0,
      ).length,
      1,
      'wine did not decrement exactly once',
    )
    assert(
      progress.filter((e) => e.order > consumed.order).every((e) => count(e) === 0),
      'wine returned after consumption',
    )
  } else throw new Error('unknown meal phase oracle')
}

export function assertMealEnd(payload, engine) {
  const state = (scene, id) =>
    engine === 'game'
      ? payload.gs.allEventObjects.find((e) => e.id === Number(id.slice(1)))?.sState
      : payload.world.script.entityState?.[scene]?.[id]
  assert.equal(
    engine === 'game' ? payload.gs.wNumScene : payload.position.sceneId,
    engine === 'game' ? 4 : 's003',
  )
  assert.equal(engine === 'game' ? payload.gs.dwCash : payload.world.money, 500)
  assert.equal(
    mealInventoryCount(engine === 'game' ? payload.gs.inventory : payload.world.inventory, engine),
    0,
    'wine not consumed',
  )
  for (const [scene, id] of [
    ['s001', 'e15'],
    ['s001', 'e16'],
    ['s001', 'e20'],
    ['s003', 'e62'],
  ])
    assert.equal(state(scene, id), 0, `${id} remained active`)
  if (engine === 'game') {
    assert.equal(payload.gs.PlayerRolesRuntime.rgwSpriteNum[0], 2, 'still carrying meal')
    assert.equal(
      payload.gs.allEventObjects.find((e) => e.id === 19)?.triggerLabel,
      'L_741',
      '005 aunt handoff missing',
    )
  } else {
    assert.equal(
      payload.world.party[0].appearance?.spriteId ?? 'li-xiaoyao',
      'li-xiaoyao',
      'ordinary party appearance was not persisted',
    )
    const s = payload.world.script.behaviors.entities.s001.e19.trigger
    assert.equal(s.selection.value, 'c8-74bc98f07f8e', '005 aunt handoff missing')
    assert.equal(s.cursor, undefined, '005 already activated')
  }
}
