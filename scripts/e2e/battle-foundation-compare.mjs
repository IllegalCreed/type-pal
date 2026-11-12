import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isDeepStrictEqual as same } from 'node:util'
import { compareBattleRepeats, compareBattleTraces } from './battle-comparison.mjs'
import {
  BATTLE_FOUNDATION_SCENARIOS,
  battleFoundationInputSources,
  battleFoundationScenario,
} from './battle-foundation-scenarios.mjs'
import { validateBattlePresentation } from './battle-presentation.mjs'
import { validateBattleRules } from './battle-rules.mjs'
import { readEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { assertDependencyClosure, recordingDependencies } from './evidence-dependencies.mjs'
import { assertInputLedger } from './input-ledger.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const expectedRunIds = BATTLE_FOUNDATION_SCENARIOS.flatMap(({ id }) => [
  `${id}-1`,
  `${id}-2`,
]).sort()
const herbPlacement = ({ heals }) =>
  heals.map(({ actorId, targetId, casterBase, targetBase, draw }) => ({
    actorId,
    targetId,
    casterBase,
    targetBase,
    number: { right: draw.right, birthY: draw.y + draw.age },
  }))

/** Rejudge original hash-bound bytes. A runner's status never substitutes for business evidence. */
export async function compareBattleReports(gamePath, reforgePath) {
  const bundles = []
  for (const [engine, path] of [
    ['game', gamePath],
    ['reforge', reforgePath],
  ]) {
    const absolute = resolve(path)
    const bytes = await readFile(absolute)
    const report = JSON.parse(bytes)
    assert.equal(report.engine, engine)
    assert.equal(report.counter, 'none', 'a counter cannot be published as a normal execution')
    assert.equal(report.profile, 'verify', 'review capture is separate from verification')
    assert.equal(report.status, 'passed', 'execution did not finish cleanly')
    assert.equal(report.errors.length, 0, 'execution contains runtime errors')
    assert.equal(report.dependencies?.definition?.entry, 'scripts/e2e/battle-foundation.mjs')
    assert.equal(
      report.dependencies.definition.traceConfig,
      `scripts/e2e/battle-${engine}.config.mts`,
    )
    assert.equal(report.dependencies.definition.packageName, engine)
    for (const path of await battleFoundationInputSources(root))
      assert(
        report.dependencies.definition.declared.includes(path),
        `input omitted from receipt: ${path}`,
      )
    const current = await recordingDependencies(root, report.dependencies.definition)
    assertDependencyClosure(report.dependencies, current)
    assert.deepEqual(
      report.dependencies.hashes,
      current.hashes,
      'stale producer/input/judge dependencies; rerun the frozen candidate',
    )
    assert.deepEqual(
      report.hashes,
      current.hashes,
      'report hash summary differs from dependency receipt',
    )
    assertInputLedger(report.actions, { requireReceipts: true })
    assert.equal(report.inputExecution?.status, 'passed')
    assert.equal(report.inputExecution.actions, report.actions.length)
    assert.deepEqual(
      report.contexts.map(({ label }) => label).sort(),
      expectedRunIds,
      'missing distinct fresh contexts',
    )
    for (const context of report.contexts) {
      assert.deepEqual(context.initialDatabases, [])
      assert(
        report.actions.some((action) => action.context === context.label),
        `no real input receipt: ${context.label}`,
      )
    }
    const traces = new Map()
    const traceBindings = []
    for (const entry of report.results) {
      const { value, binding, sha256, byteLength } = await readEvidenceArtifact(
        dirname(absolute),
        entry.trace,
      )
      assert.equal(binding.status, 'verified')
      assert.equal(value.engine, engine)
      assert.equal(value.runId, entry.runId)
      assert.equal(value.scenarioId, entry.scenarioId)
      for (const [commandIndex, command] of battleFoundationScenario(
        entry.scenarioId,
      ).expected.commands.entries())
        if (command.cancelTargetId)
          assert(
            report.actions.some(
              (input) =>
                input.context === entry.runId &&
                input.commandIndex === commandIndex &&
                input.key === 'Escape' &&
                input.execution.status === 'completed',
            ),
            `no completed physical target cancellation: ${entry.runId}/${commandIndex}`,
          )
      assert(!traces.has(value.runId), 'duplicate execution identity')
      traces.set(value.runId, value)
      traceBindings.push({
        runId: value.runId,
        scenarioId: value.scenarioId,
        path: entry.trace.path,
        sha256,
        byteLength,
      })
    }
    bundles.push({
      report,
      traces,
      path: absolute,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      byteLength: bytes.length,
      traceBindings,
    })
  }
  const [game, reforge] = bundles
  for (const source of [
    'scripts/e2e/battle-foundation-scenarios.mjs',
    'scripts/e2e/battle-comparison.mjs',
    'scripts/e2e/battle-presentation.mjs',
    'scripts/e2e/battle-casualty-presentation.mjs',
    'scripts/e2e/battle-random-instrumentation.mjs',
    'scripts/e2e/battle-rules.mjs',
    'scripts/e2e/battle-trace-contract.mjs',
    'scripts/e2e/battle-trace-observer.mjs',
  ]) {
    assert.match(
      game.report.hashes[source] ?? '',
      /^[a-f0-9]{64}$/,
      `missing source identity: ${source}`,
    )
    assert.equal(
      game.report.hashes[source],
      reforge.report.hashes[source],
      `paired judge/source changed: ${source}`,
    )
  }
  const results = []
  for (const { id } of BATTLE_FOUNDATION_SCENARIOS) {
    const scenario = battleFoundationScenario(id)
    const paired = ['1', '2'].map((index) => {
      const runId = `${id}-${index}`
      const left = game.traces.get(runId),
        right = reforge.traces.get(runId)
      assert(left && right, `missing fresh paired execution ${runId}`)
      const setup = bundles.map(({ report }) =>
        report.results
          .find((entry) => entry.runId === runId)
          .initial.nativePlayers.map(({ gameRole: _gameRole, ...player }) => player),
      )
      assert.deepEqual(setup[0], setup[1], `paired effective equipment/stats differ: ${runId}`)
      const comparison = compareBattleTraces(left, right, scenario)
      const presentation = [left, right].map((trace) => validateBattlePresentation(trace, scenario))
      for (const side of presentation)
        for (const finding of side.findings)
          comparison.findings.push({ engine: side.engine, ...finding })
      const [leftHerb, rightHerb] = presentation.map(herbPlacement)
      if (!same(leftHerb, rightHerb))
        comparison.findings.push({
          domain: 'business',
          rule: 'cross-engine-herb-placement',
          game: leftHerb,
          reforge: rightHerb,
        })
      const rules = [left, right].flatMap((trace, index) =>
        comparison.validations[index].status === 'passed'
          ? [validateBattleRules(trace, scenario)]
          : [],
      )
      for (const side of rules)
        for (const finding of side.findings)
          comparison.findings.push({ engine: side.engine, ...finding })
      if (comparison.randomObservation?.firstValueDifference)
        comparison.findings.push({
          domain: 'business',
          rule: 'cross-engine-rule-random-value',
          ...comparison.randomObservation.firstValueDifference,
        })
      return {
        ...comparison,
        status: comparison.findings.length ? 'rejected' : 'passed',
        presentation,
        rules,
      }
    })
    const repeats = bundles.map(({ traces }) =>
      compareBattleRepeats(traces.get(`${id}-1`), traces.get(`${id}-2`), scenario),
    )
    results.push({ scenarioId: id, paired, repeats })
  }
  assert.equal(
    game.traces.size,
    expectedRunIds.length,
    'unexpected Game execution outside the matrix',
  )
  assert.equal(
    reforge.traces.size,
    expectedRunIds.length,
    'unexpected Reforge execution outside the matrix',
  )
  return {
    kind: 'battle-foundation-comparison',
    schemaVersion: 1,
    status: results.every((entry) =>
      [...entry.paired, ...entry.repeats].every((result) => result.status === 'passed'),
    )
      ? 'passed'
      : 'rejected',
    reports: bundles.map(({ path, report, sha256, byteLength, traceBindings }) => ({
      engine: report.engine,
      path,
      sha256,
      byteLength,
      traces: traceBindings,
      revision: report.revision,
      hashes: report.hashes,
    })),
    results,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(
    process.argv.length,
    5,
    'usage: node battle-foundation-compare.mjs game/report.json reforge/report.json output-directory',
  )
  const result = await compareBattleReports(process.argv[2], process.argv[3])
  const out = resolve(process.argv[4])
  await mkdir(out, { recursive: true })
  console.log(JSON.stringify(await writeEvidenceArtifact(out, 'comparison.json', result)))
  assert.equal(result.status, 'passed', JSON.stringify(result.results))
}
