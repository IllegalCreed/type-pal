import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { compareBoatObservations } from './boat-observations.mjs'
import { readCapturedAmbientAncestors } from './captured-ambient-cycle.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import {
  assertDependencyClosure,
  dependencyImpact,
  hashRepositoryFiles,
  localDependencyGraph,
  recordingDependencies,
} from './evidence-dependencies.mjs'
import { compareNpcStateTraces, readNpcTrace } from './npc-transition-contract.mjs'
import { inspectTraceCapabilities } from './obligation-registry.mjs'
import { assertDeclaredInputs } from './producer-inputs.mjs'
import {
  checkRecordedStory,
  readStoryContract,
  STORY_PRODUCERS,
} from './recorded-story-contract.mjs'
import { checkSpriteResources } from './sprite-resource-contract.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const hashFile = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex')

/** Recorded provenance is immutable; current verifier provenance is a separate receipt. */
export async function recompareRecording(fragment, gamePath, reforgePath) {
  assert(Object.hasOwn(STORY_PRODUCERS, fragment), 'offline acceptance scope is 001–006')
  const contract = await readStoryContract(fragment, root)
  const loaded = await Promise.all([gamePath, reforgePath].map(readNpcTrace))
  const recordings = [],
    provenanceFindings = [],
    storyProofs = []
  for (const [index, { report, tracePath, reportSha256, traceSha256 }] of loaded.entries()) {
    const engine = ['game', 'reforge'][index]
    assert.equal(report.fragment, fragment, 'report fragment differs from requested fragment')
    // The current opening Game producer calls itself phase1-game; later producers use game.
    assert.equal(
      report.engine,
      fragment === '001' && index === 0 ? 'phase1-game' : engine,
      'report belongs to the wrong engine',
    )
    assert.equal(report.status, 'passed', 'recorded independent journey did not pass')
    assert.deepEqual(report.errors, [], 'recorded journey has errors')
    assert.equal((report.matrixVerdict ?? report.core)?.status, 'passed')
    if (fragment !== '001') assert.equal(report.route?.status, 'passed')
    const sources = {}
    for (const group of [
      report.assets,
      report.runnerHashes,
      report.hashes,
      report.matrixVerdict?.sourceHashes,
      report.core?.sourceHashes,
    ])
      for (const [path, hash] of Object.entries(group ?? {})) {
        if (path in sources) assert.equal(sources[path], hash, 'recorded source receipts disagree')
        sources[path] = hash
      }
    assert(Object.keys(sources).length, 'recording lacks source provenance')
    const reportPath = resolve([gamePath, reforgePath][index])
    let dependencies = null
    if (!report.dependencies)
      provenanceFindings.push({
        type: 'evidence-gap',
        engine,
        field: 'producer-dependency-manifest',
      })
    else {
      const definition = {
        ...STORY_PRODUCERS[fragment](engine),
        packageName: engine,
        declared: report.dependencies.definition.declared,
      }
      dependencies = await recordingDependencies(root, definition)
      assertDependencyClosure(report.dependencies, dependencies)
      assertDeclaredInputs(report.dependencies, Object.keys(contract.hashes), fragment, engine)
      assert.deepEqual(
        report.hashes,
        report.dependencies.hashes,
        'producer hashes differ from dependency receipt',
      )
    }
    try {
      storyProofs.push({
        engine,
        ...(await checkRecordedStory(reportPath, loaded[index], contract)),
      })
    } catch (error) {
      storyProofs.push({ engine, status: 'rejected', reason: String(error), artifacts: [] })
    }
    recordings.push({
      engine,
      report: { path: reportPath, sha256: reportSha256 },
      trace: { path: resolve(tracePath), sha256: traceSha256 },
      revision: report.revision,
      predecessor: report.predecessor ?? null,
      sources,
      dependencies: report.dependencies ?? null,
    })
  }
  assert.deepEqual(
    (loaded[0].report.matrixVerdict ?? loaded[0].report.core).sourceHashes,
    (loaded[1].report.matrixVerdict ?? loaded[1].report.core).sourceHashes,
    'the two recordings used different story contracts',
  )
  const resourceProofs = await Promise.all(
    loaded.map(async ({ trace }, index) => ({
      engine: ['game', 'reforge'][index],
      ...(await checkSpriteResources(trace, ['game', 'reforge'][index], root)),
    })),
  )
  const verifierGraph = await localDependencyGraph(root, ['scripts/e2e/recompare-recording.mjs'])
  const tools = [...verifierGraph.files, 'pnpm-lock.yaml', 'package.json']
  const capturedAncestors =
    fragment === '004'
      ? await readCapturedAmbientAncestors(
          loaded.map((e) => e.report),
          readNpcTrace,
          resourceProofs[1].frameCounts,
        )
      : undefined
  const comparison = compareNpcStateTraces(loaded[0].trace, loaded[1].trace, fragment, {
    rawGame: loaded[0].rawTrace,
    rawReforge: loaded[1].rawTrace,
    frameCounts: resourceProofs[1].status === 'proved' ? resourceProofs[1].frameCounts : {},
    capturedAncestors,
  })
  const cameraSources = Object.assign({}, ...Object.values(comparison.camera).map((p) => p.sources))
  // Semantic adapters read these independent inputs today. Do not retroactively add
  // them to the historical producer receipt or confuse them with verifier code.
  const semanticPaths = [
    ...Object.keys(cameraSources),
    ...new Set(resourceProofs.flatMap((proof) => Object.keys(proof.sources))),
    ...Object.keys(contract.hashes),
    'data/extracted/data/event-objects.json',
    'projects/pal/content/actors.json',
    'projects/pal/content/sprites.json',
    ...new Set(
      loaded.flatMap(({ trace }) =>
        [...(trace.initialEvents ?? []), ...trace.events]
          .map((event) => event.scene)
          .filter((scene) => /^s\d{3}$/u.test(scene))
          .map((scene) => `projects/pal/content/scenes/${scene}.json`),
      ),
    ),
  ].sort()
  const paths = [
    ...new Set([...tools, ...semanticPaths, ...recordings.flatMap((r) => Object.keys(r.sources))]),
  ].sort()
  const current = await hashRepositoryFiles(root, paths)
  const verifierSources = Object.fromEntries(tools.sort().map((path) => [path, current[path]]))
  const currentRecordedSources = Object.fromEntries(
    [...new Set(recordings.flatMap((r) => Object.keys(r.sources)))]
      .sort()
      .map((path) => [path, current[path]]),
  )
  const sourceChanges = recordings.flatMap((r) =>
    Object.entries(r.sources)
      .filter(([path, hash]) => current[path] !== hash)
      .map(([path, recorded]) => ({
        engine: r.engine,
        path,
        recorded,
        current: current[path],
        impact: r.dependencies ? dependencyImpact(r.dependencies, path) : 'unknown',
      })),
  )
  for (const [path, hash] of Object.entries(cameraSources))
    assert.equal(current[path], hash, 'camera oracle changed during comparison')
  comparison.resources = resourceProofs
  for (const proof of resourceProofs) {
    for (const [path, hash] of Object.entries(proof.sources))
      assert.equal(current[path], hash, 'resource oracle changed during comparison')
    if (proof.status !== 'proved')
      comparison.findings.push({
        type: proof.status === 'unknown' ? 'evidence-gap' : 'resource-conformance',
        engine: proof.engine,
        field: 'actual-sprite-bytes',
        proof,
      })
  }
  comparison.findings.push(...provenanceFindings)
  for (const proof of storyProofs)
    if (proof.status !== 'proved')
      comparison.findings.push({
        type: 'story-contract',
        engine: proof.engine,
        field: `${fragment}:story-special-contract`,
        reason: proof.reason,
      })
  if (fragment === '006' && storyProofs.every((proof) => proof.status === 'proved')) {
    const boat = compareBoatObservations(...storyProofs.map((proof) => proof.observations))
    comparison.boat = boat
    comparison.findings.push(...boat.findings)
    if (
      JSON.stringify(storyProofs[0].observations.leaderPosition) !==
        JSON.stringify(storyProofs[1].observations.leaderPosition) &&
      !(
        comparison.storyTiming?.status === 'passed' &&
        JSON.stringify(comparison.storyTiming.interruptedRoute?.gameHold) ===
          JSON.stringify(storyProofs[0].observations.leaderPosition) &&
        JSON.stringify(comparison.storyTiming.interruptedRoute?.reforgeHold) ===
          JSON.stringify(storyProofs[1].observations.leaderPosition)
      )
    )
      comparison.findings.push({
        type: 'boat-leader-dialogue-position',
        game: storyProofs[0].observations.leaderPosition,
        reforge: storyProofs[1].observations.leaderPosition,
      })
  }
  for (const { report, artifactBinding } of loaded)
    if (artifactBinding.status !== 'verified')
      comparison.findings.push({
        type: 'evidence-gap',
        engine: report.engine,
        field: 'recorded-artifact-binding',
        missing: artifactBinding.missing,
      })
  const capabilityAudit = loaded.map(({ report, trace }) => ({
    engine: report.engine,
    obligations: inspectTraceCapabilities(
      fragment,
      { ...trace, actions: report.actions },
      report.engine === 'phase1-game' ? 'game' : report.engine,
    ),
  }))
  for (const { engine, obligations } of capabilityAudit)
    for (const obligation of obligations)
      if (obligation.status === 'unknown')
        comparison.findings.push({
          type: 'evidence-gap',
          engine,
          field: obligation.id,
          missing: obligation.missing,
        })
  // Recheck bytes before publication so a concurrently replaced input cannot acquire this verdict.
  assert.deepEqual(
    await hashRepositoryFiles(root, paths),
    current,
    'verifier or semantic source changed during comparison',
  )
  for (const recording of recordings)
    for (const input of [recording.report, recording.trace])
      assert.equal(await hashFile(input.path), input.sha256, 'raw input changed during comparison')
  for (const proof of storyProofs)
    for (const artifact of proof.artifacts)
      assert.equal(
        await hashFile(artifact.path),
        artifact.sha256,
        'specialized raw input changed during comparison',
      )
  return {
    kind: 'archived-recording-recomparison',
    fragment,
    status: comparison.findings.length ? 'needs-review' : 'passed',
    scope:
      'Verdict on these recorded journeys; source changes require impact review, not automatic rerecording or current-runtime certification.',
    recordings,
    currentRecordedSources,
    currentSemanticSources: Object.fromEntries(semanticPaths.map((path) => [path, current[path]])),
    verifier: {
      entry: 'scripts/e2e/recompare-recording.mjs',
      inventoryScope:
        'transitive local imports plus explicit contract/semantic inputs and dependency lockfile',
      external: verifierGraph.external,
      sources: verifierSources,
      sha256: createHash('sha256').update(JSON.stringify(verifierSources)).digest('hex'),
    },
    sourceChanges,
    capabilityAudit,
    storyProofs,
    comparison,
  }
}

/** Every live dual-track entry publishes this same offline acceptance, not a parallel verdict. */
export async function assertRecordedStoryParity({
  fragment,
  gameReportPath,
  reforgeReportPath,
  output,
}) {
  const result = await recompareRecording(fragment, gameReportPath, reforgeReportPath)
  const artifact = await writeEvidenceArtifact(dirname(output), basename(output), result)
  const comparison = { ...result.comparison, receipt: { ...artifact, path: resolve(output) } }
  if (result.status !== 'passed') {
    const error = new Error(`${fragment} independent recording acceptance: ${result.status}`)
    error.comparison = comparison
    throw error
  }
  return comparison
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [fragment, game, reforge, output, ...extra] = process.argv.slice(2)
  assert(
    fragment && game && reforge && output && !extra.length,
    'usage: recompare-recording.mjs FRAGMENT GAME_REPORT REFORGE_REPORT NEW_OUTPUT_JSON',
  )
  const result = await recompareRecording(fragment, game, reforge)
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
  if (result.status !== 'passed') process.exitCode = 1
  console.log(
    `${fragment} offline: ${result.status}; ${result.comparison.findings.length} findings; ${result.sourceChanges.length} recorded-source changes to review; ${output}`,
  )
}
