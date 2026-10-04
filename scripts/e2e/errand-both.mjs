import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { repoRoot } from './browser-journey.mjs'
import { assertErrandSuite, readErrandContract, readErrandReceipt } from './errand-contract.mjs'
import { assertNpcTransitionParity } from './npc-transition-contract.mjs'

const options = {},
  args = process.argv.slice(2)
for (let n = 0; n < args.length; n++) {
  const key = args[n]
  if (key === '--headed' || key === '--headless') {
    assert(!options.mode, 'choose one browser mode')
    options.mode = key
  } else {
    assert(['--game-report', '--reforge-report'].includes(key), `unknown argument ${key}`)
    assert(!options[key] && args[n + 1] && !args[n + 1].startsWith('--'), `invalid ${key}`)
    options[key] = resolve(args[++n])
  }
}
assert(
  options['--game-report'] && options['--reforge-report'],
  'both genuine 004 saves reports required',
)
const out = resolve(
  repoRoot,
  'build/e2e',
  `both-005-${new Date().toISOString().replace(/[:.]/g, '-')}`,
)
await mkdir(out, { recursive: true })
const children = [],
  results = []
let interrupted = false
const stop = () => {
  interrupted = true
  for (const child of children)
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGINT')
}
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
const start = (engine, caseName) =>
  new Promise((done) => {
    const child = spawn(
      process.execPath,
      [
        fileURLToPath(new URL(`errand-${engine}.mjs`, import.meta.url)),
        '--from',
        options[`--${engine}-report`],
        '--case',
        caseName,
        options.mode ?? '--headed',
      ],
      { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] },
    )
    children.push(child)
    let report
    child.on('message', (message) => {
      report = message.report
    })
    child.once('error', (error) => done({ engine, case: caseName, code: 1, error: String(error) }))
    child.once('exit', (code) => done({ engine, case: caseName, code, report }))
  })
for (const caseName of ['story', 'guards', 'saves']) {
  if (interrupted) break
  const pair = await Promise.all(['game', 'reforge'].map((engine) => start(engine, caseName)))
  results.push(...pair)
  if (pair.some((result) => result.code !== 0)) break
}
process.removeListener('SIGINT', stop)
process.removeListener('SIGTERM', stop)
const comparison = { fragment: '005', status: 'failed', children: results }
try {
  assert(
    !interrupted && results.every((result) => result.code === 0),
    'independent 005 cases failed',
  )
  const reports = await Promise.all(
    results.map(async (result) => {
      assert(result.report?.startsWith(resolve(repoRoot, 'build/e2e') + sep))
      const report = await readErrandReceipt(result.report, await readErrandContract())
      assert.equal(report.engine, result.engine)
      assert.equal(report.case, result.case)
      assert.equal(report.predecessor.report, options[`--${result.engine}-report`])
      return report
    }),
  )
  assertErrandSuite(reports)
  comparison.status = 'passed'
  comparison.revision = reports[0].revision
  const storyReports = reports.filter((report) => report.case === 'story')
  comparison.npc = await assertNpcTransitionParity({
    fragment: '005',
    gameReportPath: `${storyReports.find((report) => report.engine === 'game').output}/report.json`,
    reforgeReportPath: `${storyReports.find((report) => report.engine === 'reforge').output}/report.json`,
  })
} catch (error) {
  comparison.status = 'failed'
  comparison.failure = String(error)
  if (error.comparison) comparison.npc = error.comparison
  process.exitCode = interrupted ? 130 : 1
}
await writeFile(resolve(out, 'comparison.json'), JSON.stringify(comparison, null, 2))
console.log(`[005 both] ${comparison.status}: ${out}`)
