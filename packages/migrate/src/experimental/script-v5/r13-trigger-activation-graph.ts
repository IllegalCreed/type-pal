import type {
  AuthorCommandV5,
  AuthorSceneEntryPresentationV5,
  Command,
  SceneDefV5,
  ScriptFlowV5,
  StateTransitionV5,
} from '@type-pal/content'
import { validateScenesV5 } from '@type-pal/content'
import type { R13StaticEntityBehaviorRoot, R13TranslationSession } from '../../migrate-content.js'
import { deepStripBattleCfg } from '../../migrate-content.js'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import type {
  DialogueEntryState,
  R13ActivationBlockTerm,
  R13ActivationTransferMarker,
} from '../../translate-events.js'
import { translateActivationBlock } from '../../translate-events.js'
import {
  type P7CommandProjectionContext,
  p7OwnerKey,
  projectP7AuthorCommands,
  projectP7AuthorCondition,
} from './p7-canonical.js'
import { stableJson, stableJsonSha256 } from './stable-json.js'
import type {
  P4AuthorOwnerAllocation,
  P4AuthorOwnerIdentity,
  ScriptMigrationIRP6,
} from './types.js'

type EntityCheckpointOwner = {
  kind: 'entity'
  sceneId: string
  entityId: string
  channel: 'trigger'
  behaviorId: string
  rootAddress: number
  checkpointAddress: number
}

type HookCheckpointOwner = {
  kind: 'hook'
  sceneId: string
  slot: 'onEnter'
  hookId: string
  rootAddress: number
  checkpointAddress: number
}

export type R13CheckpointOwnerSpec = EntityCheckpointOwner | HookCheckpointOwner

type EntityDelayedGotoOwner = {
  kind: 'entity'
  sceneId: string
  entityId: string
  channel: 'trigger'
  behaviorId: string
  rootAddress: number
  delayedGotos: readonly R13DelayedGotoSpec[]
}

type HookDelayedGotoOwner = {
  kind: 'hook'
  sceneId: string
  slot: 'onEnter'
  hookId: string
  rootAddress: number
  delayedGotos: readonly R13DelayedGotoSpec[]
}

type R13DelayedGotoSpec = {
  sourceAddress: number
  targetAddress: number
  fallthroughAddress: number
  threshold: number
  /** 循环体中紧邻 delayed goto 之前的 PAL 0x09(0) 数量。 */
  sourceWaitFrames: 0 | 1
}

export type R13DelayedTriggerOwnerSpec = EntityDelayedGotoOwner | HookDelayedGotoOwner

type R13ActivationOwnerSpec = R13CheckpointOwnerSpec | R13DelayedTriggerOwnerSpec

/**
 * R13-2 冻结的 34 个持久 checkpoint closure。PAL 地址只属于迁移证据；
 * 投影出的 machine/state id 由业务角色生成，绝不携带这些地址。
 */
export const R13_PERSISTENT_CHECKPOINT_OWNERS = [
  {
    kind: 'entity',
    sceneId: 's002',
    entityId: 'e34',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 569,
    checkpointAddress: 575,
  },
  {
    kind: 'entity',
    sceneId: 's005',
    entityId: 'e124',
    channel: 'trigger',
    behaviorId: 'legacy-001',
    rootAddress: 1557,
    checkpointAddress: 1575,
  },
  {
    kind: 'entity',
    sceneId: 's003',
    entityId: 'e56',
    channel: 'trigger',
    behaviorId: 'legacy-001',
    rootAddress: 2369,
    checkpointAddress: 2423,
  },
  {
    kind: 'entity',
    sceneId: 's020',
    entityId: 'e362',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 4221,
    checkpointAddress: 4224,
  },
  {
    kind: 'entity',
    sceneId: 's018',
    entityId: 'e265',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 5182,
    checkpointAddress: 5189,
  },
  {
    kind: 'entity',
    sceneId: 's021',
    entityId: 'e404',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 5844,
    checkpointAddress: 5872,
  },
  {
    kind: 'entity',
    sceneId: 's021',
    entityId: 'e404',
    channel: 'trigger',
    behaviorId: 'legacy-001',
    rootAddress: 5894,
    checkpointAddress: 5924,
  },
  {
    kind: 'entity',
    sceneId: 's023',
    entityId: 'e433',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 6343,
    checkpointAddress: 6344,
  },
  {
    kind: 'entity',
    sceneId: 's023',
    entityId: 'e426',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 6379,
    checkpointAddress: 6390,
  },
  {
    kind: 'entity',
    sceneId: 's029',
    entityId: 'e535',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 6589,
    checkpointAddress: 6594,
  },
  {
    kind: 'entity',
    sceneId: 's031',
    entityId: 'e542',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 6597,
    checkpointAddress: 6602,
  },
  {
    kind: 'entity',
    sceneId: 's030',
    entityId: 'e539',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 6605,
    checkpointAddress: 6609,
  },
  {
    kind: 'entity',
    sceneId: 's030',
    entityId: 'e540',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 7445,
    checkpointAddress: 7461,
  },
  {
    kind: 'entity',
    sceneId: 's029',
    entityId: 'e536',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 7482,
    checkpointAddress: 7489,
  },
  {
    kind: 'entity',
    sceneId: 's042',
    entityId: 'e687',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 9139,
    checkpointAddress: 9175,
  },
  {
    kind: 'hook',
    sceneId: 's039',
    slot: 'onEnter',
    hookId: 'default',
    rootAddress: 9410,
    checkpointAddress: 9411,
  },
  {
    kind: 'entity',
    sceneId: 's051',
    entityId: 'e876',
    channel: 'trigger',
    behaviorId: 'legacy-001',
    rootAddress: 9825,
    checkpointAddress: 9841,
  },
  {
    kind: 'entity',
    sceneId: 's052',
    entityId: 'e897',
    channel: 'trigger',
    behaviorId: 'legacy-001',
    rootAddress: 10245,
    checkpointAddress: 10315,
  },
  {
    kind: 'entity',
    sceneId: 's050',
    entityId: 'e844',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 10956,
    checkpointAddress: 10990,
  },
  {
    kind: 'hook',
    sceneId: 's057',
    slot: 'onEnter',
    hookId: 'default',
    rootAddress: 11811,
    checkpointAddress: 11816,
  },
  {
    kind: 'entity',
    sceneId: 's083',
    entityId: 'e1572',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 15033,
    checkpointAddress: 15046,
  },
  {
    kind: 'hook',
    sceneId: 's108',
    slot: 'onEnter',
    hookId: 'default',
    rootAddress: 17190,
    checkpointAddress: 17191,
  },
  {
    kind: 'entity',
    sceneId: 's134',
    entityId: 'e2318',
    channel: 'trigger',
    behaviorId: 'legacy-001',
    rootAddress: 17554,
    checkpointAddress: 17569,
  },
  {
    kind: 'entity',
    sceneId: 's108',
    entityId: 'e2002',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 19253,
    checkpointAddress: 19301,
  },
  {
    kind: 'entity',
    sceneId: 's100',
    entityId: 'e1808',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 20245,
    checkpointAddress: 20261,
  },
  {
    kind: 'hook',
    sceneId: 's101',
    slot: 'onEnter',
    hookId: 'legacy-001',
    rootAddress: 21484,
    checkpointAddress: 21511,
  },
  {
    kind: 'entity',
    sceneId: 's158',
    entityId: 'e2645',
    channel: 'trigger',
    behaviorId: 'legacy-001',
    rootAddress: 22647,
    checkpointAddress: 22650,
  },
  {
    kind: 'hook',
    sceneId: 's188',
    slot: 'onEnter',
    hookId: 'default',
    rootAddress: 26368,
    checkpointAddress: 26590,
  },
  {
    kind: 'hook',
    sceneId: 's184',
    slot: 'onEnter',
    hookId: 'default',
    rootAddress: 26599,
    checkpointAddress: 26635,
  },
  {
    kind: 'hook',
    sceneId: 's180',
    slot: 'onEnter',
    hookId: 'default',
    rootAddress: 27540,
    checkpointAddress: 27546,
  },
  {
    kind: 'hook',
    sceneId: 's216',
    slot: 'onEnter',
    hookId: 'default',
    rootAddress: 30651,
    checkpointAddress: 30683,
  },
  {
    kind: 'entity',
    sceneId: 's276',
    entityId: 'e4734',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 34894,
    checkpointAddress: 34898,
  },
  {
    kind: 'hook',
    sceneId: 's291',
    slot: 'onEnter',
    hookId: 'default',
    rootAddress: 35029,
    checkpointAddress: 35030,
  },
  {
    kind: 'hook',
    sceneId: 's277',
    slot: 'onEnter',
    hookId: 'default',
    rootAddress: 35419,
    checkpointAddress: 35420,
  },
] as const satisfies readonly R13CheckpointOwnerSpec[]

/** R13-2 冻结的 9 个 trigger delayed-goto，按 7 个稳定 owner 投影。 */
export const R13_DELAYED_TRIGGER_OWNERS = [
  {
    kind: 'entity',
    sceneId: 's001',
    entityId: 'e9',
    channel: 'trigger',
    behaviorId: 'legacy-001',
    rootAddress: 191,
    delayedGotos: [
      {
        sourceAddress: 193,
        targetAddress: 191,
        fallthroughAddress: 194,
        threshold: 4,
        sourceWaitFrames: 0,
      },
      {
        sourceAddress: 205,
        targetAddress: 203,
        fallthroughAddress: 206,
        threshold: 4,
        sourceWaitFrames: 0,
      },
    ],
  },
  {
    kind: 'hook',
    sceneId: 's231',
    slot: 'onEnter',
    hookId: 'default',
    rootAddress: 32083,
    delayedGotos: [
      {
        sourceAddress: 32097,
        targetAddress: 32095,
        fallthroughAddress: 32098,
        threshold: 8,
        sourceWaitFrames: 1,
      },
      {
        sourceAddress: 32209,
        targetAddress: 32207,
        fallthroughAddress: 32210,
        threshold: 8,
        sourceWaitFrames: 1,
      },
    ],
  },
  {
    kind: 'entity',
    sceneId: 's250',
    entityId: 'e4411',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 33679,
    delayedGotos: [
      {
        sourceAddress: 33696,
        targetAddress: 33694,
        fallthroughAddress: 33697,
        threshold: 3,
        sourceWaitFrames: 1,
      },
    ],
  },
  {
    kind: 'entity',
    sceneId: 's257',
    entityId: 'e4550',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 33960,
    delayedGotos: [
      {
        sourceAddress: 33964,
        targetAddress: 33962,
        fallthroughAddress: 33965,
        threshold: 3,
        sourceWaitFrames: 1,
      },
    ],
  },
  {
    kind: 'entity',
    sceneId: 's249',
    entityId: 'e4394',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 33969,
    delayedGotos: [
      {
        sourceAddress: 33972,
        targetAddress: 33970,
        fallthroughAddress: 33973,
        threshold: 4,
        sourceWaitFrames: 1,
      },
    ],
  },
  {
    kind: 'entity',
    sceneId: 's277',
    entityId: 'e4736',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 35050,
    delayedGotos: [
      {
        sourceAddress: 35054,
        targetAddress: 35052,
        fallthroughAddress: 35055,
        threshold: 3,
        sourceWaitFrames: 1,
      },
    ],
  },
  {
    kind: 'entity',
    sceneId: 's285',
    entityId: 'e4807',
    channel: 'trigger',
    behaviorId: 'default',
    rootAddress: 35059,
    delayedGotos: [
      {
        sourceAddress: 35062,
        targetAddress: 35060,
        fallthroughAddress: 35063,
        threshold: 4,
        sourceWaitFrames: 1,
      },
    ],
  },
] as const satisfies readonly R13DelayedTriggerOwnerSpec[]

type R13RestoredEntityBehaviorSpec = {
  sceneId: string
  entityId: string
  channel: 'trigger' | 'auto'
  behaviorId: string
  label: string
  order: number
  rootAddress: number
}

/**
 * 旧 P4 的错误 CFG 让这两个 0x25 目标只存在于“不可达”正文，因而没有 owner。
 * R13-2 在 immutable P7/R13-1 parent 之后追加稳定 owner；地址只保留在迁移 oracle/evidence。
 */
export const R13_RESTORED_ENTITY_BEHAVIORS = [
  {
    sceneId: 's053',
    entityId: 'e905',
    channel: 'trigger',
    behaviorId: 'legacy-002',
    label: '触发行为 2',
    order: 2,
    rootAddress: 10635,
  },
  {
    sceneId: 's053',
    entityId: 'e908',
    channel: 'trigger',
    behaviorId: 'legacy-002',
    label: '触发行为 2',
    order: 2,
    rootAddress: 10639,
  },
] as const satisfies readonly R13RestoredEntityBehaviorSpec[]

/**
 * 由同一 R13-2 successor augmentation 稍后物化的 owner。触发图在投影
 * s231/onEnter 时必须先能把 0x24 绑定改写成稳定 behavior 引用。
 */
const R13_KNOWN_SUCCESSOR_ENTITY_BEHAVIORS = [
  {
    sceneId: 's250',
    entityId: 'e4410',
    channel: 'auto',
    behaviorId: 'legacy-001',
    label: '自动行为 1',
    order: 1,
    rootAddress: 33641,
  },
  {
    sceneId: 's250',
    entityId: 'e4413',
    channel: 'auto',
    behaviorId: 'legacy-001',
    label: '自动行为 1',
    order: 1,
    rootAddress: 33786,
  },
  ...(
    [
      ['e4156', 32228],
      ['e4157', 32234],
      ['e4158', 32240],
      ['e4159', 32246],
      ['e4160', 32253],
      ['e4161', 32259],
      ['e4162', 32265],
      ['e4163', 32270],
      ['e4164', 32276],
      ['e4165', 32283],
      ['e4166', 32289],
    ] as const
  ).map<R13RestoredEntityBehaviorSpec>(([entityId, rootAddress]) => ({
    sceneId: 's231',
    entityId,
    channel: 'auto',
    behaviorId: 'legacy-001',
    label: '自动行为 1',
    order: 1,
    rootAddress,
  })),
  {
    sceneId: 's231',
    entityId: 'e4168',
    channel: 'auto',
    behaviorId: 'legacy-001',
    label: '自动行为 1',
    order: 1,
    rootAddress: 32213,
  },
  {
    sceneId: 's231',
    entityId: 'e4168',
    channel: 'auto',
    behaviorId: 'legacy-002',
    label: '自动行为 2',
    order: 2,
    rootAddress: 32218,
  },
  {
    sceneId: 's231',
    entityId: 'e4168',
    channel: 'auto',
    behaviorId: 'legacy-003',
    label: '自动行为 3',
    order: 3,
    rootAddress: 32021,
  },
  {
    sceneId: 's231',
    entityId: 'e4168',
    channel: 'auto',
    behaviorId: 'legacy-004',
    label: '自动行为 4',
    order: 4,
    rootAddress: 32222,
  },
] as const satisfies readonly R13RestoredEntityBehaviorSpec[]

export interface R13TriggerActivationOwnerEvidenceV1 {
  ownerKey: string
  rootAddress: number
  checkpointAddress: number
  resumeAddress: number
  durableStates: Array<{
    sourceAddress: number
    dialogueCarryDigest: string
    stateId: string
  }>
  stateCount: number
  confirmCount: number
  checkpointAliasesFolded: number
  flowDigest: string
}

export interface R13DelayedTriggerOwnerEvidenceV1 {
  ownerKey: string
  rootAddress: number
  delayedGotoAddresses: number[]
  delayedGotos: R13DelayedGotoSpec[]
  delayedGotoPhaseCount: number
  stateCount: number
  confirmCount: number
  flowDigest: string
}

export interface R13RestoredEntityBehaviorEvidenceV1 {
  sceneId: string
  entityId: string
  channel: 'trigger' | 'auto'
  behaviorId: string
  rootAddress: number
  bodyDigest: string
}

export interface R13TriggerActivationEvidenceV1 {
  kind: 'r13-trigger-activation-evidence'
  version: 1
  persistentClosures: 34
  coveredSourceCheckpoints: 34
  resetOverrideSourceCheckpoints: [763]
  existingRepairSourceCheckpoints: [10747]
  discardReturnContexts: 7
  directDeferredRegistryScripts: 32
  consumedDeferredRegistryClosureScripts: 39
  delayedGotoAddresses: 9
  delayedGotoOwners: 7
  delayedGotoOwnerExpandedPhases: 41
  translationTargets: {
    locale: Array<{ id: string; digest: string }>
    sprites: Array<{ id: string; digest: string }>
  }
  restoredEntityBehaviors: R13RestoredEntityBehaviorEvidenceV1[]
  owners: R13TriggerActivationOwnerEvidenceV1[]
  delayedOwners: R13DelayedTriggerOwnerEvidenceV1[]
}

type InternalState = {
  body: AuthorCommandV5[]
  next: StateTransitionV5
  entry?: AuthorSceneEntryPresentationV5
  /** 仅供迁移期 canonical alias pass；不会发布到 SceneDefV5。 */
  consumedPersistentCheckpoint?: number
}

type ReturnFrame = {
  address: number
  owner?: string
}

type NormalizedDialogueCarry = {
  slot?: DialogueEntryState['slot']
  portrait?: DialogueEntryState['portrait']
  activeSpeaker: string
  speakerAwaitingBody: boolean
  color: NonNullable<DialogueEntryState['color']>
  speed: number
}

type DurablePoint = {
  address: number
  dialogue: NormalizedDialogueCarry
}

type CompileContext = {
  persisted: DurablePoint
  checkpoint: DurablePoint
  owner?: string
  dialogue: DialogueEntryState
  returns: ReturnFrame[]
  activeDelayed?: {
    sourceAddress: number
    count: number
  }
}

type TranslatedBlock = ReturnType<typeof translateActivationBlock>
type R13ProjectionContext = P7CommandProjectionContext & {
  staticEntityBehaviorRoots: readonly R13StaticEntityBehaviorRoot[]
  restoredEntityBehaviorRoots: readonly R13RestoredEntityBehaviorSpec[]
  consumedDeferredScriptIds: Set<string>
}

function normalizeDialogueCarry(state: DialogueEntryState | undefined): NormalizedDialogueCarry {
  return {
    ...(state?.slot ? { slot: state.slot } : {}),
    ...(state?.portrait ? { portrait: structuredClone(state.portrait) } : {}),
    activeSpeaker: state?.activeSpeaker ?? '',
    speakerAwaitingBody: state?.speakerAwaitingBody ?? false,
    color: state?.color ?? 'default',
    speed: state?.speed ?? 24,
  }
}

function marker(value: unknown): R13ActivationTransferMarker | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const candidate = value as Partial<R13ActivationTransferMarker>
  return candidate.kind === 'n3R13ActivationTransfer' &&
    Number.isInteger(candidate.sourceAddress) &&
    Number.isInteger(candidate.targetAddress) &&
    candidate.entryState &&
    typeof candidate.entryState === 'object'
    ? (candidate as R13ActivationTransferMarker)
    : undefined
}

function containsMarker(value: unknown): boolean {
  if (marker(value)) return true
  if (Array.isArray(value)) return value.some(containsMarker)
  if (!value || typeof value !== 'object') return false
  return Object.values(value as Record<string, unknown>).some(containsMarker)
}

function directArmMarker(value: unknown, path: string): R13ActivationTransferMarker | undefined {
  if (!Array.isArray(value)) throw new Error(`${path}: 期望命令数组`)
  const found = value.filter((command) => marker(command))
  if (!found.length) {
    if (containsMarker(value)) throw new Error(`${path}: R13 transfer marker 嵌套位置不受支持`)
    return undefined
  }
  if (value.length !== 1 || found.length !== 1)
    throw new Error(`${path}: R13 transfer marker 必须独占控制臂`)
  return marker(found[0])
}

function transitionStates(
  transition: StateTransitionV5,
  map: (state: string) => string,
): StateTransitionV5 {
  switch (transition.kind) {
    case 'stay':
    case 'restart':
      return transition
    case 'continue':
    case 'advance':
    case 'to':
      return { ...transition, state: map(transition.state) }
    case 'branch':
      return {
        ...transition,
        then: transitionStates(transition.then, map),
        else: transitionStates(transition.else, map),
      }
    case 'commandOutcome':
      return {
        ...transition,
        then: transitionStates(transition.then, map),
        else: transitionStates(transition.else, map),
      }
  }
}

function initialEntry(flow: ScriptFlowV5): AuthorSceneEntryPresentationV5 | undefined {
  if (flow.kind === 'stages')
    return structuredClone(flow.stages.find((stage) => stage.id === flow.initial)?.entry)
  return structuredClone(flow.machine.states[flow.machine.initial]?.entry)
}

function entityScenes(scenes: readonly SceneDefV5[]): Map<string, string[]> {
  const result = new Map<string, string[]>()
  for (const scene of scenes)
    for (const entity of scene.entities) {
      const owners = result.get(entity.id) ?? []
      owners.push(scene.id)
      result.set(entity.id, owners)
    }
  for (const owners of result.values()) owners.sort()
  return result
}

function isCheckpointOwner(spec: R13ActivationOwnerSpec): spec is R13CheckpointOwnerSpec {
  return 'checkpointAddress' in spec
}

function ownerIdentity(spec: R13ActivationOwnerSpec): P4AuthorOwnerIdentity {
  return spec.kind === 'entity'
    ? {
        kind: 'entity-behavior',
        sceneId: spec.sceneId,
        entityId: spec.entityId,
        channel: spec.channel,
        behaviorId: spec.behaviorId,
      }
    : {
        kind: 'scene-hook',
        sceneId: spec.sceneId,
        slot: spec.slot,
        hookId: spec.hookId,
      }
}

function allocationHasEntryAddress(owner: P4AuthorOwnerAllocation, address: number): boolean {
  for (const stage of owner.stages) {
    const match = /(?:^|\/)L-(\d+)(?:\/|$)/.exec(stage.entryLegacyScriptId)
    if (match?.[1] !== undefined && Number(match[1]) === address) return true
  }
  return false
}

function scriptReferenceEntryAddress(command: Record<string, unknown>): number | undefined {
  const script = command.script
  if (!script || typeof script !== 'object' || Array.isArray(script)) return undefined
  const id = (script as { id?: unknown }).id
  const match = typeof id === 'string' ? /(?:^|\/)L-(\d+)(?:\/|$)/.exec(id) : null
  return match?.[1] === undefined ? undefined : Number(match[1])
}

function recordConsumedDeferredScript(
  command: Record<string, unknown>,
  projection: R13ProjectionContext,
): void {
  const script = command.script
  const id =
    script && typeof script === 'object' && !Array.isArray(script)
      ? (script as { id?: unknown }).id
      : undefined
  if (typeof id === 'string' && id.length > 0) projection.consumedDeferredScriptIds.add(id)
}

function collectRegistryReferences(value: unknown, referencedIds: Set<string>): void {
  if (Array.isArray(value)) {
    for (const entry of value) collectRegistryReferences(entry, referencedIds)
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  const kind = record.kind
  const reference =
    kind === 'callScript' || kind === 'jumpScript'
      ? record.ref
      : kind === 'setEntityAuto' ||
          kind === 'setEntityTrigger' ||
          kind === 'setSceneOnEnter' ||
          kind === 'setSceneOnTeleport'
        ? record.script
        : undefined
  if (reference && typeof reference === 'object' && !Array.isArray(reference)) {
    const id = (reference as { id?: unknown }).id
    if (typeof id === 'string' && id.length > 0) referencedIds.add(id)
  }
  for (const entry of Object.values(record)) collectRegistryReferences(entry, referencedIds)
}

function deferredRegistryClosure(args: {
  roots: ReadonlySet<string>
  bodies: Readonly<Record<string, Command[]>>
}): Set<string> {
  const closure = new Set<string>()
  const pending = [...args.roots].sort().reverse()
  while (pending.length) {
    const id = pending.pop()!
    if (closure.has(id)) continue
    const body = args.bodies[id]
    if (!body) throw new Error(`R13 activation graph: deferred registry 缺少脚本体 ${id}`)
    closure.add(id)
    const referencedIds = new Set<string>()
    collectRegistryReferences(body, referencedIds)
    for (const referencedId of [...referencedIds].sort().reverse()) {
      if (!closure.has(referencedId)) pending.push(referencedId)
    }
  }
  return closure
}

function nestedLegacyEntryAddress(value: unknown): number | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const address = nestedLegacyEntryAddress(entry)
      if (address !== undefined) return address
    }
    return undefined
  }
  if (!value || typeof value !== 'object') return undefined
  const direct = scriptReferenceEntryAddress(value as Record<string, unknown>)
  if (direct !== undefined) return direct
  const id = (value as { id?: unknown }).id
  const match = typeof id === 'string' ? /(?:^|\/)L-(\d+)(?:\/|$)/.exec(id) : null
  if (match?.[1] !== undefined) return Number(match[1])
  for (const entry of Object.values(value as Record<string, unknown>)) {
    const address = nestedLegacyEntryAddress(entry)
    if (address !== undefined) return address
  }
  return undefined
}

function uniqueEntityScene(
  entityId: string,
  projection: R13ProjectionContext,
  path: string,
): string {
  const scenes = projection.entityScenes.get(entityId) ?? []
  if (scenes.length !== 1)
    throw new Error(`${path}: entity ${entityId} scene 数量 ${scenes.length}，无法消歧`)
  return scenes[0]!
}

function rewriteDeferredBindingCommands(
  value: unknown,
  projection: R13ProjectionContext,
  path: string,
): unknown {
  if (Array.isArray(value))
    return value.map((entry, index) =>
      rewriteDeferredBindingCommands(entry, projection, `${path}[${index}]`),
    )
  if (!value || typeof value !== 'object') return value
  const command = value as Record<string, unknown>
  if (command.kind === 'setSceneOnEnter' || command.kind === 'setSceneOnTeleport') {
    if (typeof command.scene !== 'string' || !Number.isInteger(command._addr))
      throw new Error(`${path}: deferred scene hook 缺 scene/_addr`)
    const slot = command.kind === 'setSceneOnEnter' ? 'onEnter' : 'onTeleport'
    const address = Number(command._addr)
    const semanticRewrites = projection.ir.commandRewrites.filter((rewrite) => {
      if (rewrite.legacyKind !== command.kind) return false
      if (!rewrite.before || typeof rewrite.before !== 'object' || Array.isArray(rewrite.before))
        return false
      const before = rewrite.before as Record<string, unknown>
      return before.scene === command.scene && nestedLegacyEntryAddress(before) === address
    })
    if (semanticRewrites.length) {
      const first = semanticRewrites[0]!.after
      if (semanticRewrites.some((rewrite) => stableJson(rewrite.after) !== stableJson(first)))
        throw new Error(
          `${path}: deferred scene hook ${command.scene}/${slot}/L_${address} ` +
            `存在多义 P4 rewrite`,
        )
      return structuredClone(first)
    }
    const owners = projection.ir.owners.filter(
      (owner) =>
        owner.identity.kind === 'scene-hook' &&
        owner.identity.sceneId === command.scene &&
        owner.identity.slot === slot &&
        allocationHasEntryAddress(owner, address),
    )
    if (owners.length !== 1 || owners[0]?.identity.kind !== 'scene-hook')
      throw new Error(
        `${path}: deferred scene hook ${command.scene}/${slot}/L_${address} owner 数量 ${owners.length}`,
      )
    return {
      kind: 'selectSceneHooks',
      scene: command.scene,
      selection: {
        [slot]: { kind: 'use', value: owners[0].identity.hookId },
      },
    } satisfies AuthorCommandV5
  }
  if (command.kind === 'clearSceneScripts') {
    if (typeof command.scene !== 'string') throw new Error(`${path}: clearSceneScripts 缺 scene`)
    return {
      kind: 'selectSceneHooks',
      scene: command.scene,
      selection: {
        onEnter: { kind: 'disabled' },
        onTeleport: { kind: 'disabled' },
      },
    } satisfies AuthorCommandV5
  }
  if (command.kind === 'setEntityAuto' || command.kind === 'setEntityTrigger') {
    if (typeof command.entity !== 'string')
      throw new Error(`${path}: ${String(command.kind)} 缺 entity`)
    const channel = command.kind === 'setEntityAuto' ? 'auto' : 'trigger'
    const targetAddress = scriptReferenceEntryAddress(command)
    if (targetAddress === undefined) {
      if (!Array.isArray(command.stages) || command.stages.length !== 0)
        throw new Error(`${path}: ${String(command.kind)} 缺稳定 target root`)
      return {
        kind: 'selectEntityBehavior',
        target: {
          scene: uniqueEntityScene(command.entity, projection, path),
          entity: command.entity,
        },
        channel,
        selection: { kind: 'disabled' },
      } satisfies AuthorCommandV5
    }
    recordConsumedDeferredScript(command, projection)
    const semanticRewrites = projection.ir.commandRewrites.filter((rewrite) => {
      if (rewrite.legacyKind !== command.kind) return false
      if (!rewrite.before || typeof rewrite.before !== 'object' || Array.isArray(rewrite.before))
        return false
      const before = rewrite.before as Record<string, unknown>
      return before.entity === command.entity && nestedLegacyEntryAddress(before) === targetAddress
    })
    if (semanticRewrites.length) {
      const first = semanticRewrites[0]!.after
      if (semanticRewrites.some((rewrite) => stableJson(rewrite.after) !== stableJson(first)))
        throw new Error(
          `${path}: ${String(command.kind)} ${command.entity}/L_${targetAddress} 存在多义 P4 rewrite`,
        )
      return structuredClone(first)
    }
    const staticOwners = projection.staticEntityBehaviorRoots.filter(
      (owner) =>
        owner.entityId === command.entity &&
        owner.channel === channel &&
        owner.rootAddress === targetAddress,
    )
    if (staticOwners.length > 1)
      throw new Error(
        `${path}: ${String(command.kind)} ${command.entity}/L_${targetAddress} ` +
          `静态 owner 数量 ${staticOwners.length}`,
      )
    const staticOwner = staticOwners[0]
    if (staticOwner)
      return {
        kind: 'selectEntityBehavior',
        target: {
          scene: staticOwner.sceneId,
          entity: staticOwner.entityId,
        },
        channel,
        selection: { kind: 'use', value: staticOwner.behaviorId },
      } satisfies AuthorCommandV5
    const owners = projection.ir.owners.filter(
      (owner) =>
        owner.identity.kind === 'entity-behavior' &&
        owner.identity.entityId === command.entity &&
        owner.identity.channel === channel &&
        allocationHasEntryAddress(owner, targetAddress),
    )
    const restoredOwners = projection.restoredEntityBehaviorRoots.filter(
      (owner) =>
        owner.entityId === command.entity &&
        owner.channel === channel &&
        owner.rootAddress === targetAddress,
    )
    if (owners.length > 1 || restoredOwners.length > 1 || (owners.length && restoredOwners.length))
      throw new Error(
        `${path}: ${String(command.kind)} ${command.entity}/L_${targetAddress} ` +
          `P4 owner=${owners.length}, R13 owner=${restoredOwners.length}`,
      )
    const restoredOwner = restoredOwners[0]
    if (restoredOwner)
      return {
        kind: 'selectEntityBehavior',
        target: {
          scene: restoredOwner.sceneId,
          entity: restoredOwner.entityId,
        },
        channel,
        selection: { kind: 'use', value: restoredOwner.behaviorId },
      } satisfies AuthorCommandV5
    if (owners.length !== 1 || owners[0]?.identity.kind !== 'entity-behavior')
      throw new Error(
        `${path}: ${String(command.kind)} ${command.entity}/L_${targetAddress} owner 数量 0`,
      )
    return {
      kind: 'selectEntityBehavior',
      target: {
        scene: owners[0].identity.sceneId,
        entity: owners[0].identity.entityId,
      },
      channel,
      selection: { kind: 'use', value: owners[0].identity.behaviorId },
    } satisfies AuthorCommandV5
  }
  if (command.kind === 'setEntityTriggerMode') {
    if (typeof command.entity !== 'string')
      throw new Error(`${path}: setEntityTriggerMode 缺 entity`)
    const selection =
      command.on === 'interact' || command.on === 'touch'
        ? {
            kind: 'use' as const,
            value: {
              on: command.on as 'interact' | 'touch',
              ...(typeof command.range === 'number' ? { range: command.range } : {}),
            },
          }
        : ({ kind: 'disabled' } as const)
    return {
      kind: 'setEntityTriggerActivation',
      target: {
        scene: uniqueEntityScene(command.entity, projection, path),
        entity: command.entity,
      },
      selection,
    } satisfies AuthorCommandV5
  }
  return Object.fromEntries(
    Object.entries(command).map(([key, entry]) => [
      key,
      rewriteDeferredBindingCommands(entry, projection, `${path}.${key}`),
    ]),
  )
}

function findOwner(
  ir: ScriptMigrationIRP6,
  identity: P4AuthorOwnerIdentity,
): P4AuthorOwnerAllocation {
  const key = p7OwnerKey(identity)
  const matches = ir.owners.filter((owner) => p7OwnerKey(owner.identity) === key)
  if (matches.length !== 1)
    throw new Error(`R13 activation graph: ${key} owner 数量 ${matches.length}，期望 1`)
  return matches[0]!
}

function locateFlow(
  scenes: readonly SceneDefV5[],
  spec: R13ActivationOwnerSpec,
): {
  flow: ScriptFlowV5
  label: string
  replace(flow: ScriptFlowV5): void
} {
  const scene = scenes.find((candidate) => candidate.id === spec.sceneId)
  if (!scene) throw new Error(`R13 activation graph: scene 不存在 ${spec.sceneId}`)
  if (spec.kind === 'entity') {
    const entity = scene.entities.find((candidate) => candidate.id === spec.entityId)
    if (!entity)
      throw new Error(`R13 activation graph: entity 不存在 ${spec.sceneId}/${spec.entityId}`)
    const behavior = entity.behaviors?.[spec.channel]?.[spec.behaviorId]
    if (!behavior)
      throw new Error(
        `R13 activation graph: behavior 不存在 ${spec.sceneId}/${spec.entityId}/${spec.behaviorId}`,
      )
    return {
      flow: behavior.flow,
      label: behavior.label,
      replace: (flow) => {
        behavior.flow = flow
      },
    }
  }
  const hook = scene.hooks?.[spec.slot]?.variants[spec.hookId]
  if (!hook)
    throw new Error(`R13 activation graph: hook 不存在 ${spec.sceneId}/${spec.slot}/${spec.hookId}`)
  return {
    flow: hook.flow,
    label: hook.label,
    replace: (flow) => {
      hook.flow = flow
    },
  }
}

class TriggerActivationCompiler {
  private readonly internalStates = new Map<string, InternalState>()
  private readonly sourceMemo = new Map<string, string>()
  private readonly durablePoints = new Map<string, DurablePoint>()
  private readonly compiledDurablePoints = new Set<string>()
  private readonly coveredCheckpointSources = new Set<number>()
  private readonly coveredDelayedGotoSources = new Set<number>()
  private readonly checkpointAliasTargets = new Map<string, string>()
  private readonly checkpointResumeAddress: number | undefined
  private serial = 0
  private confirmCount = 0

  constructor(
    private readonly spec: R13ActivationOwnerSpec,
    private readonly translation: R13TranslationSession,
    private readonly projection: R13ProjectionContext,
    private readonly entry: AuthorSceneEntryPresentationV5 | undefined,
    private readonly label: string,
  ) {
    this.checkpointResumeAddress = isCheckpointOwner(spec) ? spec.checkpointAddress + 1 : undefined
    if (!isCheckpointOwner(spec)) this.assertDelayedGotoManifest()
    this.registerDurable({ address: spec.rootAddress, dialogue: normalizeDialogueCarry({}) })
  }

  compile(): {
    flow: ScriptFlowV5
    evidence: R13TriggerActivationOwnerEvidenceV1 | R13DelayedTriggerOwnerEvidenceV1
  } {
    while (true) {
      const pending = [...this.durablePoints]
        .filter(([pointKey]) => !this.compiledDurablePoints.has(pointKey))
        .sort(
          ([leftKey, left], [rightKey, right]) =>
            left.address - right.address || leftKey.localeCompare(rightKey),
        )[0]
      if (!pending) break
      const [pointKey, point] = pending
      this.compiledDurablePoints.add(pointKey)
      const key = this.durableKey(point)
      const context: CompileContext = {
        persisted: point,
        checkpoint: point,
        owner: this.spec.kind === 'entity' ? this.spec.entityId : undefined,
        dialogue: normalizeDialogueCarry(point.dialogue),
        returns: [],
      }
      const memoKey = this.sourceMemoKey(point.address, context)
      this.sourceMemo.set(memoKey, key)
      const block = this.translate(point.address, context.owner, context.dialogue)
      this.compileTranslated(
        key,
        block.body,
        block.term,
        context,
        point.address === this.spec.rootAddress &&
          pointKey ===
            this.durablePointKey({
              address: this.spec.rootAddress,
              dialogue: normalizeDialogueCarry({}),
            }),
      )
    }

    if (isCheckpointOwner(this.spec)) {
      if (
        stableJson([...this.coveredCheckpointSources].sort((left, right) => left - right)) !==
        stableJson([this.spec.checkpointAddress])
      )
        throw new Error(
          `R13 activation graph: ${this.ownerKey()} checkpoint 覆盖漂移 ` +
            `${stableJson([...this.coveredCheckpointSources])}`,
        )
      if (
        ![...this.durablePoints.values()].some(
          (point) => point.address === this.checkpointResumeAddress,
        )
      )
        throw new Error(
          `R13 activation graph: ${this.ownerKey()} 未到达 checkpoint resume ${this.checkpointResumeAddress}`,
        )
    } else if (
      stableJson([...this.coveredDelayedGotoSources].sort((left, right) => left - right)) !==
      stableJson(this.spec.delayedGotos.map(({ sourceAddress }) => sourceAddress))
    )
      throw new Error(
        `R13 activation graph: ${this.ownerKey()} delayed goto 覆盖漂移 ` +
          `${stableJson([...this.coveredDelayedGotoSources])}`,
      )
    const checkpointAliasesFolded = isCheckpointOwner(this.spec)
      ? this.foldCheckpointEntryAliases()
      : 0

    const durableOrder = [...this.durablePoints.entries()].sort(
      ([leftKey, left], [rightKey, right]) =>
        left.address - right.address || leftKey.localeCompare(rightKey),
    )
    const rootPointKey = this.durablePointKey({
      address: this.spec.rootAddress,
      dialogue: normalizeDialogueCarry({}),
    })
    const checkpointPoints =
      this.checkpointResumeAddress === undefined
        ? []
        : durableOrder.filter(([, point]) => point.address === this.checkpointResumeAddress)
    const otherDurable = durableOrder.filter(
      ([pointKey, point]) =>
        pointKey !== rootPointKey && point.address !== this.checkpointResumeAddress,
    )
    const durableIds = new Map<string, string>()
    const finalIds = new Map<string, string>()
    const assignDurableId = (pointKey: string, proposed: string): string => {
      const point = this.durablePoints.get(pointKey)
      if (!point) throw new Error(`R13 activation graph: durable point 缺失 ${pointKey}`)
      const internalKey = this.canonicalInternalKey(this.durableKey(point))
      const existing = finalIds.get(internalKey)
      const id = existing ?? proposed
      if (existing === undefined) finalIds.set(internalKey, id)
      durableIds.set(pointKey, id)
      return id
    }
    assignDurableId(rootPointKey, 'initial')
    let checkpointOrdinal = 0
    for (const [pointKey] of checkpointPoints) {
      const id = assignDurableId(
        pointKey,
        checkpointOrdinal === 0
          ? 'after-checkpoint'
          : `after-checkpoint-${String(checkpointOrdinal + 1).padStart(3, '0')}`,
      )
      if (id === 'initial')
        throw new Error(`R13 activation graph: ${this.ownerKey()} checkpoint 错并到 initial`)
      if (id.startsWith('after-checkpoint')) checkpointOrdinal++
    }
    let phaseOrdinal = 2
    for (const [pointKey] of otherDurable) {
      const point = this.durablePoints.get(pointKey)!
      const internalKey = this.canonicalInternalKey(this.durableKey(point))
      const existing = finalIds.get(internalKey)
      assignDurableId(pointKey, existing ?? `phase-${String(phaseOrdinal).padStart(3, '0')}`)
      if (existing === undefined) phaseOrdinal++
    }
    const transients = [...this.internalStates.keys()].filter((key) => !finalIds.has(key)).sort()
    transients.forEach((key, index) => {
      finalIds.set(key, `continuation-${String(index + 1).padStart(3, '0')}`)
    })
    if (finalIds.size !== this.internalStates.size)
      throw new Error(`R13 activation graph: ${this.ownerKey()} state id closure 不完整`)

    const states = Object.fromEntries(
      [...this.internalStates]
        .map(([key, state]) => {
          const id = finalIds.get(key)
          if (!id) throw new Error(`R13 activation graph: 缺 final state id ${key}`)
          const durableEntry = durableOrder.find(
            ([, point]) => this.canonicalInternalKey(this.durableKey(point)) === key,
          )
          const durableAddress = durableEntry?.[1].address
          const durableId = durableEntry ? durableIds.get(durableEntry[0]) : undefined
          const stateLabel =
            durableId === 'initial'
              ? '首次执行'
              : durableId?.startsWith('after-checkpoint')
                ? '检查点后的执行'
                : durableAddress !== undefined
                  ? `后续阶段 ${id.replace('phase-', '')}`
                  : `流程分支 ${id.replace('continuation-', '')}`
          return [
            id,
            {
              label: stateLabel,
              ...(state.entry ? { entry: structuredClone(state.entry) } : {}),
              body: structuredClone(state.body),
              next: transitionStates(state.next, (target) => {
                const mapped = finalIds.get(target)
                if (!mapped)
                  throw new Error(
                    `R13 activation graph: ${this.ownerKey()} transition target 缺失 ${target}`,
                  )
                return mapped
              }),
            },
          ] as const
        })
        .sort(([left], [right]) => {
          if (left === 'initial') return -1
          if (right === 'initial') return 1
          if (left === 'after-checkpoint') return -1
          if (right === 'after-checkpoint') return 1
          return left.localeCompare(right)
        }),
    )

    const flow: ScriptFlowV5 = {
      kind: 'stateMachine',
      machine: {
        id: 'machine',
        label: this.label,
        initial: 'initial',
        states,
      },
    }
    if (isCheckpointOwner(this.spec))
      return {
        flow,
        evidence: {
          ownerKey: this.ownerKey(),
          rootAddress: this.spec.rootAddress,
          checkpointAddress: this.spec.checkpointAddress,
          resumeAddress: this.spec.checkpointAddress + 1,
          durableStates: durableOrder.map(([pointKey, point]) => ({
            sourceAddress: point.address,
            dialogueCarryDigest: stableJsonSha256(point.dialogue),
            stateId: durableIds.get(pointKey)!,
          })),
          stateCount: Object.keys(states).length,
          confirmCount: this.confirmCount,
          checkpointAliasesFolded,
          flowDigest: stableJsonSha256(flow),
        },
      }
    return {
      flow,
      evidence: {
        ownerKey: this.ownerKey(),
        rootAddress: this.spec.rootAddress,
        delayedGotoAddresses: [...this.coveredDelayedGotoSources].sort(
          (left, right) => left - right,
        ),
        delayedGotos: this.spec.delayedGotos.map((site) => ({ ...site })),
        delayedGotoPhaseCount: this.spec.delayedGotos.reduce(
          (sum, site) => sum + site.threshold,
          0,
        ),
        stateCount: Object.keys(states).length,
        confirmCount: this.confirmCount,
        flowDigest: stableJsonSha256(flow),
      },
    }
  }

  private ownerKey(): string {
    return p7OwnerKey(ownerIdentity(this.spec))
  }

  private durablePointKey(point: DurablePoint): string {
    return stableJson({
      address: point.address,
      dialogue: normalizeDialogueCarry(point.dialogue),
    })
  }

  private registerDurable(point: DurablePoint): DurablePoint {
    const normalized = {
      address: point.address,
      dialogue: normalizeDialogueCarry(point.dialogue),
    }
    const key = this.durablePointKey(normalized)
    const existing = this.durablePoints.get(key)
    if (existing) return existing
    this.durablePoints.set(key, normalized)
    return normalized
  }

  private durableKey(point: DurablePoint): string {
    return `durable:${this.durablePointKey(point)}`
  }

  private canonicalInternalKey(key: string): string {
    let current = key
    const seen = new Set<string>()
    while (this.checkpointAliasTargets.has(current)) {
      if (seen.has(current))
        throw new Error(`R13 activation graph: ${this.ownerKey()} checkpoint alias 环`)
      seen.add(current)
      current = this.checkpointAliasTargets.get(current)!
    }
    return current
  }

  private foldCheckpointEntryAliases(): number {
    if (!isCheckpointOwner(this.spec))
      throw new Error(`R13 activation graph: ${this.ownerKey()} 非 checkpoint owner`)
    const checkpointAddress = this.spec.checkpointAddress
    const checkpointResumeAddress = checkpointAddress + 1
    const aliases = new Map<string, string>()
    const checkpointDurableTargets = new Set(
      [...this.durablePoints.values()]
        .filter((point) => point.address === checkpointResumeAddress)
        .map((point) => this.durableKey(point)),
    )
    for (const [key, state] of [...this.internalStates].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      if (
        state.consumedPersistentCheckpoint !== checkpointAddress ||
        state.entry !== undefined ||
        state.next.kind !== 'advance' ||
        !checkpointDurableTargets.has(state.next.state)
      )
        continue
      const target = this.internalStates.get(state.next.state)
      if (
        !target ||
        target.entry !== undefined ||
        target.next.kind !== 'stay' ||
        stableJson(target.body) !== stableJson(state.body)
      )
        continue
      aliases.set(key, state.next.state)
    }
    const expected = checkpointAddress === 6344 ? 3 : 0
    if (aliases.size !== expected)
      throw new Error(
        `R13 activation graph: ${this.ownerKey()} checkpoint alias=${aliases.size}，期望 ${expected}`,
      )
    for (const [alias, target] of aliases) this.checkpointAliasTargets.set(alias, target)
    for (const state of this.internalStates.values())
      state.next = transitionStates(state.next, (target) => this.canonicalInternalKey(target))
    for (const alias of aliases.keys()) this.internalStates.delete(alias)
    return aliases.size
  }

  private transientKey(seed: string): string {
    return `transient:${seed}:${String(++this.serial).padStart(5, '0')}`
  }

  private sourceMemoKey(address: number, context: CompileContext): string {
    return stableJson({
      address,
      persisted: this.durablePointKey(context.persisted),
      checkpoint: this.durablePointKey(context.checkpoint),
      owner: context.owner ?? '',
      dialogue: normalizeDialogueCarry(context.dialogue),
      activeDelayed: context.activeDelayed ?? null,
      returns: context.returns.map((frame) => ({
        address: frame.address,
        owner: frame.owner ?? '',
      })),
    })
  }

  private sourceCommandAt(address: number): Record<string, unknown> {
    const located = this.translation.ctx.labelAt.get(`L_${address}`)
    const command = located?.cmds[located.idx]
    if (!command || typeof command !== 'object')
      throw new Error(`R13 activation graph: ${this.ownerKey()} 缺 source command @${address}`)
    return command as unknown as Record<string, unknown>
  }

  private assertDelayedGotoManifest(): void {
    if (isCheckpointOwner(this.spec)) return
    for (const site of this.spec.delayedGotos) {
      const command = this.sourceCommandAt(site.sourceAddress)
      const operands = Array.isArray(command.operands) ? (command.operands as unknown[]) : []
      const previous = this.sourceCommandAt(site.sourceAddress - 1)
      const previousOperands = Array.isArray(previous.operands)
        ? (previous.operands as unknown[])
        : []
      const hasImmediateWait =
        previous.op === 'raw' && previous.opcode === 0x09 && (previousOperands[0] ?? 0) === 0
      if (
        command.op !== 'goto' ||
        command.to !== `L_${site.targetAddress}` ||
        command.frameDelay !== site.threshold ||
        site.fallthroughAddress !== site.sourceAddress + 1 ||
        Number(hasImmediateWait) !== site.sourceWaitFrames ||
        operands.length > 0
      )
        throw new Error(
          `R13 activation graph: ${this.ownerKey()} delayed goto source manifest 漂移 ` +
            `@${site.sourceAddress}`,
        )
    }
  }

  private translate(
    address: number,
    owner: string | undefined,
    dialogue: DialogueEntryState,
  ): TranslatedBlock {
    return translateActivationBlock({
      address,
      ...(owner ? { owner } : {}),
      ctx: this.translation.ctx,
      entryState: dialogue,
    })
  }

  private compileSource(address: number, context: CompileContext): string {
    const memoKey = this.sourceMemoKey(address, context)
    const existing = this.sourceMemo.get(memoKey)
    if (existing) return existing
    const key = this.transientKey(`source-${address}`)
    this.sourceMemo.set(memoKey, key)
    const block = this.translate(address, context.owner, context.dialogue)
    this.compileTranslated(key, block.body, block.term, context, false)
    return key
  }

  private compileVirtual(
    body: unknown[],
    term: R13ActivationBlockTerm,
    context: CompileContext,
    seed: string,
  ): string {
    const key = this.transientKey(seed)
    this.compileTranslated(key, body, term, context, false)
    return key
  }

  private compileTranslated(
    key: string,
    inputBody: unknown[],
    inputTerm: R13ActivationBlockTerm,
    inputContext: CompileContext,
    isInitial: boolean,
  ): void {
    if (this.internalStates.has(key)) return
    // 先占位，允许同步 goto 形成图环；占位在本函数返回前必被覆盖。
    this.internalStates.set(key, { body: [], next: { kind: 'stay' } })

    let body = [...inputBody]
    let term = inputTerm
    let consumedPersistentCheckpoint: number | undefined
    let context = {
      ...inputContext,
      dialogue: normalizeDialogueCarry(inputContext.dialogue),
      returns: inputContext.returns.map((frame) => ({ ...frame })),
    }

    // 0x08 在同一 activation 继续执行；线性部分直接并入当前 state，只有 activation
    // 完成时才用 advance/stay 提交持久 cursor。callee 中的 checkpoint 刻意不改 caller。
    while (!containsMarker(body) && term.kind === 'checkpoint') {
      if (!isCheckpointOwner(this.spec) || term.sourceAddress !== this.spec.checkpointAddress)
        throw new Error(
          `R13 activation graph: ${this.ownerKey()} 命中未登记 checkpoint ${term.sourceAddress}`,
        )
      if (context.returns.length === 0) {
        consumedPersistentCheckpoint = term.sourceAddress
        this.coveredCheckpointSources.add(term.sourceAddress)
        context = {
          ...context,
          checkpoint: {
            address: term.resumeAddress,
            dialogue: normalizeDialogueCarry(term.dialogueState),
          },
        }
      }
      const resumed = this.translate(term.resumeAddress, context.owner, term.dialogueState)
      body.push(...resumed.body)
      term = resumed.term
      context = { ...context, dialogue: normalizeDialogueCarry(term.dialogueState) }
    }

    body = this.consumeInitialSceneEntryPrefix(body, isInitial, key)
    body = this.expandNestedBattleTransfers(body, context, key)
    const control = this.findControl(body, key)
    if (control) {
      const prefix = body.slice(0, control.index)
      if (control.kind === 'branch') {
        const command = control.command
        const remainder = body.slice(control.index + 1)
        const fallthrough = () =>
          this.compileVirtual(remainder, term, context, `${key}-fallthrough`)
        const armTarget = (
          arm: unknown,
          armName: 'then' | 'else',
          direct: R13ActivationTransferMarker | undefined,
        ): string => {
          if (direct)
            return this.compileSource(direct.targetAddress, {
              ...context,
              dialogue: normalizeDialogueCarry(direct.entryState),
            })
          if (!Array.isArray(arm) || arm.length === 0) return fallthrough()
          return this.compileVirtual([...arm, ...remainder], term, context, `${key}-${armName}`)
        }
        const thenKey = armTarget(command.then, 'then', control.thenMarker)
        const elseKey = armTarget(command.else ?? [], 'else', control.elseMarker)
        this.internalStates.set(key, {
          body: this.project(prefix, `${key}.body`),
          next: {
            kind: 'branch',
            cond: projectP7AuthorCondition(
              command.cond,
              this.projection,
              `${this.ownerKey()}.${key}.condition`,
            ),
            then: { kind: 'continue', state: thenKey },
            else: { kind: 'continue', state: elseKey },
          },
          ...(isInitial && this.entry ? { entry: structuredClone(this.entry) } : {}),
          ...(consumedPersistentCheckpoint === undefined ? {} : { consumedPersistentCheckpoint }),
        })
        return
      }

      const commandId = `decision-${String(++this.confirmCount).padStart(3, '0')}`
      const command = {
        ...control.command,
        id: commandId,
        onNo: [],
      }
      const noKey = this.compileSource(control.noMarker.targetAddress, {
        ...context,
        dialogue: normalizeDialogueCarry(control.noMarker.entryState),
      })
      const yesKey = this.compileVirtual(body.slice(control.index + 1), term, context, `${key}-yes`)
      this.internalStates.set(key, {
        body: this.project([...prefix, command], `${key}.body`),
        next: {
          kind: 'commandOutcome',
          commandId,
          command: 'confirm',
          outcome: 'no',
          then: { kind: 'continue', state: noKey },
          else: { kind: 'continue', state: yesKey },
        },
        ...(isInitial && this.entry ? { entry: structuredClone(this.entry) } : {}),
        ...(consumedPersistentCheckpoint === undefined ? {} : { consumedPersistentCheckpoint }),
      })
      return
    }

    if (containsMarker(body))
      throw new Error(`R13 activation graph: ${this.ownerKey()}.${key} 遗留 transfer marker`)
    const next = this.transitionForTerm(term, context)
    this.internalStates.set(key, {
      body: this.project(body, `${key}.body`),
      next,
      ...(isInitial && this.entry ? { entry: structuredClone(this.entry) } : {}),
      ...(consumedPersistentCheckpoint === undefined ? {} : { consumedPersistentCheckpoint }),
    })
  }

  private expandNestedBattleTransfers(
    body: unknown[],
    context: CompileContext,
    key: string,
  ): unknown[] {
    return body.map((value, index) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return value
      const command = value as Record<string, unknown>
      if (command.kind !== 'startBattle') return value
      const expanded = { ...command }
      for (const armName of ['onLose', 'onFlee'] as const) {
        const arm = expanded[armName]
        if (arm === undefined || !containsMarker(arm)) continue
        const transfer = directArmMarker(arm, `${this.ownerKey()}.${key}[${index}].${armName}`)
        if (!transfer)
          throw new Error(
            `R13 activation graph: ${this.ownerKey()}.${key}[${index}].${armName} ` +
              `marker 未独占控制臂`,
          )
        const translated = this.translate(
          transfer.targetAddress,
          context.owner,
          transfer.entryState,
        )
        if (translated.term.kind !== 'end' || containsMarker(translated.body))
          throw new Error(
            `R13 activation graph: ${this.ownerKey()} battle ${armName} ` +
              `目标 ${transfer.targetAddress} 不是单 activation 终止体`,
          )
        expanded[armName] = translated.body
      }
      return expanded
    })
  }

  private findControl(
    body: readonly unknown[],
    key: string,
  ):
    | {
        kind: 'branch'
        index: number
        command: {
          kind: 'branch'
          cond: unknown
          then: unknown
          else?: unknown
        }
        thenMarker?: R13ActivationTransferMarker
        elseMarker?: R13ActivationTransferMarker
      }
    | {
        kind: 'confirm'
        index: number
        command: Record<string, unknown>
        noMarker: R13ActivationTransferMarker
      }
    | undefined {
    for (let index = 0; index < body.length; index++) {
      const value = body[index]
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        if (containsMarker(value))
          throw new Error(`R13 activation graph: ${this.ownerKey()}.${key}[${index}] marker 非法`)
        continue
      }
      const command = value as Record<string, unknown>
      if (command.kind === 'branch') {
        const thenMarker = directArmMarker(command.then, `${this.ownerKey()}.${key}[${index}].then`)
        const elseMarker =
          command.else === undefined
            ? undefined
            : directArmMarker(command.else, `${this.ownerKey()}.${key}[${index}].else`)
        if (thenMarker || elseMarker)
          return {
            kind: 'branch',
            index,
            command: command as {
              kind: 'branch'
              cond: unknown
              then: unknown
              else?: unknown
            },
            ...(thenMarker ? { thenMarker } : {}),
            ...(elseMarker ? { elseMarker } : {}),
          }
      } else if (command.kind === 'confirm') {
        const noMarker = directArmMarker(command.onNo, `${this.ownerKey()}.${key}[${index}].onNo`)
        if (noMarker) return { kind: 'confirm', index, command, noMarker }
      }
      if (containsMarker(command))
        throw new Error(
          `R13 activation graph: ${this.ownerKey()}.${key}[${index}] 的 marker 位于不支持的 ${String(command.kind)}`,
        )
    }
    return undefined
  }

  private project(body: unknown[], path: string): AuthorCommandV5[] {
    return projectP7AuthorCommands(
      rewriteDeferredBindingCommands(
        body,
        this.projection,
        `${this.ownerKey()}.${path}<deferred-bindings>`,
      ),
      this.projection,
      `${this.ownerKey()}.${path}`,
    )
  }

  /**
   * R13 从 PAL source root 重建完整 activation；而旧 canonical flow 可能已经把
   * “安全 prepare 前缀 + dither”提升成 scene entry。重新挂载 entry 时必须同步消费
   * source 正文中的同一段前缀，否则 prepare/reveal 会在目标画面上再执行一遍。
   *
   * raw translation 到 author commands 不是恒定 1:1，因此先在 raw 顶层定位 reveal，
   * 再用生产 projector 比较 prepare；任一处不一致都 fail loudly，不能猜测剥离长度。
   */
  private consumeInitialSceneEntryPrefix(
    body: unknown[],
    isInitial: boolean,
    key: string,
  ): unknown[] {
    if (!isInitial || !this.entry) return body
    const path = `${this.ownerKey()}.${key}`
    if (this.entry.reveal.kind !== 'dither')
      throw new Error(`${path}: R13 scene entry 只支持重建已提升的 dither 前缀`)
    const ditherIndex = body.findIndex(
      (value) =>
        !!value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        (value as Record<string, unknown>).kind === 'ditherScreen',
    )
    if (ditherIndex < 0) throw new Error(`${path}: R13 scene entry 缺 entry.reveal 源命令`)
    const prepare = this.project(body.slice(0, ditherIndex), `${key}.entry.prepare`)
    const reveal = body[ditherIndex] as Record<string, unknown>
    if (
      stableJson(prepare) !== stableJson(this.entry.prepare) ||
      (reveal.ms ?? 720) !== this.entry.reveal.ms
    )
      throw new Error(
        `${path}: R13 scene entry 与 source 正文前缀不一致 ` +
          `expected=${stableJson(this.entry)} ` +
          `actual=${stableJson({ prepare, reveal })}`,
      )
    return body.slice(ditherIndex + 1)
  }

  private transitionForTerm(
    term: R13ActivationBlockTerm,
    context: CompileContext,
  ): StateTransitionV5 {
    const returnFromCall = (dialogue: DialogueEntryState): StateTransitionV5 | undefined => {
      const frame = context.returns.at(-1)
      if (!frame) return undefined
      const target = this.compileSource(frame.address, {
        ...context,
        owner: frame.owner,
        dialogue: normalizeDialogueCarry(dialogue),
        returns: context.returns.slice(0, -1),
      })
      return { kind: 'continue', state: target }
    }
    switch (term.kind) {
      case 'end': {
        const returned = returnFromCall(term.dialogueState)
        if (!returned && context.activeDelayed)
          throw new Error(
            `R13 activation graph: ${this.ownerKey()} delayed goto ` +
              `@${context.activeDelayed.sourceAddress} 在计数完成前终止`,
          )
        if (!returned && !isCheckpointOwner(this.spec)) return { kind: 'restart' }
        return (
          returned ??
          this.commit(
            this.registerDurable({
              address: context.checkpoint.address,
              dialogue: normalizeDialogueCarry(term.dialogueState),
            }),
            context.persisted,
          )
        )
      }
      case 'advance': {
        const returned = returnFromCall(term.dialogueState)
        if (returned) return returned
        if (context.activeDelayed)
          throw new Error(
            `R13 activation graph: ${this.ownerKey()} delayed goto ` +
              `@${context.activeDelayed.sourceAddress} 在计数完成前 advance`,
          )
        return this.commit(
          this.registerDurable({
            address: term.targetAddress,
            dialogue: normalizeDialogueCarry(term.dialogueState),
          }),
          context.persisted,
        )
      }
      case 'reset': {
        if (term.idleFrames > 0)
          throw new Error(
            `R13 activation graph: ${this.ownerKey()} trigger reset idleFrames=${term.idleFrames} 应由 idle-gate 投影处理`,
          )
        const returned = returnFromCall(term.dialogueState)
        if (returned) return returned
        if (context.activeDelayed)
          throw new Error(
            `R13 activation graph: ${this.ownerKey()} delayed goto ` +
              `@${context.activeDelayed.sourceAddress} 在计数完成前 reset`,
          )
        return this.commit(
          this.registerDurable({
            address: term.targetAddress,
            dialogue: normalizeDialogueCarry(term.dialogueState),
          }),
          context.persisted,
        )
      }
      case 'goto': {
        if (term.frameDelay > 0) {
          const site = isCheckpointOwner(this.spec)
            ? undefined
            : this.spec.delayedGotos.find(
                ({ sourceAddress }) => sourceAddress === term.sourceAddress,
              )
          if (!site)
            throw new Error(
              `R13 activation graph: ${this.ownerKey()} 命中未登记 delayed goto @${term.sourceAddress}`,
            )
          if (
            site.targetAddress !== term.targetAddress ||
            site.fallthroughAddress !== term.fallthroughAddress ||
            site.threshold !== term.frameDelay
          )
            throw new Error(
              `R13 activation graph: ${this.ownerKey()} delayed goto @${term.sourceAddress} ` +
                `term 漂移 target=${term.targetAddress}, fallthrough=${term.fallthroughAddress}, ` +
                `threshold=${term.frameDelay}`,
            )
          if (context.activeDelayed && context.activeDelayed.sourceAddress !== term.sourceAddress)
            throw new Error(
              `R13 activation graph: ${this.ownerKey()} delayed goto ` +
                `@${context.activeDelayed.sourceAddress} 未完成即命中 @${term.sourceAddress}`,
            )
          this.coveredDelayedGotoSources.add(term.sourceAddress)
          const incremented = (context.activeDelayed?.count ?? 0) + 1
          const pending = incremented < site.threshold
          return {
            kind: 'continue',
            state: this.compileSource(pending ? site.targetAddress : site.fallthroughAddress, {
              ...context,
              dialogue: normalizeDialogueCarry(term.dialogueState),
              activeDelayed: pending
                ? {
                    sourceAddress: site.sourceAddress,
                    count: incremented,
                  }
                : undefined,
            }),
          }
        }
        return {
          kind: 'continue',
          state: this.compileSource(term.targetAddress, {
            ...context,
            dialogue: normalizeDialogueCarry(term.dialogueState),
          }),
        }
      }
      case 'call':
        return {
          kind: 'continue',
          state: this.compileSource(term.targetAddress, {
            ...context,
            owner: term.callOwner,
            dialogue: normalizeDialogueCarry(term.dialogueState),
            returns: [...context.returns, { address: term.returnAddress, owner: context.owner }],
          }),
        }
      case 'checkpoint':
        throw new Error(
          `R13 activation graph: ${this.ownerKey()} checkpoint ${term.sourceAddress} 未在线性归一化中消费`,
        )
      case 'cut':
        throw new Error(`R13 activation graph: ${this.ownerKey()} 翻译体发生 flow cut`)
    }
  }

  private commit(target: DurablePoint, persisted: DurablePoint): StateTransitionV5 {
    if (this.durablePointKey(target) === this.durablePointKey(persisted)) return { kind: 'stay' }
    const rootKey = this.durablePointKey({
      address: this.spec.rootAddress,
      dialogue: normalizeDialogueCarry({}),
    })
    if (this.durablePointKey(target) === rootKey) return { kind: 'restart' }
    return { kind: 'advance', state: this.durableKey(target) }
  }
}

function mergeLocale(
  files: Map<string, MigrationJson>,
  incoming: Readonly<Record<string, string>>,
): void {
  const current = files.get('content/locale.json')
  if (!current || typeof current !== 'object' || Array.isArray(current))
    throw new Error('R13 activation graph: content/locale.json 无效')
  const output = { ...(current as Record<string, MigrationJson>) }
  for (const [id, text] of Object.entries(incoming)) {
    const previous = output[id]
    if (previous !== undefined && previous !== text)
      throw new Error(`R13 activation graph: locale ${id} 与生产迁移文本冲突`)
    output[id] = text
  }
  files.set('content/locale.json', output)
}

function mergeSprites(
  files: Map<string, MigrationJson>,
  incoming: R13TranslationSession['finish'] extends () => infer Output
    ? Output extends { spriteDefinitions: infer Definitions }
      ? Definitions
      : never
    : never,
): void {
  if (!incoming.length) return
  const current = files.get('content/sprites.json')
  if (!Array.isArray(current)) throw new Error('R13 activation graph: content/sprites.json 无效')
  const output = [...current]
  const byId = new Map(
    output.map((definition) => [(definition as { id?: unknown }).id, definition]),
  )
  for (const definition of incoming) {
    const previous = byId.get(definition.id)
    if (previous !== undefined && stableJson(previous) !== stableJson(definition))
      throw new Error(`R13 activation graph: sprite ${definition.id} 定义冲突`)
    if (previous === undefined) {
      output.push(structuredClone(definition) as unknown as MigrationJson)
      byId.set(definition.id, definition as unknown as MigrationJson)
    }
  }
  output.sort((left, right) =>
    String((left as { id?: unknown }).id).localeCompare(String((right as { id?: unknown }).id)),
  )
  files.set('content/sprites.json', output)
}

function materializeRestoredEntityBehaviors(args: {
  scenes: SceneDefV5[]
  ir: ScriptMigrationIRP6
  translation: R13TranslationSession
  entitySceneIndex: ReadonlyMap<string, readonly string[]>
  consumedDeferredScriptIds: Set<string>
}): R13RestoredEntityBehaviorEvidenceV1[] {
  const evidence: R13RestoredEntityBehaviorEvidenceV1[] = []
  for (const spec of R13_RESTORED_ENTITY_BEHAVIORS) {
    const scene = args.scenes.find((candidate) => candidate.id === spec.sceneId)
    const entity = scene?.entities.find((candidate) => candidate.id === spec.entityId)
    if (!scene || !entity)
      throw new Error(
        `R13 activation graph: restored owner 缺实体 ${spec.sceneId}/${spec.entityId}`,
      )
    if (!entity.behaviors) entity.behaviors = {}
    const registry = entity.behaviors
    const existingChannelRegistry = registry[spec.channel]
    const channelRegistry = existingChannelRegistry ?? {}
    if (!existingChannelRegistry) registry[spec.channel] = channelRegistry
    if (channelRegistry[spec.behaviorId])
      throw new Error(
        `R13 activation graph: restored owner id 冲突 ` +
          `${spec.sceneId}/${spec.entityId}/${spec.channel}/${spec.behaviorId}`,
      )
    const identity: P4AuthorOwnerIdentity = {
      kind: 'entity-behavior',
      sceneId: spec.sceneId,
      entityId: spec.entityId,
      channel: spec.channel,
      behaviorId: spec.behaviorId,
    }
    const block = translateActivationBlock({
      address: spec.rootAddress,
      owner: spec.entityId,
      ctx: args.translation.ctx,
      entryState: normalizeDialogueCarry({}),
    })
    if (block.term.kind !== 'end' || containsMarker(block.body))
      throw new Error(
        `R13 activation graph: restored owner ${spec.sceneId}/${spec.entityId}/` +
          `${spec.behaviorId} 不再是单 activation 终止体`,
      )
    const projection: R13ProjectionContext = {
      ir: args.ir,
      owner: identity,
      entityScenes: args.entitySceneIndex,
      staticEntityBehaviorRoots: args.translation.staticEntityBehaviorRoots,
      restoredEntityBehaviorRoots: R13_RESTORED_ENTITY_BEHAVIORS,
      consumedDeferredScriptIds: args.consumedDeferredScriptIds,
    }
    const body = projectP7AuthorCommands(
      rewriteDeferredBindingCommands(
        block.body,
        projection,
        `restored:${spec.sceneId}:${spec.entityId}:${spec.channel}:${spec.behaviorId}`,
      ),
      projection,
      `restored:${spec.sceneId}:${spec.entityId}:${spec.channel}:${spec.behaviorId}`,
    )
    channelRegistry[spec.behaviorId] = {
      label: spec.label,
      order: spec.order,
      flow: {
        kind: 'stages',
        initial: 'initial',
        stages: [{ id: 'initial', body }],
      },
    }
    evidence.push({
      sceneId: spec.sceneId,
      entityId: spec.entityId,
      channel: spec.channel,
      behaviorId: spec.behaviorId,
      rootAddress: spec.rootAddress,
      bodyDigest: stableJsonSha256(body),
    })
  }
  return evidence
}

export function augmentR13TriggerActivations(args: {
  snapshot: MigrationSnapshot
  ir: ScriptMigrationIRP6
  translation: R13TranslationSession
}): {
  snapshot: MigrationSnapshot
  evidence: R13TriggerActivationEvidenceV1
} {
  // Scene values are cloned individually below; locale/sprites are merged into new
  // objects. Other maps/assets remain immutable across this augmentation layer.
  const files = new Map(args.snapshot.files)
  const sceneIds = files.get('content/scenes/index.json')
  if (!Array.isArray(sceneIds) || sceneIds.some((id) => typeof id !== 'string'))
    throw new Error('R13 activation graph: scene index 无效')
  const scenes = sceneIds.map((id) => {
    const value = files.get(`content/scenes/${String(id)}.json`)
    if (!value) throw new Error(`R13 activation graph: scene 缺失 ${String(id)}`)
    return structuredClone(value) as unknown as SceneDefV5
  })
  const entitySceneIndex = entityScenes(scenes)
  const consumedDeferredScriptIds = new Set<string>()
  const restoredEntityBehaviors = materializeRestoredEntityBehaviors({
    scenes,
    ir: args.ir,
    translation: args.translation,
    entitySceneIndex,
    consumedDeferredScriptIds,
  })
  const ownerEvidence: R13TriggerActivationOwnerEvidenceV1[] = []
  const delayedOwnerEvidence: R13DelayedTriggerOwnerEvidenceV1[] = []
  const knownSuccessorRoots = [
    ...R13_RESTORED_ENTITY_BEHAVIORS,
    ...R13_KNOWN_SUCCESSOR_ENTITY_BEHAVIORS,
  ]
  for (const spec of R13_PERSISTENT_CHECKPOINT_OWNERS) {
    const identity = ownerIdentity(spec)
    const owner = findOwner(args.ir, identity)
    const located = locateFlow(scenes, spec)
    const compiler = new TriggerActivationCompiler(
      spec,
      args.translation,
      {
        ir: args.ir,
        owner: owner.identity,
        entityScenes: entitySceneIndex,
        staticEntityBehaviorRoots: args.translation.staticEntityBehaviorRoots,
        restoredEntityBehaviorRoots: knownSuccessorRoots,
        consumedDeferredScriptIds,
      },
      initialEntry(located.flow),
      located.label,
    )
    const compiled = compiler.compile()
    located.replace(compiled.flow)
    if (!('checkpointAddress' in compiled.evidence))
      throw new Error(`R13 activation graph: ${p7OwnerKey(identity)} evidence 类型漂移`)
    ownerEvidence.push(compiled.evidence)
  }
  for (const spec of R13_DELAYED_TRIGGER_OWNERS) {
    const identity = ownerIdentity(spec)
    const owner = findOwner(args.ir, identity)
    const located = locateFlow(scenes, spec)
    const compiler = new TriggerActivationCompiler(
      spec,
      args.translation,
      {
        ir: args.ir,
        owner: owner.identity,
        entityScenes: entitySceneIndex,
        staticEntityBehaviorRoots: args.translation.staticEntityBehaviorRoots,
        restoredEntityBehaviorRoots: knownSuccessorRoots,
        consumedDeferredScriptIds,
      },
      initialEntry(located.flow),
      located.label,
    )
    const compiled = compiler.compile()
    located.replace(compiled.flow)
    if (!('delayedGotoAddresses' in compiled.evidence))
      throw new Error(`R13 activation graph: ${p7OwnerKey(identity)} evidence 类型漂移`)
    delayedOwnerEvidence.push(compiled.evidence)
  }
  const delayedGotoAddresses = new Set(
    delayedOwnerEvidence.flatMap((owner) => owner.delayedGotoAddresses),
  )
  const delayedGotoOwnerExpandedPhases = delayedOwnerEvidence.reduce(
    (sum, owner) => sum + owner.delayedGotoPhaseCount,
    0,
  )
  if (
    delayedOwnerEvidence.length !== 7 ||
    delayedGotoAddresses.size !== 9 ||
    delayedGotoOwnerExpandedPhases !== 41
  )
    throw new Error(
      `R13 activation graph: delayed owners/addresses/phases=` +
        `${delayedOwnerEvidence.length}/${delayedGotoAddresses.size}/` +
        `${delayedGotoOwnerExpandedPhases}，期望 7/9/41`,
    )

  // 0x45/0x4A 是迁移期 marker；R13-2 恢复的后半 activation 必须沿用生产迁移
  // 的既有“烘进 SceneDef 默认并 strip”策略，绝不能复活退役 override 命令。
  const finalizedScenes = validateScenesV5(
    scenes.map((scene) => {
      const battleDefaults: {
        battleFieldId?: number
        battleMusic?: SceneDefV5['battleMusic']
      } = {}
      const hooks = scene.hooks ? deepStripBattleCfg(scene.hooks, battleDefaults) : undefined
      const entities = deepStripBattleCfg(scene.entities, battleDefaults)
      return {
        ...scene,
        ...(battleDefaults.battleFieldId === undefined
          ? {}
          : { battleFieldId: battleDefaults.battleFieldId }),
        ...(battleDefaults.battleMusic === undefined
          ? {}
          : { battleMusic: battleDefaults.battleMusic }),
        ...(hooks ? { hooks } : {}),
        entities,
      }
    }),
  )
  const refreshFinalFlowDigest = (
    evidence: R13TriggerActivationOwnerEvidenceV1 | R13DelayedTriggerOwnerEvidenceV1,
    spec: R13ActivationOwnerSpec,
  ): void => {
    const expectedOwner = p7OwnerKey(ownerIdentity(spec))
    if (evidence.ownerKey !== expectedOwner)
      throw new Error(
        `R13 activation graph: final digest owner 漂移 ${evidence.ownerKey}/${expectedOwner}`,
      )
    evidence.flowDigest = stableJsonSha256(locateFlow(finalizedScenes, spec).flow)
  }
  for (const [index, spec] of R13_PERSISTENT_CHECKPOINT_OWNERS.entries())
    refreshFinalFlowDigest(ownerEvidence[index]!, spec)
  for (const [index, spec] of R13_DELAYED_TRIGGER_OWNERS.entries())
    refreshFinalFlowDigest(delayedOwnerEvidence[index]!, spec)
  for (const scene of finalizedScenes)
    files.set(`content/scenes/${scene.id}.json`, structuredClone(scene) as unknown as MigrationJson)

  const translationOutput = args.translation.finish()
  if (translationOutput.report.gaps.length || translationOutput.report.flowCuts)
    throw new Error(
      `R13 activation graph: 翻译存在 gaps=${translationOutput.report.gaps.length}, flowCuts=${translationOutput.report.flowCuts}`,
    )
  const registryAuditIds = new Set(translationOutput.scriptRegistryAudit.map((record) => record.id))
  const consumedRegistryClosure = deferredRegistryClosure({
    roots: consumedDeferredScriptIds,
    bodies: translationOutput.scriptRegistryBodies,
  })
  const unconsumedRegistry = translationOutput.scriptRegistryAudit.filter(
    (record) => !consumedRegistryClosure.has(record.id),
  )
  const missingRegistry = [...consumedDeferredScriptIds].filter((id) => !registryAuditIds.has(id))
  const missingClosureRegistry = [...consumedRegistryClosure].filter(
    (id) => !registryAuditIds.has(id),
  )
  if (
    consumedDeferredScriptIds.size !== 32 ||
    consumedRegistryClosure.size !== 39 ||
    translationOutput.scriptRegistryAudit.length !== 39 ||
    unconsumedRegistry.length ||
    missingRegistry.length ||
    missingClosureRegistry.length
  )
    throw new Error(
      `R13 activation graph: deferred registry 消账漂移 ` +
        `direct=${consumedDeferredScriptIds.size}, ` +
        `closure=${consumedRegistryClosure.size}, ` +
        `audit=${translationOutput.scriptRegistryAudit.length}, ` +
        `unconsumed=${unconsumedRegistry.length}, ` +
        `missingRoots=${missingRegistry.length}, missingClosure=${missingClosureRegistry.length}`,
    )
  mergeLocale(files, translationOutput.locale)
  mergeSprites(files, translationOutput.spriteDefinitions)

  return {
    snapshot: {
      ...args.snapshot,
      files,
      managedFiles: new Set(args.snapshot.managedFiles),
      ...(args.snapshot.hashes ? { hashes: new Map(args.snapshot.hashes) } : {}),
    },
    evidence: {
      kind: 'r13-trigger-activation-evidence',
      version: 1,
      persistentClosures: 34,
      coveredSourceCheckpoints: 34,
      resetOverrideSourceCheckpoints: [763],
      existingRepairSourceCheckpoints: [10747],
      discardReturnContexts: 7,
      directDeferredRegistryScripts: 32,
      consumedDeferredRegistryClosureScripts: 39,
      delayedGotoAddresses: 9,
      delayedGotoOwners: 7,
      delayedGotoOwnerExpandedPhases: 41,
      translationTargets: {
        locale: Object.entries(translationOutput.locale)
          .map(([id, value]) => ({ id, digest: stableJsonSha256(value) }))
          .sort((left, right) => left.id.localeCompare(right.id)),
        sprites: translationOutput.spriteDefinitions
          .map((definition) => ({
            id: definition.id,
            digest: stableJsonSha256(definition),
          }))
          .sort((left, right) => left.id.localeCompare(right.id)),
      },
      restoredEntityBehaviors,
      owners: ownerEvidence.sort((left, right) => left.ownerKey.localeCompare(right.ownerKey)),
      delayedOwners: delayedOwnerEvidence.sort((left, right) =>
        left.ownerKey.localeCompare(right.ownerKey),
      ),
    },
  }
}
