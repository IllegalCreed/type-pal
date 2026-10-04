import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { compareBoatObservations, summarizeBoatMotion } from './boat-observations.mjs'
import { repoRoot } from './browser-journey.mjs'

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
const actorIds = ['e35', 'e36', 'e59', 'e60', 'e61', 'e116', 'e117', 'e123', 'e203']
const traceFindings = []
for (const id of actorIds) {
  for (const [engine, trace] of [
    ['game', comparison.observations.game.stateTrace],
    ['reforge', comparison.observations.reforge.stateTrace],
  ]) {
    const actors = trace?.map((entry) => entry.state.actors?.[id]).filter(Boolean) ?? []
    if (!actors.length)
      traceFindings.push({
        type: 'evidence-gap',
        field: `actor.${id}`,
        engine,
        rationale: '006 state trace did not observe this actor.',
      })
    else if (actors.every((actor) => actor.frame === null || actor.frame === undefined))
      traceFindings.push({
        type: 'evidence-gap',
        field: `actor.${id}.frame`,
        engine,
        rationale: '006 trace has no committed frame telemetry for this actor.',
      })
  }
}
const npcTransitions = {
  fragment: '006',
  actors: actorIds,
  findings: traceFindings,
  violations: [],
}

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
        facing: { game: game.boatMotion.rideFacings, reforge: reforge.boatMotion.rideFacing },
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
