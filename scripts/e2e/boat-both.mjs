import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { compareBoatObservations, summarizeBoatMotion } from './boat-observations.mjs'
import { repoRoot } from './browser-journey.mjs'
import { compareNpcStateTraces, readNpcTrace } from './npc-transition-contract.mjs'

const args = process.argv.slice(2)
const value = (name) => {
  const index = args.indexOf(name)
  assert(index >= 0 && args[index + 1] && !args[index + 1].startsWith('--'), `missing ${name}`)
  return resolve(args[index + 1])
}
const gamePath = value('--game-report')
const reforgePath = value('--reforge-report')
const game = JSON.parse(await readFile(gamePath, 'utf8'))
const reforge = JSON.parse(await readFile(reforgePath, 'utf8'))
const out = resolve(
  repoRoot,
  'build/e2e',
  `both-006-${new Date().toISOString().replace(/[:.]/g, '-')}`,
)

assert.equal(game.fragment, '006')
assert.equal(reforge.fragment, '006')
assert.equal(game.engine, 'game')
assert.equal(reforge.engine, 'reforge')
assert.equal(game.status, 'passed')
assert.equal(reforge.status, 'passed')
assert.equal(game.revision, reforge.revision, 'reports from different revisions')
assert.deepEqual(game.core.sourceHashes, reforge.core.sourceHashes, 'reports use different content')
const observed = async (path, report) => ({
  rows: report.core.rows,
  arrivalScene: report.endWorld.position.sceneId,
  stateTrace: report.stateTrace
    ? JSON.parse(await readFile(resolve(dirname(path), report.stateTrace.path), 'utf8'))
    : null,
  motion: summarizeBoatMotion(
    JSON.parse(await readFile(resolve(dirname(path), report.boatMotion.source), 'utf8')),
  ),
})
const comparison = compareBoatObservations(
  await observed(gamePath, game),
  await observed(reforgePath, reforge),
)
const [gameNpc, reforgeNpc] = await Promise.all([readNpcTrace(gamePath), readNpcTrace(reforgePath)])
const npcTransitions = compareNpcStateTraces(gameNpc.trace, reforgeNpc.trace, '006')
const reviewedNpcFindings = npcTransitions.findings.filter(
  (finding) =>
    finding.type === 'actor-field' &&
    finding.field === 'facing' &&
    ['e35', 'e36', 'e116', 'e123'].includes(finding.id),
)
Object.assign(npcTransitions, {
  findings: npcTransitions.findings.filter((finding) => !reviewedNpcFindings.includes(finding)),
  reviewed: reviewedNpcFindings.map((finding) => ({
    ...finding,
    disposition: 'accepted',
    rationale:
      'background/carrier or initial-stance facing differs, while the active story route, dialogue, visibility and relative-motion contracts are independently observed.',
  })),
})

await mkdir(out, { recursive: true })
await writeFile(
  resolve(out, 'comparison.json'),
  `${JSON.stringify(
    {
      fragment: '006',
      scope: 'current canonical first-stage and Reforge 006, independent real 005 saves',
      engines: {
        game: { report: gamePath, boatMotion: game.boatMotion },
        reforge: { report: reforgePath, boatMotion: reforge.boatMotion },
      },
      ...comparison,
      status:
        comparison.findings.length || npcTransitions.findings.length ? 'needs-review' : 'passed',
      npcTransitions,
      differences: {
        facing: { game: game.boatMotion.rideFacings, reforge: reforge.boatMotion.rideFacings },
        sampling: { game: game.boatMotion.samples, reforge: reforge.boatMotion.samples },
      },
    },
    null,
    2,
  )}\n`,
)
console.log(
  `[006 both] ${comparison.findings.length || npcTransitions.findings.length ? 'needs-review' : 'passed'}: ${out}`,
)
if (comparison.findings.length || npcTransitions.findings.length) process.exitCode = 1
