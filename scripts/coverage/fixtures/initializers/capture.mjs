import assert from 'node:assert/strict'
import { realpathSync, writeFileSync } from 'node:fs'
import { Session } from 'node:inspector/promises'
import { pathToFileURL } from 'node:url'

const [subject, output, mode] = process.argv.slice(2)
const session = new Session()
session.connect()
try {
  await session.post('Profiler.enable')
  await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true })
  const url = pathToFileURL(realpathSync(subject)).href
  const mod = await import(url)
  const cases = [
    ['Both', 'runBoth', 'both'],
    ['StaticOnly', 'runStatic', 'staticOnly'],
    ['InstanceOnly', 'runInstance', 'instanceOnly'],
    ['Nested', 'runNested', 'nested'],
    ['Anonymous', 'runAnonymous', 'anonymous'],
  ]
  for (const [name, method, key] of cases) {
    if (mode === 'construct') new mod[name]()
    if (mode === 'valid') assert.equal(new mod[name]()[method](1), key)
    if (mode === 'reject') assert.throws(() => new mod[name]()[method](2), /version rejected/)
  }
  if (mode === 'valid') assert.equal(mod.plain(1), 'plain')
  if (mode === 'reject') assert.throws(() => mod.plain(2), /version rejected/)
  const { result } = await session.post('Profiler.takePreciseCoverage')
  const coverage = result.find((entry) => entry.url === url)
  assert(coverage, 'native target missing')
  const expected = mode === 'valid' || mode === 'reject' ? 1 : 0
  assert.deepEqual(
    globalThis.__initializerCalls,
    Object.fromEntries(
      ['both', 'staticOnly', 'instanceOnly', 'nested', 'anonymous', 'plain'].map((key) => [
        key,
        expected,
      ]),
    ),
  )
  writeFileSync(output, JSON.stringify({ actual: globalThis.__initializerCalls, coverage }))
} finally {
  session.disconnect()
}
