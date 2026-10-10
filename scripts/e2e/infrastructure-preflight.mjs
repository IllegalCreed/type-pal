import assert from 'node:assert/strict'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  AUTOMATIC_LANGUAGE_BINDINGS,
  automaticLanguageGraphs,
} from './automatic-language-receipts.mjs'
import { commandDomain } from './command-obligations.mjs'
import {
  hashRepositoryFiles,
  localDependencyGraph,
  recordingDependencies,
} from './evidence-dependencies.mjs'
import { readNpcTrace } from './npc-transition-contract.mjs'
import { inspectTraceCapabilities } from './obligation-registry.mjs'
import { CAUSAL_TARGETS, instrumentOpeningCausalTrace } from './opening-causal-instrumentation.mjs'
import { producerExtraInputs } from './producer-inputs.mjs'
import { readStoryContract, STORY_PRODUCERS } from './recorded-story-contract.mjs'
import { expectedScriptCommands } from './script-execution-contract.mjs'
import { storyExecutionSpecifications } from './story-execution-specs.mjs'

/** Freeze-time census is separate from per-fragment producers: no seven-scene import at every recording entry. */
export async function infrastructurePreflight(root) {
  const automaticLanguages = AUTOMATIC_LANGUAGE_BINDINGS.map((binding) => {
    const graphs = automaticLanguageGraphs(binding)
    return {
      ...binding,
      source: graphs.label,
      stage: graphs.stage,
      pairs: graphs.proof.pairs,
      status: graphs.proof.status,
      note: 'Static preflight only; actual receipts required by acceptance.',
    }
  })
  const fragments = ['001', '002', '003', '004', '005', '006'],
    paths = new Set(),
    contracts = []
  for (const file of CAUSAL_TARGETS) {
    instrumentOpeningCausalTrace(await readFile(resolve(root, file), 'utf8'), file)
    paths.add(file)
  }
  for (const fragment of fragments) {
    const contract = await readStoryContract(fragment, root)
    const executions = storyExecutionSpecifications(fragment).map((spec) => ({
      name: spec.name,
      commands: expectedScriptCommands(spec).map((e) => ({
        domain: commandDomain(e.command),
        path: e.path,
        kind: e.command.kind === 'leaf' ? e.command.command.kind : e.command.kind,
      })),
    }))
    const producers = []
    for (const engine of ['game', 'reforge']) {
      const dependencies = await recordingDependencies(root, {
        ...STORY_PRODUCERS[fragment](engine),
        packageName: engine,
        declared: [...Object.keys(contract.hashes), ...producerExtraInputs(fragment, engine)],
      })
      for (const path of Object.keys(dependencies.hashes)) paths.add(path)
      producers.push({
        engine,
        entry: dependencies.definition.entry,
        files: Object.keys(dependencies.hashes).length,
      })
    }
    contracts.push({ fragment, executions, producers })
  }
  const graph = await localDependencyGraph(root, [
    'scripts/e2e/infrastructure-preflight.mjs',
    'scripts/e2e/continuous-acceptance.mjs',
    'scripts/e2e/trace-prototype-check.mjs',
  ])
  for (const path of graph.files) paths.add(path)
  const sources = await hashRepositoryFiles(root, [...paths].sort())
  const directory = resolve(root, 'build/e2e'),
    latest = new Map()
  for (const entry of (await readdir(directory, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    if (!/^(game|reforge)-00[1-6]-/u.test(entry.name)) continue
    const path = resolve(directory, entry.name, 'report.json')
    let report
    try {
      report = JSON.parse(await readFile(path, 'utf8'))
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    if (report.status !== 'passed' || (report.case && report.case !== 'story')) continue
    const engine = report.engine === 'phase1-game' ? 'game' : report.engine
    if (!fragments.includes(report.fragment) || !['game', 'reforge'].includes(engine)) continue
    latest.set(`${report.fragment}/${engine}`, path)
  }
  const recordings = []
  for (const fragment of fragments)
    for (const engine of ['game', 'reforge']) {
      const path = latest.get(`${fragment}/${engine}`)
      if (!path) {
        recordings.push({
          fragment,
          engine,
          required: 'capture',
          reason: 'no passed independent story',
        })
        continue
      }
      try {
        const loaded = await readNpcTrace(path)
        const missing = inspectTraceCapabilities(
          fragment,
          { ...loaded.trace, actions: loaded.report.actions },
          engine,
        ).filter((o) => o.status === 'unknown')
        recordings.push({
          fragment,
          engine,
          report: path,
          reportSha256: loaded.reportSha256,
          traceSha256: loaded.traceSha256,
          artifactBinding: loaded.artifactBinding.status,
          missing,
          required:
            missing.length || loaded.artifactBinding.status !== 'verified'
              ? 'recapture'
              : 'offline-recompare',
          note: 'Availability only; never grants story or dual-track acceptance.',
        })
      } catch (error) {
        recordings.push({
          fragment,
          engine,
          report: path,
          required: 'recapture',
          reason: String(error),
        })
      }
    }
  assert.deepEqual(
    await hashRepositoryFiles(root, Object.keys(sources)),
    sources,
    'preflight sources changed',
  )
  return {
    kind: 'e2e-infrastructure-preflight',
    status: 'passed',
    scope:
      'finite author language, actual instrumentation anchors, twelve producer dependency closures; archival availability census, not runtime acceptance',
    contracts,
    automaticLanguages,
    recordings,
    sources,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [output, ...extra] = process.argv.slice(2)
  assert(output && !extra.length, 'usage: infrastructure-preflight.mjs NEW_OUTPUT_JSON')
  const result = await infrastructurePreflight(fileURLToPath(new URL('../../', import.meta.url)))
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
  console.log(
    JSON.stringify(
      {
        status: result.status,
        contracts: result.contracts.map((c) => ({
          fragment: c.fragment,
          runs: c.executions.length,
          producers: c.producers,
        })),
        recordings: result.recordings,
      },
      null,
      2,
    ),
  )
}
