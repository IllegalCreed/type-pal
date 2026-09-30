import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { repoRoot } from './browser-journey.mjs'
import { innArguments } from './inn-contract.mjs'

const options = innArguments(process.argv.slice(2), true),
  out = resolve(repoRoot, 'build/e2e', `both-002-${new Date().toISOString().replace(/[:.]/g, '-')}`)
await mkdir(out, { recursive: true })
const children = ['game', 'reforge'].map((engine) => {
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(new URL(`${engine}-inn.mjs`, import.meta.url)),
      '--from',
      options[`--${engine}-report`],
      options.headless ? '--headless' : '--headed',
      ...(options.holdLeader ? ['--hold-leader'] : []),
    ],
    { detached: true, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] },
  )
  let report
  child.on('message', (m) => {
    report = m.report
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
const results = await Promise.all(children.map((c) => c.done))
process.removeListener('SIGINT', stop)
process.removeListener('SIGTERM', stop)
const comparison = {
  fragment: '002',
  status: 'failed',
  children: results,
  scope: 'shared story target; engine routes/positions/timing and checkpoints remain independent',
}
try {
  assert(!interrupted, '002 interrupted')
  assert(
    results.every((r) => r.code === 0),
    'one or both independent 002 journeys failed',
  )
  const reports = await Promise.all(
    results.map(async (r) => {
      assert(
        typeof r.report === 'string' && r.report.startsWith(resolve(repoRoot, 'build/e2e') + sep),
      )
      const p = JSON.parse(await readFile(r.report, 'utf8'))
      assert.equal(p.status, 'passed')
      assert.equal(p.route.status, 'passed')
      assert.equal(p.core.status, 'passed')
      return p
    }),
  )
  assert.equal(reports[0].revision, reports[1].revision)
  assert.deepEqual(reports[0].core.sourceHashes, reports[1].core.sourceHashes)
  assert.equal(reports[0].core.rows, reports[1].core.rows)
  comparison.status = 'passed'
  comparison.revision = reports[0].revision
  comparison.core = reports.map((r) => ({
    engine: r.engine,
    verdict: r.core,
    checkpoint: r.checkpoint,
    predecessor: r.predecessor,
  }))
} catch (error) {
  comparison.failure = error.message
  process.exitCode = interrupted ? 130 : 1
}
await writeFile(resolve(out, 'comparison.json'), JSON.stringify(comparison, null, 2))
console.log(`[002 both] ${comparison.status}: ${out}`)
