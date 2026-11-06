import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import {
  assertDependencyClosure,
  dependencyImpact,
  hashRepositoryFiles,
  localDependencyGraph,
  recordingDependencies,
} from './evidence-dependencies.mjs'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

/** Keep the frozen producer receipt separate from what the current verifier executes. */
export async function recompareBoundStory({
  root,
  fragment,
  recordings,
  semanticPaths,
  scope,
  compare,
}) {
  const [game, reforge] = recordings
  assert.equal(
    game.report.revision,
    reforge.report.revision,
    `${fragment} used different candidates`,
  )
  const graph = await localDependencyGraph(root, ['scripts/e2e/recompare-recording.mjs'])
  const paths = [
    ...new Set([
      ...graph.files,
      ...semanticPaths,
      ...recordings.flatMap(({ report }) => Object.keys(report.hashes)),
      'package.json',
      'pnpm-lock.yaml',
    ]),
  ]
  const current = await hashRepositoryFiles(root, paths)
  const semanticSources = Object.fromEntries(semanticPaths.map((path) => [path, current[path]]))
  const comparison = await compare({ semanticSources })
  const sourceChanges = []
  for (const { report } of recordings) {
    const { engine, hashes, dependencies } = report
    for (const [path, recorded] of Object.entries(hashes))
      if (current[path] !== recorded)
        sourceChanges.push({
          engine,
          path,
          recorded,
          current: current[path],
          impact: dependencyImpact(dependencies, path),
        })
    const now = await recordingDependencies(root, dependencies.definition)
    try {
      assertDependencyClosure(dependencies, now)
    } catch (error) {
      if (!(error instanceof assert.AssertionError)) throw error
      comparison.findings.push({
        type: 'producer-dependency-change',
        engine,
        reason: error.message.split('\n')[0],
      })
    }
  }
  assert.deepEqual(await hashRepositoryFiles(root, paths), current, 'verifier/source changed')
  for (const { files } of recordings)
    for (const artifact of files)
      assert.equal(digest(await readFile(artifact.path)), artifact.sha256, 'native input changed')
  const sources = Object.fromEntries(graph.files.map((path) => [path, current[path]]))
  return {
    kind: 'archived-recording-recomparison',
    fragment,
    status: comparison.findings.length ? 'needs-review' : 'passed',
    scope,
    recordings: recordings.map(({ report, files }) => ({
      engine: report.engine,
      revision: report.revision,
      report: files[0],
      trace: files[1],
      artifacts: files.slice(2),
      predecessor: report.predecessor,
      sources: report.hashes,
      dependencies: report.dependencies,
    })),
    sourceChanges,
    currentSemanticSources: semanticSources,
    verifier: {
      entry: 'scripts/e2e/recompare-recording.mjs',
      external: graph.external,
      sources,
      sha256: digest(JSON.stringify(sources)),
    },
    comparison,
  }
}
