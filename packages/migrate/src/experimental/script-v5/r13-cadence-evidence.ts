import { isDeepStrictEqual } from 'node:util'
import type { SceneDefV5, ScriptFlowV5 } from '@type-pal/content'
import { validateScenesV5 } from '@type-pal/content'
import { compileScriptFlowV5 } from '@type-pal/reforge/script-compiler-v5'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { AutoFlowLifecycleReport } from './auto-flow-lifecycle.js'
import type { PalAutoLifecycleRepairEvidenceV1 } from './pal-auto-lifecycle-repair.js'
import type { PalSceneSemanticRepairEvidenceV1 } from './pal-scene-semantic-repair.js'
import { digestRecord, stableJson, stableJsonSha256 } from './stable-json.js'

const COMPATIBILITY_CONTENT_DIGEST = 'a'.repeat(64)

export interface R13CadenceOwnerEvidenceV1 {
  ownerKey: string
  machineId: string
  flowDigest: string
  lifecycleDigest: string
  sourceCommandsDigest: string
  sourceStates: number
  syntheticWaitStates: number
  totalStates: number
  compoundSourceStates: number
  waitSourceStates: number
  directContinueSourceStates: number
  branchSourceStates: number
}

export interface R13CadenceEvidenceV1 {
  generator: {
    id: 'r13-cadence-evidence'
    version: 1
  }
  compiler: {
    version: 2
    boundaryPolicy: 'transition'
    worldTickMs: 100
    sourceFrameMs: 40
    waitOpcode09: 'stable-world-tick-states'
  }
  legacyCompatibility: {
    rows: number
    uniqueKeys: number
    stages: number
    historicalMachines: number
    transitionMachines: number
    bytes: number
    sha256: string
  }
  cadence: {
    owners: number
    sourceStates: number
    syntheticWaitStates: number
    totalStates: number
    compoundSourceStates: number
    waitSourceStates: number
    directContinueSourceStates: number
    branchSourceStates: number
  }
  owners: R13CadenceOwnerEvidenceV1[]
  lifecycleReport: {
    inputPool: number
    summary: AutoFlowLifecycleReport['summary']
    digest: string
  }
  repairs: {
    autoLifecycle: PalAutoLifecycleRepairEvidenceV1
    sceneSemantics: PalSceneSemanticRepairEvidenceV1
    sceneSemanticsDigest: string
  }
  digest: string
}

function requiredScenes(snapshot: MigrationSnapshot): SceneDefV5[] {
  const ids = snapshot.files.get('content/scenes/index.json')
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string'))
    throw new Error('R13 cadence evidence: scenes/index.json 无效')
  return validateScenesV5(
    ids.map((id) => {
      const scene = snapshot.files.get(`content/scenes/${String(id)}.json`)
      if (!scene) throw new Error(`R13 cadence evidence: 缺 scene ${String(id)}`)
      return scene
    }),
  )
}

function sum(
  owners: readonly R13CadenceOwnerEvidenceV1[],
  key: Exclude<
    keyof R13CadenceOwnerEvidenceV1,
    'ownerKey' | 'machineId' | 'flowDigest' | 'lifecycleDigest' | 'sourceCommandsDigest'
  >,
): number {
  return owners.reduce((total, owner) => total + owner[key], 0)
}

function assertRepairEvidence(
  autoLifecycle: PalAutoLifecycleRepairEvidenceV1,
  lifecycle: AutoFlowLifecycleReport,
): void {
  const { digest: autoDigest, ...autoBody } = autoLifecycle
  if (stableJsonSha256(autoBody) !== autoDigest)
    throw new Error('R13 cadence evidence: auto lifecycle repair 自摘要不符')
  const { digest: lifecycleDigest, ...lifecycleBody } = lifecycle
  if (stableJsonSha256(lifecycleBody) !== lifecycleDigest)
    throw new Error('R13 cadence evidence: lifecycle report 自摘要不符')
}

interface CompatibilityBuild {
  rows: Array<{ key: string; timing: 'auto' | 'interactive'; flow: unknown }>
  summary: R13CadenceEvidenceV1['legacyCompatibility']
}

function buildCompatibility(
  snapshot: MigrationSnapshot,
  excludedKeys: ReadonlySet<string>,
): CompatibilityBuild {
  const rows: CompatibilityBuild['rows'] = []
  let stages = 0
  let historicalMachines = 0
  let transitionMachines = 0
  const add = (
    key: string,
    timing: 'auto' | 'interactive',
    flow: ScriptFlowV5,
    allowSceneEntry = false,
  ): void => {
    if (excludedKeys.has(key)) {
      transitionMachines++
      return
    }
    if (flow.kind === 'stages') stages++
    else {
      historicalMachines++
      if (flow.machine.cadence !== undefined)
        throw new Error(`R13 cadence evidence: 非 transition machine 含 cadence ${key}`)
    }
    rows.push({
      key,
      timing,
      flow: compileScriptFlowV5(flow, {
        canonicalContentDigest: COMPATIBILITY_CONTENT_DIGEST,
        timing,
        ...(allowSceneEntry ? { allowSceneEntry: true } : {}),
      }).flow,
    })
  }
  for (const scene of requiredScenes(snapshot)) {
    for (const entity of scene.entities)
      for (const channel of ['trigger', 'auto'] as const)
        for (const [behaviorId, behavior] of Object.entries(entity.behaviors?.[channel] ?? {}))
          add(
            `${scene.id}/${entity.id}/${channel}/${behaviorId}`,
            channel === 'auto' ? 'auto' : 'interactive',
            behavior.flow,
          )
    for (const slot of ['onEnter', 'onTeleport'] as const)
      for (const [hookId, hook] of Object.entries(scene.hooks?.[slot]?.variants ?? {}))
        add(`${scene.id}/${slot}/${hookId}`, 'interactive', hook.flow, slot === 'onEnter')
  }
  rows.sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0))
  const bytes = stableJson(rows)
  return {
    rows,
    summary: {
      rows: rows.length,
      uniqueKeys: new Set(rows.map((row) => row.key)).size,
      stages,
      historicalMachines,
      transitionMachines,
      bytes: Buffer.byteLength(bytes),
      sha256: stableJsonSha256(rows),
    },
  }
}

export function buildPalR13CadenceEvidence(args: {
  snapshot: MigrationSnapshot
  compatibilityBase: MigrationSnapshot
  autoLifecycle: AutoFlowLifecycleReport
  autoLifecycleRepairEvidence: PalAutoLifecycleRepairEvidenceV1
  sceneSemanticRepairEvidence: PalSceneSemanticRepairEvidenceV1
}): R13CadenceEvidenceV1 {
  assertRepairEvidence(args.autoLifecycleRepairEvidence, args.autoLifecycle)
  const lifecycleByOwner = new Map(
    args.autoLifecycle.entries.map((entry) => [entry.ownerKey, entry]),
  )
  const owners: R13CadenceOwnerEvidenceV1[] = []
  let transitionMachines = 0

  const visit = (key: string, flow: ScriptFlowV5, ownerKey?: string): void => {
    if (flow.kind === 'stateMachine' && flow.machine.cadence === 'transition') {
      transitionMachines++
      if (!ownerKey || !flow.machine.id.startsWith('auto-lifecycle-'))
        throw new Error(`R13 cadence evidence: transition owner 非 auto lifecycle ${key}`)
      const lifecycle = lifecycleByOwner.get(ownerKey)
      if (!lifecycle) throw new Error(`R13 cadence evidence: 缺 lifecycle ${ownerKey}`)
      const sourceStates = Object.entries(flow.machine.states).filter(([id]) =>
        /^source-\d+$/.test(id),
      )
      const syntheticWaitStates = Object.keys(flow.machine.states).filter((id) =>
        /^source-\d+-wait-\d+$/.test(id),
      )
      const waitAddresses = new Set(
        syntheticWaitStates.map((id) => /^source-(\d+)-wait-\d+$/.exec(id)?.[1]),
      )
      waitAddresses.delete(undefined)
      owners.push({
        ownerKey,
        machineId: flow.machine.id,
        flowDigest: stableJsonSha256(flow),
        lifecycleDigest: lifecycle.digest,
        sourceCommandsDigest: lifecycle.sourceCommandsDigest,
        sourceStates: sourceStates.length,
        syntheticWaitStates: syntheticWaitStates.length,
        totalStates: Object.keys(flow.machine.states).length,
        compoundSourceStates: sourceStates.filter(([, state]) => state.body.length > 1).length,
        waitSourceStates: waitAddresses.size,
        directContinueSourceStates: sourceStates.filter(
          ([, state]) => state.next.kind === 'continue',
        ).length,
        branchSourceStates: sourceStates.filter(([, state]) => state.next.kind === 'branch').length,
      })
      return
    }
  }

  for (const scene of requiredScenes(args.snapshot)) {
    for (const entity of scene.entities)
      for (const channel of ['trigger', 'auto'] as const)
        for (const [behaviorId, behavior] of Object.entries(entity.behaviors?.[channel] ?? {}))
          visit(
            `${scene.id}/${entity.id}/${channel}/${behaviorId}`,
            behavior.flow,
            `entity:${scene.id}:${entity.id}:${channel}:${behaviorId}`,
          )
    for (const slot of ['onEnter', 'onTeleport'] as const)
      for (const [hookId, hook] of Object.entries(scene.hooks?.[slot]?.variants ?? {}))
        visit(`${scene.id}/${slot}/${hookId}`, hook.flow)
  }

  owners.sort((left, right) =>
    left.ownerKey < right.ownerKey ? -1 : left.ownerKey > right.ownerKey ? 1 : 0,
  )
  const excludedKeys = new Set(
    owners.map((owner) => {
      const match = /^entity:([^:]+):([^:]+):auto:([^:]+)$/.exec(owner.ownerKey)
      if (!match) throw new Error(`R13 cadence evidence: owner key 无效 ${owner.ownerKey}`)
      return `${match[1]}/${match[2]}/auto/${match[3]}`
    }),
  )
  const compatibility = buildCompatibility(args.snapshot, excludedKeys)
  const historicalCompatibility =
    args.compatibilityBase === args.snapshot
      ? compatibility
      : buildCompatibility(args.compatibilityBase, excludedKeys)
  if (!isDeepStrictEqual(compatibility.rows, historicalCompatibility.rows)) {
    const index = compatibility.rows.findIndex(
      (row, rowIndex) => !isDeepStrictEqual(row, historicalCompatibility.rows[rowIndex]),
    )
    throw new Error(
      `R13 cadence evidence: cadence 省略 flow 漂移 index=${index} ` +
        `generated=${compatibility.rows[index]?.key ?? '<missing>'} ` +
        `historical=${historicalCompatibility.rows[index]?.key ?? '<missing>'} ` +
        `generatedSha=${compatibility.summary.sha256} ` +
        `historicalSha=${historicalCompatibility.summary.sha256}`,
    )
  }
  if (transitionMachines !== excludedKeys.size)
    throw new Error('R13 cadence evidence: transition owner 计数不闭合')
  const cadence = {
    owners: owners.length,
    sourceStates: sum(owners, 'sourceStates'),
    syntheticWaitStates: sum(owners, 'syntheticWaitStates'),
    totalStates: sum(owners, 'totalStates'),
    compoundSourceStates: sum(owners, 'compoundSourceStates'),
    waitSourceStates: sum(owners, 'waitSourceStates'),
    directContinueSourceStates: sum(owners, 'directContinueSourceStates'),
    branchSourceStates: sum(owners, 'branchSourceStates'),
  }
  const withoutDigest = {
    generator: { id: 'r13-cadence-evidence' as const, version: 1 as const },
    compiler: {
      version: 2 as const,
      boundaryPolicy: 'transition' as const,
      worldTickMs: 100 as const,
      sourceFrameMs: 40 as const,
      waitOpcode09: 'stable-world-tick-states' as const,
    },
    legacyCompatibility: compatibility.summary,
    cadence,
    owners,
    lifecycleReport: {
      inputPool: args.autoLifecycle.inputPool,
      summary: structuredClone(args.autoLifecycle.summary),
      digest: args.autoLifecycle.digest,
    },
    repairs: {
      autoLifecycle: structuredClone(args.autoLifecycleRepairEvidence),
      sceneSemantics: structuredClone(args.sceneSemanticRepairEvidence),
      sceneSemanticsDigest: stableJsonSha256(args.sceneSemanticRepairEvidence),
    },
  }
  const evidence = digestRecord<R13CadenceEvidenceV1>(withoutDigest)
  assertPalR13CadenceEvidence(evidence)
  return evidence
}

export function assertPalR13CadenceEvidence(evidence: R13CadenceEvidenceV1): void {
  const { digest, ...body } = evidence
  if (stableJsonSha256(body) !== digest)
    throw new Error('R13 cadence evidence: evidence 自摘要不符')
  const expectedCompatibility = {
    rows: 4_611,
    uniqueKeys: 4_611,
    stages: 4_546,
    historicalMachines: 65,
    transitionMachines: 22,
    bytes: 7_896_404,
    sha256: 'e0d2587f59dfe883158ccb0e67851bc0f533ddbbb7222bd3864a069947bd43f2',
  }
  if (JSON.stringify(evidence.legacyCompatibility) !== JSON.stringify(expectedCompatibility))
    throw new Error(
      `R13 cadence evidence: K6 legacy compatibility golden 漂移 ` +
        `${JSON.stringify(evidence.legacyCompatibility)}`,
    )
  const expectedCadence = {
    owners: 22,
    sourceStates: 286,
    syntheticWaitStates: 133,
    totalStates: 419,
    compoundSourceStates: 101,
    waitSourceStates: 31,
    directContinueSourceStates: 13,
    branchSourceStates: 6,
  }
  if (JSON.stringify(evidence.cadence) !== JSON.stringify(expectedCadence))
    throw new Error(
      `R13 cadence evidence: PAL cadence 总量漂移 ${JSON.stringify(evidence.cadence)}`,
    )
  if (
    evidence.owners.length !== evidence.cadence.owners ||
    new Set(evidence.owners.map((owner) => owner.ownerKey)).size !== evidence.owners.length
  )
    throw new Error('R13 cadence evidence: owner 身份不闭合')
}
