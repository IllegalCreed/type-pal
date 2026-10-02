import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { repoRoot } from './browser-journey.mjs'
import { assertMealSuite, MEAL_CASES, mealArguments } from './meal-contract.mjs'

const options = mealArguments(process.argv.slice(2), true)
const out = resolve(
  repoRoot,
  'build/e2e',
  `both-004-${new Date().toISOString().replace(/[:.]/g, '-')}`,
)
await mkdir(out, { recursive: true })
const children = []
const start = (engine, caseName) => {
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(new URL(`meal-${engine}.mjs`, import.meta.url)),
      '--from',
      options[`--${engine}-report`],
      '--case',
      caseName,
      options.headless ? '--headless' : '--headed',
    ],
    { detached: true, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] },
  )
  let report
  child.on('message', (message) => {
    report = message.report
  })
  const done = new Promise((done) => {
    child.once('error', (error) => done({ engine, case: caseName, code: 1, error: String(error) }))
    child.once('exit', (code, signal) => done({ engine, case: caseName, code, signal, report }))
  })
  const entry = { child, done }
  children.push(entry)
  return entry
}
let interrupted = false
const stop = () => {
  interrupted = true
  for (const { child } of children)
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGINT')
}
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
const results = []
// Two isolated engines at a time. Specialist cases never interrupt the normal story context,
// and six simultaneous render loops would distort the very presentation timing being tested.
for (const caseName of MEAL_CASES) {
  if (interrupted) break
  const pair = ['game', 'reforge'].map((engine) => start(engine, caseName))
  const completed = await Promise.all(pair.map((entry) => entry.done))
  results.push(...completed)
  if (completed.some((result) => result.code !== 0)) break
}
process.removeListener('SIGINT', stop)
process.removeListener('SIGTERM', stop)
const comparison = {
  fragment: '004',
  status: 'failed',
  children: results,
  scope:
    'full 004 coverage: both engines, all three separate story/items/saves cases; independent genuine 003 checkpoints and timing',
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
      assert.equal(report.engine, result.engine)
      assert.equal(report.case, result.case)
      assert.equal(report.predecessor.report, options[`--${result.engine}-report`])
      return report
    }),
  )
  assertMealSuite(reports)
  comparison.status = 'passed'
  comparison.revision = reports[0].revision
  comparison.core = reports.map((report) => ({
    engine: report.engine,
    case: report.case,
    scope: report.scope,
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
