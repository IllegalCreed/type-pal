import type {
  ItemData,
  LegacyManifestV4,
  ProjectManifest,
  ProjectMigrationSidecarV1,
  SceneDef,
} from '@type-pal/content'
import {
  SCRIPT_V4_V5_SIDECAR_PATH,
  SCRIPT_V4_V5_TRANSITION_ID,
  validateProjectMigrationDescriptorV1,
} from '@type-pal/content'
import {
  baselineState,
  isAtomicProjectMapPath,
  serializeMigrationJson,
  sha256,
} from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import { buildP7ProjectCompatibility } from './p7-compatibility.js'
import { type P7CanonicalProject, projectP7CanonicalProject } from './p7-project.js'
import {
  buildP7TransitionLedger,
  type ScriptIdentityTransitionLedgerV1,
} from './p7-transition-ledger.js'
import { buildP6ShadowCore, digestShadowBundle, type P6ShadowBuildArgs } from './shadow-harness.js'
import { formatStableJson, stableStringCompare } from './stable-json.js'
import type { ScriptMigrationIRP6, ScriptTransitionLedgerDraftP6 } from './types.js'

const P7_EPOCH = 'n3-script-v5-p7-v1' as const
const P7_LEDGER_PATH = '_transitions/script-v4-v5.json' as const
const P7_SHARED_SCRIPTS_PATH = 'content/shared-scripts.json' as const

export interface P7ShadowBuildArgs extends P6ShadowBuildArgs {
  manifest: LegacyManifestV4
}

export interface P7ShadowBundle {
  files: ReadonlyMap<string, string>
  digest: string
}

interface BaselineStateV2 {
  version: 2
  generatorEpoch: typeof P7_EPOCH
  transitions: Record<typeof SCRIPT_V4_V5_TRANSITION_ID, string>
  managedFiles: string[]
  files: Record<string, string>
}

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function parseJson<T>(body: string | undefined, path: string): T {
  if (body === undefined) throw new Error(`P7 shadow: 缺文件 ${path}`)
  try {
    return JSON.parse(body) as T
  } catch (error) {
    throw new Error(`P7 shadow: JSON 无效 ${path}`, { cause: error })
  }
}

function sameFiles(left: ReadonlyMap<string, string>, right: ReadonlyMap<string, string>): boolean {
  if (left.size !== right.size) return false
  for (const [path, body] of left) if (right.get(path) !== body) return false
  return true
}

function readP6Project(files: ReadonlyMap<string, string>): Map<string, MigrationJson> {
  const prefix = 'target/project/'
  const project = new Map<string, MigrationJson>()
  for (const [path, body] of files) {
    if (!path.startsWith(prefix)) continue
    project.set(path.slice(prefix.length), parseJson(body, path))
  }
  if (project.size === 0) throw new Error('P7 shadow: P6 完整 v4 project target 缺失')
  return project
}

function readSourceProject(source: ReadonlyMap<string, MigrationJson>): {
  scenes: SceneDef[]
  items: ItemData[]
} {
  const sceneIds = source.get('content/scenes/index.json')
  if (!Array.isArray(sceneIds) || sceneIds.some((id) => typeof id !== 'string'))
    throw new Error('P7 shadow: content/scenes/index.json 无效')
  const scenes = sceneIds.map((id) => {
    const scene = source.get(`content/scenes/${String(id)}.json`)
    if (!scene) throw new Error(`P7 shadow: scene 缺失 ${String(id)}`)
    return structuredClone(scene) as unknown as SceneDef
  })
  const items = source.get('content/items.json')
  if (!Array.isArray(items)) throw new Error('P7 shadow: content/items.json 无效')
  return { scenes, items: structuredClone(items) as unknown as ItemData[] }
}

function canonicalTarget(
  source: ReadonlyMap<string, MigrationJson>,
  project: P7CanonicalProject,
  sidecar: ProjectMigrationSidecarV1,
  ledger?: ScriptIdentityTransitionLedgerV1,
): Map<string, MigrationJson> {
  const target = new Map(
    [...source].map(([path, value]) => [path, structuredClone(value)] as const),
  )
  for (const path of [...target.keys()]) {
    if (
      path.startsWith('content/scripts/') ||
      (/^content\/scenes\/[^/]+\.json$/.test(path) && path !== 'content/scenes/index.json')
    )
      target.delete(path)
  }
  target.set(
    'content/scenes/index.json',
    project.scenes.map((scene) => scene.id),
  )
  for (const scene of project.scenes) target.set(`content/scenes/${scene.id}.json`, asJson(scene))
  target.set('content/items.json', asJson(project.items))
  target.set(P7_SHARED_SCRIPTS_PATH, asJson(project.scripts))
  target.set(SCRIPT_V4_V5_SIDECAR_PATH, asJson(sidecar))
  if (ledger) target.set(P7_LEDGER_PATH, asJson(ledger))
  return target
}

function serializeTarget(
  target: ReadonlyMap<string, MigrationJson>,
  stableBodies: ReadonlyMap<string, string>,
): Map<string, string> {
  return new Map(
    [...target]
      .sort(([left], [right]) => stableStringCompare(left, right))
      .map(([path, value]) => [
        path,
        stableBodies.get(path) ?? serializeMigrationJson(value, path),
      ]),
  )
}

function buildBaselineState(
  bodies: ReadonlyMap<string, string>,
  ledger: ScriptIdentityTransitionLedgerV1,
): BaselineStateV2 {
  const managedFiles = [...bodies.keys()].sort(stableStringCompare)
  return {
    version: 2,
    generatorEpoch: P7_EPOCH,
    transitions: { [SCRIPT_V4_V5_TRANSITION_ID]: ledger.digest },
    managedFiles,
    files: Object.fromEntries(managedFiles.map((path) => [path, sha256(bodies.get(path)!)])),
  }
}

function buildManifest(source: LegacyManifestV4, sidecarBody: string): ProjectManifest<5> {
  if (source.migrations?.[SCRIPT_V4_V5_TRANSITION_ID] !== undefined)
    throw new Error(`P7 shadow: v4 manifest 已占用 migration ${SCRIPT_V4_V5_TRANSITION_ID}`)
  if (
    source.minimumSaveVersion !== undefined &&
    (!Number.isInteger(source.minimumSaveVersion) ||
      source.minimumSaveVersion < 1 ||
      source.minimumSaveVersion > 5)
  )
    throw new Error('P7 shadow: manifest.minimumSaveVersion 必须为 1..5 的整数')
  const content = Object.fromEntries(
    Object.entries(source.content).filter(([kind]) => kind !== 'scripts'),
  )
  const descriptor = validateProjectMigrationDescriptorV1({
    version: 1,
    fromContentVersion: 4,
    toContentVersion: 5,
    path: SCRIPT_V4_V5_SIDECAR_PATH,
    sha256: sha256(sidecarBody),
  })
  return {
    ...structuredClone(source),
    contentVersion: 5,
    content: {
      ...content,
      sharedScripts: P7_SHARED_SCRIPTS_PATH,
    },
    migrations: {
      ...structuredClone(source.migrations ?? {}),
      [SCRIPT_V4_V5_TRANSITION_ID]: descriptor,
    },
  }
}

function projectState(bodies: ReadonlyMap<string, string>, manifestBody: string) {
  const inventory = [
    ...[...bodies].map(([path, body]) => ({
      path,
      bytes: Buffer.byteLength(body),
      sha256: sha256(body),
    })),
    {
      path: 'manifest.json',
      bytes: Buffer.byteLength(manifestBody),
      sha256: sha256(manifestBody),
    },
  ].sort((left, right) => stableStringCompare(left.path, right.path))
  return {
    kind: 'script-v5-canonical-project-state',
    version: 1,
    contentVersion: 5,
    files: inventory,
    digest: digestShadowBundle(
      new Map(
        inventory.map((entry) => [
          entry.path,
          entry.path === 'manifest.json' ? manifestBody : bodies.get(entry.path)!,
        ]),
      ),
    ),
  }
}

function reverseArgs(args: P7ShadowBuildArgs): P7ShadowBuildArgs {
  return {
    ...args,
    migration: {
      ...args.migration,
      files: new Map([...args.migration.files].reverse()),
      managedFiles: new Set([...args.migration.managedFiles].reverse()),
    },
    base: {
      ...args.base,
      files: new Map([...args.base.files].reverse()),
      managedFiles: new Set([...args.base.managedFiles].reverse()),
      ...(args.base.hashes ? { hashes: new Map([...args.base.hashes].reverse()) } : {}),
    },
    ours: {
      ...args.ours,
      files: new Map([...args.ours.files].reverse()),
      managedFiles: new Set([...args.ours.managedFiles].reverse()),
      ...(args.ours.hashes ? { hashes: new Map([...args.ours.hashes].reverse()) } : {}),
    },
  }
}

function buildP7Core(args: P7ShadowBuildArgs): Map<string, string> {
  if (args.manifest.contentVersion !== 4)
    throw new Error('P7 shadow: source manifest 必须是 contentVersion 4')
  const p6Files = buildP6ShadowCore(args)
  const ir = parseJson<ScriptMigrationIRP6>(
    p6Files.get('ir/script-migration-ir.json'),
    'ir/script-migration-ir.json',
  )
  const p6Ledger = parseJson<ScriptTransitionLedgerDraftP6>(
    p6Files.get('transitions/script-v4-v5.draft.json'),
    'transitions/script-v4-v5.draft.json',
  )
  const mergedV4 = readP6Project(p6Files)
  const mergedSource = readSourceProject(mergedV4)
  const project = projectP7CanonicalProject({
    ir,
    sourceCommands: args.sourceCommands,
    sourceAudit: args.currentAudit,
    ...mergedSource,
  })
  const preliminary = buildP7ProjectCompatibility({
    projectId: args.manifest.id,
    ir,
    sourceScenes: mergedSource.scenes,
    targetScenes: project.scenes,
    sourceAuditDigest: ir.sourceAudit.digest,
    fullLedgerDigest: p6Ledger.digest,
  }).sidecar
  const v4State = baselineState(args.base)
  if (v4State.version !== 1) throw new Error('P7 shadow: source PAL baseline 必须是 state v1')
  const baselineSha256 = sha256(serializeMigrationJson(v4State as unknown as MigrationJson))
  const { ledger, report: ledgerReport } = buildP7TransitionLedger({
    projectId: args.manifest.id,
    baselineSha256,
    ir,
    p6Ledger,
    project,
    compatibility: preliminary,
  })
  const projectCompatibility = buildP7ProjectCompatibility({
    projectId: args.manifest.id,
    ir,
    sourceScenes: mergedSource.scenes,
    targetScenes: project.scenes,
    sourceAuditDigest: ir.sourceAudit.digest,
    fullLedgerDigest: ledger.digest,
  })
  const projectSidecarBody = formatStableJson(projectCompatibility.sidecar)
  const manifest = buildManifest(args.manifest, projectSidecarBody)
  const manifestBody = `${JSON.stringify(manifest, null, 2)}\n`
  const projectTarget = canonicalTarget(mergedV4, project, projectCompatibility.sidecar)
  const projectBodies = serializeTarget(
    projectTarget,
    new Map([[SCRIPT_V4_V5_SIDECAR_PATH, projectSidecarBody]]),
  )

  const generatedV4 = new Map(
    [...args.migration.files].map(([path, value]) => [path, structuredClone(value)] as const),
  )
  const generatedSource = readSourceProject(generatedV4)
  const baselineProject = projectP7CanonicalProject({
    ir,
    sourceCommands: args.sourceCommands,
    sourceAudit: args.currentAudit,
    ...generatedSource,
  })
  const baselineCompatibility = buildP7ProjectCompatibility({
    projectId: args.manifest.id,
    ir,
    sourceScenes: generatedSource.scenes,
    targetScenes: baselineProject.scenes,
    sourceAuditDigest: ir.sourceAudit.digest,
    fullLedgerDigest: ledger.digest,
  })
  const baselineSidecarBody = formatStableJson(baselineCompatibility.sidecar)
  const ledgerBody = formatStableJson(ledger)
  const baselineTarget = canonicalTarget(
    generatedV4,
    baselineProject,
    baselineCompatibility.sidecar,
    ledger,
  )
  const baselineBodies = serializeTarget(
    baselineTarget,
    new Map([
      [SCRIPT_V4_V5_SIDECAR_PATH, baselineSidecarBody],
      [P7_LEDGER_PATH, ledgerBody],
    ]),
  )
  const nextBaselineState = buildBaselineState(baselineBodies, ledger)
  const nextBaselineStateBody = serializeMigrationJson(
    nextBaselineState as unknown as MigrationJson,
  )
  const canonicalProjectState = projectState(projectBodies, manifestBody)

  const files = new Map<string, string>()
  for (const path of [
    'ir/script-migration-ir.json',
    'reports/phase-validation.json',
    'reports/transition-plan.json',
    'reports/repeat-transition-plan.json',
    'reports/v4-author-merge-preflight.json',
    'reports/p6-shared-closure-inventory.json',
  ]) {
    const body = p6Files.get(path)
    if (body === undefined) throw new Error(`P7 shadow: P6 evidence 缺失 ${path}`)
    files.set(path, body)
  }
  for (const [path, body] of projectBodies) files.set(`target/project/${path}`, body)
  files.set('target/project/manifest.json', manifestBody)
  for (const [path, body] of baselineBodies) {
    if (!isAtomicProjectMapPath(path)) files.set(`target/baseline/${path}`, body)
  }
  files.set('target/baseline/_state.json', nextBaselineStateBody)
  files.set('transitions/script-v4-v5.json', ledgerBody)
  files.set('target/project-state.json', formatStableJson(canonicalProjectState))
  files.set(
    'reports/p7-canonical-inventory.json',
    formatStableJson({
      kind: 'script-v5-p7-canonical-inventory',
      version: 1,
      throughPhase: 'P7',
      canonical: true,
      runtimeConsumable: true,
      project: project.report,
      compatibility: projectCompatibility.report,
      baselineCompatibility: baselineCompatibility.report,
      ledger: ledgerReport,
      projectFiles: projectBodies.size + 1,
      baselineManagedFiles: baselineBodies.size,
      baselineMaterializedFiles: [...baselineBodies.keys()].filter(
        (path) => !isAtomicProjectMapPath(path),
      ).length,
      legacyScriptFiles: [...projectBodies.keys()].filter((path) =>
        path.startsWith('content/scripts/'),
      ).length,
      manifestDescriptor: manifest.migrations?.[SCRIPT_V4_V5_TRANSITION_ID],
      baselineSha256,
      baselineStateVersion: nextBaselineState.version,
      generatorEpoch: nextBaselineState.generatorEpoch,
    }),
  )
  files.set(
    'target/reconstruction.json',
    formatStableJson({
      kind: 'script-v5-shadow-reconstruction',
      version: 1,
      throughPhase: 'P7',
      canonical: true,
      runtimeConsumable: true,
      layers: [
        {
          kind: 'canonical-v5-project',
          root: 'target/project/',
          state: 'target/project-state.json',
          digest: canonicalProjectState.digest,
        },
        {
          kind: 'pal-baseline-v2',
          root: 'target/baseline/',
          state: 'target/baseline/_state.json',
          generatorEpoch: P7_EPOCH,
          transition: P7_LEDGER_PATH,
          transitionDigest: ledger.digest,
        },
      ],
      publication:
        'publish canonical project files, project sidecar, baseline v2 and full ledger in one recoverable transaction; publish manifest last after closure preconditions pass',
    }),
  )
  files.set(
    'target/summary.json',
    formatStableJson({
      kind: 'script-v5-shadow-target-summary',
      version: 1,
      throughPhase: 'P7',
      canonical: true,
      runtimeConsumable: true,
      sourceAuditDigest: args.frozenAudit.digest,
      irDigest: ir.digest,
      ledgerDigest: ledger.digest,
      projectDigest: canonicalProjectState.digest,
      project: project.report,
      compatibility: projectCompatibility.report,
      baselineState: {
        version: nextBaselineState.version,
        generatorEpoch: nextBaselineState.generatorEpoch,
        transitionDigest: nextBaselineState.transitions[SCRIPT_V4_V5_TRANSITION_ID],
      },
    }),
  )
  return files
}

export function buildDeterministicP7ShadowBundle(args: P7ShadowBuildArgs): P7ShadowBundle {
  const first = buildP7Core(args)
  const second = buildP7Core(reverseArgs(args))
  if (!sameFiles(first, second)) throw new Error('P7 shadow transform is not deterministic')
  const coreDigest = digestShadowBundle(first)
  first.set(
    'reports/determinism.json',
    formatStableJson({
      kind: 'script-v5-shadow-determinism',
      version: 1,
      throughPhase: 'P7',
      independentBuilds: 2,
      identical: true,
      coreDigest,
    }),
  )
  const artifacts = [...first]
    .sort(([left], [right]) => stableStringCompare(left, right))
    .map(([path, body]) => ({ path, sha256: sha256(body) }))
  first.set(
    'shadow.json',
    formatStableJson({
      kind: 'script-v5-shadow-manifest',
      version: 1,
      projectId: args.manifest.id,
      throughPhase: 'P7',
      generatorEpoch: P7_EPOCH,
      canonical: true,
      runtimeConsumable: true,
      source: 'author-preserving-v4-merge-to-canonical-v5-plus-pal-baseline-v2',
      sourceAuditDigest: args.frozenAudit.digest,
      artifacts,
      coreDigest,
    }),
  )
  return Object.freeze({ files: first, digest: digestShadowBundle(first) })
}

export function assertP7ShadowBundle(bundle: P7ShadowBundle): void {
  if (digestShadowBundle(bundle.files) !== bundle.digest)
    throw new Error('P7 shadow bundle digest mismatch')
  const shadow = parseJson<{
    kind?: unknown
    version?: unknown
    throughPhase?: unknown
    generatorEpoch?: unknown
    canonical?: unknown
    runtimeConsumable?: unknown
    coreDigest?: unknown
    artifacts?: Array<{ path?: unknown; sha256?: unknown }>
  }>(bundle.files.get('shadow.json'), 'shadow.json')
  if (
    shadow.kind !== 'script-v5-shadow-manifest' ||
    shadow.version !== 1 ||
    shadow.throughPhase !== 'P7' ||
    shadow.generatorEpoch !== P7_EPOCH ||
    shadow.canonical !== true ||
    shadow.runtimeConsumable !== true ||
    typeof shadow.coreDigest !== 'string' ||
    !Array.isArray(shadow.artifacts)
  )
    throw new Error('P7 shadow bundle manifest invalid')
  const coreFiles = new Map(
    [...bundle.files].filter(
      ([path]) => path !== 'shadow.json' && path !== 'reports/determinism.json',
    ),
  )
  if (digestShadowBundle(coreFiles) !== shadow.coreDigest)
    throw new Error('P7 shadow bundle core digest mismatch')
  const determinism = parseJson<{
    identical?: unknown
    independentBuilds?: unknown
    coreDigest?: unknown
  }>(bundle.files.get('reports/determinism.json'), 'reports/determinism.json')
  if (
    determinism.identical !== true ||
    determinism.independentBuilds !== 2 ||
    determinism.coreDigest !== shadow.coreDigest
  )
    throw new Error('P7 shadow determinism report invalid')

  const manifest = parseJson<ProjectManifest<5>>(
    bundle.files.get('target/project/manifest.json'),
    'target/project/manifest.json',
  )
  if (
    manifest.contentVersion !== 5 ||
    manifest.content.scripts !== undefined ||
    manifest.content.sharedScripts !== P7_SHARED_SCRIPTS_PATH
  )
    throw new Error('P7 shadow canonical manifest invalid')
  if (bundle.files.get(`target/project/${P7_SHARED_SCRIPTS_PATH}`) !== '{}\n')
    throw new Error('P7 shadow canonical shared script library invalid')
  const descriptor = validateProjectMigrationDescriptorV1(
    manifest.migrations?.[SCRIPT_V4_V5_TRANSITION_ID],
  )
  const projectSidecarBody = bundle.files.get(`target/project/${SCRIPT_V4_V5_SIDECAR_PATH}`)
  if (!projectSidecarBody || descriptor.sha256 !== sha256(projectSidecarBody))
    throw new Error('P7 shadow project sidecar descriptor mismatch')
  const sidecar = parseJson<ProjectMigrationSidecarV1>(
    projectSidecarBody,
    SCRIPT_V4_V5_SIDECAR_PATH,
  )
  const ledgerBody = bundle.files.get('transitions/script-v4-v5.json')
  const ledger = parseJson<ScriptIdentityTransitionLedgerV1>(
    ledgerBody,
    'transitions/script-v4-v5.json',
  )
  if (
    sidecar.provenance.kind !== 'pal-baseline' ||
    sidecar.provenance.fullLedgerDigest !== ledger.digest
  )
    throw new Error('P7 shadow sidecar provenance mismatch')
  if ([...bundle.files.keys()].some((path) => path.startsWith('target/project/content/scripts/')))
    throw new Error('P7 shadow still contains legacy script files')

  const state = parseJson<BaselineStateV2>(
    bundle.files.get('target/baseline/_state.json'),
    'target/baseline/_state.json',
  )
  if (
    state.version !== 2 ||
    state.generatorEpoch !== P7_EPOCH ||
    state.transitions[SCRIPT_V4_V5_TRANSITION_ID] !== ledger.digest ||
    state.files[P7_LEDGER_PATH] !== sha256(ledgerBody!)
  )
    throw new Error('P7 shadow baseline state invalid')
  for (const [path, expected] of Object.entries(state.files)) {
    if (isAtomicProjectMapPath(path)) continue
    const body = bundle.files.get(`target/baseline/${path}`)
    if (body === undefined || sha256(body) !== expected)
      throw new Error(`P7 shadow baseline file hash mismatch ${path}`)
  }

  const inventory = parseJson<{
    project?: P7CanonicalProject['report']
    ledger?: {
      entries?: unknown
      groups?: unknown
      evidence?: unknown
      canonicalTargets?: unknown
    }
    legacyScriptFiles?: unknown
    baselineStateVersion?: unknown
  }>(bundle.files.get('reports/p7-canonical-inventory.json'), 'reports/p7-canonical-inventory.json')
  if (
    inventory.project?.sceneCount !== 294 ||
    inventory.project.pageCount !== 3_616 ||
    inventory.project.ownerCount !== 4_584 ||
    inventory.project.stateMachineOwnerCount !== 65 ||
    inventory.project.itemPrivateScriptCount !== 6 ||
    inventory.ledger?.entries !== 18_383 ||
    inventory.ledger.groups !== 5_630 ||
    inventory.ledger.evidence !== 8_975 ||
    inventory.ledger.canonicalTargets !== 8_271 ||
    inventory.legacyScriptFiles !== 0 ||
    inventory.baselineStateVersion !== 2
  )
    throw new Error('P7 shadow canonical inventory invalid')

  const artifactPaths = new Set<string>()
  for (const artifact of shadow.artifacts) {
    if (typeof artifact.path !== 'string' || typeof artifact.sha256 !== 'string')
      throw new Error('P7 shadow bundle artifact record invalid')
    if (artifactPaths.has(artifact.path))
      throw new Error(`P7 shadow bundle duplicate artifact ${artifact.path}`)
    artifactPaths.add(artifact.path)
    const body = bundle.files.get(artifact.path)
    if (body === undefined || sha256(body) !== artifact.sha256)
      throw new Error(`P7 shadow bundle artifact hash mismatch ${artifact.path}`)
  }
  const actualPaths = [...bundle.files.keys()]
    .filter((path) => path !== 'shadow.json')
    .sort(stableStringCompare)
  const declaredPaths = [...artifactPaths].sort(stableStringCompare)
  if (
    actualPaths.length !== declaredPaths.length ||
    actualPaths.some((path, index) => path !== declaredPaths[index])
  )
    throw new Error('P7 shadow bundle manifest closure mismatch')
}
