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
const scopeArrivalDialogue = (trace) => ({
  ...trace,
  pages: (trace.pages ?? []).filter((page) => page.scene !== 's014'),
})
const npcTransitions = compareNpcStateTraces(
  scopeArrivalDialogue(gameNpc.trace),
  scopeArrivalDialogue(reforgeNpc.trace),
  '006',
)
const acceptedNpcRationales = new Map([
  [
    'actor-field:e35:facing',
    'e35 is a background room actor; both traces preserve the active route, dialogue and control boundary.',
  ],
  [
    'actor-field:e36:facing',
    'e36 is a background room actor; both traces preserve the active route, dialogue and control boundary.',
  ],
  [
    'actor-field:e60:facing',
    'e60 is hidden in the first presented s003 state; the stance difference exists only in pre-render materialization.',
  ],
  [
    'movement-count:e60:',
    'e60 is hidden in the first presented s003 state; Reforge placement commits are pre-render projection setup.',
  ],
  [
    'movement-count:e61:',
    'e61 is hidden in the first presented s003 state; Reforge placement commits are pre-render projection setup.',
  ],
  [
    'actor-field:e116:facing',
    'e116 is the carrier; both ride traces face up and now share the corrected ride endpoint.',
  ],
  [
    'movement-count:e116:',
    'e116 raw actor samples differ from boat-motion sampling; the dedicated ride trace proves the same endpoint and relative offsets.',
  ],
  [
    'movement-count:e117:',
    'e117 raw actor samples include reveal/mount setup; the dedicated ride trace proves the same endpoint-relative offset.',
  ],
  [
    'movement-path:e117:',
    'e117 raw path includes reveal/mount setup; the dedicated ride trace proves locked motion with e116.',
  ],
  [
    'actor-field:e123:facing',
    'e123 turns right before the active dialogue on both traces; the differing initial stance is pre-interaction setup.',
  ],
  [
    'movement-count:e123:',
    'e123 includes different pre-interaction placement sampling; both traces complete the same dialogue and hide state.',
  ],
  [
    'movement-path:e123:',
    'e123 includes different pre-interaction placement sampling; both traces complete the same dialogue and hide state.',
  ],
])
const findingKey = (finding) => `${finding.type}:${finding.id ?? ''}:${finding.field ?? ''}`
const reviewedNpcFindings = []
const unresolvedNpcFindings = []
for (const finding of npcTransitions.findings) {
  const rationale = acceptedNpcRationales.get(findingKey(finding))
  if (rationale) reviewedNpcFindings.push({ ...finding, disposition: 'accepted', rationale })
  else unresolvedNpcFindings.push(finding)
}
Object.assign(npcTransitions, { findings: unresolvedNpcFindings, reviewed: reviewedNpcFindings })

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
        boundary: 'island arrival; observed dialogue differences remain unresolved',
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
