import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import {
  errandArguments,
  errandScene,
  ERRAND_PHASE_ROWS,
  validateErrandPredecessor,
} from './errand-contract.mjs'
import { installErrandObserver, readErrandGame } from './errand-observer.mjs'
import { instrumentErrandTrace } from './errand-trace-plugin.mjs'
import { MEAL_TRACE_TARGETS } from './meal-trace-plugin.mjs'
import { assertMealDialogue } from './meal-contract.mjs'

test('005 scene identity covers both village and docks, not kitchen two-scene fallback', () => {
  for (const sid of ['s001', 's003', 's004', 's005']) {
    assert(errandScene({ scene: Number(sid.slice(1)) + 1 }, 'game', sid))
    assert(errandScene({ scene: sid }, 'reforge', sid))
  }
  assert.equal(errandScene({ scene: 4 }, 'game', 's005'), false)
})
test('005 requires explicit genuine predecessor and separates specialist cases', () => {
  assert.equal(errandArguments(['--from', '/report']).case, 'story')
  for (const args of [
    [],
    ['--from'],
    ['--from', 'a', '--capture'],
    ['--from', 'a', '--case', 'bogus'],
    ['--from', 'a', '--headed', '--headless'],
  ])
    assert.throws(() => errandArguments(args))
  for (const caseName of ['story', 'items'])
    assert.throws(
      () => validateErrandPredecessor({ case: caseName }, {}, 'game', '{}'),
      /004 saves/,
    )
  assert.throws(
    () => validateErrandPredecessor({ case: 'saves', profile: 'capture' }, {}, 'game', '{}'),
    /capture/,
  )
  assert.throws(
    () => validateErrandPredecessor({ case: 'saves', engine: 'reforge' }, {}, 'game', '{}'),
    /wrong engine/,
  )
})
test('005 original closure includes shrimp reminder, no later ZhangSi repeat in normal story', () => {
  assert(ERRAND_PHASE_ROWS.aunt.includes(223))
  assert.deepEqual(ERRAND_PHASE_ROWS.zhang, [515, 516, 517, 518, 519, 521, 522])
  assert.deepEqual(ERRAND_PHASE_ROWS.news, [282, 283, 284, 286, 288, 289, 290, 292, 293])
})
test('005 snapshot stays bounded while routeActors include all current blocking NPCs', () => {
  const gs = {
    wNumScene: 6,
    party: { x: 0, y: 0 },
    allEventObjects: Array.from({ length: 6000 }, (_, id) => ({ id })),
    npcs: [
      { id: 500, sState: 2, x: 32, y: 16 },
      { id: 124, sState: 2, x: 16, y: 8 },
      { id: 999, sState: 0, x: 0, y: 0 },
    ],
  }
  const state = vm.runInNewContext(`(${readErrandGame.toString()})()`, { window: { __tpgs: gs } })
  assert.equal(Object.keys(state.actors).length, 12)
  assert.equal(state.routeActors.length, 2)
  assert(JSON.stringify(state).length < 3000)
})
test('005 rendered observer captures Xianglan position on every shown row', () => {
  const context = vm.createContext({ structuredClone, performance, addEventListener() {} })
  vm.runInContext(`(${installErrandObserver.toString()})()`, context)
  vm.runInContext(
    `__errandPoint('commit:test',{scene:'s004',actors:{e83:{position:[1700,1300]}},money:550});
    __errandRendered({phase:'waiting-input',dialogueId:'news',cueIndex:0,pageIndex:0,pageStartedAtMs:1,pageText:'不好了！',speaker:'香兰'});`,
    context,
  )
  const trace = context.__readErrandEvidence()
  assert.deepEqual(trace.pages[0].actors.e83.position, [1700, 1300])
  assert.deepEqual(trace.errors, [])
})
test('005 full dialogue checker rejects missing, repeated and wrong-speaker pages', () => {
  const contract = {
    rows: [
      { id: 'dlg.1', text: '一', speaker: '甲' },
      { id: 'dlg.2', text: '二', speaker: '乙' },
    ],
    locale: {},
  }
  const page = (id, title, line) => ({
    engine: 'game',
    order: id,
    page: { instance: id, title, lines: [line] },
  })
  const valid = { pages: [page(1, '甲', '一'), page(2, '乙', '二')] }
  assertMealDialogue(valid, 'game', contract)
  for (const pages of [
    [page(2, '乙', '二')],
    [page(1, '乙', '一')],
    [...valid.pages, page(3, '乙', '二')],
  ])
    assert.throws(() => assertMealDialogue({ pages }, 'game', contract))
})
test('005 isolated instrumentation parses every actual hook target without production edits', () => {
  for (const file of MEAL_TRACE_TARGETS) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
    const result = instrumentErrandTrace(source, file)
    assert.equal(
      ts.createSourceFile(file, result.code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
      0,
    )
    assert(!result.code.includes('globalThis.__meal'))
  }
})
