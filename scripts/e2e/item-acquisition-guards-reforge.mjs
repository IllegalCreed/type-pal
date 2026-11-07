import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { readBoundStoryRecording } from './bound-story-recording.mjs'
import { repoRoot, runBrowserJourney } from './browser-journey.mjs'
import { assertErrandCollector, errandSaveView } from './errand-contract.mjs'
import { readErrandReforge } from './errand-observer.mjs'
import { readEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import {
  assertDependencyClosure,
  hashRepositoryFiles,
  recordingDependencies,
} from './evidence-dependencies.mjs'
import { fairyIslandMazeObserverScript } from './fairy-island-maze-reforge-trace.mjs'
import { fairyIslandPoolObserverScript } from './fairy-island-pool-reforge-trace.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'
import {
  assertItemGuardRepeats,
  assertItemGuardSeed,
  ITEM_GUARD_SAMPLES,
} from './item-acquisition-guard-contract.mjs'
import { kitchenReady } from './kitchen-contract.mjs'
import {
  readLongEvidenceArchive,
  readLongEvidenceArtifact,
  writeLongEvidenceArtifact,
} from './long-evidence.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { assertReforgeRestoreInput } from './restore-input-contract.mjs'

const { values: options } = parseArgs({
  options: {
    from: { type: 'string' },
    headed: { type: 'boolean' },
    headless: { type: 'boolean' },
  },
})
assert(options.from, 'item guards require --from a current formal 008 or 009 Reforge report')
assert(!(options.headed && options.headless), 'choose one browser mode')
const reportPath = resolve(options.from)
const directory = dirname(reportPath)
const supplied = await readEvidenceArtifact(directory, { path: basename(reportPath) })
const { fragment } = supplied.value
assert(['008', '009'].includes(fragment), 'item guards accept only native 008/009 seeds')
const source = await readBoundStoryRecording({
  path: reportPath,
  engine: 'reforge',
  fragment,
  readTrace: readLongEvidenceArtifact,
  assertTrace: assertErrandCollector,
})
assert.equal(source.files[0].sha256, supplied.sha256, 'source report changed during preflight')
assert.equal(source.report.sourceHashesStable, true)
const expectedEntities = Object.entries(ITEM_GUARD_SAMPLES)
  .filter(([, sample]) => sample.fragment === fragment)
  .map(([entity]) => entity)
assert.deepEqual(
  source.report.itemGuardSeeds?.map(({ entity }) => entity).sort(),
  [...expectedEntities].sort(),
  'normal route did not capture every required native guard seed',
)
const dependencies = await recordingDependencies(repoRoot, source.report.dependencies.definition)
assertDependencyClosure(source.report.dependencies, dependencies)
assert.deepEqual(dependencies.hashes, source.report.hashes, 'guard source candidate changed')
const seeds = []
for (const seed of source.report.itemGuardSeeds) {
  assert.equal(seed.source, 'normal-route:dumpSave')
  const artifact = await readEvidenceArtifact(directory, seed.checkpoint)
  assert.equal(artifact.binding.status, 'verified')
  const sample = assertItemGuardSeed(artifact.value, seed.entity)
  const completed = source.trace.causes.filter(
    (event) =>
      event.phase === 'run-started' &&
      event.author?.entity === seed.entity &&
      event.author?.scene === sample.scene &&
      event.author?.channel === 'trigger' &&
      event.order < seed.captureOrder,
  )
  assert.equal(completed.length, 1, 'guard seed lacks its unique actual acquisition trigger')
  assert(
    source.trace.causes.some(
      (event) =>
        event.phase === 'run-ended' &&
        event.runId === completed[0].runId &&
        !event.aborted &&
        event.order <= seed.captureOrder,
    ),
    'guard seed was captured before acquisition finished',
  )
  const party = source.trace.events.findLast(
    (event) =>
      event.kind === 'actor' &&
      event.id === 'party' &&
      event.scene === sample.scene &&
      event.order <= seed.captureOrder,
  )
  assert.deepEqual(party?.state.position, sample.position, 'seed moved away from native route')
  seeds.push({ ...seed, artifact, sample })
}
const locale = JSON.parse(await readFile(resolve(repoRoot, 'projects/pal/content/locale.json')))
const ready = (state) => kitchenReady(state, 'reforge') && !state.runtime.dialogueSlots?.length

await runBrowserJourney({
  name: `reforge-${fragment}-item-guards`,
  packageName: '@type-pal/reforge',
  environment: { VITE_PROJECT_ID: 'pal' },
  traceConfig:
    fragment === '008'
      ? 'scripts/e2e/fairy-island-maze-reforge.config.mts'
      : 'scripts/e2e/fairy-island-pool-reforge.config.mjs',
  arguments: [options.headed ? '--headed' : '--headless'],
  viewport: { width: 1280, height: 800 },
  initScripts: [
    fragment === '008' ? fairyIslandMazeObserverScript() : fairyIslandPoolObserverScript(),
  ],
  sources: Object.keys(source.report.hashes),
  journey: async ({ newPage, baseURL, out, report, until }) => {
    Object.assign(report, {
      fragment,
      engine: 'reforge',
      case: 'item-guards',
      kind: 'verify',
      source: { report: reportPath, sha256: supplied.sha256, artifacts: source.files },
      traceScope:
        'Separate native saved-world guard contexts. Original story inputs and routes are unchanged.',
      samples: [],
      contextTraces: [],
    })
    for (const seed of seeds) {
      let bytes = await readFile(seed.artifact.path)
      let payload = seed.artifact.value
      const result = { entity: seed.entity, seed: seed.checkpoint, contexts: [] }
      report.samples.push(result)
      // The second browser starts from the first browser's real native post-repeat save.
      for (const lifecycle of ['collected-restore', 'repeated-fresh-restore']) {
        const label = `${seed.entity}-${lifecycle}`
        const page = await newPage(label)
        const snapshot = () => page.evaluate(readErrandReforge)
        const drive = () => page.evaluate(() => window.__readErrandDrive(Number.MAX_SAFE_INTEGER))
        const press = (reason) =>
          pressRecordedKey({
            keyboard: page.keyboard,
            action: canonicalInput({
              phase: label,
              scene: seed.sample.scene,
              key: 'Enter',
              reason,
            }),
            record: (action) => report.actions.push(action),
          })
        try {
          await page.route('**/__item-guard.json', (route) =>
            route.fulfill({ contentType: 'application/json', body: bytes }),
          )
          await page.goto(`${baseURL}/?e2e-load=%2F__item-guard.json`)
          const restored = await until(
            snapshot,
            (state) =>
              state.boot?.checkpointLoad === 'loaded' &&
              state.scene === seed.sample.scene &&
              ready(state),
            `${label} native checkpoint restored`,
            60_000,
          )
          assert.deepEqual(restored.position, seed.sample.position)
          assert.equal(restored.facing, seed.sample.facing)
          const initial = await readLongEvidenceArchive(page)
          assertErrandCollector(initial, label)
          const proof = assertReforgeRestoreInput(initial, payload)
          assert.deepEqual(
            errandSaveView(initial.restoreCommits[0].payload, 'reforge'),
            errandSaveView(payload, 'reforge'),
          )
          await waitForOpeningFrame(page, until)
          const ranges = []
          for (let repeat = 1; repeat <= 2; repeat++) {
            const start = await drive()
            const range = { startOrder: start.order }
            await press(`repeat collected ${seed.entity} (${repeat})`)
            if (seed.sample.emptyText) {
              const shown = await until(
                snapshot,
                (state) => state.runtime?.dialogue?.phase === 'waiting-input',
                `${label} empty prompt`,
              )
              assert.deepEqual(shown.runtime.dialogue.pageTextIds, [seed.sample.emptyText])
              await waitForOpeningFrame(page, until)
              await page.screenshot({ path: resolve(out, `${label}-${repeat}.png`) })
              await press('confirm original empty prompt')
              await until(snapshot, ready, `${label} empty prompt completed`)
            } else {
              await until(
                drive,
                (next) => next.worldRender?.tick > start.worldRender.tick + 2,
                `${label} native input and subsequent world ticks`,
              )
              assert(ready(await snapshot()), 'collected visible object started a script or prompt')
            }
            await waitForOpeningFrame(page, until)
            range.endOrder = (await drive()).order
            ranges.push(range)
          }
          const after = await page.evaluate(() => window.__tpE2e.dumpSave())
          const trace = await readLongEvidenceArchive(page)
          assertErrandCollector(trace, label)
          const assertions = assertItemGuardRepeats({
            trace,
            entity: seed.entity,
            ranges,
            before: payload,
            after,
            locale,
          })
          const checkpoint = await writeEvidenceArtifact(out, `${label}.save.json`, after)
          const raw = await writeLongEvidenceArtifact(out, `${label}.trace.json`, trace)
          report.contextTraces.push(raw)
          await page.screenshot({ path: resolve(out, `${label}-ready.png`) })
          result.contexts.push({ label, proof, assertions, checkpoint, trace: raw })
          payload = after
          bytes = await readFile(resolve(out, checkpoint.path))
        } catch (error) {
          await page.screenshot({ path: resolve(out, `${label}-failed.png`) }).catch(() => {})
          try {
            report.contextTraces.push(
              await writeLongEvidenceArtifact(
                out,
                `${label}-failed.trace.json`,
                await readLongEvidenceArchive(page),
              ),
            )
          } catch (captureError) {
            report.errors.push({ label, capture: String(captureError) })
          }
          throw error
        } finally {
          await page.close()
        }
      }
    }
    assert.deepEqual(
      await hashRepositoryFiles(repoRoot, Object.keys(report.hashes)),
      report.hashes,
      'guard sources changed during native run',
    )
    assert.equal(
      (await readEvidenceArtifact(directory, { path: basename(reportPath) })).sha256,
      supplied.sha256,
      'normal-route report changed during native guard run',
    )
    for (const seed of seeds) await readEvidenceArtifact(directory, seed.checkpoint)
    report.sourceHashesStable = true
  },
})
