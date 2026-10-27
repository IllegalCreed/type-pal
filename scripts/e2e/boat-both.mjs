import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { checkBoatCheckpoint } from './boat-checkpoint-contract.mjs'
import { repoRoot } from './browser-journey.mjs'
import { recompareRecording } from './recompare-recording.mjs'

const options = {},
  args = process.argv.slice(2)
for (let index = 0; index < args.length; index += 2) {
  const key = args[index],
    value = args[index + 1]
  assert(['--game-report', '--reforge-report'].includes(key), `unknown argument ${key}`)
  assert(!options[key] && value && !value.startsWith('--'), `invalid ${key}`)
  options[key] = resolve(value)
}
assert(
  options['--game-report'] && options['--reforge-report'],
  'both independent 006 reports required',
)
const result = await recompareRecording(
  '006',
  options['--game-report'],
  options['--reforge-report'],
)
result.checkpointProofs = []
for (const path of [options['--game-report'], options['--reforge-report']]) {
  try {
    const report = JSON.parse(await readFile(path, 'utf8'))
    result.checkpointProofs.push({
      engine: report.engine,
      ...(await checkBoatCheckpoint(path, report)),
    })
  } catch (error) {
    result.checkpointProofs.push({ report: path, status: 'rejected', reason: String(error) })
  }
}
if (result.checkpointProofs.some((proof) => proof.status !== 'proved'))
  result.status = 'needs-review'
const out = resolve(
  repoRoot,
  'build/e2e',
  `both-006-${new Date().toISOString().replace(/[:.]/g, '-')}`,
)
await mkdir(out, { recursive: true })
await writeFile(resolve(out, 'acceptance.json'), `${JSON.stringify(result, null, 2)}\n`, {
  flag: 'wx',
})
await writeFile(resolve(out, 'comparison.json'), `${JSON.stringify(result, null, 2)}\n`, {
  flag: 'wx',
})
console.log(`[006 both] ${result.status}: ${out}`)
if (result.status !== 'passed') process.exitCode = 1
