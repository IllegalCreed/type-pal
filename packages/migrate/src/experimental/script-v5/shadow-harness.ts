import { createHash } from 'node:crypto'
import { type MigrationSnapshot, serializeMigrationJson, sha256 } from '../../migration-baseline.js'
import { createMigrationPlan } from '../../migration-plan.js'
import type { MigrationFileSet } from '../../pal-migration.js'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import { buildP2ScriptMigrationIR } from './p2-transform.js'
import { planP2ScriptTransition } from './p2-transition-plan.js'
import { readV4ScriptCorpus } from './source-v4.js'
import { formatStableJson, stableStringCompare } from './stable-json.js'
import { validateScriptMigrationIR } from './validate-ir.js'

export interface P2ShadowBundle {
  files: ReadonlyMap<string, string>
  digest: string
}

export function digestShadowBundle(files: ReadonlyMap<string, string>): string {
  const hash = createHash('sha256')
  for (const [path, body] of [...files].sort(([left], [right]) =>
    stableStringCompare(left, right),
  )) {
    hash.update(path)
    hash.update('\0')
    hash.update(sha256(body))
    hash.update('\n')
  }
  return hash.digest('hex')
}

function fullTargetArtifacts(
  target: ReadonlyMap<string, import('../../pal-migration.js').MigrationJson>,
): {
  files: Map<string, string>
  state: {
    kind: 'script-v5-shadow-v4-project-state'
    version: 1
    files: Array<{ path: string; bytes: number; sha256: string }>
    digest: string
  }
} {
  const files = new Map<string, string>()
  const inventory = [...target]
    .sort(([left], [right]) => stableStringCompare(left, right))
    .map(([path, value]) => {
      const body = serializeMigrationJson(value, path)
      files.set(`target/project/${path}`, body)
      return { path, bytes: Buffer.byteLength(body), sha256: sha256(body) }
    })
  const digest = digestShadowBundle(
    new Map(inventory.map((entry) => [entry.path, files.get(`target/project/${entry.path}`)!])),
  )
  return {
    files,
    state: {
      kind: 'script-v5-shadow-v4-project-state',
      version: 1,
      files: inventory,
      digest,
    },
  }
}

function buildCore(args: {
  migration: MigrationFileSet
  base: MigrationSnapshot
  ours: MigrationSnapshot
  currentAudit: ScriptControlFlowAuditV1
  frozenAudit: ScriptControlFlowAuditV1
}): Map<string, string> {
  const transformed = buildP2ScriptMigrationIR(args)
  const validation = validateScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    ir: transformed.ir,
    ledger: transformed.ledger,
    throughPhase: 'P2',
  })
  const transitionPlan = planP2ScriptTransition({
    base: args.base,
    ours: { kind: 'v4', migration: args.ours },
    target: transformed.ir,
    ledger: transformed.ledger,
  })
  if (
    transitionPlan.summary.conflicts !== 0 ||
    transitionPlan.summary.cellWrites !== 2 ||
    transitionPlan.summary.cellDeletes !== 3_346
  )
    throw new Error(`P2 transition plan drift: ${JSON.stringify(transitionPlan.summary)}`)
  const repeatPlan = planP2ScriptTransition({
    base: args.migration,
    ours: { kind: 'p2-ir', ir: transformed.ir, ledger: transformed.ledger },
    target: transformed.ir,
    ledger: transformed.ledger,
  })
  if (
    repeatPlan.summary.cellWrites !== 0 ||
    repeatPlan.summary.cellDeletes !== 0 ||
    repeatPlan.summary.conflicts !== 0
  )
    throw new Error(`P2 repeat transition is not zero: ${JSON.stringify(repeatPlan.summary)}`)

  const v4MergePlan = createMigrationPlan(args.base, args.ours, args.migration)
  if (v4MergePlan.conflicts.length)
    throw new Error(`P2 author-preservation preflight conflicts: ${v4MergePlan.conflicts.length}`)
  const fullTarget = fullTargetArtifacts(v4MergePlan.target)
  const baseCorpus = readV4ScriptCorpus(args.base)
  const oursCorpus = readV4ScriptCorpus(args.ours)
  const files = new Map<string, string>()
  for (const [path, body] of fullTarget.files) files.set(path, body)
  files.set('ir/script-migration-ir.json', formatStableJson(transformed.ir))
  files.set('transitions/script-v4-v5.draft.json', formatStableJson(transformed.ledger))
  files.set('reports/phase-validation.json', formatStableJson(validation))
  files.set('reports/transition-plan.json', formatStableJson(transitionPlan))
  files.set('reports/repeat-transition-plan.json', formatStableJson(repeatPlan))
  files.set(
    'reports/v4-author-merge-preflight.json',
    formatStableJson({
      kind: 'script-v5-shadow-v4-author-merge-preflight',
      version: 1,
      canonical: false,
      runtimeConsumable: false,
      summary: v4MergePlan.summary,
      conflicts: v4MergePlan.conflicts,
      baseSourceSnapshotSha256: baseCorpus.sourceSnapshotSha256,
      oursSourceSnapshotSha256: oursCorpus.sourceSnapshotSha256,
      generatedSourceSnapshotSha256: transformed.ir.source.sourceSnapshotSha256,
      fullMergedV4TargetDigest: fullTarget.state.digest,
    }),
  )
  files.set('target/project-state.json', formatStableJson(fullTarget.state))
  files.set(
    'target/reconstruction.json',
    formatStableJson({
      kind: 'script-v5-shadow-reconstruction',
      version: 1,
      throughPhase: 'P2',
      canonical: false,
      runtimeConsumable: false,
      layers: [
        {
          kind: 'full-merged-v4-project',
          root: 'target/project/',
          state: 'target/project-state.json',
          digest: fullTarget.state.digest,
        },
        {
          kind: 'p2-transition-overlay',
          ir: 'ir/script-migration-ir.json',
          ledger: 'transitions/script-v4-v5.draft.json',
          plan: 'reports/transition-plan.json',
          apply:
            'remove 3,345 folded tombstones and atomically resolve the s018 body plus installer cell',
        },
      ],
      contract:
        'The complete merged v4 layer preserves author files; the P2 IR and ledger are the lossless experimental overlay. Neither layer is canonical v5 or runtime-consumable.',
    }),
  )
  files.set(
    'target/summary.json',
    formatStableJson({
      kind: 'script-v5-shadow-target-summary',
      version: 1,
      throughPhase: 'P2',
      canonical: false,
      runtimeConsumable: false,
      sourceAuditDigest: args.frozenAudit.digest,
      sourceRawGeneratorSnapshotSha256: readV4ScriptCorpus(args.migration)
        .rawGeneratorSnapshotSha256,
      irDigest: transformed.ir.digest,
      ledgerDigest: transformed.ledger.digest,
      fullMergedV4TargetDigest: fullTarget.state.digest,
      fullMergedV4Files: fullTarget.state.files.length,
      v4AuthorMerge: v4MergePlan.summary,
      retainedBodies: transformed.ir.retainedBodies.length,
      tombstones: transformed.ir.tombstones.length,
      commandTransition: transformed.ir.commandTransition,
      pendingByPhase: transformed.ir.pendingByPhase,
    }),
  )
  return files
}

function sameFiles(left: ReadonlyMap<string, string>, right: ReadonlyMap<string, string>): boolean {
  if (left.size !== right.size) return false
  for (const [path, body] of left) if (right.get(path) !== body) return false
  return true
}

/**
 * 每次都从同一权威 v4 输入独立构建两次。前一次 shadow 目录从不作为输入。
 */
export function buildDeterministicP2ShadowBundle(args: {
  migration: MigrationFileSet
  base: MigrationSnapshot
  ours: MigrationSnapshot
  currentAudit: ScriptControlFlowAuditV1
  frozenAudit: ScriptControlFlowAuditV1
}): P2ShadowBundle {
  const first = buildCore(args)
  const second = buildCore({
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
  })
  if (!sameFiles(first, second)) throw new Error('P2 shadow transform is not deterministic')
  const coreDigest = digestShadowBundle(first)
  first.set(
    'reports/determinism.json',
    formatStableJson({
      kind: 'script-v5-shadow-determinism',
      version: 1,
      throughPhase: 'P2',
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
      projectId: 'pal',
      throughPhase: 'P2',
      generatorEpoch: 'n3-script-v5-p2-v1',
      canonical: false,
      runtimeConsumable: false,
      source: 'author-preserving-v4-merge-plus-p2-overlay',
      sourceAuditDigest: args.frozenAudit.digest,
      artifacts,
      coreDigest,
    }),
  )
  return Object.freeze({ files: first, digest: digestShadowBundle(first) })
}

export function assertP2ShadowBundle(bundle: P2ShadowBundle): void {
  if (digestShadowBundle(bundle.files) !== bundle.digest)
    throw new Error('P2 shadow bundle digest mismatch')
  const manifestBody = bundle.files.get('shadow.json')
  if (!manifestBody) throw new Error('P2 shadow bundle manifest missing')
  const manifest = JSON.parse(manifestBody) as {
    kind?: unknown
    version?: unknown
    throughPhase?: unknown
    generatorEpoch?: unknown
    canonical?: unknown
    runtimeConsumable?: unknown
    coreDigest?: unknown
    artifacts?: Array<{ path?: unknown; sha256?: unknown }>
  }
  if (
    manifest.kind !== 'script-v5-shadow-manifest' ||
    manifest.version !== 1 ||
    manifest.throughPhase !== 'P2' ||
    manifest.generatorEpoch !== 'n3-script-v5-p2-v1' ||
    manifest.canonical !== false ||
    manifest.runtimeConsumable !== false ||
    typeof manifest.coreDigest !== 'string' ||
    !Array.isArray(manifest.artifacts)
  )
    throw new Error('P2 shadow bundle manifest invalid')
  const coreFiles = new Map(
    [...bundle.files].filter(
      ([path]) => path !== 'shadow.json' && path !== 'reports/determinism.json',
    ),
  )
  if (digestShadowBundle(coreFiles) !== manifest.coreDigest)
    throw new Error('P2 shadow bundle core digest mismatch')
  const determinismBody = bundle.files.get('reports/determinism.json')
  if (!determinismBody) throw new Error('P2 shadow determinism report missing')
  const determinism = JSON.parse(determinismBody) as {
    identical?: unknown
    independentBuilds?: unknown
    coreDigest?: unknown
  }
  if (
    determinism.identical !== true ||
    determinism.independentBuilds !== 2 ||
    determinism.coreDigest !== manifest.coreDigest
  )
    throw new Error('P2 shadow determinism report invalid')
  const artifactPaths = new Set<string>()
  for (const artifact of manifest.artifacts) {
    if (typeof artifact.path !== 'string' || typeof artifact.sha256 !== 'string')
      throw new Error('P2 shadow bundle artifact record invalid')
    if (artifactPaths.has(artifact.path))
      throw new Error(`P2 shadow bundle duplicate artifact ${artifact.path}`)
    artifactPaths.add(artifact.path)
    const body = bundle.files.get(artifact.path)
    if (body === undefined || sha256(body) !== artifact.sha256)
      throw new Error(`P2 shadow bundle artifact hash mismatch ${artifact.path}`)
  }
  const actualPaths = [...bundle.files.keys()]
    .filter((path) => path !== 'shadow.json')
    .sort(stableStringCompare)
  const declaredPaths = [...artifactPaths].sort(stableStringCompare)
  if (
    actualPaths.length !== declaredPaths.length ||
    actualPaths.some((path, index) => path !== declaredPaths[index])
  )
    throw new Error('P2 shadow bundle manifest closure mismatch')
}
