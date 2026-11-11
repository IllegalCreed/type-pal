import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { GAME_BATTLE_TARGETS, instrumentGameBattle } from './battle-game-instrumentation.mjs'

const source = (file) => readFile(new URL(`../..${file}`, import.meta.url), 'utf8')
const compile = (code, globals = {}) => {
  const context = vm.createContext({ exports: {}, ...globals })
  vm.runInContext(
    ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context,
  )
  return context.exports
}

test('Q2 observation guards the actual native battle boundaries and rejects drift', async () => {
  for (const file of GAME_BATTLE_TARGETS) {
    const native = await source(file)
    const observed = instrumentGameBattle(native, file)
    assert.match(observed.code, /__battle(?:Game|Evidence)/)
    assert.throws(() => instrumentGameBattle(observed.code, file), /instrumented twice/)
    if (file.endsWith('/battle/battle-system.ts')) {
      assert.equal(observed.anchors.command, 10)
      assert.equal(observed.anchors.actionComplete, 4)
      assert.throws(
        () =>
          instrumentGameBattle(
            native.replace('function tickPerformAction(', 'function movedTick('),
            file,
          ),
        /boundary census changed/,
      )
    }
  }
})

test('observed native mulberry32 preserves each value, draw count and final state', async () => {
  const file = '/packages/game/src/core/rng.ts'
  const native = await source(file)
  const observations = []
  const original = compile(native).createSeedableRng(1729)
  const observed = compile(instrumentGameBattle(native, file).code, {
    __battleGameRandom: (seed, state, value) => observations.push({ seed, state, value }),
  }).createSeedableRng(1729)
  const calls = [
    ['next', []],
    ['rangeInclusive', [1, 3]],
    ['rangeFloat', [0.9, 1.1]],
    ['range', [0, 5]],
    ['range', [2, 2]],
    ['next', []],
  ]
  for (const [name, args] of calls) assert.equal(observed[name](...args), original[name](...args))
  assert.equal(observations.length, 5, 'degenerate range does not draw')
  assert(observations.every((entry) => entry.seed === 1729 && entry.value >= 0 && entry.value < 1))
  assert.equal(observed.getState(), original.getState())
  assert.equal(observations.at(-1).state, original.getState())
  assert.equal(observations[0].value, compile(native).createSeedableRng(1729).next())
})
