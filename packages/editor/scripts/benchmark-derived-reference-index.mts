import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
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
  const { collectCanonicalScriptCommandVisits, collectCanonicalScriptTransitionVisits } =
    await vite.ssrLoadModule('/packages/editor/src/core/script-editor.ts')
  const { projectCurrentAuthorReferenceSlices, scriptEditorStateFromCurrentAuthorSlices } =
    await vite.ssrLoadModule('/packages/editor/src/core/script-editor-projection.ts')
  const { collectEntityAddressReferences } = await vite.ssrLoadModule(
    '/packages/editor/src/core/entity-address-references.ts',
  )
  const {
    actorReferenceEdges,
    battleDataReferenceEdges,
    buildProjectReferenceSnapshotFromProjection,
    canonicalCommandTargetEdges,
    entityAddressReferenceEdges,
    itemReferenceEdges,
    legacyScriptChunkTargetEdges,
    spriteReferenceEdges,
    structuralProjectReferenceEdges,
  } = await vite.ssrLoadModule('/packages/editor/src/core/project-reference-adapters.ts')
  const { buildProjectReferenceSnapshot } = await vite.ssrLoadModule(
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
        }),
      ).ms,
  )

  const firstSnapshot = timed(() => collectEditorDiagnosticsSnapshot(state, canonical))
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

  console.log(
    JSON.stringify(
      {
        commit: execFileSync('git', ['rev-parse', 'HEAD'], {
          cwd: repoRoot,
          encoding: 'utf8',
        }).trim(),
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
        projectReferenceBuildBreakdown: {
          structuralMs: Number(structuralEdgeRun.ms.toFixed(3)),
          canonicalMs: Number(canonicalEdgeRun.ms.toFixed(3)),
          legacyMs: Number(legacyEdgeRun.ms.toFixed(3)),
          battleDataMs: Number(battleDataEdgeRun.ms.toFixed(3)),
          actorMs: Number(actorEdgeRun.ms.toFixed(3)),
          itemMs: Number(itemEdgeRun.ms.toFixed(3)),
          spriteMs: Number(spriteEdgeRun.ms.toFixed(3)),
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
          assetReferences: derived.assetReferences.length,
          worldVariableReferences: derived.worldVariableReferences.all.length,
          behaviorReferences: sumPairs(derived.canonicalBehaviorReferences),
          sceneHookReferences: sumPairs(derived.canonicalSceneHookReferences),
        },
      },
      null,
      2,
    ),
  )
} finally {
  await vite.close()
}
