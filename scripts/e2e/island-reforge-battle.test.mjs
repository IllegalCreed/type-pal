import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { islandReforgeBattlePlugin } from './island-reforge-battle.mjs'

test('007 binds the observed hostile to the original encounter abort signal', async () => {
  const file = new URL('../../packages/reforge/src/main.ts', import.meta.url)
  const source = await readFile(file, 'utf8')
  const observer = islandReforgeBattlePlugin()
  const { code } = observer.transform(source, file.pathname)
  const continuation = code.slice(code.indexOf('  async function runHostileEncounter('))
  const signal = 'const encounterSignal = encounterController.signal'
  const registration = 'trackHostile(encounterSignal, {'
  const launch = 'await runtime.host.startBattle('
  assert.equal(continuation.split(registration).length - 1, 1)
  assert(continuation.indexOf(signal) >= 0)
  assert(continuation.indexOf(signal) < continuation.indexOf(registration))
  assert(continuation.indexOf(registration) < continuation.indexOf(launch))
  assert(continuation.includes('abort: () => encounterController.abort()'))
  assert.throws(
    () =>
      observer.transform(
        source.replace(signal, 'const encounterSignal = unrelated.signal'),
        file.pathname,
      ),
    /007 Reforge battle source anchor changed/,
  )
})
