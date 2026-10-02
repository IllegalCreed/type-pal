import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { sha256 } from './browser-journey.mjs'
import {
  assertMealCollector,
  assertMealDialogue,
  assertMealEnd,
  assertMealPhase,
  mealArguments,
  mealSaveView,
  mealTraceArtifact,
  readMealContract,
  validateMealPredecessor,
} from './meal-contract.mjs'
import { installMealObserver } from './meal-observer.mjs'
import { instrumentMealTrace, MEAL_TRACE_TARGETS } from './meal-trace-plugin.mjs'

const donor = () => {
  const payload = {
    format: 'type-pal-save',
    gs: {
      wNumScene: 2,
      dwCash: 500,
      party: { x: 1, y: 2, facing: 'up' },
      partyMembers: [0],
      PlayerRolesRuntime: { rgwSpriteNum: [2] },
      inventory: [],
      rgScene: [],
      rgObject: [],
      rgEventObject: [],
      allEventObjects: [
        { id: 19, sState: 2 },
        { id: 20, sState: 1, triggerLabel: 'L_583' },
        { id: 62, sState: 2 },
      ],
    },
  }
  const bytes = JSON.stringify(payload),
    world = mealSaveView(payload, 'game'),
    frame = { width: 320, height: 200, nonBlack: 50000, sha256: 'b'.repeat(64) }
  const report = {
    status: 'passed',
    fragment: '003',
    engine: 'game',
    name: 'game-003',
    revision: 'a'.repeat(40),
    core: { status: 'passed' },
    route: { status: 'passed' },
    sourceHashesStable: true,
    checkpoint: { path: '003.end.save.json', sha256: sha256(bytes) },
    endWorld: world,
    restoredWorld: structuredClone(world),
    endWorldHash: sha256(JSON.stringify(world)),
    restoredWorldHash: sha256(JSON.stringify(world)),
    endFrame: frame,
    restoredFrame: frame,
  }
  return { report, payload, bytes }
}

test('004 artifact receipt hashes the exact pretty-printed file bytes and is detached', () => {
  const trace = { events: [{ id: 'party', order: 0 }], pages: [] }
  const result = mealTraceArtifact(trace)
  assert.equal(result.bytes, JSON.stringify(trace, null, 2))
  assert.equal(result.sha256, sha256(result.bytes))
  assert.notEqual(result.sha256, sha256(JSON.stringify(trace)))
  trace.events[0].order = 1
  assert.equal(JSON.parse(result.bytes).events[0].order, 0)
})

test('004 CLI rejects missing donor, arbitrary scene/position and conflicting mode', () => {
  assert.throws(() => mealArguments([]), /required/)
  for (const args of [
    ['--scene', 's003'],
    ['--from', 'a', '--pos', '1,2'],
    ['--from', 'a', '--headless', '--headed'],
    ['--from', 'a', '--from', 'b'],
  ])
    assert.throws(() => mealArguments(args))
  assert.throws(() => mealArguments(['--game-report', 'a', '--expect-stationary-no-gift'], true))
})
test('003 admission rejects false evidence, byte mutation, wrong engine/story and pickup pollution', () => {
  const { report, payload, bytes } = donor()
  validateMealPredecessor(report, payload, 'game', bytes)
  for (const patch of [
    { status: 'failed' },
    { fragment: '002' },
    { engine: 'reforge' },
    { core: { status: 'running' } },
    { sourceHashesStable: false },
    { restoredWorldHash: 'c'.repeat(64) },
    { restoredFrame: { ...report.restoredFrame, sha256: 'c'.repeat(64) } },
  ])
    assert.throws(() => validateMealPredecessor({ ...report, ...patch }, payload, 'game', bytes))
  assert.throws(() => validateMealPredecessor(report, payload, 'game', `${bytes} `), /bytes differ/)
  const p = structuredClone(payload)
  p.gs.inventory = [{ itemId: 272, count: 1 }]
  const b = JSON.stringify(p),
    w = mealSaveView(p, 'game'),
    h = sha256(JSON.stringify(w))
  assert.throws(
    () =>
      validateMealPredecessor(
        {
          ...report,
          checkpoint: { path: '003.end.save.json', sha256: sha256(b) },
          endWorld: w,
          restoredWorld: w,
          endWorldHash: h,
          restoredWorldHash: h,
        },
        p,
        'game',
        b,
      ),
    /wine already owned/,
  )
})
test('004 actual isolated transforms retain reviewed restore/commit and menu dispatch/render anchors', () => {
  for (const file of MEAL_TRACE_TARGETS) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'),
      result = instrumentMealTrace(source, file)
    assert.equal(
      ts.createSourceFile(file, result.code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
      0,
    )
    if (file.endsWith('/reforge/src/main.ts')) {
      assert.equal(result.anchors.actualReforgeMenuRender, 1)
      assert.equal(result.anchors.restorePayloadCommitted, 1)
      assert(result.code.includes("'e15','e16','e19','e20','e24','e25','e26'"))
    }
    if (file.endsWith('/menu-session.ts')) assert.equal(result.anchors.actualReforgeItemDispatch, 1)
    if (file.endsWith('/event-system.ts')) assert.equal(result.anchors.actualGameItemDispatch, 1)
  }
})
test('004 dispatch and rendered-view census fails closed under primary-source anchor removal', () => {
  for (const [file, from, to] of [
    ['packages/reforge/src/main.ts', 'if (menus.active) {', 'if (menus.active && true) {'],
    [
      'packages/reforge/src/menu/menu-session.ts',
      'private dispatchItemUse(',
      'private changedDispatch(',
    ],
    [
      'packages/game/src/core/event-system.ts',
      'export function startOverworldItemScript(',
      'export function changedUse(',
    ],
  ]) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
    assert(source.includes(from))
    assert.throws(() => instrumentMealTrace(source.replaceAll(from, to), file))
  }
})
test('004 observer copies observations and rejects unobserved moves, overflow and duplicate restore commits', () => {
  const host = {}
  let ms = 0
  new Function('globalThis', 'performance', `(${installMealObserver.toString()})()`)(host, {
    now: () => ++ms,
  })
  const state = {
      scene: 's001',
      actors: { party: { position: [0, 0], visible: true } },
      money: 500,
      inventory: {},
      persistent: {},
      control: true,
    },
    original = structuredClone(state)
  host.__mealPoint('render:world', state)
  host.__mealMenu('reforge', { active: true, levels: [{ ids: ['item'], cursor: 0 }] })
  host.__mealDispatch('reforge', { itemId: '272' })
  assert.deepEqual(state, original)
  assertMealCollector(host.__readMealEvidence())
  const t = host.__readMealEvidence()
  t.latestMenu.active = false
  t.final.money = 0
  assert.equal(host.__readMealEvidence().latestMenu.active, true)
  assert.equal(host.__readMealEvidence().final.money, 500)
  host.__mealPoint('render:world', {
    ...state,
    actors: { party: { position: [1, 0], visible: true } },
  })
  assert.throws(() => assertMealCollector(host.__readMealEvidence()), /observer error/)
  host.__mealRestoreCommitted({})
  host.__mealRestoreCommitted({})
  assert.equal(host.__readMealEvidence().overflow, true)
})
test('004 global party continuity survives a real pre-switch placement and still rejects an uncommitted re-entry move', () => {
  const host = {}
  let clock = 0
  new Function('globalThis', 'performance', `(${installMealObserver.toString()})()`)(host, {
    now: () => ++clock,
  })
  const point = (source, scene, position) =>
    host.__mealPoint(source, {
      scene,
      actors: { party: { position, visible: true } },
      persistent: {},
      money: 500,
      inventory: {},
    })
  point('render:world', 's001', [1, 1])
  point('commit:applyRawOpcode', 's001', [2, 2])
  point('tick:tickEventSystem', 's003', [2, 2])
  point('commit:applyRawOpcode', 's003', [3, 3])
  point('tick:tickEventSystem', 's001', [3, 3])
  assertMealCollector(host.__readMealEvidence())
  point('render:world', 's003', [4, 4])
  assert.throws(() => assertMealCollector(host.__readMealEvidence()), /observer error/)
})
test('004 ordered original/current rendered dialogue rejects missing, replayed and misattributed lines', async () => {
  const c = await readMealContract(),
    pages = c.rows.map((r, i) => ({
      engine: 'game',
      order: i,
      page: { instance: i, lines: [r.text], title: r.speaker },
    })),
    t = { pages }
  assert.equal(assertMealDialogue(t, 'game', c).size, 40)
  for (const corrupt of [
    (t) => t.pages.splice(2, 1),
    (t) => t.pages.push({ ...t.pages[0], page: { ...t.pages[0].page, instance: 100 } }),
    (t) => {
      t.pages[0].page.title = 'not-aunt'
    },
  ]) {
    const wrong = structuredClone(t)
    corrupt(wrong)
    assert.throws(() => assertMealDialogue(wrong, 'game', c))
  }
})
test('004 end rejects live taoist, carried sprite, missing wine decrement and entered005', () => {
  const { payload } = donor()
  payload.gs.wNumScene = 4
  payload.gs.allEventObjects = [15, 16, 20, 62].map((id) => ({ id, sState: 0 }))
  payload.gs.allEventObjects.push({ id: 19, triggerLabel: 'L_741' })
  assertMealEnd(payload, 'game')
  for (const change of [
    (p) => {
      p.gs.allEventObjects[3].sState = 2
    },
    (p) => {
      p.gs.PlayerRolesRuntime.rgwSpriteNum[0] = 208
    },
    (p) => {
      p.gs.inventory = [{ itemId: 272, count: 1 }]
    },
    (p) => {
      p.gs.allEventObjects[4].triggerLabel = 'L_565'
    },
  ]) {
    const p = structuredClone(payload)
    change(p)
    assert.throws(() => assertMealEnd(p, 'game'))
  }
})
test('004 gift dependencies reject early disappearance or double consumption even with final zero inventory', () => {
  const shown = new Map([
    ['dlg.202', 2],
    ['dlg.203', 4],
    ['dlg.205', 5],
    ['dlg.207', 8],
  ])
  const trace = {
    events: [
      { kind: 'actor', id: 'e62', order: 3, before: { visible: true }, state: { visible: false } },
      { kind: 'progress', order: 6, before: { inventory: { 272: 1 } }, state: { inventory: {} } },
    ],
    frames: [],
  }
  assertMealPhase(trace, 'reforge', shown, 'wine-gift', -1)
  const wrong = structuredClone(trace)
  wrong.events[0].order = 1
  assert.throws(() => assertMealPhase(wrong, 'reforge', shown, 'wine-gift', -1), /disappeared/)
  const doubled = structuredClone(trace)
  doubled.events.push({ ...doubled.events[1], order: 7 })
  assert.throws(() => assertMealPhase(doubled, 'reforge', shown, 'wine-gift', -1), /exactly once/)
})
