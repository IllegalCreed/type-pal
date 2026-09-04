import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { serialize } from 'node:v8'
import { createServer } from 'vite'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const argument = (name: string): string | undefined => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}
const projectRoot = resolve(repoRoot, argument('--project') ?? 'projects/pal')
const samples = Number(argument('--samples') ?? 20)
if (!Number.isSafeInteger(samples) || samples <= 0) throw new Error('--samples 必须是正整数')

const vite = await createServer({
  root: repoRoot,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

const percentile = (values: readonly number[], p: number): number => {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]!
}
const stats = (values: readonly number[]) => ({
  n: values.length,
  samplesMs: values.map((value) => Number(value.toFixed(3))),
  minMs: Number(Math.min(...values).toFixed(3)),
  p50Ms: Number(percentile(values, 0.5).toFixed(3)),
  p95Ms: Number(percentile(values, 0.95).toFixed(3)),
  maxMs: Number(Math.max(...values).toFixed(3)),
  meanMs: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3)),
})
const timed = <T,>(run: () => T): { value: T; ms: number } => {
  const started = performance.now()
  return { value: run(), ms: performance.now() - started }
}
const timedAsync = async <T,>(run: () => Promise<T>): Promise<{ value: T; ms: number }> => {
  const started = performance.now()
  return { value: await run(), ms: performance.now() - started }
}
const jsonReplacer = (_key: string, value: unknown): unknown =>
  value instanceof Map ? [...value] : value
const jsonBytes = (value: unknown): number => {
  const json = JSON.stringify(value, jsonReplacer)
  return json === undefined ? 0 : Buffer.byteLength(json)
}
const v8Bytes = (value: unknown): number => serialize(value).byteLength
const sumPairs = (pairs: readonly [string, readonly unknown[]][]): number =>
  pairs.reduce((sum, [, references]) => sum + references.length, 0)

try {
  const loader = await vite.ssrLoadModule('/packages/reforge/src/project-loader.ts')
  const { loadProjectMap } = await vite.ssrLoadModule('/packages/reforge/src/assets.ts')
  const { EditSession } = await vite.ssrLoadModule('/packages/editor/src/core/edit-session.ts')
  const { toEditorState } = await vite.ssrLoadModule('/packages/editor/src/core/project-io.ts')
  const { collectEditorDiagnosticsSnapshot } = await vite.ssrLoadModule(
    '/packages/editor/src/core/project-diagnostics.ts',
  )
  const { createEditorDerivedWorkerRuntime } = await vite.ssrLoadModule(
    '/packages/editor/src/core/editor-derived-core.ts',
  )
  const { editorDiagnosticState } = await vite.ssrLoadModule(
    '/packages/editor/src/core/editor-derived-store.ts',
  )
  const {
    buildCanonicalSchemeReferenceIndexesFromVisits,
    collectCanonicalScriptCommandVisits,
    collectCanonicalScriptTransitionVisits,
    collectCanonicalSharedScriptReferencesFromVisits,
  } = await vite.ssrLoadModule('/packages/editor/src/core/script-editor.ts')
  const { projectCurrentAuthorReferenceSlices, scriptEditorStateFromCurrentAuthorSlices } =
    await vite.ssrLoadModule('/packages/editor/src/core/script-editor-projection.ts')
  const { collectEntityAddressReferences } = await vite.ssrLoadModule(
    '/packages/editor/src/core/entity-address-references.ts',
  )
  const { collectEditorAssetReferences } = await vite.ssrLoadModule(
    '/packages/editor/src/core/editor-asset-references.ts',
  )
  const { collectWorldVariableReferencesV1FromVisits } = await vite.ssrLoadModule(
    '/packages/editor/src/core/world-variable-references.ts',
  )
  const { buildMapReferenceEdgeBatch, extractProjectStampReferenceFacts } =
    await vite.ssrLoadModule('/packages/editor/src/core/map-reference-facts.ts')
  const {
    actorReferenceEdges,
    assetReferenceEdges,
    battleDataReferenceEdges,
    buildProjectReferenceSnapshotFromProjection,
    canonicalSchemeReferenceEdges,
    canonicalCommandTargetEdges,
    entityAddressReferenceEdges,
    itemReferenceEdges,
    legacyScriptChunkTargetEdges,
    sharedScriptReferenceEdges,
    spriteReferenceEdges,
    structuralProjectReferenceEdges,
    worldVariableReferenceEdges,
  } = await vite.ssrLoadModule('/packages/editor/src/core/project-reference-adapters.ts')
  const { buildProjectReferenceSnapshot, createProjectReferenceIndex } = await vite.ssrLoadModule(
    '/packages/editor/src/core/project-reference.ts',
  )

  const source = {
    async readText(path: string): Promise<string> {
      return readFile(resolve(projectRoot, path), 'utf8')
    },
    async readJson(path: string): Promise<unknown> {
      return JSON.parse(await readFile(resolve(projectRoot, path), 'utf8')) as unknown
    },
    async readBytes(path: string): Promise<ArrayBuffer> {
      const bytes = await readFile(resolve(projectRoot, path))
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    },
    async urlFor(path: string): Promise<string> {
      return `file://${resolve(projectRoot, path)}`
    },
  }

  const setupStarted = performance.now()
  const project = await loader.loadCurrentProjectFrom(source)
  const scenes = await loader.loadAllAuthorScenes(project)
  const stamps = await loader.loadStampTemplates(project)
  const state = toEditorState(project, scenes, {}, {}, stamps)
  const canonical = {
    scenes: structuredClone(scenes),
    items: structuredClone(project.authorContent.items),
    sharedScripts: structuredClone(project.authorContent.sharedScripts),
  }
  const input = { state: editorDiagnosticState(state), canonical }
  const setupMs = performance.now() - setupStarted

  const author = projectCurrentAuthorReferenceSlices(canonical, state)
  const currentAuthorState = {
    ...state,
    scenes: author.scenes,
    items: author.items,
    sharedScripts: author.sharedScripts,
  }
  const scriptState = scriptEditorStateFromCurrentAuthorSlices(canonical, author)
  const commandVisits = collectCanonicalScriptCommandVisits(scriptState)
  const transitionVisits = collectCanonicalScriptTransitionVisits(scriptState)
  const entityAddressReferences = collectEntityAddressReferences(currentAuthorState)
  const assetReferenceRun = timed(() => collectEditorAssetReferences(currentAuthorState))
  const worldVariableReferenceRun = timed(() =>
    collectWorldVariableReferencesV1FromVisits(scriptState, commandVisits),
  )
  const canonicalSchemeReferenceRun = timed(() =>
    buildCanonicalSchemeReferenceIndexesFromVisits(scriptState, commandVisits),
  )
  const sharedScriptReferenceRun = timed(() =>
    collectCanonicalSharedScriptReferencesFromVisits(scriptState, commandVisits),
  )
  const structuralEdgeRun = timed(() => structuralProjectReferenceEdges(currentAuthorState))
  const canonicalEdgeRun = timed(() => canonicalCommandTargetEdges(commandVisits, scriptState))
  const legacyEdgeRun = timed(() => legacyScriptChunkTargetEdges(currentAuthorState.scriptChunks))
  const battleDataEdgeRun = timed(() =>
    battleDataReferenceEdges(currentAuthorState, commandVisits, scriptState),
  )
  const actorEdgeRun = timed(() =>
    actorReferenceEdges(currentAuthorState, commandVisits, transitionVisits, scriptState),
  )
  const itemEdgeRun = timed(() =>
    itemReferenceEdges(currentAuthorState, commandVisits, transitionVisits, scriptState),
  )
  const spriteEdgeRun = timed(() =>
    spriteReferenceEdges(currentAuthorState, commandVisits, scriptState),
  )
  const assetEdgeRun = timed(() =>
    assetReferenceEdges(currentAuthorState, assetReferenceRun.value, commandVisits, scriptState),
  )
  const worldVariableEdgeRun = timed(() =>
    worldVariableReferenceEdges(worldVariableReferenceRun.value, scriptState),
  )
  const canonicalSchemeEdgeRun = timed(() =>
    canonicalSchemeReferenceEdges(canonicalSchemeReferenceRun.value, scriptState),
  )
  const sharedScriptEdgeRun = timed(() =>
    sharedScriptReferenceEdges(sharedScriptReferenceRun.value, scriptState),
  )
  const entityEdgeRun = timed(() => entityAddressReferenceEdges(entityAddressReferences))
  const compactRun = timed(() =>
    buildProjectReferenceSnapshot(
      [
        ...structuralEdgeRun.value,
        ...canonicalEdgeRun.value,
        ...legacyEdgeRun.value,
        ...battleDataEdgeRun.value,
        ...actorEdgeRun.value,
        ...itemEdgeRun.value,
        ...spriteEdgeRun.value,
        ...assetEdgeRun.value,
        ...worldVariableEdgeRun.value,
        ...canonicalSchemeEdgeRun.value,
        ...sharedScriptEdgeRun.value,
        ...entityEdgeRun.value,
      ],
      { assumeUnique: true },
    ),
  )
  const referenceBuildSamples = Array.from(
    { length: samples },
    () =>
      timed(() =>
        buildProjectReferenceSnapshotFromProjection({
          state: currentAuthorState,
          scriptState,
          commandVisits,
          transitionVisits,
          entityAddressReferences,
          assetReferences: assetReferenceRun.value,
          worldVariableReferences: worldVariableReferenceRun.value,
          canonicalSchemeReferences: canonicalSchemeReferenceRun.value,
          sharedScriptReferences: sharedScriptReferenceRun.value,
        }),
      ).ms,
  )

  const firstSnapshot = timed(() => collectEditorDiagnosticsSnapshot(state, canonical))
  if (!isDeepStrictEqual(compactRun.value, firstSnapshot.value.projectReferences))
    throw new Error('分项引用边与生产快照不一致；benchmark 已漏算同步引用域')
  const snapshotSamples = Array.from(
    { length: samples },
    () => timed(() => collectEditorDiagnosticsSnapshot(state, canonical)).ms,
  )
  const request = {
    kind: 'init',
    epoch: 1,
    jobId: 1,
    revision: { mainHistoryVersion: 0, scriptHistoryVersion: 0 },
    input,
  }
  const firstDerived = timed(() => createEditorDerivedWorkerRuntime().handle(request))
  if (firstDerived.value.kind !== 'ready') throw new Error(firstDerived.value.message)
  const derived = firstDerived.value.data
  const derivedSamples = Array.from({ length: samples }, () => {
    const result = timed(() => createEditorDerivedWorkerRuntime().handle(request))
    if (result.value.kind !== 'ready') throw new Error(result.value.message)
    return result.ms
  })
  const inputCloneSamples = Array.from(
    { length: samples },
    () => timed(() => structuredClone(request)).ms,
  )
  const outputCloneSamples = Array.from(
    { length: samples },
    () => timed(() => structuredClone(firstDerived.value)).ms,
  )
  const outputFields = Object.fromEntries(
    Object.entries(derived)
      .map(([name, value]) => [name, { json: jsonBytes(value), v8: v8Bytes(value) }] as const)
      .sort((left, right) => right[1].v8 - left[1].v8),
  )
  const projectReferences = derived.projectReferences
  const projectReferenceFields = Object.fromEntries(
    Object.entries(projectReferences)
      .map(([name, value]) => [name, { json: jsonBytes(value), v8: v8Bytes(value) }] as const)
      .sort((left, right) => right[1].v8 - left[1].v8),
  )
  const mapReferenceSession = new EditSession(state, {
    loadMap: (_mapId: string, path: string) => loadProjectMap(project.assetBase, path),
  })
  const mapReferenceScan = await timedAsync(() => mapReferenceSession.ensureMapReferencesIndexed())
  if (
    !mapReferenceScan.value.done ||
    mapReferenceScan.value.completed !== mapReferenceScan.value.total ||
    mapReferenceScan.value.failures.length !== 0 ||
    mapReferenceScan.value.facts.length !== mapReferenceScan.value.total ||
    mapReferenceScan.value.stampCompleted !== mapReferenceScan.value.stampTotal
  )
    throw new Error('异步地图引用扫描没有完整覆盖 PAL mapIndex')
  if (
    Object.keys(mapReferenceSession.getState().maps).length !== 0 ||
    mapReferenceSession.getHistoryVersion() !== 0 ||
    mapReferenceSession.getVersion() !== 0 ||
    mapReferenceSession.isDirty()
  )
    throw new Error('异步地图引用扫描污染了 EditorState、history、version 或 dirty')
  const mapReferenceBatchSamples = Array.from(
    { length: samples },
    () => timed(() => mapReferenceSession.getMapReferenceBatch()).ms,
  )
  const mapReferenceForcedBuildSamples = Array.from(
    { length: samples },
    () =>
      timed(() =>
        buildMapReferenceEdgeBatch({
          generation: mapReferenceScan.value.generation,
          running: false,
          mapIndex: state.mapIndex,
          facts: mapReferenceScan.value.facts,
          failures: [],
          stampFacts: mapReferenceScan.value.stampFacts,
          stampTotal: mapReferenceScan.value.stampTotal,
        }),
      ).ms,
  )
  const mapReferenceQuerySamples = Array.from(
    { length: samples },
    () =>
      timed(() =>
        createProjectReferenceIndex(mapReferenceScan.value.projectReferences).referencesTo({
          kind: 'tileset',
          id: 'tileset-001',
        }),
      ).ms,
  )
  const authoredStampProbe = {
    id: 'benchmark-stamp',
    name: 'Benchmark Stamp',
    origin: 'authored',
    width: 1,
    height: 1,
    anchor: { row: 0, col: 0 },
    tilesetRefs: ['tileset-001'],
    layers: [{ id: 'floor', name: 'Floor', tiles: [[0], [null]], sources: [[0], [null]] }],
    collision: [[null], [null]],
  }
  const authoredStampFactSamples = Array.from(
    { length: samples },
    () => timed(() => extractProjectStampReferenceFacts([authoredStampProbe])).ms,
  )
  const authoredStampFacts = extractProjectStampReferenceFacts([authoredStampProbe])
  const authoredStampBatch = buildMapReferenceEdgeBatch({
    generation: mapReferenceScan.value.generation,
    running: false,
    mapIndex: state.mapIndex,
    facts: mapReferenceScan.value.facts.map((fact: { mapId: string }) =>
      fact.mapId === state.mapIndex.maps[0]?.id
        ? {
            ...fact,
            stampSources: [
              ...(fact.stampSources ?? []),
              { placementId: 'benchmark-placement', sourceStampId: 'benchmark-stamp' },
            ],
          }
        : fact,
    ),
    failures: [],
    stampFacts: authoredStampFacts,
    stampTotal: 1,
  })
  const benchmarkCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim()
  const worktreeDirty =
    execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' }).trim()
      .length > 0

  console.log(
    JSON.stringify(
      {
        commit: benchmarkCommit,
        worktreeDirty,
        environment: { platform: process.platform, arch: process.arch, node: process.version },
        project: projectRoot,
        setupMs: Number(setupMs.toFixed(3)),
        snapshot: { firstMs: Number(firstSnapshot.ms.toFixed(3)), warm: stats(snapshotSamples) },
        derived: { firstMs: Number(firstDerived.ms.toFixed(3)), warm: stats(derivedSamples) },
        structuredClone: {
          initRequest: stats(inputCloneSamples),
          readyReply: stats(outputCloneSamples),
        },
        projectReferenceBuild: stats(referenceBuildSamples),
        asyncMapReferences: {
          source: 'Node file reads; lower bound for browser HTTP/FSA',
          initialScanMs: Number(mapReferenceScan.ms.toFixed(3)),
          cachedBatchBuild: stats(mapReferenceBatchSamples),
          forcedBatchBuild: stats(mapReferenceForcedBuildSamples),
          indexDecodeAndQuery: stats(mapReferenceQuerySamples),
          rows: mapReferenceScan.value.projectReferences.rows.length,
          completed: mapReferenceScan.value.completed,
          total: mapReferenceScan.value.total,
          failures: mapReferenceScan.value.failures.length,
          projectReferenceJsonBytes: jsonBytes(mapReferenceScan.value.projectReferences),
          fullBatchJsonBytes: jsonBytes(mapReferenceScan.value),
          stampFacts: mapReferenceScan.value.stampFacts.length,
          authoredStampProbe: {
            shape: 'one 1x1 authored stamp + one map placement',
            factCollect: stats(authoredStampFactSamples),
            rows: authoredStampBatch.projectReferences.rows.length,
            fullBatchJsonBytes: jsonBytes(authoredStampBatch),
          },
        },
        projectReferenceBuildBreakdown: {
          structuralMs: Number(structuralEdgeRun.ms.toFixed(3)),
          canonicalMs: Number(canonicalEdgeRun.ms.toFixed(3)),
          legacyMs: Number(legacyEdgeRun.ms.toFixed(3)),
          battleDataMs: Number(battleDataEdgeRun.ms.toFixed(3)),
          actorMs: Number(actorEdgeRun.ms.toFixed(3)),
          itemMs: Number(itemEdgeRun.ms.toFixed(3)),
          spriteMs: Number(spriteEdgeRun.ms.toFixed(3)),
          assetCollectMs: Number(assetReferenceRun.ms.toFixed(3)),
          assetMs: Number(assetEdgeRun.ms.toFixed(3)),
          worldVariableCollectMs: Number(worldVariableReferenceRun.ms.toFixed(3)),
          worldVariableMs: Number(worldVariableEdgeRun.ms.toFixed(3)),
          canonicalSchemeCollectMs: Number(canonicalSchemeReferenceRun.ms.toFixed(3)),
          canonicalSchemeMs: Number(canonicalSchemeEdgeRun.ms.toFixed(3)),
          sharedScriptCollectMs: Number(sharedScriptReferenceRun.ms.toFixed(3)),
          sharedScriptMs: Number(sharedScriptEdgeRun.ms.toFixed(3)),
          entityMs: Number(entityEdgeRun.ms.toFixed(3)),
          compactMs: Number(compactRun.ms.toFixed(3)),
        },
        payloadBytes: {
          initRequestJsonWithMapEntries: jsonBytes(request),
          initRequestV8: v8Bytes(request),
          readyReplyJsonWithMapEntries: jsonBytes(firstDerived.value),
          readyReplyV8: v8Bytes(firstDerived.value),
          outputFields,
          projectReferenceFields,
        },
        counts: {
          scenes: state.scenes.length,
          entities: state.scenes.reduce(
            (sum: number, scene: { entities: readonly unknown[] }) => sum + scene.entities.length,
            0,
          ),
          commandVisits: commandVisits.length,
          transitionVisits: transitionVisits.length,
          projectReferenceRows: projectReferences.rows.length,
          projectReferenceTargets: projectReferences.targets.length,
          projectReferenceSources: projectReferences.sources.length,
          projectReferenceRelations: projectReferences.relations.length,
          projectReferenceLocators: projectReferences.locators.length,
          projectReferenceTargetBuckets: projectReferences.targetEdgeIds.length,
          projectReferenceEmptyWhereSuffixes: projectReferences.rows.filter(
            (row: readonly number[]) => projectReferences.whereSuffixes[row[4]] === '',
          ).length,
          projectReferenceUniqueWhereSuffixes: projectReferences.whereSuffixes.length,
          projectReferenceWhereSuffixDictionaryJson: jsonBytes(projectReferences.whereSuffixes),
          assetReferences: assetReferenceRun.value.length,
          worldVariableReferences: firstSnapshot.value.worldVariableReferences.all.length,
          behaviorReferences: sumPairs([
            ...firstSnapshot.value.canonicalSchemeReferenceIndexes.behavior,
          ]),
          sceneHookReferences: sumPairs([
            ...firstSnapshot.value.canonicalSchemeReferenceIndexes.sceneHook,
          ]),
          sharedScriptReferences: sharedScriptReferenceRun.value.length,
        },
      },
      null,
      2,
    ),
  )
} finally {
  await vite.close()
}
