import { createHash } from 'node:crypto'
import { type MigrationSnapshot, serializeMigrationJson, sha256 } from '../../migration-baseline.js'
import { createMigrationPlan } from '../../migration-plan.js'
import type { MigrationFileSet } from '../../pal-migration.js'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import { buildP2ScriptMigrationIR } from './p2-transform.js'
import { planP2ScriptTransition } from './p2-transition-plan.js'
import { buildP3ScriptMigrationIR } from './p3-control-flow.js'
import { planP3ScriptTransition } from './p3-transition-plan.js'
import { validateP3ScriptMigrationIR } from './p3-validate.js'
import { buildP4ScriptMigrationIR } from './p4-owner-allocation.js'
import { planP4ScriptTransition } from './p4-transition-plan.js'
import { validateP4ScriptMigrationIR } from './p4-validate.js'
import { buildP5ScriptMigrationIR } from './p5-cycle-structure.js'
import { planP5ScriptTransition } from './p5-transition-plan.js'
import { validateP5ScriptMigrationIR } from './p5-validate.js'
import { buildP6ScriptMigrationIR } from './p6-shared-closure.js'
import { planP6ScriptTransition } from './p6-transition-plan.js'
import { validateP6ScriptMigrationIR } from './p6-validate.js'
import { readV4ScriptCorpus } from './source-v4.js'
import { formatStableJson, stableStringCompare } from './stable-json.js'
import type {
  ScriptMigrationIRP3,
  ScriptMigrationIRP4,
  ScriptMigrationIRP5,
  ScriptMigrationIRP6,
} from './types.js'
import { validateScriptMigrationIR } from './validate-ir.js'

export interface P2ShadowBundle {
  files: ReadonlyMap<string, string>
  digest: string
}

export interface P3ShadowBundle {
  files: ReadonlyMap<string, string>
  digest: string
}

export interface P4ShadowBundle {
  files: ReadonlyMap<string, string>
  digest: string
}

export interface P5ShadowBundle {
  files: ReadonlyMap<string, string>
  digest: string
}

export interface P6ShadowBundle {
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

interface P3ShadowBuildArgs {
  migration: MigrationFileSet
  base: MigrationSnapshot
  ours: MigrationSnapshot
  currentAudit: ScriptControlFlowAuditV1
  frozenAudit: ScriptControlFlowAuditV1
  sourceCommands: readonly SourceCmd[]
}

function buildP3Core(args: P3ShadowBuildArgs): Map<string, string> {
  const p2 = buildP2ScriptMigrationIR(args)
  validateScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    ir: p2.ir,
    ledger: p2.ledger,
    throughPhase: 'P2',
  })
  const transformed = buildP3ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    p2: p2.ir,
    p2Ledger: p2.ledger,
  })
  const validation = validateP3ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    p2: p2.ir,
    p2Ledger: p2.ledger,
    ir: transformed.ir,
    ledger: transformed.ledger,
    throughPhase: 'P3',
  })
  const transitionPlan = planP3ScriptTransition({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    base: args.base,
    ours: { kind: 'v4', migration: args.ours },
    p2: p2.ir,
    p2Ledger: p2.ledger,
    target: transformed.ir,
    ledger: transformed.ledger,
  })
  if (
    transitionPlan.summary.conflicts !== 0 ||
    transitionPlan.summary.cellWrites !== 657 ||
    transitionPlan.summary.cellDeletes !== 3_945 ||
    transitionPlan.summary.flowAbsorptions !== 599 ||
    transitionPlan.summary.flowReferenceRewrites !== 655
  )
    throw new Error(`P3 transition plan drift: ${JSON.stringify(transitionPlan.summary)}`)
  const repeatPlan = planP3ScriptTransition({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    base: args.migration,
    ours: {
      kind: 'p3-ir',
      ir: transformed.ir,
      ledger: transformed.ledger,
    },
    p2: p2.ir,
    p2Ledger: p2.ledger,
    target: transformed.ir,
    ledger: transformed.ledger,
  })
  if (
    repeatPlan.summary.cellWrites !== 0 ||
    repeatPlan.summary.cellDeletes !== 0 ||
    repeatPlan.summary.conflicts !== 0
  )
    throw new Error(`P3 repeat transition is not zero: ${JSON.stringify(repeatPlan.summary)}`)

  const v4MergePlan = createMigrationPlan(args.base, args.ours, args.migration)
  if (v4MergePlan.conflicts.length)
    throw new Error(`P3 author-preservation preflight conflicts: ${v4MergePlan.conflicts.length}`)
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
    'reports/p3-flow-inventory.json',
    formatStableJson({
      kind: 'script-v5-p3-flow-inventory',
      version: 1,
      throughPhase: 'P3',
      canonical: false,
      runtimeConsumable: false,
      census: transformed.ir.flowCensus,
      structures: {
        tailInline: transformed.ir.flowStructures.filter(
          (structure) => structure.kind === 'tail-inline',
        ).length,
        branchSwitchJoin: transformed.ir.flowStructures.filter(
          (structure) => structure.kind === 'branch-switch-join',
        ).length,
        incomingSites: transformed.ir.flowStructures.reduce(
          (total, structure) => total + structure.incoming.length,
          0,
        ),
      },
      sizeGates: transformed.ir.sizeGates,
      pendingByPhase: transformed.ir.pendingByPhase,
    }),
  )
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
      throughPhase: 'P3',
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
          kind: 'p3-cumulative-transition-overlay',
          ir: 'ir/script-migration-ir.json',
          ledger: 'transitions/script-v4-v5.draft.json',
          plan: 'reports/transition-plan.json',
          previousPhase: transformed.ir.previousPhase,
          apply:
            'apply P2 pruning/owner resolution, then atomically absorb 599 acyclic targets and rewrite 655 jump cells into 579 tail-inline plus 20 branch/switch join structures',
        },
      ],
      contract:
        'The complete merged v4 layer preserves author files; the cumulative P3 IR and ledger are lossless experimental control-flow evidence. Generated n3P3FlowExit nodes are not AuthorCommand, canonical identity, save data, or runtime input.',
    }),
  )
  files.set(
    'target/summary.json',
    formatStableJson({
      kind: 'script-v5-shadow-target-summary',
      version: 1,
      throughPhase: 'P3',
      canonical: false,
      runtimeConsumable: false,
      sourceAuditDigest: args.frozenAudit.digest,
      sourceRawGeneratorSnapshotSha256: readV4ScriptCorpus(args.migration)
        .rawGeneratorSnapshotSha256,
      previousPhase: transformed.ir.previousPhase,
      irDigest: transformed.ir.digest,
      ledgerDigest: transformed.ledger.digest,
      fullMergedV4TargetDigest: fullTarget.state.digest,
      fullMergedV4Files: fullTarget.state.files.length,
      v4AuthorMerge: v4MergePlan.summary,
      retainedBodies: transformed.ir.retainedBodies.length,
      tombstones: transformed.ir.tombstones.length,
      flowStructures: transformed.ir.flowStructures.length,
      flowCensus: transformed.ir.flowCensus,
      sizeGates: transformed.ir.sizeGates,
      commandTransition: transformed.ir.commandTransition,
      pendingByPhase: transformed.ir.pendingByPhase,
    }),
  )
  return files
}

/**
 * P3 仍从同一权威 v4 输入独立构建两次，不读取 P2/P3 shadow 目录。
 */
export function buildDeterministicP3ShadowBundle(args: P3ShadowBuildArgs): P3ShadowBundle {
  const first = buildP3Core(args)
  const second = buildP3Core({
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
  if (!sameFiles(first, second)) throw new Error('P3 shadow transform is not deterministic')
  const coreDigest = digestShadowBundle(first)
  first.set(
    'reports/determinism.json',
    formatStableJson({
      kind: 'script-v5-shadow-determinism',
      version: 1,
      throughPhase: 'P3',
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
      throughPhase: 'P3',
      generatorEpoch: 'n3-script-v5-p3-v1',
      canonical: false,
      runtimeConsumable: false,
      source: 'author-preserving-v4-merge-plus-cumulative-p3-overlay',
      sourceAuditDigest: args.frozenAudit.digest,
      artifacts,
      coreDigest,
    }),
  )
  return Object.freeze({ files: first, digest: digestShadowBundle(first) })
}

export function assertP3ShadowBundle(bundle: P3ShadowBundle): void {
  if (digestShadowBundle(bundle.files) !== bundle.digest)
    throw new Error('P3 shadow bundle digest mismatch')
  const manifestBody = bundle.files.get('shadow.json')
  if (!manifestBody) throw new Error('P3 shadow bundle manifest missing')
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
    manifest.throughPhase !== 'P3' ||
    manifest.generatorEpoch !== 'n3-script-v5-p3-v1' ||
    manifest.canonical !== false ||
    manifest.runtimeConsumable !== false ||
    typeof manifest.coreDigest !== 'string' ||
    !Array.isArray(manifest.artifacts)
  )
    throw new Error('P3 shadow bundle manifest invalid')
  const coreFiles = new Map(
    [...bundle.files].filter(
      ([path]) => path !== 'shadow.json' && path !== 'reports/determinism.json',
    ),
  )
  if (digestShadowBundle(coreFiles) !== manifest.coreDigest)
    throw new Error('P3 shadow bundle core digest mismatch')
  const determinismBody = bundle.files.get('reports/determinism.json')
  if (!determinismBody) throw new Error('P3 shadow determinism report missing')
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
    throw new Error('P3 shadow determinism report invalid')
  const inventory = JSON.parse(bundle.files.get('reports/p3-flow-inventory.json') ?? '{}') as {
    census?: ScriptMigrationIRP3['flowCensus']
    structures?: { incomingSites?: unknown }
  }
  if (
    inventory.census?.input !== 1_715 ||
    inventory.census.tailInline !== 579 ||
    inventory.census.branchSwitchJoin !== 20 ||
    inventory.structures?.incomingSites !== 655
  )
    throw new Error('P3 shadow flow inventory invalid')
  const artifactPaths = new Set<string>()
  for (const artifact of manifest.artifacts) {
    if (typeof artifact.path !== 'string' || typeof artifact.sha256 !== 'string')
      throw new Error('P3 shadow bundle artifact record invalid')
    if (artifactPaths.has(artifact.path))
      throw new Error(`P3 shadow bundle duplicate artifact ${artifact.path}`)
    artifactPaths.add(artifact.path)
    const body = bundle.files.get(artifact.path)
    if (body === undefined || sha256(body) !== artifact.sha256)
      throw new Error(`P3 shadow bundle artifact hash mismatch ${artifact.path}`)
  }
  const actualPaths = [...bundle.files.keys()]
    .filter((path) => path !== 'shadow.json')
    .sort(stableStringCompare)
  const declaredPaths = [...artifactPaths].sort(stableStringCompare)
  if (
    actualPaths.length !== declaredPaths.length ||
    actualPaths.some((path, index) => path !== declaredPaths[index])
  )
    throw new Error('P3 shadow bundle manifest closure mismatch')
}

interface P4ShadowBuildArgs extends P3ShadowBuildArgs {}

function buildP4Core(args: P4ShadowBuildArgs): Map<string, string> {
  const p2 = buildP2ScriptMigrationIR(args)
  validateScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    ir: p2.ir,
    ledger: p2.ledger,
    throughPhase: 'P2',
  })
  const p3 = buildP3ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    p2: p2.ir,
    p2Ledger: p2.ledger,
  })
  validateP3ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    p2: p2.ir,
    p2Ledger: p2.ledger,
    ir: p3.ir,
    ledger: p3.ledger,
    throughPhase: 'P3',
  })
  const transformed = buildP4ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    p3: p3.ir,
    p3Ledger: p3.ledger,
  })
  const validation = validateP4ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    p3: p3.ir,
    p3Ledger: p3.ledger,
    ir: transformed.ir,
    ledger: transformed.ledger,
    throughPhase: 'P4',
  })
  const transitionPlan = planP4ScriptTransition({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    base: args.base,
    ours: { kind: 'v4', migration: args.ours },
    p2: p2.ir,
    p2Ledger: p2.ledger,
    p3: p3.ir,
    p3Ledger: p3.ledger,
    target: transformed.ir,
    ledger: transformed.ledger,
  })
  if (
    transitionPlan.summary.conflicts !== 0 ||
    transitionPlan.summary.cellWrites !== 5_343 ||
    transitionPlan.summary.cellDeletes !== 10_983 ||
    transitionPlan.summary.pageAllocations !== 3_616 ||
    transitionPlan.summary.ownerAllocations !== 4_584 ||
    transitionPlan.summary.ownerFragments !== 7_039 ||
    transitionPlan.summary.selectionCommandRewrites !== 843 ||
    transitionPlan.summary.deferredCrossOwner !== 17
  )
    throw new Error(`P4 transition plan drift: ${JSON.stringify(transitionPlan.summary)}`)
  const repeatPlan = planP4ScriptTransition({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    base: args.migration,
    ours: {
      kind: 'p4-ir',
      ir: transformed.ir,
      ledger: transformed.ledger,
    },
    p2: p2.ir,
    p2Ledger: p2.ledger,
    p3: p3.ir,
    p3Ledger: p3.ledger,
    target: transformed.ir,
    ledger: transformed.ledger,
  })
  if (
    repeatPlan.summary.cellWrites !== 0 ||
    repeatPlan.summary.cellDeletes !== 0 ||
    repeatPlan.summary.conflicts !== 0
  )
    throw new Error(`P4 repeat transition is not zero: ${JSON.stringify(repeatPlan.summary)}`)

  const v4MergePlan = createMigrationPlan(args.base, args.ours, args.migration)
  if (v4MergePlan.conflicts.length)
    throw new Error(`P4 author-preservation preflight conflicts: ${v4MergePlan.conflicts.length}`)
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
    'reports/p4-owner-inventory.json',
    formatStableJson({
      kind: 'script-v5-p4-owner-inventory',
      version: 1,
      throughPhase: 'P4',
      canonical: false,
      runtimeConsumable: false,
      census: transformed.ir.ownerCensus,
      pages: transformed.ir.pages.length,
      owners: transformed.ir.owners.length,
      fragments: transformed.ir.ownerFragments.length,
      commandTransition: transformed.ir.commandTransition,
      pendingByPhase: transformed.ir.pendingByPhase,
      deferredCrossOwner: transformed.ir.pendingOwnerLinks
        .filter(
          (link) =>
            transformed.ir.retainedBodies.find(
              (body) => body.legacyScriptId === link.legacyScriptId,
            )?.status.work.reason === 'p4-cross-owner-reuse',
        )
        .map((link) => ({
          legacyScriptId: link.legacyScriptId,
          owners: link.owners,
        })),
    }),
  )
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
      throughPhase: 'P4',
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
          kind: 'p4-cumulative-transition-overlay',
          ir: 'ir/script-migration-ir.json',
          ledger: 'transitions/script-v4-v5.draft.json',
          plan: 'reports/transition-plan.json',
          previousPhase: transformed.ir.previousPhase,
          apply:
            'apply P2/P3, then allocate stable Page/Behavior/Hook identities, absorb 7,039 owner fragments, and rewrite all 844 legacy selection commands; defer 17 cross-owner bodies to P6 without copying',
        },
      ],
      contract:
        'The complete merged v4 layer preserves author files; the cumulative P4 IR and ledger are lossless experimental owner-allocation evidence. They are not canonical v5, save data, editor input, or runtime input.',
    }),
  )
  files.set(
    'target/summary.json',
    formatStableJson({
      kind: 'script-v5-shadow-target-summary',
      version: 1,
      throughPhase: 'P4',
      canonical: false,
      runtimeConsumable: false,
      sourceAuditDigest: args.frozenAudit.digest,
      sourceRawGeneratorSnapshotSha256: readV4ScriptCorpus(args.migration)
        .rawGeneratorSnapshotSha256,
      previousPhase: transformed.ir.previousPhase,
      irDigest: transformed.ir.digest,
      ledgerDigest: transformed.ledger.digest,
      fullMergedV4TargetDigest: fullTarget.state.digest,
      fullMergedV4Files: fullTarget.state.files.length,
      v4AuthorMerge: v4MergePlan.summary,
      retainedBodies: transformed.ir.retainedBodies.length,
      tombstones: transformed.ir.tombstones.length,
      flowStructures: transformed.ir.flowStructures.length,
      pages: transformed.ir.pages.length,
      owners: transformed.ir.owners.length,
      ownerFragments: transformed.ir.ownerFragments.length,
      ownerCensus: transformed.ir.ownerCensus,
      commandTransition: transformed.ir.commandTransition,
      pendingByPhase: transformed.ir.pendingByPhase,
    }),
  )
  return files
}

/**
 * P4 仍从同一权威 v4 输入独立构建两次，不读取任何已有 shadow 目录。
 */
export function buildDeterministicP4ShadowBundle(args: P4ShadowBuildArgs): P4ShadowBundle {
  const first = buildP4Core(args)
  const second = buildP4Core({
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
  if (!sameFiles(first, second)) throw new Error('P4 shadow transform is not deterministic')
  const coreDigest = digestShadowBundle(first)
  first.set(
    'reports/determinism.json',
    formatStableJson({
      kind: 'script-v5-shadow-determinism',
      version: 1,
      throughPhase: 'P4',
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
      throughPhase: 'P4',
      generatorEpoch: 'n3-script-v5-p4-v1',
      canonical: false,
      runtimeConsumable: false,
      source: 'author-preserving-v4-merge-plus-cumulative-p4-overlay',
      sourceAuditDigest: args.frozenAudit.digest,
      artifacts,
      coreDigest,
    }),
  )
  return Object.freeze({ files: first, digest: digestShadowBundle(first) })
}

export function assertP4ShadowBundle(bundle: P4ShadowBundle): void {
  if (digestShadowBundle(bundle.files) !== bundle.digest)
    throw new Error('P4 shadow bundle digest mismatch')
  const manifestBody = bundle.files.get('shadow.json')
  if (!manifestBody) throw new Error('P4 shadow bundle manifest missing')
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
    manifest.throughPhase !== 'P4' ||
    manifest.generatorEpoch !== 'n3-script-v5-p4-v1' ||
    manifest.canonical !== false ||
    manifest.runtimeConsumable !== false ||
    typeof manifest.coreDigest !== 'string' ||
    !Array.isArray(manifest.artifacts)
  )
    throw new Error('P4 shadow bundle manifest invalid')
  const coreFiles = new Map(
    [...bundle.files].filter(
      ([path]) => path !== 'shadow.json' && path !== 'reports/determinism.json',
    ),
  )
  if (digestShadowBundle(coreFiles) !== manifest.coreDigest)
    throw new Error('P4 shadow bundle core digest mismatch')
  const determinismBody = bundle.files.get('reports/determinism.json')
  if (!determinismBody) throw new Error('P4 shadow determinism report missing')
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
    throw new Error('P4 shadow determinism report invalid')
  const inventory = JSON.parse(bundle.files.get('reports/p4-owner-inventory.json') ?? '{}') as {
    census?: ScriptMigrationIRP4['ownerCensus']
    pages?: unknown
    owners?: unknown
    fragments?: unknown
  }
  if (
    inventory.census?.pages !== 3_616 ||
    inventory.census.entityBehaviors.total !== 4_300 ||
    inventory.census.sceneHooks.total !== 284 ||
    inventory.census.deferredCrossOwner !== 17 ||
    inventory.pages !== 3_616 ||
    inventory.owners !== 4_584 ||
    inventory.fragments !== 7_039
  )
    throw new Error('P4 shadow owner inventory invalid')
  const artifactPaths = new Set<string>()
  for (const artifact of manifest.artifacts) {
    if (typeof artifact.path !== 'string' || typeof artifact.sha256 !== 'string')
      throw new Error('P4 shadow bundle artifact record invalid')
    if (artifactPaths.has(artifact.path))
      throw new Error(`P4 shadow bundle duplicate artifact ${artifact.path}`)
    artifactPaths.add(artifact.path)
    const body = bundle.files.get(artifact.path)
    if (body === undefined || sha256(body) !== artifact.sha256)
      throw new Error(`P4 shadow bundle artifact hash mismatch ${artifact.path}`)
  }
  const actualPaths = [...bundle.files.keys()]
    .filter((path) => path !== 'shadow.json')
    .sort(stableStringCompare)
  const declaredPaths = [...artifactPaths].sort(stableStringCompare)
  if (
    actualPaths.length !== declaredPaths.length ||
    actualPaths.some((path, index) => path !== declaredPaths[index])
  )
    throw new Error('P4 shadow bundle manifest closure mismatch')
}

interface P5ShadowBuildArgs extends P4ShadowBuildArgs {}

function buildP5Core(args: P5ShadowBuildArgs): Map<string, string> {
  const p2 = buildP2ScriptMigrationIR(args)
  validateScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    ir: p2.ir,
    ledger: p2.ledger,
    throughPhase: 'P2',
  })
  const p3 = buildP3ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    p2: p2.ir,
    p2Ledger: p2.ledger,
  })
  validateP3ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    p2: p2.ir,
    p2Ledger: p2.ledger,
    ir: p3.ir,
    ledger: p3.ledger,
    throughPhase: 'P3',
  })
  const p4 = buildP4ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    p3: p3.ir,
    p3Ledger: p3.ledger,
  })
  validateP4ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    p3: p3.ir,
    p3Ledger: p3.ledger,
    ir: p4.ir,
    ledger: p4.ledger,
    throughPhase: 'P4',
  })
  const transformed = buildP5ScriptMigrationIR({
    frozenAudit: args.frozenAudit,
    p4: p4.ir,
    p4Ledger: p4.ledger,
  })
  const validation = validateP5ScriptMigrationIR({
    frozenAudit: args.frozenAudit,
    p4: p4.ir,
    p4Ledger: p4.ledger,
    ir: transformed.ir,
    ledger: transformed.ledger,
    throughPhase: 'P5',
  })
  const transitionPlan = planP5ScriptTransition({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    base: args.base,
    ours: { kind: 'v4', migration: args.ours },
    p2: p2.ir,
    p2Ledger: p2.ledger,
    p3: p3.ir,
    p3Ledger: p3.ledger,
    p4: p4.ir,
    p4Ledger: p4.ledger,
    target: transformed.ir,
    ledger: transformed.ledger,
  })
  if (
    transitionPlan.summary.conflicts !== 0 ||
    transitionPlan.summary.cellWrites !== 6_207 ||
    transitionPlan.summary.cellDeletes !== 11_416 ||
    transitionPlan.summary.transitionGroups !== 5_620 ||
    transitionPlan.summary.cycleStructures !== 331 ||
    transitionPlan.summary.cycleBodies !== 433 ||
    transitionPlan.summary.jumpTransitionRewrites !== 1_286 ||
    transitionPlan.summary.remainingLegacyJumps !== 11
  )
    throw new Error(`P5 transition plan drift: ${JSON.stringify(transitionPlan.summary)}`)
  const repeatPlan = planP5ScriptTransition({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    base: args.migration,
    ours: {
      kind: 'p5-ir',
      ir: transformed.ir,
      ledger: transformed.ledger,
    },
    p2: p2.ir,
    p2Ledger: p2.ledger,
    p3: p3.ir,
    p3Ledger: p3.ledger,
    p4: p4.ir,
    p4Ledger: p4.ledger,
    target: transformed.ir,
    ledger: transformed.ledger,
  })
  if (
    repeatPlan.summary.cellWrites !== 0 ||
    repeatPlan.summary.cellDeletes !== 0 ||
    repeatPlan.summary.conflicts !== 0
  )
    throw new Error(`P5 repeat transition is not zero: ${JSON.stringify(repeatPlan.summary)}`)

  const v4MergePlan = createMigrationPlan(args.base, args.ours, args.migration)
  if (v4MergePlan.conflicts.length)
    throw new Error(`P5 author-preservation preflight conflicts: ${v4MergePlan.conflicts.length}`)
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
    'reports/p5-cycle-inventory.json',
    formatStableJson({
      kind: 'script-v5-p5-cycle-inventory',
      version: 1,
      throughPhase: 'P5',
      canonical: false,
      runtimeConsumable: false,
      census: transformed.ir.cycleCensus,
      scheduling: transformed.ir.scheduling,
      structures: transformed.ir.cycleStructures.length,
      bodies: transformed.ir.cycleCensus.bodies,
      transitionRewrites: transformed.ir.transitionRewrites.length,
      remainingLegacyJumps: transformed.ir.cycleCensus.jumpTransitions.deferredP6,
      pendingByPhase: transformed.ir.pendingByPhase,
    }),
  )
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
      throughPhase: 'P5',
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
          kind: 'p5-cumulative-transition-overlay',
          ir: 'ir/script-migration-ir.json',
          ledger: 'transitions/script-v4-v5.draft.json',
          plan: 'reports/transition-plan.json',
          previousPhase: transformed.ir.previousPhase,
          apply:
            'apply P2/P3/P4, then restore 331 cyclic flow structures covering 433 legacy bodies and rewrite 1,286 legacy jumps into explicit yielded flow exits; defer only 11 P6 synthetic targets',
        },
      ],
      contract:
        'The complete merged v4 layer preserves author files; the cumulative P5 IR and ledger are lossless experimental cycle-restoration evidence. They are not canonical v5, save data, editor input, or runtime input.',
    }),
  )
  files.set(
    'target/summary.json',
    formatStableJson({
      kind: 'script-v5-shadow-target-summary',
      version: 1,
      throughPhase: 'P5',
      canonical: false,
      runtimeConsumable: false,
      sourceAuditDigest: args.frozenAudit.digest,
      sourceRawGeneratorSnapshotSha256: readV4ScriptCorpus(args.migration)
        .rawGeneratorSnapshotSha256,
      previousPhase: transformed.ir.previousPhase,
      irDigest: transformed.ir.digest,
      ledgerDigest: transformed.ledger.digest,
      fullMergedV4TargetDigest: fullTarget.state.digest,
      fullMergedV4Files: fullTarget.state.files.length,
      v4AuthorMerge: v4MergePlan.summary,
      retainedBodies: transformed.ir.retainedBodies.length,
      tombstones: transformed.ir.tombstones.length,
      flowStructures: transformed.ir.flowStructures.length,
      pages: transformed.ir.pages.length,
      owners: transformed.ir.owners.length,
      ownerFragments: transformed.ir.ownerFragments.length,
      cycleStructures: transformed.ir.cycleStructures.length,
      cycleCensus: transformed.ir.cycleCensus,
      scheduling: transformed.ir.scheduling,
      transitionRewrites: transformed.ir.transitionRewrites.length,
      pendingByPhase: transformed.ir.pendingByPhase,
    }),
  )
  return files
}

/**
 * P5 仍从同一权威 v4 输入独立构建两次，不读取任何已有 shadow 目录。
 */
export function buildDeterministicP5ShadowBundle(args: P5ShadowBuildArgs): P5ShadowBundle {
  const first = buildP5Core(args)
  const second = buildP5Core({
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
  if (!sameFiles(first, second)) throw new Error('P5 shadow transform is not deterministic')
  const coreDigest = digestShadowBundle(first)
  first.set(
    'reports/determinism.json',
    formatStableJson({
      kind: 'script-v5-shadow-determinism',
      version: 1,
      throughPhase: 'P5',
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
      throughPhase: 'P5',
      generatorEpoch: 'n3-script-v5-p5-v1',
      canonical: false,
      runtimeConsumable: false,
      source: 'author-preserving-v4-merge-plus-cumulative-p5-overlay',
      sourceAuditDigest: args.frozenAudit.digest,
      artifacts,
      coreDigest,
    }),
  )
  return Object.freeze({ files: first, digest: digestShadowBundle(first) })
}

export function assertP5ShadowBundle(bundle: P5ShadowBundle): void {
  if (digestShadowBundle(bundle.files) !== bundle.digest)
    throw new Error('P5 shadow bundle digest mismatch')
  const manifestBody = bundle.files.get('shadow.json')
  if (!manifestBody) throw new Error('P5 shadow bundle manifest missing')
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
    manifest.throughPhase !== 'P5' ||
    manifest.generatorEpoch !== 'n3-script-v5-p5-v1' ||
    manifest.canonical !== false ||
    manifest.runtimeConsumable !== false ||
    typeof manifest.coreDigest !== 'string' ||
    !Array.isArray(manifest.artifacts)
  )
    throw new Error('P5 shadow bundle manifest invalid')
  const coreFiles = new Map(
    [...bundle.files].filter(
      ([path]) => path !== 'shadow.json' && path !== 'reports/determinism.json',
    ),
  )
  if (digestShadowBundle(coreFiles) !== manifest.coreDigest)
    throw new Error('P5 shadow bundle core digest mismatch')
  const determinismBody = bundle.files.get('reports/determinism.json')
  if (!determinismBody) throw new Error('P5 shadow determinism report missing')
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
    throw new Error('P5 shadow determinism report invalid')
  const inventory = JSON.parse(bundle.files.get('reports/p5-cycle-inventory.json') ?? '{}') as {
    census?: ScriptMigrationIRP5['cycleCensus']
    structures?: unknown
    bodies?: unknown
    transitionRewrites?: unknown
    remainingLegacyJumps?: unknown
    pendingByPhase?: unknown
  }
  if (
    inventory.census?.components !== 331 ||
    inventory.census.bodies !== 433 ||
    inventory.census.projections.autoRunnerRepeat !== 99 ||
    inventory.census.projections.structuredLoops !== 162 ||
    inventory.census.projections.stateMachines !== 70 ||
    inventory.census.projections.stateMachineStates !== 172 ||
    inventory.census.authorTransitions.total !== 753 ||
    inventory.census.authorTransitions.bodyEnd !== 230 ||
    inventory.census.authorTransitions.condition !== 522 ||
    inventory.census.authorTransitions.commandOutcome !== 1 ||
    inventory.census.bodyCopies !== 0 ||
    inventory.structures !== 331 ||
    inventory.bodies !== 433 ||
    inventory.transitionRewrites !== 1_286 ||
    inventory.remainingLegacyJumps !== 11
  )
    throw new Error('P5 shadow cycle inventory invalid')
  const artifactPaths = new Set<string>()
  for (const artifact of manifest.artifacts) {
    if (typeof artifact.path !== 'string' || typeof artifact.sha256 !== 'string')
      throw new Error('P5 shadow bundle artifact record invalid')
    if (artifactPaths.has(artifact.path))
      throw new Error(`P5 shadow bundle duplicate artifact ${artifact.path}`)
    artifactPaths.add(artifact.path)
    const body = bundle.files.get(artifact.path)
    if (body === undefined || sha256(body) !== artifact.sha256)
      throw new Error(`P5 shadow bundle artifact hash mismatch ${artifact.path}`)
  }
  const actualPaths = [...bundle.files.keys()]
    .filter((path) => path !== 'shadow.json')
    .sort(stableStringCompare)
  const declaredPaths = [...artifactPaths].sort(stableStringCompare)
  if (
    actualPaths.length !== declaredPaths.length ||
    actualPaths.some((path, index) => path !== declaredPaths[index])
  )
    throw new Error('P5 shadow bundle manifest closure mismatch')
}

interface P6ShadowBuildArgs extends P5ShadowBuildArgs {}

function buildP6Core(args: P6ShadowBuildArgs): Map<string, string> {
  const p2 = buildP2ScriptMigrationIR(args)
  validateScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    ir: p2.ir,
    ledger: p2.ledger,
    throughPhase: 'P2',
  })
  const p3 = buildP3ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    p2: p2.ir,
    p2Ledger: p2.ledger,
  })
  validateP3ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    p2: p2.ir,
    p2Ledger: p2.ledger,
    ir: p3.ir,
    ledger: p3.ledger,
    throughPhase: 'P3',
  })
  const p4 = buildP4ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    p3: p3.ir,
    p3Ledger: p3.ledger,
  })
  validateP4ScriptMigrationIR({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    p3: p3.ir,
    p3Ledger: p3.ledger,
    ir: p4.ir,
    ledger: p4.ledger,
    throughPhase: 'P4',
  })
  const p5 = buildP5ScriptMigrationIR({
    frozenAudit: args.frozenAudit,
    p4: p4.ir,
    p4Ledger: p4.ledger,
  })
  validateP5ScriptMigrationIR({
    frozenAudit: args.frozenAudit,
    p4: p4.ir,
    p4Ledger: p4.ledger,
    ir: p5.ir,
    ledger: p5.ledger,
    throughPhase: 'P5',
  })
  const transformed = buildP6ScriptMigrationIR({
    frozenAudit: args.frozenAudit,
    p5: p5.ir,
    p5Ledger: p5.ledger,
  })
  const validation = validateP6ScriptMigrationIR({
    frozenAudit: args.frozenAudit,
    p5: p5.ir,
    p5Ledger: p5.ledger,
    ir: transformed.ir,
    ledger: transformed.ledger,
    throughPhase: 'P6',
  })
  const transitionPlan = planP6ScriptTransition({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    base: args.base,
    ours: { kind: 'v4', migration: args.ours },
    p2: p2.ir,
    p2Ledger: p2.ledger,
    p3: p3.ir,
    p3Ledger: p3.ledger,
    p4: p4.ir,
    p4Ledger: p4.ledger,
    p5: p5.ir,
    p5Ledger: p5.ledger,
    target: transformed.ir,
    ledger: transformed.ledger,
  })
  if (
    transitionPlan.summary.conflicts !== 0 ||
    transitionPlan.summary.cellWrites !== 6_793 ||
    transitionPlan.summary.cellDeletes !== 11_447 ||
    transitionPlan.summary.transitionGroups !== 5_630 ||
    transitionPlan.summary.localCallInlines !== 574 ||
    transitionPlan.summary.localFlowAllocations !== 42 ||
    transitionPlan.summary.itemPrivateScripts !== 6 ||
    transitionPlan.summary.sharedAuthorScripts !== 0 ||
    transitionPlan.summary.classifiedSharedTails !== 532 ||
    transitionPlan.summary.remainingInternalCalls !== 0 ||
    transitionPlan.summary.remainingLegacyJumps !== 0 ||
    transitionPlan.summary.remainingPendingBodies !== 0
  )
    throw new Error(
      `P6 transition plan drift: ${JSON.stringify({
        summary: transitionPlan.summary,
        conflicts: transitionPlan.conflicts,
      })}`,
    )
  const repeatPlan = planP6ScriptTransition({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    base: args.migration,
    ours: {
      kind: 'p6-ir',
      ir: transformed.ir,
      ledger: transformed.ledger,
    },
    p2: p2.ir,
    p2Ledger: p2.ledger,
    p3: p3.ir,
    p3Ledger: p3.ledger,
    p4: p4.ir,
    p4Ledger: p4.ledger,
    p5: p5.ir,
    p5Ledger: p5.ledger,
    target: transformed.ir,
    ledger: transformed.ledger,
  })
  if (
    repeatPlan.summary.cellWrites !== 0 ||
    repeatPlan.summary.cellDeletes !== 0 ||
    repeatPlan.summary.conflicts !== 0
  )
    throw new Error(`P6 repeat transition is not zero: ${JSON.stringify(repeatPlan.summary)}`)

  const v4MergePlan = createMigrationPlan(args.base, args.ours, args.migration)
  if (v4MergePlan.conflicts.length)
    throw new Error(`P6 author-preservation preflight conflicts: ${v4MergePlan.conflicts.length}`)
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
    'reports/p6-shared-closure-inventory.json',
    formatStableJson({
      kind: 'script-v5-p6-shared-closure-inventory',
      version: 1,
      throughPhase: 'P6',
      canonical: false,
      runtimeConsumable: false,
      census: transformed.ir.closureCensus,
      localSourceBodies: transformed.ir.localSourceBodies.length,
      localFlowAllocations: transformed.ir.localFlows.length,
      itemPrivateClosures: transformed.ir.itemPrivateClosures.map((closure) => ({
        domainId: closure.domainId,
        itemIds: closure.scripts.map((script) => script.identity.itemId),
        sourceBodies: closure.sourceBodies.length,
      })),
      itemPrivateScripts: transformed.ir.itemPrivateScripts.length,
      sharedAuthorScripts: transformed.ir.sharedAuthorScripts.length,
      sharedTailClassifications: transformed.ir.sharedTailClassifications.length,
      misleadingSccRetirements: transformed.ir.misleadingSccRetirements.length,
      callInlineRewrites: transformed.ir.callInlineRewrites.length,
      flowExitRewrites: transformed.ir.flowExitRewrites.length,
      pendingByPhase: transformed.ir.pendingByPhase,
    }),
  )
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
      throughPhase: 'P6',
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
          kind: 'p6-cumulative-transition-overlay',
          ir: 'ir/script-migration-ir.json',
          ledger: 'transitions/script-v4-v5.draft.json',
          plan: 'reports/transition-plan.json',
          previousPhase: transformed.ir.previousPhase,
          apply:
            'apply P2-P5, then classify all 532 shared tails, inline 574 owner-local calls with compatibility scheduling evidence, restore 42 owner-local flow allocations, absorb six item roots into four item-private closure families, and retire all active legacy/private/shared-shell identities without creating a shared author script',
        },
      ],
      contract:
        'The complete merged v4 layer preserves author files; the cumulative P6 IR and ledger are lossless experimental shared-closure evidence. P6 reaches zero pending/internal call/jump identities, but remains a non-canonical, non-runtime-consumable shadow input for P7 publication.',
    }),
  )
  files.set(
    'target/summary.json',
    formatStableJson({
      kind: 'script-v5-shadow-target-summary',
      version: 1,
      throughPhase: 'P6',
      canonical: false,
      runtimeConsumable: false,
      sourceAuditDigest: args.frozenAudit.digest,
      sourceRawGeneratorSnapshotSha256: readV4ScriptCorpus(args.migration)
        .rawGeneratorSnapshotSha256,
      previousPhase: transformed.ir.previousPhase,
      irDigest: transformed.ir.digest,
      ledgerDigest: transformed.ledger.digest,
      fullMergedV4TargetDigest: fullTarget.state.digest,
      fullMergedV4Files: fullTarget.state.files.length,
      v4AuthorMerge: v4MergePlan.summary,
      tombstones: transformed.ir.tombstones.length,
      flowStructures: transformed.ir.flowStructures.length,
      pages: transformed.ir.pages.length,
      owners: transformed.ir.owners.length,
      ownerFragments: transformed.ir.ownerFragments.length,
      cycleStructures: transformed.ir.cycleStructures.length,
      localSourceBodies: transformed.ir.localSourceBodies.length,
      localFlowAllocations: transformed.ir.localFlows.length,
      itemPrivateClosures: transformed.ir.itemPrivateClosures.length,
      itemPrivateScripts: transformed.ir.itemPrivateScripts.length,
      sharedAuthorScripts: transformed.ir.sharedAuthorScripts.length,
      closureCensus: transformed.ir.closureCensus,
      pendingByPhase: transformed.ir.pendingByPhase,
    }),
  )
  return files
}

/**
 * P6 仍从同一权威 v4 输入独立构建两次，不读取任何已有 shadow 目录。
 */
export function buildDeterministicP6ShadowBundle(args: P6ShadowBuildArgs): P6ShadowBundle {
  const first = buildP6Core(args)
  const second = buildP6Core({
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
  if (!sameFiles(first, second)) throw new Error('P6 shadow transform is not deterministic')
  const coreDigest = digestShadowBundle(first)
  first.set(
    'reports/determinism.json',
    formatStableJson({
      kind: 'script-v5-shadow-determinism',
      version: 1,
      throughPhase: 'P6',
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
      throughPhase: 'P6',
      generatorEpoch: 'n3-script-v5-p6-v1',
      canonical: false,
      runtimeConsumable: false,
      source: 'author-preserving-v4-merge-plus-cumulative-p6-overlay',
      sourceAuditDigest: args.frozenAudit.digest,
      artifacts,
      coreDigest,
    }),
  )
  return Object.freeze({ files: first, digest: digestShadowBundle(first) })
}

export function assertP6ShadowBundle(bundle: P6ShadowBundle): void {
  if (digestShadowBundle(bundle.files) !== bundle.digest)
    throw new Error('P6 shadow bundle digest mismatch')
  const manifestBody = bundle.files.get('shadow.json')
  if (!manifestBody) throw new Error('P6 shadow bundle manifest missing')
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
    manifest.throughPhase !== 'P6' ||
    manifest.generatorEpoch !== 'n3-script-v5-p6-v1' ||
    manifest.canonical !== false ||
    manifest.runtimeConsumable !== false ||
    typeof manifest.coreDigest !== 'string' ||
    !Array.isArray(manifest.artifacts)
  )
    throw new Error('P6 shadow bundle manifest invalid')
  const coreFiles = new Map(
    [...bundle.files].filter(
      ([path]) => path !== 'shadow.json' && path !== 'reports/determinism.json',
    ),
  )
  if (digestShadowBundle(coreFiles) !== manifest.coreDigest)
    throw new Error('P6 shadow bundle core digest mismatch')
  const determinismBody = bundle.files.get('reports/determinism.json')
  if (!determinismBody) throw new Error('P6 shadow determinism report missing')
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
    throw new Error('P6 shadow determinism report invalid')
  const inventory = JSON.parse(
    bundle.files.get('reports/p6-shared-closure-inventory.json') ?? '{}',
  ) as {
    census?: ScriptMigrationIRP6['closureCensus']
    localSourceBodies?: unknown
    localFlowAllocations?: unknown
    itemPrivateClosures?: unknown[]
    itemPrivateScripts?: unknown
    sharedAuthorScripts?: unknown
    sharedTailClassifications?: unknown
    misleadingSccRetirements?: unknown
    callInlineRewrites?: unknown
    flowExitRewrites?: unknown
  }
  if (
    inventory.census?.retainedOutput !== 0 ||
    inventory.census.sharedTails.input !== 532 ||
    inventory.census.sharedTails.sharedAuthorScript !== 0 ||
    inventory.census.internalCalls.remaining !== 0 ||
    inventory.census.legacyJumps.remaining !== 0 ||
    inventory.localSourceBodies !== 21 ||
    inventory.localFlowAllocations !== 42 ||
    inventory.itemPrivateClosures?.length !== 4 ||
    inventory.itemPrivateScripts !== 6 ||
    inventory.sharedAuthorScripts !== 0 ||
    inventory.sharedTailClassifications !== 532 ||
    inventory.misleadingSccRetirements !== 13 ||
    inventory.callInlineRewrites !== 574 ||
    inventory.flowExitRewrites !== 5
  )
    throw new Error('P6 shadow shared closure inventory invalid')
  const artifactPaths = new Set<string>()
  for (const artifact of manifest.artifacts) {
    if (typeof artifact.path !== 'string' || typeof artifact.sha256 !== 'string')
      throw new Error('P6 shadow bundle artifact record invalid')
    if (artifactPaths.has(artifact.path))
      throw new Error(`P6 shadow bundle duplicate artifact ${artifact.path}`)
    artifactPaths.add(artifact.path)
    const body = bundle.files.get(artifact.path)
    if (body === undefined || sha256(body) !== artifact.sha256)
      throw new Error(`P6 shadow bundle artifact hash mismatch ${artifact.path}`)
  }
  const actualPaths = [...bundle.files.keys()]
    .filter((path) => path !== 'shadow.json')
    .sort(stableStringCompare)
  const declaredPaths = [...artifactPaths].sort(stableStringCompare)
  if (
    actualPaths.length !== declaredPaths.length ||
    actualPaths.some((path, index) => path !== declaredPaths[index])
  )
    throw new Error('P6 shadow bundle manifest closure mismatch')
}
