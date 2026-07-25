import { createHash } from 'node:crypto'
import type {
  CanonicalAuthorIdentityV5,
  CanonicalScriptOwnerV5,
  ProjectMigrationSidecarV1,
  ScriptFlowV5,
} from '@type-pal/content'
import { canonicalScriptTransitionJson } from '@type-pal/content'
import type { P7CanonicalProject } from './p7-project.js'
import { stableJson, stableStringCompare } from './stable-json.js'
import type { ScriptMigrationIRP6, ScriptTransitionLedgerDraftP6 } from './types.js'

function digest(value: unknown): string {
  return createHash('sha256').update(canonicalScriptTransitionJson(value)).digest('hex')
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function canonicalOwner(
  owner: ScriptMigrationIRP6['owners'][number]['identity'],
): CanonicalScriptOwnerV5 {
  return owner.kind === 'entity-behavior'
    ? clone(owner)
    : {
        kind: 'scene-hook',
        sceneId: owner.sceneId,
        hook: owner.slot,
        hookId: owner.hookId,
      }
}

function ownerKey(owner: CanonicalScriptOwnerV5): string {
  return owner.kind === 'entity-behavior'
    ? `entity:${owner.sceneId}:${owner.entityId}:${owner.channel}:${owner.behaviorId}`
    : `hook:${owner.sceneId}:${owner.hook}:${owner.hookId}`
}

function flowForOwner(project: P7CanonicalProject, owner: CanonicalScriptOwnerV5): ScriptFlowV5 {
  const scene = project.scenes.find((candidate) => candidate.id === owner.sceneId)
  if (!scene) throw new Error(`P7 ledger: scene 缺失 ${owner.sceneId}`)
  if (owner.kind === 'scene-hook') {
    const flow = scene.hooks?.[owner.hook]?.variants[owner.hookId]?.flow
    if (!flow) throw new Error(`P7 ledger: hook owner 缺失 ${ownerKey(owner)}`)
    return flow
  }
  const entity = scene.entities.find((candidate) => candidate.id === owner.entityId)
  const flow = entity?.behaviors?.[owner.channel]?.[owner.behaviorId]?.flow
  if (!flow) throw new Error(`P7 ledger: entity owner 缺失 ${ownerKey(owner)}`)
  return flow
}

export type P7CanonicalTargetInventoryEntry =
  | {
      target: Extract<CanonicalAuthorIdentityV5, { kind: 'entity-page' }>
    }
  | {
      target: CanonicalScriptOwnerV5
      flow:
        | { kind: 'stages'; stages: string[] }
        | { kind: 'stateMachine'; machineId: string; states: string[] }
    }
  | {
      target: Extract<CanonicalAuthorIdentityV5, { kind: 'state-machine' }>
      states: string[]
    }
  | {
      target: Extract<CanonicalAuthorIdentityV5, { kind: 'item-private-script' }>
    }

export interface ScriptIdentityTransitionLedgerV1 {
  kind: 'script-identity-transition'
  version: 1
  projectId: string
  transitionId: 'script-v4-v5'
  from: {
    contentVersion: 4
    generatorEpoch: 'pal-content-v4-v1'
    baselineSha256: string
  }
  to: {
    contentVersion: 5
    generatorEpoch: 'n3-script-v5-p7-v1'
    canonicalScriptProjectDigest: string
  }
  sourceAudit: ScriptMigrationIRP6['sourceAudit']
  previousPhase: {
    throughPhase: 'P6'
    irDigest: string
    ledgerDigest: string
  }
  entries: ScriptTransitionLedgerDraftP6['entries']
  groups: ScriptTransitionLedgerDraftP6['groups']
  evidence: ScriptTransitionLedgerDraftP6['evidence']
  canonicalTargets: P7CanonicalTargetInventoryEntry[]
  compatibility: {
    legacyBindings: ProjectMigrationSidecarV1['legacyBindings']
    legacyCursors: ProjectMigrationSidecarV1['legacyCursors']
    legacyEntities: ProjectMigrationSidecarV1['legacyEntities']
    lineagePlans: ProjectMigrationSidecarV1['lineagePlans']
    localAllocations: ProjectMigrationSidecarV1['localAllocations']
    targetClosures: ProjectMigrationSidecarV1['targetClosures']
    digest: string
  }
  digest: string
}

function canonicalTargets(
  ir: ScriptMigrationIRP6,
  project: P7CanonicalProject,
): P7CanonicalTargetInventoryEntry[] {
  const targets: P7CanonicalTargetInventoryEntry[] = []
  for (const page of ir.pages) {
    targets.push({
      target: {
        kind: 'entity-page',
        sceneId: page.identity.sceneId,
        entityId: page.identity.entityId,
        pageId: page.identity.pageId,
      },
    })
  }
  for (const allocation of ir.owners) {
    const owner = canonicalOwner(allocation.identity)
    const flow = flowForOwner(project, owner)
    if (flow.kind === 'stages') {
      targets.push({
        target: owner,
        flow: { kind: 'stages', stages: flow.stages.map((stage) => stage.id) },
      })
      continue
    }
    const states = Object.keys(flow.machine.states)
    targets.push({
      target: owner,
      flow: {
        kind: 'stateMachine',
        machineId: flow.machine.id,
        states,
      },
    })
    targets.push({
      target: {
        kind: 'state-machine',
        owner,
        machineId: flow.machine.id,
      },
      states,
    })
  }
  for (const item of ir.itemPrivateScripts) {
    targets.push({
      target: {
        kind: 'item-private-script',
        itemId: item.identity.itemId,
        scriptId: item.identity.scriptId,
      },
    })
  }
  targets.sort((left, right) =>
    stableStringCompare(stableJson(left.target), stableJson(right.target)),
  )
  const identities = targets.map((entry) => stableJson(entry.target))
  if (new Set(identities).size !== identities.length)
    throw new Error('P7 ledger: canonical target identity 重复')
  return targets
}

function compatibilityCore(sidecar: ProjectMigrationSidecarV1) {
  return {
    legacyBindings: clone(sidecar.legacyBindings),
    legacyCursors: clone(sidecar.legacyCursors),
    legacyEntities: clone(sidecar.legacyEntities),
    lineagePlans: clone(sidecar.lineagePlans),
    localAllocations: clone(sidecar.localAllocations),
    targetClosures: clone(sidecar.targetClosures),
  }
}

export interface P7TransitionLedgerReport {
  entries: number
  groups: number
  evidence: number
  pages: number
  owners: number
  machines: number
  simpleStages: number
  machineStates: number
  itemPrivateScripts: number
  canonicalTargets: number
  compatibilityDigest: string
}

export function buildP7TransitionLedger(args: {
  projectId: string
  baselineSha256: string
  ir: ScriptMigrationIRP6
  p6Ledger: ScriptTransitionLedgerDraftP6
  project: P7CanonicalProject
  compatibility: ProjectMigrationSidecarV1
}): {
  ledger: ScriptIdentityTransitionLedgerV1
  report: P7TransitionLedgerReport
} {
  if (!/^[a-f0-9]{64}$/.test(args.baselineSha256)) throw new Error('P7 ledger: baselineSha256 非法')
  if (args.p6Ledger.pending.length !== 0 || args.ir.pendingOwnerLinks.length !== 0)
    throw new Error('P7 ledger: P6 pending 尚未归零')
  if (
    args.compatibility.provenance.kind !== 'pal-baseline' ||
    args.p6Ledger.digest !== args.compatibility.provenance.fullLedgerDigest
  )
    throw new Error('P7 ledger: preliminary compatibility 必须引用 P6 ledger digest')
  const targets = canonicalTargets(args.ir, args.project)
  const core = compatibilityCore(args.compatibility)
  const compatibility = { ...core, digest: digest(core) }
  const withoutDigest = {
    kind: 'script-identity-transition' as const,
    version: 1 as const,
    projectId: args.projectId,
    transitionId: 'script-v4-v5' as const,
    from: {
      contentVersion: 4 as const,
      generatorEpoch: 'pal-content-v4-v1' as const,
      baselineSha256: args.baselineSha256,
    },
    to: {
      contentVersion: 5 as const,
      generatorEpoch: 'n3-script-v5-p7-v1' as const,
      canonicalScriptProjectDigest: digest({
        scenes: args.project.scenes,
        items: args.project.items,
        scripts: args.project.scripts,
      }),
    },
    sourceAudit: clone(args.ir.sourceAudit),
    previousPhase: {
      throughPhase: 'P6' as const,
      irDigest: args.ir.digest,
      ledgerDigest: args.p6Ledger.digest,
    },
    entries: clone(args.p6Ledger.entries),
    groups: clone(args.p6Ledger.groups),
    evidence: clone(args.p6Ledger.evidence),
    canonicalTargets: targets,
    compatibility,
  }
  const ledger: ScriptIdentityTransitionLedgerV1 = {
    ...withoutDigest,
    digest: digest(withoutDigest),
  }
  const ownerTargets = targets.filter(
    (entry) => entry.target.kind === 'entity-behavior' || entry.target.kind === 'scene-hook',
  )
  const machineTargets = targets.filter((entry) => entry.target.kind === 'state-machine')
  const simpleStages = ownerTargets.reduce(
    (total, entry) =>
      total + ('flow' in entry && entry.flow.kind === 'stages' ? entry.flow.stages.length : 0),
    0,
  )
  const machineStates = machineTargets.reduce(
    (total, entry) => total + ('states' in entry ? entry.states.length : 0),
    0,
  )
  return {
    ledger,
    report: {
      entries: ledger.entries.length,
      groups: ledger.groups.length,
      evidence: ledger.evidence.length,
      pages: targets.filter((entry) => entry.target.kind === 'entity-page').length,
      owners: ownerTargets.length,
      machines: machineTargets.length,
      simpleStages,
      machineStates,
      itemPrivateScripts: targets.filter((entry) => entry.target.kind === 'item-private-script')
        .length,
      canonicalTargets: targets.length,
      compatibilityDigest: compatibility.digest,
    },
  }
}
