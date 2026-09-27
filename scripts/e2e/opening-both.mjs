import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareOpeningTiming } from './opening-timing.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const out = resolve(root, 'build/e2e', `both-001-${new Date().toISOString().replace(/[:.]/g, '-')}`)
await mkdir(out, { recursive: true })

// Separate browser contexts, servers and checkpoint chains. One engine's failure never skips the other.
const children = ['game-opening.mjs', 'reforge-opening.mjs'].map((file) => {
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL(file, import.meta.url)), ...process.argv.slice(2)],
    { detached: true, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] },
  )
  let report
  child.on('message', (message) => {
    report = message.report
  })
  const done = new Promise((resolve) => {
    child.once('error', (error) => resolve({ file, code: 1, error: String(error) }))
    child.once('exit', (code, signal) => resolve({ file, code, signal, report }))
  })
  return { child, done }
})
let interrupted = false
const stop = () => {
  interrupted = true
  for (const { child } of children)
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGINT')
}
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
const results = await Promise.all(children.map((c) => c.done))
process.removeListener('SIGINT', stop)
process.removeListener('SIGTERM', stop)
console.log('[001 both]', JSON.stringify(results))
if (interrupted) process.exitCode = 130
else if (results.some((r) => r.code !== 0)) process.exitCode = 1
const comparison = { status: 'failed', children: results }
try {
  assert(!process.exitCode, 'one or both independent journeys failed')
  const reports = await Promise.all(
    results.map(async (result) => {
      assert(
        typeof result.report === 'string' &&
          result.report.startsWith(resolve(root, 'build/e2e') + sep),
        'missing owned report',
      )
      const report = JSON.parse(await readFile(result.report, 'utf8'))
      assert.equal(report.status, 'passed')
      return report
    }),
  )
  assert.equal(reports[0].revision, reports[1].revision, 'two engines ran different revisions')
  Object.assign(comparison, compareOpeningTiming(reports[0].npcTrace, reports[1].npcTrace))
  assert.equal(comparison.status, 'passed', 'semantic timing differs')
} catch (error) {
  comparison.failure = error.message
  process.exitCode = 1
}
await writeFile(resolve(out, 'comparison.json'), `${JSON.stringify(comparison, null, 2)}\n`)
console.log(`[001 semantic timing] ${comparison.status}: ${out}`)
