import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { instrumentBattleRandomDraws } from './battle-random-instrumentation.mjs'
import {
  instrumentReforgeBattle,
  REFORGE_BATTLE_TARGETS,
} from './battle-reforge-instrumentation.mjs'

test('current real battle producers instrument once; drift fails closed and normal source is preserved', async () => {
  for (const file of REFORGE_BATTLE_TARGETS) {
    const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
    const instrumented = instrumentReforgeBattle(source, file)
    assert(Object.keys(instrumented.anchors).length >= 1)
    // Removing every inserted character must recover the original source as a subsequence.
    let cursor = 0
    for (const character of instrumented.code) if (character === source[cursor]) cursor++
    assert.equal(cursor, source.length)
    assert(!instrumented.code.includes('extra.count--'))
    if (file.endsWith('/battle/battle-core.ts')) {
      assert.match(
        instrumented.code,
        /markRandom\('spell-damage-variance', undefined, \{ turn: s.turn, side: 'enemy', slot: ti \}\), rng\(\)/,
      )
      assert.throws(
        () =>
          instrumentBattleRandomDraws(
            source.replace('function dealSkillDamage(', 'function movedSkillDamage('),
            file,
          ),
        /battle RNG boundaries changed/,
      )
    }
  }
  const file = REFORGE_BATTLE_TARGETS[1]
  const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  assert.throws(
    () =>
      instrumentReforgeBattle(
        source.replace('finishBattleWorldState(actual,', 'missingCommit(actual,'),
        file,
      ),
    /producer drift/,
  )
  assert.deepEqual(instrumentReforgeBattle('unchanged', 'outside.ts'), {
    code: 'unchanged',
    anchors: {},
  })
})

test('explicit counter changes real item state before the same factual completion hook', async () => {
  const file = REFORGE_BATTLE_TARGETS[2]
  const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  const counter = instrumentReforgeBattle(source, file, 'double-herb').code
  assert(counter.includes("s.lastAction.itemId === '99'"))
  assert(counter.indexOf('extra.count--') < counter.indexOf('__battleHarness.afterStep(s)'))
  assert.throws(() => instrumentReforgeBattle(source, file, 'unknown'), /unknown battle counter/)
})

test('enemy spell cancellation observes the actual target before the replacement commit', async () => {
  const file = 'packages/reforge/src/battle/battle-command-selection.ts'
  const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  const cancelled = []
  const committed = []
  const browser = vm.createContext({
    exports: {},
    __battleHarness: { targetCancel: (...args) => cancelled.push(args) },
  })
  const code = instrumentReforgeBattle(source, file).code
  vm.runInContext(
    ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    browser,
  )
  const selection = new browser.exports.BattleCommandSelection()
  const context = {
    playerIndex: 0,
    player: { skills: ['303'], mp: 100, silenced: false, healthy: true },
    playerCount: 1,
    healthyPlayerCount: 1,
    aliveEnemyIndices: [0, 2],
    usableItems: [],
    throwableItems: [],
    skills: { 303: { target: 'oneEnemy', cost: { mp: 6 } } },
    money: 0,
  }
  const press = (key) =>
    selection.advance(context, new Set([key]), {
      submit: (slot, action) => committed.push([slot, structuredClone(action)]),
    })
  for (const key of ['ArrowLeft', 'Enter', 'Enter', 'ArrowRight', 'Escape']) press(key)
  assert.deepEqual(cancelled, [[0, 'enemy', 2, '303']])
  assert.deepEqual(committed, [])
  assert.equal(selection.phase, 'menu')
  for (const key of ['Enter', 'Enter', 'Enter']) press(key)
  assert.deepEqual(committed, [[0, { kind: 'cast', skillId: '303', targetEnemyIdx: 0 }]])
  assert.equal(cancelled.length, 1)
})
