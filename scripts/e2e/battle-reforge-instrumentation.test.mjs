import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
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
