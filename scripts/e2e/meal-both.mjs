import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { repoRoot } from './browser-journey.mjs'
import { mealArguments } from './meal-contract.mjs'

const options = mealArguments(process.argv.slice(2), true)
const out = resolve(
  repoRoot,
  'build/e2e',
  `both-004-${new Date().toISOString().replace(/[:.]/g, '-')}`,
)
await mkdir(out, { recursive: true })
const children = ['game', 'reforge'].map((engine) => {
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(new URL(`meal-${engine}.mjs`, import.meta.url)),
      '--from',
      options[`--${engine}-report`],
      options.headless ? '--headless' : '--headed',
    ],
    { detached: true, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] },
  )
  let report
  child.on('message', (message) => {
    report = message.report
  })
  const done = new Promise((done) => {
    child.once('error', (error) => done({ engine, code: 1, error: String(error) }))
    child.once('exit', (code, signal) => done({ engine, code, signal, report }))
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
const results = await Promise.all(children.map((entry) => entry.done))
process.removeListener('SIGINT', stop)
process.removeListener('SIGTERM', stop)
const comparison = {
  fragment: '004',
  status: 'failed',
  children: results,
  scope:
    'independent real 003 checkpoints; carrying save/restore, serving, normal item menu and complete gift; routes/timing remain independent',
}
try {
  assert(!interrupted, '004 interrupted')
  assert(
    results.every((r) => r.code === 0),
    'one or both independent 004 journeys failed',
  )
  const reports = await Promise.all(
    results.map(async (result) => {
      assert(
        typeof result.report === 'string' &&
          result.report.startsWith(resolve(repoRoot, 'build/e2e') + sep),
      )
      const report = JSON.parse(await readFile(result.report, 'utf8'))
      assert.equal(report.status, 'passed')
      assert.equal(report.core.status, 'passed')
      assert.equal(report.route.status, 'passed')
      return report
    }),
  )
  assert.equal(reports[0].revision, reports[1].revision)
  assert.deepEqual(reports[0].core.sourceHashes, reports[1].core.sourceHashes)
  assert.deepEqual(reports[0].core.rows, reports[1].core.rows)
  comparison.status = 'passed'
  comparison.revision = reports[0].revision
  comparison.core = reports.map((report) => ({
    engine: report.engine,
    verdict: report.core,
    checkpoint: report.checkpoint,
    predecessor: report.predecessor,
  }))
} catch (error) {
  comparison.failure = error.message
  process.exitCode = interrupted ? 130 : 1
}
await writeFile(resolve(out, 'comparison.json'), JSON.stringify(comparison, null, 2))
console.log(`[004 both] ${comparison.status}: ${out}`)
