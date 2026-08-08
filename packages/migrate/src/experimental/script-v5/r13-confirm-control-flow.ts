import type {
  AuthorCommandV5,
  SceneDefV5,
  ScriptFlowV5,
  StateTransitionV5,
} from '@type-pal/content'
import type { R13TranslationSession } from '../../migrate-content.js'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import {
  type DialogueEntryState,
  type R13ActivationBlockTerm,
  type R13ActivationTransferMarker,
  type ScriptRegistryDialogueStateAudit,
  translateActivationBlock,
} from '../../translate-events.js'
import type { C8ItemUseAugmentationEvidenceV1 } from './c8-item-use-augmentation.js'
import {
  type P7CommandProjectionContext,
  p7OwnerKey,
  projectP7AuthorCommands,
  projectP7AuthorCondition,
} from './p7-canonical.js'
import type { R13TriggerActivationEvidenceV1 } from './r13-trigger-activation-graph.js'
import {
  assertR13SourceExecutionCensus,
  type R13SourceExecutionCensusV1,
} from './source-execution-census.js'
import { stableJson, stableJsonSha256 } from './stable-json.js'
import type {
  P3FlowStructure,
  P4AuthorOwnerAllocation,
  P4AuthorOwnerIdentity,
  ScriptMigrationIRP6,
} from './types.js'

export const R13_CONFIRM_SOURCE_CENSUS_DIGEST =
  '3d19fb14b8261fd5a0e48f20cbd1e80fc57c31622624bb09126eb86ea2cb13ac' as const

export const R13_CONFIRM_LOSSY_SCENE_IDS = [
  's005',
  's009',
  's023',
  's050',
  's084',
  's091',
  's100',
  's102',
  's111',
  's127',
  's128',
  's131',
  's148',
] as const

export const R13_CONFIRM_EXACT_SCENE_IDS = ['s029', 's030', 's081', 's108', 's118'] as const

export const R13_CONFIRM_MATERIALIZED_LOCALE_IDS = [
  'dlg.5350',
  'dlg.5483',
  'dlg.5484',
  'dlg.5485',
  'dlg.5486',
  'dlg.6164',
  'dlg.7838',
  'dlg.7840',
  'dlg.7841',
  'dlg.7842',
  'dlg.7844',
  'dlg.7845',
  'dlg.7846',
  'dlg.7847',
  'dlg.7849',
  'dlg.7851',
  'dlg.7853',
  'dlg.7855',
  'dlg.7856',
] as const

export const R13_CONFIRM_MATERIALIZED_LOCALE_DIGEST =
  'ee546b25fa80c480a6b70287ff1884c0138cacbdb6cc3deee9473e4dbddff518' as const

type EntityOwnerSpec = {
  kind: 'entity'
  sceneId: string
  entityId: string
  channel: 'trigger' | 'auto'
  behaviorId: string
}

type HookOwnerSpec = {
  kind: 'hook'
  sceneId: string
  slot: 'onEnter' | 'onTeleport'
  hookId: string
}

type OwnerSpec = EntityOwnerSpec | HookOwnerSpec

type TerminalFamily = 'end' | 'advance' | 'reset' | 'loop'

interface ConfirmLogicalSpec {
  sourceAddress: number
  siteId: string
  noTargetAddress: number
  terminalFamily: TerminalFamily
  owner: OwnerSpec
  status: 'lossy' | 'exact'
  stageId?: string
  stageConfirmOrdinal?: number
}

const entity = (sceneId: string, entityId: string, behaviorId = 'default'): EntityOwnerSpec => ({
  kind: 'entity',
  sceneId,
  entityId,
  channel: 'trigger',
  behaviorId,
})

const hook = (sceneId: string, slot: HookOwnerSpec['slot'], hookId = 'default'): HookOwnerSpec => ({
  kind: 'hook',
  sceneId,
  slot,
  hookId,
})

const CONFIRM_LOGICAL_SPECS = [
  {
    sourceAddress: 3751,
    siteId: 'site-3751-ctx-7bc1e300e4ce11fd59d2',
    noTargetAddress: 3746,
    terminalFamily: 'advance',
    owner: entity('s005', 'e128'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 3862,
    siteId: 'site-3862-ctx-c1b72f9d69e8c01cf2b7',
    noTargetAddress: 3925,
    terminalFamily: 'reset',
    owner: entity('s009', 'e188'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 3868,
    siteId: 'site-3868-ctx-c1b72f9d69e8c01cf2b7',
    noTargetAddress: 3925,
    terminalFamily: 'reset',
    owner: entity('s009', 'e188'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 1,
  },
  {
    sourceAddress: 7452,
    siteId: 'site-7452-ctx-d93628201e2554cae3c5',
    noTargetAddress: 7469,
    terminalFamily: 'reset',
    owner: entity('s030', 'e540'),
    status: 'exact',
  },
  {
    sourceAddress: 7484,
    siteId: 'site-7484-ctx-34acdb0746312fa01010',
    noTargetAddress: 7477,
    terminalFamily: 'end',
    owner: entity('s029', 'e536'),
    status: 'exact',
  },
  {
    sourceAddress: 7569,
    siteId: 'site-7569-ctx-09b9781f55491d49d8a5',
    noTargetAddress: 7566,
    terminalFamily: 'advance',
    owner: entity('s023', 'e437'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 11019,
    siteId: 'site-11019-ctx-3e6c4585bcf165ca15a3',
    noTargetAddress: 11012,
    terminalFamily: 'advance',
    owner: entity('s050', 'e845'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 11019,
    siteId: 'site-11019-ctx-cc3a85ce249e2c42ccf7',
    noTargetAddress: 11012,
    terminalFamily: 'advance',
    owner: entity('s050', 'e846'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 14486,
    siteId: 'site-14486-ctx-bb02af6da639ee5d8fd3',
    noTargetAddress: 14461,
    terminalFamily: 'loop',
    owner: hook('s081', 'onEnter'),
    status: 'exact',
  },
  {
    sourceAddress: 14583,
    siteId: 'site-14583-ctx-4c392fd42e4c8d11e1c9',
    noTargetAddress: 14578,
    terminalFamily: 'advance',
    owner: entity('s084', 'e1583', 'legacy-001'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 14583,
    siteId: 'site-14583-ctx-81303fbc77e6eb63cd22',
    noTargetAddress: 14578,
    terminalFamily: 'advance',
    owner: entity('s084', 'e1584', 'legacy-001'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 15388,
    siteId: 'site-15388-ctx-86fc9ff8104f842b05b9',
    noTargetAddress: 15398,
    terminalFamily: 'advance',
    owner: entity('s091', 'e1682'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 15947,
    siteId: 'site-15947-ctx-b8859fc31d837f9e1983',
    noTargetAddress: 15999,
    terminalFamily: 'reset',
    owner: entity('s131', 'e2292'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 15962,
    siteId: 'site-15962-ctx-b8859fc31d837f9e1983',
    noTargetAddress: 15968,
    terminalFamily: 'advance',
    owner: entity('s131', 'e2292'),
    status: 'lossy',
    stageId: 'legacy-002',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 16223,
    siteId: 'site-16223-ctx-0c06abb37532a6a444f2',
    noTargetAddress: 16219,
    terminalFamily: 'advance',
    owner: entity('s127', 'e2224'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 17181,
    siteId: 'site-17181-ctx-3c8a25ed7ae2cfdc29d0',
    noTargetAddress: 17178,
    terminalFamily: 'advance',
    owner: entity('s111', 'e2085'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 17497,
    siteId: 'site-17497-ctx-d83dec4951e0299d00e2',
    noTargetAddress: 17500,
    terminalFamily: 'advance',
    owner: entity('s100', 'e1824'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 17725,
    siteId: 'site-17725-ctx-09458f32326d9e6fcf81',
    noTargetAddress: 17718,
    terminalFamily: 'advance',
    owner: entity('s100', 'e1825'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 17740,
    siteId: 'site-17740-ctx-09458f32326d9e6fcf81',
    noTargetAddress: 17718,
    terminalFamily: 'advance',
    owner: entity('s100', 'e1825'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 1,
  },
  {
    sourceAddress: 17789,
    siteId: 'site-17789-ctx-09458f32326d9e6fcf81',
    noTargetAddress: 17784,
    terminalFamily: 'advance',
    owner: entity('s100', 'e1825'),
    status: 'lossy',
    stageId: 'legacy-002',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 19272,
    siteId: 'site-19272-ctx-a3baf2a2b52a9116e594',
    noTargetAddress: 19261,
    terminalFamily: 'advance',
    owner: entity('s108', 'e2002'),
    status: 'exact',
  },
  {
    sourceAddress: 19292,
    siteId: 'site-19292-ctx-a3baf2a2b52a9116e594',
    noTargetAddress: 19281,
    terminalFamily: 'advance',
    owner: entity('s108', 'e2002'),
    status: 'exact',
  },
  {
    sourceAddress: 19352,
    siteId: 'site-19352-ctx-9471632ab6d11cae1db3',
    noTargetAddress: 19309,
    terminalFamily: 'reset',
    owner: entity('s128', 'e2245', 'legacy-001'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 19836,
    siteId: 'site-19836-ctx-e0215c043593a5bb9737',
    noTargetAddress: 19829,
    terminalFamily: 'advance',
    owner: entity('s100', 'e1817'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 19888,
    siteId: 'site-19888-ctx-93cdab79bcb67cbc2d3a',
    noTargetAddress: 19917,
    terminalFamily: 'end',
    owner: entity('s118', 'e2165', 'c8-b88cfe32b808'),
    status: 'exact',
  },
  {
    sourceAddress: 20363,
    siteId: 'site-20363-ctx-23afa82915f6021c9f4e',
    noTargetAddress: 20355,
    terminalFamily: 'advance',
    owner: entity('s100', 'e1837'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 21207,
    siteId: 'site-21207-ctx-36b6cb3e0053c9542c25',
    noTargetAddress: 21220,
    terminalFamily: 'advance',
    owner: entity('s102', 'e1882'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
  {
    sourceAddress: 23518,
    siteId: 'site-23518-ctx-46248ab3dce4ca16c355',
    noTargetAddress: 23511,
    terminalFamily: 'advance',
    owner: entity('s148', 'e2433'),
    status: 'lossy',
    stageId: 'initial',
    stageConfirmOrdinal: 0,
  },
] as const satisfies readonly ConfirmLogicalSpec[]

const LOSSY_SPECS = CONFIRM_LOGICAL_SPECS.filter(
  (
    spec,
  ): spec is (typeof CONFIRM_LOGICAL_SPECS)[number] & {
    status: 'lossy'
    stageId: string
    stageConfirmOrdinal: number
  } => spec.status === 'lossy',
)

const EXACT_SPECS = CONFIRM_LOGICAL_SPECS.filter((spec) => spec.status === 'exact')
type LossySpec = (typeof LOSSY_SPECS)[number]

function ownerIdentity(spec: OwnerSpec): P4AuthorOwnerIdentity {
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

function ownerSpecKey(spec: OwnerSpec): string {
  return p7OwnerKey(ownerIdentity(spec))
}

function containsTransferMarker(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsTransferMarker)
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    record.kind === 'n3R13ActivationTransfer' || Object.values(record).some(containsTransferMarker)
  )
}

function topLevelConfirms(body: readonly AuthorCommandV5[]): Array<{
  index: number
  command: Extract<AuthorCommandV5, { kind: 'confirm' }>
}> {
  return body.flatMap((command, index) => (command.kind === 'confirm' ? [{ index, command }] : []))
}

function recursiveConfirmCount(value: unknown): number {
  if (Array.isArray(value))
    return value.reduce<number>((sum, child) => sum + recursiveConfirmCount(child), 0)
  if (!value || typeof value !== 'object') return 0
  const record = value as Record<string, unknown>
  return (
    Number(record.kind === 'confirm') +
    Object.values(record).reduce<number>((sum, child) => sum + recursiveConfirmCount(child), 0)
  )
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

export interface R13ConfirmTerminal {
  kind: TerminalFamily
  targetAddress?: number
  targetState?: string
  yield?: 'macroTask' | 'worldTick'
}

export function projectR13ConfirmTerminalTransition(args: {
  terminal: R13ConfirmTerminal
  initialState: string
  currentState: string
  persistedState: string
}): StateTransitionV5 {
  const { terminal, initialState, currentState, persistedState } = args
  const commit = (target: string): StateTransitionV5 =>
    target === currentState
      ? { kind: 'stay' }
      : target === initialState
        ? { kind: 'restart' }
        : { kind: 'advance', state: target }
  switch (terminal.kind) {
    case 'end': {
      if (terminal.targetAddress !== undefined || terminal.yield !== undefined)
        throw new Error('R13 confirm terminal: end 不得携带 source target/yield')
      const target = terminal.targetState ?? persistedState
      return commit(target)
    }
    case 'advance':
      if (
        !terminal.targetState ||
        terminal.targetAddress === undefined ||
        terminal.yield !== undefined
      )
        throw new Error('R13 confirm terminal: advance 缺 target 或非法 yield')
      return commit(terminal.targetState)
    case 'reset':
      if (
        !terminal.targetState ||
        terminal.targetAddress === undefined ||
        terminal.yield !== undefined
      )
        throw new Error('R13 confirm terminal: reset 缺 target 或非法 yield')
      return commit(terminal.targetState)
    case 'loop':
      if (!terminal.targetState || terminal.targetAddress === undefined || !terminal.yield)
        throw new Error('R13 confirm terminal: loop 缺 target/yield')
      return { kind: 'to', state: terminal.targetState, yield: terminal.yield }
  }
}

export interface R13ConfirmSplitDecision {
  stageId: string
  stageConfirmOrdinal: number
  commandId: string
  noBody: AuthorCommandV5[]
  noTerminal: R13ConfirmTerminal
}

export interface R13ConfirmSplitEvidence {
  commandId: string
  stageId: string
  stateId: string
  noStateId?: string
  yesStateId?: string
  sourceOnNoDigest: string
  parentYesSuffixDigest: string
  noTransitionDigest: string
  yesTransitionDigest: string
}

export function splitR13ConfirmStageFlow(args: {
  flow: Extract<ScriptFlowV5, { kind: 'stages' }>
  label: string
  decisions: readonly R13ConfirmSplitDecision[]
  extraStates?: Extract<ScriptFlowV5, { kind: 'stateMachine' }>['machine']['states']
}): {
  flow: Extract<ScriptFlowV5, { kind: 'stateMachine' }>
  evidence: R13ConfirmSplitEvidence[]
} {
  const decisionsByStage = new Map<string, R13ConfirmSplitDecision[]>()
  const commandIds = new Set<string>()
  for (const decision of args.decisions) {
    if (!/^decision-\d{3}$/.test(decision.commandId))
      throw new Error(`R13 confirm split: 非稳定 command id ${decision.commandId}`)
    if (/\d{4,}/.test(decision.commandId))
      throw new Error(`R13 confirm split: command id 泄漏源地址 ${decision.commandId}`)
    if (commandIds.has(decision.commandId))
      throw new Error(`R13 confirm split: 重复 command id ${decision.commandId}`)
    commandIds.add(decision.commandId)
    const values = decisionsByStage.get(decision.stageId) ?? []
    values.push(decision)
    decisionsByStage.set(decision.stageId, values)
  }
  for (const values of decisionsByStage.values())
    values.sort((left, right) => left.stageConfirmOrdinal - right.stageConfirmOrdinal)

  const stagesById = new Map(args.flow.stages.map((stage) => [stage.id, stage]))
  if (!stagesById.has(args.flow.initial))
    throw new Error(`R13 confirm split: initial stage 缺失 ${args.flow.initial}`)
  for (const stageId of decisionsByStage.keys())
    if (!stagesById.has(stageId))
      throw new Error(`R13 confirm split: decision stage 缺失 ${stageId}`)

  const states: Extract<ScriptFlowV5, { kind: 'stateMachine' }>['machine']['states'] = {}
  const evidence: R13ConfirmSplitEvidence[] = []

  const completionForStage = (
    stageId: string,
    next: string | undefined,
    currentState: string,
  ): StateTransitionV5 => {
    const target = next ?? stageId
    return target === currentState
      ? { kind: 'stay' }
      : target === args.flow.initial
        ? { kind: 'restart' }
        : { kind: 'advance', state: target }
  }

  const compileSegment = (
    stateId: string,
    label: string,
    stageId: string,
    body: AuthorCommandV5[],
    decisions: readonly R13ConfirmSplitDecision[],
    stageNext: string | undefined,
    entry?: Extract<ScriptFlowV5, { kind: 'stages' }>['stages'][number]['entry'],
  ): void => {
    if (states[stateId]) throw new Error(`R13 confirm split: 重复 state ${stateId}`)
    if (!decisions.length) {
      states[stateId] = {
        label,
        ...(entry ? { entry: clone(entry) } : {}),
        body: clone(body),
        next: completionForStage(stageId, stageNext, stateId),
      }
      return
    }
    const confirms = topLevelConfirms(body)
    if (recursiveConfirmCount(body) !== confirms.length)
      throw new Error(`R13 confirm split: ${stageId} 存在嵌套 confirm`)
    const decision = decisions[0]!
    const located = confirms[0]
    if (!located)
      throw new Error(`R13 confirm split: ${stageId} confirm#${decision.stageConfirmOrdinal} 缺失`)
    const prefix = body.slice(0, located.index)
    if (recursiveConfirmCount(prefix) !== 0)
      throw new Error(`R13 confirm split: ${stageId} 决策前残留未消费 confirm`)
    if (stableJson(located.command.onNo) !== stableJson(decision.noBody))
      throw new Error(`R13 confirm split: ${stageId}/${decision.commandId} No 正文漂移`)

    const suffix = body.slice(located.index + 1)
    const noStateId = `${decision.commandId}-no`
    const yesStateId =
      decisions.length > 1
        ? decisions[1]!.commandId
        : suffix.length
          ? `${decision.commandId}-yes`
          : undefined
    const noTransition = projectR13ConfirmTerminalTransition({
      terminal: decision.noTerminal,
      initialState: args.flow.initial,
      currentState: noStateId,
      persistedState: stageId,
    })
    const yesTransition: StateTransitionV5 = yesStateId
      ? { kind: 'continue', state: yesStateId }
      : completionForStage(stageId, stageNext, stateId)
    states[stateId] = {
      label,
      ...(entry ? { entry: clone(entry) } : {}),
      body: [
        ...clone(prefix),
        { kind: 'confirm', id: decision.commandId, onNo: [] } satisfies AuthorCommandV5,
      ],
      next: {
        kind: 'commandOutcome',
        commandId: decision.commandId,
        command: 'confirm',
        outcome: 'no',
        then: { kind: 'continue', state: noStateId },
        else: clone(yesTransition),
      },
    }
    states[noStateId] = {
      label: `${args.label} · 选择否`,
      body: clone(decision.noBody),
      next: clone(noTransition),
    }
    if (yesStateId)
      compileSegment(
        yesStateId,
        `${args.label} · 继续`,
        stageId,
        suffix,
        decisions.slice(1),
        stageNext,
      )
    else if (decisions.length !== 1)
      throw new Error(`R13 confirm split: ${stageId} 后续 decision 缺正文`)
    evidence.push({
      commandId: decision.commandId,
      stageId,
      stateId,
      noStateId,
      ...(yesStateId ? { yesStateId } : {}),
      sourceOnNoDigest: stableJsonSha256(decision.noBody),
      parentYesSuffixDigest: stableJsonSha256(suffix),
      noTransitionDigest: stableJsonSha256(noTransition),
      yesTransitionDigest: stableJsonSha256(yesTransition),
    })
  }

  for (const stage of args.flow.stages) {
    const decisions = decisionsByStage.get(stage.id) ?? []
    const expectedTopLevel = topLevelConfirms(stage.body).length
    if (recursiveConfirmCount(stage.body) !== expectedTopLevel)
      throw new Error(`R13 confirm split: ${stage.id} 存在嵌套 confirm`)
    if (expectedTopLevel !== decisions.length)
      throw new Error(
        `R13 confirm split: ${stage.id} decision 数量 ${decisions.length}/${expectedTopLevel}`,
      )
    for (const [index, decision] of decisions.entries())
      if (decision.stageConfirmOrdinal !== index)
        throw new Error(`R13 confirm split: ${stage.id} decision ordinal 不连续`)
    compileSegment(
      stage.id,
      `步骤 ${stage.id}`,
      stage.id,
      clone(stage.body),
      decisions,
      stage.next,
      stage.entry,
    )
  }
  for (const [stateId, state] of Object.entries(args.extraStates ?? {})) {
    if (states[stateId]) throw new Error(`R13 confirm split: extra state 冲突 ${stateId}`)
    states[stateId] = clone(state)
  }
  if (evidence.length !== args.decisions.length)
    throw new Error(`R13 confirm split: evidence 数量漂移`)
  evidence.sort((left, right) => left.commandId.localeCompare(right.commandId))
  return {
    flow: {
      kind: 'stateMachine',
      machine: {
        id: 'confirm-decisions',
        label: args.label,
        initial: args.flow.initial,
        states,
      },
    },
    evidence,
  }
}

interface ExactPhysicalSpec {
  logicalSiteId: string
  owner: OwnerSpec
  flowKind: 'stateMachine' | 'stages'
  stateId?: string
  stageId?: string
  commandId?: string
}

const EXACT_PHYSICAL_SPECS = [
  {
    logicalSiteId: 'site-7452-ctx-d93628201e2554cae3c5',
    owner: entity('s030', 'e540'),
    flowKind: 'stateMachine',
    stateId: 'initial',
    commandId: 'decision-001',
  },
  {
    logicalSiteId: 'site-7452-ctx-d93628201e2554cae3c5',
    owner: entity('s030', 'e540'),
    flowKind: 'stateMachine',
    stateId: 'phase-002',
    commandId: 'decision-002',
  },
  {
    logicalSiteId: 'site-7484-ctx-34acdb0746312fa01010',
    owner: entity('s029', 'e536'),
    flowKind: 'stateMachine',
    stateId: 'initial',
    commandId: 'decision-001',
  },
  {
    logicalSiteId: 'site-7484-ctx-34acdb0746312fa01010',
    owner: entity('s029', 'e536'),
    flowKind: 'stateMachine',
    stateId: 'phase-002',
    commandId: 'decision-002',
  },
  {
    logicalSiteId: 'site-14486-ctx-bb02af6da639ee5d8fd3',
    owner: hook('s081', 'onEnter'),
    flowKind: 'stateMachine',
    stateId: 'initial',
    commandId: 'legacy-choice-001',
  },
  {
    logicalSiteId: 'site-14486-ctx-bb02af6da639ee5d8fd3',
    owner: hook('s081', 'onEnter'),
    flowKind: 'stateMachine',
    stateId: 'cycle',
    commandId: 'legacy-choice-001',
  },
  {
    logicalSiteId: 'site-19272-ctx-a3baf2a2b52a9116e594',
    owner: entity('s108', 'e2002'),
    flowKind: 'stateMachine',
    stateId: 'continuation-004',
    commandId: 'decision-001',
  },
  {
    logicalSiteId: 'site-19292-ctx-a3baf2a2b52a9116e594',
    owner: entity('s108', 'e2002'),
    flowKind: 'stateMachine',
    stateId: 'continuation-006',
    commandId: 'decision-002',
  },
  {
    logicalSiteId: 'site-19888-ctx-93cdab79bcb67cbc2d3a',
    owner: entity('s118', 'e2165', 'c8-b88cfe32b808'),
    flowKind: 'stages',
    stageId: 'stage-1',
  },
] as const satisfies readonly ExactPhysicalSpec[]

export interface R13ConfirmPhysicalSelectorV1 {
  ownerKey: string
  flowKind: 'stateMachine' | 'stages'
  machineId?: string
  stateId?: string
  stageId?: string
  commandId?: string
  commandDigest: string
}

export interface R13ConfirmPhysicalEvidenceV1 {
  logicalSiteId: string
  selector: R13ConfirmPhysicalSelectorV1
  noTransitionDigest: string
  yesTransitionDigest: string
  flowDigest: string
}

export interface R13ConfirmLogicalEvidenceV1 {
  siteId: string
  sourceAddress: number
  sourceCommandSha256: string
  ownerKey: string
  noTargetAddress: number
  yesFallthroughAddress: number
  terminal: R13ConfirmTerminal
  status: 'lossy-transformed' | 'exact-preserved'
  p3StructureId?: string
  sourceOnNoDigest?: string
  parentYesSuffixDigest?: string
}

export interface R13ConfirmRecoveredStateEvidenceV1 {
  ownerKey: string
  stateId: string
  sourceAddress: number
  dialogueStateDigest: string
  bodyDigest: string
  transitionDigest: string
  kind: 'translated-durable' | 'shared-decision'
}

export interface R13ConfirmControlFlowEvidenceV1 {
  kind: 'r13-confirm-control-flow-evidence'
  version: 1
  generator: {
    id: 'r13-confirm-control-flow'
    version: 1
  }
  inputs: {
    sourceCensusDigest: typeof R13_CONFIRM_SOURCE_CENSUS_DIGEST
    p3FlowStructuresDigest: string
    triggerActivationEvidenceDigest: string
    c8EvidenceDigest: string
    parentConfirmDigest: string
  }
  summary: {
    rawInstructions: 26
    logicalSites: 28
    physicalSites: 31
    exactLogicalSites: 6
    exactPhysicalSites: 9
    transformedLogicalSites: 22
    transformedPhysicalSites: 22
    transformedFlows: 18
    retiredStageCursors: 26
    recoveredDurableStates: 6
    materializedLocaleEntries: number
    materializedSpriteDefinitions: number
    changedScenes: 13
    terminalFamilies: {
      raw: { end: 2; advance: 18; reset: 5; loop: 1 }
      logical: { end: 2; advance: 20; reset: 5; loop: 1 }
      physical: { end: 3; advance: 20; reset: 6; loop: 2 }
    }
  }
  changedSceneIds: string[]
  exactSceneDigests: Array<{ sceneId: string; digest: string }>
  logicalSites: R13ConfirmLogicalEvidenceV1[]
  physicalSites: R13ConfirmPhysicalEvidenceV1[]
  recoveredStates: R13ConfirmRecoveredStateEvidenceV1[]
  materializedLocaleIds: string[]
  materializedLocaleDigest: string
  materializedSpriteIds: string[]
  successorConfirmDigest: string
  digest: string
}

/**
 * The augmentation mutates its local scene working set, while the evidence readers only inspect
 * an already immutable snapshot.  Keep those two modes explicit: cloning for the former avoids
 * mutating a parent snapshot; reusing for the latter avoids materialising several 294-scene
 * copies solely to prove selectors and deltas.
 */
function readScenes(snapshot: MigrationSnapshot, options: { clone?: boolean } = {}): SceneDefV5[] {
  const cloneScenes = options.clone ?? true
  const ids = snapshot.files.get('content/scenes/index.json')
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string'))
    throw new Error('R13 confirm: scene index 无效')
  return ids.map((id) => {
    const scene = snapshot.files.get(`content/scenes/${String(id)}.json`)
    if (!scene) throw new Error(`R13 confirm: scene 缺失 ${String(id)}`)
    return cloneScenes
      ? (structuredClone(scene) as unknown as SceneDefV5)
      : (scene as unknown as SceneDefV5)
  })
}

function entitySceneIndex(scenes: readonly SceneDefV5[]): ReadonlyMap<string, readonly string[]> {
  const index = new Map<string, string[]>()
  for (const scene of scenes)
    for (const entityValue of scene.entities) {
      const values = index.get(entityValue.id) ?? []
      values.push(scene.id)
      index.set(entityValue.id, values)
    }
  for (const values of index.values()) values.sort()
  return index
}

function flowAt(
  scenes: readonly SceneDefV5[],
  spec: OwnerSpec,
): {
  label: string
  flow: ScriptFlowV5
  replace?: (flow: ScriptFlowV5) => void
} {
  const scene = scenes.find((candidate) => candidate.id === spec.sceneId)
  if (!scene) throw new Error(`R13 confirm: scene 不存在 ${spec.sceneId}`)
  if (spec.kind === 'entity') {
    const entityValue = scene.entities.find((candidate) => candidate.id === spec.entityId)
    const behavior = entityValue?.behaviors?.[spec.channel]?.[spec.behaviorId]
    if (!entityValue || !behavior)
      throw new Error(`R13 confirm: owner 不存在 ${ownerSpecKey(spec)}`)
    return {
      label: behavior.label,
      flow: behavior.flow,
      replace: (flow) => {
        behavior.flow = flow
      },
    }
  }
  const behavior = scene.hooks?.[spec.slot]?.variants[spec.hookId]
  if (!behavior) throw new Error(`R13 confirm: owner 不存在 ${ownerSpecKey(spec)}`)
  return {
    label: behavior.label,
    flow: behavior.flow,
    replace: (flow) => {
      behavior.flow = flow
    },
  }
}

function p4Owner(ir: ScriptMigrationIRP6, spec: OwnerSpec): P4AuthorOwnerAllocation {
  const key = ownerSpecKey(spec)
  const owners = ir.owners.filter((owner) => p7OwnerKey(owner.identity) === key)
  if (owners.length !== 1)
    throw new Error(`R13 confirm: P4 owner ${key} 数量 ${owners.length}，期望 1`)
  return owners[0]!
}

function legacyScriptAddress(legacyScriptId: string): number | undefined {
  const match = /(?:^|\/)L-(\d+)(?:\/|$)/.exec(legacyScriptId)
  return match ? Number(match[1]) : undefined
}

type NormalizedDialogueCarry = {
  slot?: DialogueEntryState['slot']
  portrait?: DialogueEntryState['portrait']
  activeSpeaker: string
  speakerAwaitingBody: boolean
  color: NonNullable<DialogueEntryState['color']>
  speed: number
}

interface DurablePoint {
  address: number
  dialogue: NormalizedDialogueCarry
}

function normalizeDialogueCarry(
  state: DialogueEntryState | ScriptRegistryDialogueStateAudit | undefined,
): NormalizedDialogueCarry {
  const slot = state?.slot || undefined
  const portrait = state?.portrait || undefined
  return {
    ...(slot ? { slot } : {}),
    ...(portrait ? { portrait: clone(portrait) } : {}),
    activeSpeaker: state?.activeSpeaker ?? '',
    speakerAwaitingBody: state?.speakerAwaitingBody ?? false,
    color: state?.color ?? 'default',
    speed: state?.speed ?? 24,
  }
}

function durablePointKey(point: DurablePoint): string {
  return stableJson(point)
}

function auditBody(
  audit: ScriptControlFlowAuditV1,
  legacyScriptId: string,
): ScriptControlFlowAuditV1['product']['bodies'][number] {
  const values = audit.product.bodies.filter((body) => body.id === legacyScriptId)
  if (values.length !== 1)
    throw new Error(`R13 confirm: source audit body ${legacyScriptId} 数量 ${values.length}`)
  return values[0]!
}

function stageDurablePoint(args: {
  audit: ScriptControlFlowAuditV1
  legacyScriptId: string
}): DurablePoint {
  const body = auditBody(args.audit, args.legacyScriptId)
  const explicit = legacyScriptAddress(args.legacyScriptId)
  const address = body.source.entryAddress ?? body.source.addresses[0] ?? explicit
  if (address === undefined)
    throw new Error(`R13 confirm: source stage ${args.legacyScriptId} 缺 entry address`)
  if (explicit !== undefined && explicit !== address)
    throw new Error(
      `R13 confirm: source stage ${args.legacyScriptId} address ${explicit}/${address} 漂移`,
    )
  return {
    address,
    dialogue: normalizeDialogueCarry(body.dialogue?.entry),
  }
}

function activationTransferMarker(value: unknown): R13ActivationTransferMarker | undefined {
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

function directActivationTransferMarker(value: unknown, path: string): R13ActivationTransferMarker {
  if (!Array.isArray(value)) throw new Error(`R13 confirm: ${path} 不是 transfer command array`)
  const direct = value.map(activationTransferMarker).filter(Boolean)
  if (direct.length !== 1 || value.length !== 1 || containsTransferMarker(value[0]) === false)
    throw new Error(`R13 confirm: ${path} transfer marker 不唯一`)
  return direct[0]!
}

function sourceConfirmMarkers(args: {
  translation: R13TranslationSession
  point: DurablePoint
  owner?: string
  path: string
}): Map<number, R13ActivationTransferMarker> {
  const translated = translateActivationBlock({
    address: args.point.address,
    ...(args.owner ? { owner: args.owner } : {}),
    ctx: args.translation.ctx,
    entryState: args.point.dialogue,
  })
  const result = new Map<number, R13ActivationTransferMarker>()
  for (const [index, value] of translated.body.entries()) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const command = value as Record<string, unknown>
    if (command.kind !== 'confirm') continue
    const marker = directActivationTransferMarker(
      command.onNo,
      `${args.path}[${index}].confirm.onNo`,
    )
    if (result.has(marker.sourceAddress))
      throw new Error(`R13 confirm: ${args.path} 重复 source confirm @${marker.sourceAddress}`)
    result.set(marker.sourceAddress, marker)
  }
  return result
}

function sourceStructureForDecision(args: {
  ir: ScriptMigrationIRP6
  owner: P4AuthorOwnerAllocation
  stageId: string
  noTargetAddress: number
  arm?: 'onNo' | 'then'
  targetOrdinal?: number
}): P3FlowStructure {
  const allocation = args.owner.stages.find((stage) => stage.stageId === args.stageId)
  if (!allocation)
    throw new Error(`R13 confirm: ${p7OwnerKey(args.owner.identity)} 缺 stage ${args.stageId}`)
  const candidates = args.ir.flowStructures
    .filter(
      (structure) =>
        legacyScriptAddress(structure.target.legacyScriptId) === args.noTargetAddress &&
        structure.incoming.some(
          (incoming) =>
            incoming.callerLegacyScriptId === allocation.entryLegacyScriptId &&
            new RegExp(`/${args.arm ?? 'onNo'}(?:/|$)`).test(incoming.path),
        ),
    )
    .sort((left, right) => {
      const callerPath = (structure: P3FlowStructure): string =>
        structure.incoming.find(
          (incoming) =>
            incoming.callerLegacyScriptId === allocation.entryLegacyScriptId &&
            new RegExp(`/${args.arm ?? 'onNo'}(?:/|$)`).test(incoming.path),
        )?.path ?? ''
      const index = (path: string): number => Number(/^\/(\d+)/.exec(path)?.[1] ?? -1)
      return index(callerPath(left)) - index(callerPath(right))
    })
  const selected = candidates[args.targetOrdinal ?? 0]
  if (!selected)
    throw new Error(
      `R13 confirm: ${p7OwnerKey(args.owner.identity)}/${args.stageId} ` +
        `No target @${args.noTargetAddress} P3 structure ` +
        `${args.targetOrdinal ?? 0}/${candidates.length}`,
    )
  const structure = selected
  const exits = recursiveRecords(structure.target.body).filter(
    (record) => record.kind === 'n3P3FlowExit',
  )
  for (const exit of exits)
    if (
      exit.continuation !== 'terminate-current-activation' ||
      stableJson(exit.scheduling) !== stableJson({ kind: 'macroTask', worldClockAdvanceMs: 0 })
    )
      throw new Error(`R13 confirm: P3 exit 生命周期漂移 ${structure.id}`)
  return structure
}

function recursiveRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(recursiveRecords)
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  return [record, ...Object.values(record).flatMap(recursiveRecords)]
}

function terminalFamily(term: R13ActivationBlockTerm): TerminalFamily | undefined {
  if (term.kind === 'end' || term.kind === 'advance' || term.kind === 'reset') return term.kind
  if (term.kind === 'goto' && term.frameDelay === 0) return 'loop'
  return undefined
}

interface PreparedLossyDecision {
  spec: LossySpec
  commandId: string
  structure: P3FlowStructure
  noBody: AuthorCommandV5[]
  noTerm: R13ActivationBlockTerm
}

interface CompiledLossyDecision extends PreparedLossyDecision {
  terminal: R13ConfirmTerminal
  split: R13ConfirmSplitEvidence
}

function compileLossyConfirmOwner(args: {
  key: string
  label: string
  flow: Extract<ScriptFlowV5, { kind: 'stages' }>
  owner: P4AuthorOwnerAllocation
  specs: readonly LossySpec[]
  ir: ScriptMigrationIRP6
  audit: ScriptControlFlowAuditV1
  translation: R13TranslationSession
  projection: P7CommandProjectionContext
  ownerSpec: OwnerSpec
}): {
  flow: Extract<ScriptFlowV5, { kind: 'stateMachine' }>
  decisions: CompiledLossyDecision[]
  recoveredStates: R13ConfirmRecoveredStateEvidenceV1[]
} {
  const stageAllocations = new Map(args.owner.stages.map((stage) => [stage.stageId, stage]))
  if (
    stageAllocations.size !== args.owner.stages.length ||
    args.flow.stages.length !== args.owner.stages.length
  )
    throw new Error(`R13 confirm: ${args.key} parent/P4 stage 数量漂移`)
  const stagePoints = new Map<string, DurablePoint>()
  const durableStates = new Map<string, string>()
  const oldDurableByAddress = new Map<number, string>()
  for (const stage of args.flow.stages) {
    const allocation = stageAllocations.get(stage.id)
    if (!allocation) throw new Error(`R13 confirm: ${args.key} parent stage ${stage.id} 无 P4`)
    const point = stageDurablePoint({
      audit: args.audit,
      legacyScriptId: allocation.entryLegacyScriptId,
    })
    const pointKey = durablePointKey(point)
    if (durableStates.has(pointKey))
      throw new Error(`R13 confirm: ${args.key} old durable point 重复 ${stage.id}`)
    if (oldDurableByAddress.has(point.address))
      throw new Error(`R13 confirm: ${args.key} old durable address 重复 @${point.address}`)
    stagePoints.set(stage.id, point)
    durableStates.set(pointKey, stage.id)
    oldDurableByAddress.set(point.address, stage.id)
  }
  if (!stagePoints.has(args.flow.initial))
    throw new Error(`R13 confirm: ${args.key} initial durable point 缺失`)

  const ordered = [...args.specs].sort(
    (left, right) =>
      args.owner.stages.findIndex((stage) => stage.stageId === left.stageId) -
        args.owner.stages.findIndex((stage) => stage.stageId === right.stageId) ||
      left.stageConfirmOrdinal - right.stageConfirmOrdinal,
  )
  const prepared: PreparedLossyDecision[] = []
  for (const stage of args.flow.stages) {
    const stageSpecs = ordered.filter((spec) => spec.stageId === stage.id)
    const parentConfirms = topLevelConfirms(stage.body)
    if (
      parentConfirms.length !== stageSpecs.length ||
      recursiveConfirmCount(stage.body) !== parentConfirms.length
    )
      throw new Error(
        `R13 confirm: ${args.key}/${stage.id} parent confirm ` +
          `${parentConfirms.length}/${stageSpecs.length} 漂移`,
      )
    for (const [index, spec] of stageSpecs.entries())
      if (spec.stageConfirmOrdinal !== index)
        throw new Error(`R13 confirm: ${args.key}/${stage.id} confirm ordinal 漂移`)
    if (!stageSpecs.length) continue

    const point = stagePoints.get(stage.id)!
    const markers = sourceConfirmMarkers({
      translation: args.translation,
      point,
      ...(args.ownerSpec.kind === 'entity' ? { owner: args.ownerSpec.entityId } : {}),
      path: `${args.key}/${stage.id}`,
    })
    if (markers.size !== stageSpecs.length)
      throw new Error(
        `R13 confirm: ${args.key}/${stage.id} source marker ${markers.size}/${stageSpecs.length}`,
      )
    for (const [index, spec] of stageSpecs.entries()) {
      const marker = markers.get(spec.sourceAddress)
      if (!marker || marker.targetAddress !== spec.noTargetAddress)
        throw new Error(`R13 confirm: ${args.key} source marker 漂移 ${spec.siteId}`)
      const structure = sourceStructureForDecision({
        ir: args.ir,
        owner: args.owner,
        stageId: spec.stageId,
        noTargetAddress: spec.noTargetAddress,
        targetOrdinal: stageSpecs
          .slice(0, index)
          .filter((candidate) => candidate.noTargetAddress === spec.noTargetAddress).length,
      })
      const p3Body = projectP7AuthorCommands(
        structure.target.body,
        args.projection,
        `r13-confirm:${args.key}:${spec.stageId}:${spec.siteId}:p3-no`,
      )
      const noBlock = translateActivationBlock({
        address: spec.noTargetAddress,
        ...(args.ownerSpec.kind === 'entity' ? { owner: args.ownerSpec.entityId } : {}),
        ctx: args.translation.ctx,
        entryState: marker.entryState,
      })
      if (containsTransferMarker(noBlock.body))
        throw new Error(`R13 confirm: No body 残留 transfer marker ${spec.siteId}`)
      const sourceBody = projectP7AuthorCommands(
        noBlock.body,
        args.projection,
        `r13-confirm:${args.key}:${spec.stageId}:${spec.siteId}:source-no`,
      )
      const parentBody = parentConfirms[index]!.command.onNo
      if (
        stableJson(p3Body) !== stableJson(sourceBody) ||
        stableJson(parentBody) !== stableJson(sourceBody)
      )
        throw new Error(`R13 confirm: P3/source/parent No 正文不一致 ${spec.siteId}`)
      const family = terminalFamily(noBlock.term)
      if (family !== spec.terminalFamily)
        throw new Error(
          `R13 confirm: source terminal ${family ?? noBlock.term.kind}/` +
            `${spec.terminalFamily} 漂移 ${spec.siteId}`,
        )
      prepared.push({
        spec,
        commandId: `decision-${String(prepared.length + 1).padStart(3, '0')}`,
        structure,
        noBody: sourceBody,
        noTerm: noBlock.term,
      })
    }
  }
  if (prepared.length !== ordered.length)
    throw new Error(`R13 confirm: ${args.key} prepared decision 数量漂移`)

  const extraStates: Extract<ScriptFlowV5, { kind: 'stateMachine' }>['machine']['states'] = {}
  const recoveredStates: R13ConfirmRecoveredStateEvidenceV1[] = []
  let recoveredOrdinal = 0

  const registerDurable = (point: DurablePoint, stateId: string): void => {
    const key = durablePointKey(point)
    const existing = durableStates.get(key)
    if (existing && existing !== stateId)
      throw new Error(`R13 confirm: ${args.key} durable alias ${existing}/${stateId}`)
    durableStates.set(key, stateId)
  }

  const ensureDurable = (point: DurablePoint): string => {
    const pointKey = durablePointKey(point)
    const existing = durableStates.get(pointKey)
    if (existing) return existing
    const oldStage = oldDurableByAddress.get(point.address)
    if (oldStage) {
      // P4 已把这个源入口分配为稳定 stage。审计 body 对静态根可能省略 dialogue
      // entry；此处只给该既有地址登记 source term 实测到的 carry alias。不存在旧
      // stage 的内部入口仍严格使用 address + dialogue identity（例如 s128/@19350）。
      durableStates.set(pointKey, oldStage)
      return oldStage
    }
    const stateId = `recovered-${String(++recoveredOrdinal).padStart(3, '0')}`
    registerDurable(point, stateId)
    extraStates[stateId] = {
      label: `${args.label} · 恢复步骤 ${recoveredOrdinal}`,
      body: [],
      next: { kind: 'stay' },
    }
    const block = translateActivationBlock({
      address: point.address,
      ...(args.ownerSpec.kind === 'entity' ? { owner: args.ownerSpec.entityId } : {}),
      ctx: args.translation.ctx,
      entryState: point.dialogue,
    })
    if (containsTransferMarker(block.body) || recursiveConfirmCount(block.body) !== 0)
      throw new Error(
        `R13 confirm: ${args.key}/${stateId} 不能安全恢复为无决策 durable state ` +
          `point=${JSON.stringify(point)} body=${JSON.stringify(block.body)}`,
      )
    const body = projectP7AuthorCommands(
      block.body,
      args.projection,
      `r13-confirm:${args.key}:${stateId}:body`,
    )
    const resolved = resolveTerm(block.term, undefined, stateId, stateId)
    extraStates[stateId] = {
      label: `${args.label} · 恢复步骤 ${recoveredOrdinal}`,
      body,
      next: resolved.transition,
    }
    recoveredStates.push({
      ownerKey: args.key,
      stateId,
      sourceAddress: point.address,
      dialogueStateDigest: stableJsonSha256(point.dialogue),
      bodyDigest: stableJsonSha256(body),
      transitionDigest: stableJsonSha256(resolved.transition),
      kind: 'translated-durable',
    })
    return stateId
  }

  const resolveTerm = (
    term: R13ActivationBlockTerm,
    expectedFamily: TerminalFamily | undefined,
    currentState: string,
    persistedState: string,
  ): { terminal: R13ConfirmTerminal; transition: StateTransitionV5 } => {
    const family = terminalFamily(term)
    if (!family || (expectedFamily && family !== expectedFamily))
      throw new Error(
        `R13 confirm: ${args.key} terminal ${family ?? term.kind}/` +
          `${expectedFamily ?? 'durable'} 不支持`,
      )
    let terminal: R13ConfirmTerminal
    switch (term.kind) {
      case 'end':
        terminal = { kind: 'end', targetState: persistedState }
        break
      case 'advance':
      case 'reset': {
        if (term.kind === 'reset' && term.idleFrames !== 0)
          throw new Error(`R13 confirm: ${args.key} reset idleFrames=${term.idleFrames}`)
        const targetState = ensureDurable({
          address: term.targetAddress,
          dialogue: normalizeDialogueCarry(term.dialogueState),
        })
        terminal = {
          kind: term.kind,
          targetAddress: term.targetAddress,
          targetState,
        }
        break
      }
      case 'goto': {
        if (term.frameDelay !== 0)
          throw new Error(`R13 confirm: ${args.key} delayed goto 不属于 R13-4`)
        const targetState = ensureDurable({
          address: term.targetAddress,
          dialogue: normalizeDialogueCarry(term.dialogueState),
        })
        terminal = {
          kind: 'loop',
          targetAddress: term.targetAddress,
          targetState,
          yield: 'worldTick',
        }
        break
      }
      default:
        throw new Error(`R13 confirm: ${args.key} terminal ${term.kind} 不支持`)
    }
    return {
      terminal,
      transition: projectR13ConfirmTerminalTransition({
        terminal,
        initialState: args.flow.initial,
        currentState,
        persistedState,
      }),
    }
  }

  const s128Key = ownerSpecKey(entity('s128', 'e2245', 'legacy-001'))
  if (args.key === s128Key) {
    if (
      prepared.length !== 1 ||
      args.flow.stages.length !== 1 ||
      args.flow.initial !== 'initial' ||
      prepared[0]!.spec.sourceAddress !== 19352
    )
      throw new Error('R13 confirm: s128 特例 manifest 漂移')
    const decision = prepared[0]!
    if (
      decision.noTerm.kind !== 'reset' ||
      decision.noTerm.targetAddress !== 19350 ||
      decision.noTerm.idleFrames !== 0 ||
      decision.noBody.length !== 0
    )
      throw new Error('R13 confirm: s128 No reset 漂移')
    const decisionPoint: DurablePoint = {
      address: 19350,
      dialogue: normalizeDialogueCarry(decision.noTerm.dialogueState),
    }
    registerDurable(decisionPoint, decision.commandId)

    const stage = args.flow.stages[0]!
    const parentConfirm = topLevelConfirms(stage.body)[0]
    if (!parentConfirm) throw new Error('R13 confirm: s128 parent confirm 缺失')
    const decisionBlock = translateActivationBlock({
      address: decisionPoint.address,
      owner: 'e2245',
      ctx: args.translation.ctx,
      entryState: decisionPoint.dialogue,
    })
    const rawConfirmIndex = decisionBlock.body.findIndex((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false
      const command = value as Record<string, unknown>
      if (command.kind !== 'confirm') return false
      const marker = directActivationTransferMarker(command.onNo, 's128/decision-001.confirm.onNo')
      return marker.sourceAddress === 19352 && marker.targetAddress === 19309
    })
    if (rawConfirmIndex < 0) throw new Error('R13 confirm: s128 @19350 未找到共享 confirm')
    const questionBody = projectP7AuthorCommands(
      decisionBlock.body.slice(0, rawConfirmIndex),
      args.projection,
      'r13-confirm:s128:decision-001:question',
    )
    const questionStart = parentConfirm.index - questionBody.length
    if (
      questionStart < 0 ||
      stableJson(stage.body.slice(questionStart, parentConfirm.index)) !== stableJson(questionBody)
    )
      throw new Error('R13 confirm: s128 价格问句与 parent 不一致')

    const parentBranch = stage.body[parentConfirm.index + 1]
    const rawBranch = decisionBlock.body[rawConfirmIndex + 1]
    if (
      !parentBranch ||
      parentBranch.kind !== 'branch' ||
      !rawBranch ||
      typeof rawBranch !== 'object' ||
      Array.isArray(rawBranch) ||
      (rawBranch as Record<string, unknown>).kind !== 'branch'
    )
      throw new Error('R13 confirm: s128 金钱 branch 缺失')
    const rawBranchRecord = rawBranch as Record<string, unknown>
    const moneyMarker = directActivationTransferMarker(
      rawBranchRecord.then,
      's128/decision-001.money.then',
    )
    if (moneyMarker.sourceAddress !== 19353 || moneyMarker.targetAddress !== 19306)
      throw new Error('R13 confirm: s128 金钱 branch source 漂移')
    const projectedCondition = projectP7AuthorCondition(
      rawBranchRecord.cond,
      args.projection,
      'r13-confirm:s128:decision-001.money.cond',
    )
    if (stableJson(projectedCondition) !== stableJson(parentBranch.cond))
      throw new Error('R13 confirm: s128 金钱 condition 与 parent 不一致')
    const moneyBlock = translateActivationBlock({
      address: moneyMarker.targetAddress,
      owner: 'e2245',
      ctx: args.translation.ctx,
      entryState: moneyMarker.entryState,
    })
    if (containsTransferMarker(moneyBlock.body))
      throw new Error('R13 confirm: s128 钱不足 body 残留 transfer marker')
    const moneyBody = projectP7AuthorCommands(
      moneyBlock.body,
      args.projection,
      'r13-confirm:s128:decision-001:money-no',
    )
    const moneyStructure = sourceStructureForDecision({
      ir: args.ir,
      owner: args.owner,
      stageId: 'initial',
      noTargetAddress: 19306,
      arm: 'then',
    })
    const p3MoneyBody = projectP7AuthorCommands(
      moneyStructure.target.body,
      args.projection,
      'r13-confirm:s128:decision-001:money-p3',
    )
    if (
      stableJson(moneyBody) !== stableJson(parentBranch.then) ||
      stableJson(p3MoneyBody) !== stableJson(moneyBody)
    )
      throw new Error('R13 confirm: s128 钱不足 P3/source/parent 正文不一致')

    const noResolved = resolveTerm(
      decision.noTerm,
      decision.spec.terminalFamily,
      decision.commandId,
      decision.commandId,
    )
    const insufficientStateId = `${decision.commandId}-insufficient`
    const successStateId = `${decision.commandId}-success`
    const insufficientResolved = resolveTerm(
      moneyBlock.term,
      'reset',
      insufficientStateId,
      decision.commandId,
    )
    const successBody = clone(stage.body.slice(parentConfirm.index + 2))
    const disableIndex = successBody.findIndex(
      (command) =>
        command.kind === 'setEntityState' &&
        command.state === 0 &&
        command.target.scene === 's128' &&
        command.target.entity === 'e2245',
    )
    const loadSceneIndex = successBody.findIndex((command) => command.kind === 'loadScene')
    if (disableIndex < 0 || loadSceneIndex < 0 || disableIndex >= loadSceneIndex)
      throw new Error('R13 confirm: s128 success 未在离场前禁用 owner')
    const yesTransition: StateTransitionV5 = {
      kind: 'branch',
      cond: clone(parentBranch.cond),
      then: { kind: 'continue', state: insufficientStateId },
      else: { kind: 'continue', state: successStateId },
    }
    const states: Extract<ScriptFlowV5, { kind: 'stateMachine' }>['machine']['states'] = {
      initial: {
        label: '步骤 initial',
        ...(stage.entry ? { entry: clone(stage.entry) } : {}),
        body: clone(stage.body.slice(0, questionStart)),
        next: { kind: 'continue', state: decision.commandId },
      },
      [decision.commandId]: {
        label: `${args.label} · 价格确认`,
        body: [
          ...questionBody,
          {
            kind: 'confirm',
            id: decision.commandId,
            onNo: [],
          },
        ],
        next: {
          kind: 'commandOutcome',
          commandId: decision.commandId,
          command: 'confirm',
          outcome: 'no',
          then: noResolved.transition,
          else: yesTransition,
        },
      },
      [insufficientStateId]: {
        label: `${args.label} · 钱不足`,
        body: moneyBody,
        next: insufficientResolved.transition,
      },
      [successStateId]: {
        label: `${args.label} · 成交`,
        body: successBody,
        next: { kind: 'restart' },
      },
    }
    const flow: Extract<ScriptFlowV5, { kind: 'stateMachine' }> = {
      kind: 'stateMachine',
      machine: {
        id: 'confirm-decisions',
        label: args.label,
        initial: 'initial',
        states,
      },
    }
    const split: R13ConfirmSplitEvidence = {
      commandId: decision.commandId,
      stageId: 'initial',
      stateId: decision.commandId,
      sourceOnNoDigest: stableJsonSha256(decision.noBody),
      parentYesSuffixDigest: stableJsonSha256(stage.body.slice(parentConfirm.index + 1)),
      noTransitionDigest: stableJsonSha256(noResolved.transition),
      yesTransitionDigest: stableJsonSha256(yesTransition),
    }
    recoveredStates.push({
      ownerKey: args.key,
      stateId: decision.commandId,
      sourceAddress: decisionPoint.address,
      dialogueStateDigest: stableJsonSha256(decisionPoint.dialogue),
      bodyDigest: stableJsonSha256(states[decision.commandId]!.body),
      transitionDigest: stableJsonSha256(states[decision.commandId]!.next),
      kind: 'shared-decision',
    })
    return {
      flow,
      decisions: [
        {
          ...decision,
          terminal: noResolved.terminal,
          split,
        },
      ],
      recoveredStates,
    }
  }

  const splitDecisions: R13ConfirmSplitDecision[] = []
  const terminalByCommand = new Map<string, R13ConfirmTerminal>()
  for (const decision of prepared) {
    const noStateId = `${decision.commandId}-no`
    const resolved = resolveTerm(
      decision.noTerm,
      decision.spec.terminalFamily,
      noStateId,
      decision.spec.stageId,
    )
    splitDecisions.push({
      stageId: decision.spec.stageId,
      stageConfirmOrdinal: decision.spec.stageConfirmOrdinal,
      commandId: decision.commandId,
      noBody: decision.noBody,
      noTerminal: resolved.terminal,
    })
    terminalByCommand.set(decision.commandId, resolved.terminal)
  }
  const split = splitR13ConfirmStageFlow({
    flow: args.flow,
    label: args.label,
    decisions: splitDecisions,
    extraStates,
  })
  const splitByCommand = new Map(split.evidence.map((entry) => [entry.commandId, entry]))
  return {
    flow: split.flow,
    decisions: prepared.map((decision) => {
      const terminal = terminalByCommand.get(decision.commandId)
      const splitEvidence = splitByCommand.get(decision.commandId)
      if (!terminal || !splitEvidence)
        throw new Error(`R13 confirm: ${args.key}/${decision.commandId} 编译证据缺失`)
      return {
        ...decision,
        terminal,
        split: splitEvidence,
      }
    }),
    recoveredStates,
  }
}

function validateSourceManifest(args: {
  sourceCommands: readonly SourceCmd[]
  sourceCensus: R13SourceExecutionCensusV1
}): Map<string, { sourceCommandSha256: string }> {
  assertR13SourceExecutionCensus(args.sourceCensus)
  if (args.sourceCensus.digest !== R13_CONFIRM_SOURCE_CENSUS_DIGEST)
    throw new Error(
      `R13 confirm: source census digest 漂移 ` +
        `${args.sourceCensus.digest}/${R13_CONFIRM_SOURCE_CENSUS_DIGEST}`,
    )
  if (CONFIRM_LOGICAL_SPECS.length !== 28 || LOSSY_SPECS.length !== 22 || EXACT_SPECS.length !== 6)
    throw new Error('R13 confirm: logical manifest 口径漂移')
  const uniqueAddresses = new Set(CONFIRM_LOGICAL_SPECS.map((spec) => spec.sourceAddress))
  if (uniqueAddresses.size !== 26) throw new Error('R13 confirm: RAW confirm 数量漂移')
  const result = new Map<string, { sourceCommandSha256: string }>()
  for (const spec of CONFIRM_LOGICAL_SPECS) {
    if (result.has(spec.siteId)) throw new Error(`R13 confirm: 重复 logical site ${spec.siteId}`)
    const instruction = args.sourceCensus.instructions[spec.sourceAddress]
    const command = args.sourceCommands[spec.sourceAddress]
    if (
      !instruction ||
      instruction.opcode !== 0x0a ||
      !instruction.executionSiteIds.includes(spec.siteId) ||
      !command ||
      command.op !== 'raw' ||
      command.opcode !== 0x0a ||
      command.operands?.[0] !== spec.noTargetAddress ||
      stableJsonSha256(command) !== instruction.sourceCommandSha256
    )
      throw new Error(`R13 confirm: source manifest 漂移 ${spec.siteId}`)
    result.set(spec.siteId, { sourceCommandSha256: instruction.sourceCommandSha256 })
  }
  const censusConfirmSites = args.sourceCensus.instructions
    .filter((instruction) => instruction.opcode === 0x0a)
    .flatMap((instruction) => instruction.executionSiteIds)
    .sort()
  if (
    stableJson(censusConfirmSites) !==
    stableJson(CONFIRM_LOGICAL_SPECS.map((spec) => spec.siteId).sort())
  )
    throw new Error('R13 confirm: source census 与 logical manifest 非双向闭合')
  return result
}

function exactPhysicalEvidence(scenes: readonly SceneDefV5[]): R13ConfirmPhysicalEvidenceV1[] {
  return EXACT_PHYSICAL_SPECS.map((rawSpec) => {
    const spec: ExactPhysicalSpec = rawSpec
    const located = flowAt(scenes, spec.owner)
    if (located.flow.kind !== spec.flowKind)
      throw new Error(`R13 confirm: exact flow kind 漂移 ${spec.logicalSiteId}`)
    let command: Extract<AuthorCommandV5, { kind: 'confirm' }> | undefined
    let next: StateTransitionV5 = { kind: 'stay' }
    if (spec.flowKind === 'stateMachine') {
      if (located.flow.kind !== 'stateMachine' || !spec.stateId || !spec.commandId)
        throw new Error(`R13 confirm: exact state selector 非法 ${spec.logicalSiteId}`)
      const state = located.flow.machine.states[spec.stateId]
      const confirms = state ? topLevelConfirms(state.body) : []
      command = confirms.find((entry) => entry.command.id === spec.commandId)?.command
      if (!command || confirms.length !== 1)
        throw new Error(`R13 confirm: exact state selector 非唯一 ${spec.logicalSiteId}`)
      next = state!.next
      if (
        next.kind !== 'commandOutcome' ||
        next.commandId !== spec.commandId ||
        next.command !== 'confirm' ||
        next.outcome !== 'no'
      )
        throw new Error(`R13 confirm: exact commandOutcome 漂移 ${spec.logicalSiteId}`)
    } else {
      if (located.flow.kind !== 'stages' || !spec.stageId || spec.commandId !== undefined)
        throw new Error(`R13 confirm: exact stage selector 非法 ${spec.logicalSiteId}`)
      const stage = located.flow.stages.find((candidate) => candidate.id === spec.stageId)
      const confirms = stage ? topLevelConfirms(stage.body) : []
      if (confirms.length !== 1 || confirms[0]!.command.id !== undefined)
        throw new Error(`R13 confirm: C8 digest selector 非唯一 ${spec.logicalSiteId}`)
      command = confirms[0]!.command
      next = stage?.next ? { kind: 'advance', state: stage.next } : { kind: 'stay' }
    }
    const noTransition =
      next.kind === 'commandOutcome' ? next.then : ({ kind: 'stay' } satisfies StateTransitionV5)
    const yesTransition =
      next.kind === 'commandOutcome' ? next.else : ({ kind: 'stay' } satisfies StateTransitionV5)
    return {
      logicalSiteId: spec.logicalSiteId,
      selector: {
        ownerKey: ownerSpecKey(spec.owner),
        flowKind: spec.flowKind,
        ...(located.flow.kind === 'stateMachine'
          ? { machineId: located.flow.machine.id, stateId: spec.stateId }
          : { stageId: spec.stageId }),
        ...(spec.commandId ? { commandId: spec.commandId } : {}),
        commandDigest: stableJsonSha256(command),
      },
      noTransitionDigest: stableJsonSha256(noTransition),
      yesTransitionDigest: stableJsonSha256(yesTransition),
      flowDigest: stableJsonSha256(located.flow),
    }
  })
}

function sceneConfirmCount(scenes: readonly SceneDefV5[]): number {
  let total = 0
  for (const scene of scenes) {
    for (const entityValue of scene.entities)
      for (const channel of ['trigger', 'auto'] as const)
        for (const behavior of Object.values(entityValue.behaviors?.[channel] ?? {}))
          total += recursiveConfirmCount(behavior.flow)
    for (const slot of ['onEnter', 'onTeleport'] as const)
      for (const behavior of Object.values(scene.hooks?.[slot]?.variants ?? {}))
        total += recursiveConfirmCount(behavior.flow)
  }
  return total
}

function confirmSnapshotDigest(snapshot: MigrationSnapshot): string {
  const sceneIds = snapshot.files.get('content/scenes/index.json')
  if (!Array.isArray(sceneIds)) throw new Error('R13 confirm: scene index 无效')
  return stableJsonSha256({
    scenes: sceneIds.map((id) => [
      String(id),
      snapshot.files.get(`content/scenes/${String(id)}.json`),
    ]),
    locale: snapshot.files.get('content/locale.json'),
    sprites: snapshot.files.get('content/sprites.json'),
  })
}

function localeTargetDigest(snapshot: MigrationSnapshot, ids: readonly string[]): string {
  const locale = snapshot.files.get('content/locale.json')
  if (!locale || typeof locale !== 'object' || Array.isArray(locale))
    throw new Error('R13 confirm: content/locale.json 无效')
  const record = locale as Record<string, MigrationJson>
  return stableJsonSha256(
    Object.fromEntries(
      [...ids].sort().map((id) => {
        const value = record[id]
        if (typeof value !== 'string')
          throw new Error(`R13 confirm: materialized locale 缺失 ${id}`)
        return [id, value]
      }),
    ),
  )
}

function materializeTranslationOutput(
  snapshot: MigrationSnapshot,
  output: ReturnType<R13TranslationSession['finish']>,
): {
  files: Map<string, MigrationJson>
  localeIds: string[]
  spriteIds: string[]
} {
  if (output.report.gaps.length || output.report.flowCuts)
    throw new Error(
      `R13 confirm: source translation gaps=${output.report.gaps.length}, ` +
        `flowCuts=${output.report.flowCuts}`,
    )
  const locale = snapshot.files.get('content/locale.json')
  if (!locale || typeof locale !== 'object' || Array.isArray(locale))
    throw new Error('R13 confirm: content/locale.json 无效')
  const files = new Map(snapshot.files)
  const nextLocale = { ...(locale as Record<string, MigrationJson>) }
  const localeIds: string[] = []
  for (const [id, text] of Object.entries(output.locale))
    if (nextLocale[id] === undefined) {
      nextLocale[id] = text
      localeIds.push(id)
    } else if (nextLocale[id] !== text) throw new Error(`R13 confirm: locale ${id} 与 parent 冲突`)
  if (localeIds.length) files.set('content/locale.json', nextLocale)
  const sprites = snapshot.files.get('content/sprites.json')
  if (!Array.isArray(sprites)) throw new Error('R13 confirm: content/sprites.json 无效')
  const nextSprites = clone(sprites)
  const spriteById = new Map(nextSprites.map((value) => [(value as { id?: unknown }).id, value]))
  const spriteIds: string[] = []
  for (const definition of output.spriteDefinitions) {
    const previous = spriteById.get(definition.id)
    if (previous === undefined) {
      nextSprites.push(clone(definition) as unknown as MigrationJson)
      spriteById.set(definition.id, definition as unknown as MigrationJson)
      spriteIds.push(definition.id)
    } else if (stableJson(previous) !== stableJson(definition))
      throw new Error(`R13 confirm: sprite ${definition.id} 与 parent 冲突`)
  }
  if (spriteIds.length) {
    nextSprites.sort((left, right) =>
      String((left as { id?: unknown }).id).localeCompare(String((right as { id?: unknown }).id)),
    )
    files.set('content/sprites.json', nextSprites)
  }
  localeIds.sort()
  spriteIds.sort()
  return { files, localeIds, spriteIds }
}

export function augmentR13ConfirmControlFlow(args: {
  snapshot: MigrationSnapshot
  ir: ScriptMigrationIRP6
  sourceCommands: readonly SourceCmd[]
  sourceCensus: R13SourceExecutionCensusV1
  translation: R13TranslationSession
  sourceAudit: ScriptControlFlowAuditV1
  triggerActivationEvidence: R13TriggerActivationEvidenceV1
  c8Evidence: C8ItemUseAugmentationEvidenceV1
}): {
  snapshot: MigrationSnapshot
  evidence: R13ConfirmControlFlowEvidenceV1
} {
  const sourceManifest = validateSourceManifest(args)
  const parentConfirmDigest = confirmSnapshotDigest(args.snapshot)
  const scenes = readScenes(args.snapshot)
  if (sceneConfirmCount(scenes) !== 31)
    throw new Error('R13 confirm: parent physical confirm != 31')
  const sceneIndex = entitySceneIndex(scenes)
  const exactBefore = new Map(
    R13_CONFIRM_EXACT_SCENE_IDS.map((sceneId) => {
      const scene = scenes.find((candidate) => candidate.id === sceneId)
      if (!scene) throw new Error(`R13 confirm: exact scene 缺失 ${sceneId}`)
      return [sceneId, stableJsonSha256(scene)] as const
    }),
  )
  const exactPhysical = exactPhysicalEvidence(scenes)
  if (exactPhysical.length !== 9) throw new Error('R13 confirm: exact physical != 9')

  const ownerSpecs = new Map<string, typeof LOSSY_SPECS>()
  for (const spec of LOSSY_SPECS) {
    const key = ownerSpecKey(spec.owner)
    const values = ownerSpecs.get(key) ?? []
    ownerSpecs.set(key, [...values, spec] as typeof LOSSY_SPECS)
  }
  if (ownerSpecs.size !== 18) throw new Error('R13 confirm: transformed flow != 18')

  const logicalEvidence: R13ConfirmLogicalEvidenceV1[] = []
  const transformedPhysical: R13ConfirmPhysicalEvidenceV1[] = []
  const recoveredStates: R13ConfirmRecoveredStateEvidenceV1[] = []
  let retiredStageCursors = 0
  for (const [key, specs] of [...ownerSpecs.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const first = specs[0]!
    const owner = p4Owner(args.ir, first.owner)
    if (p7OwnerKey(owner.identity) !== key) throw new Error(`R13 confirm: owner key 漂移 ${key}`)
    retiredStageCursors += owner.stages.length
    const located = flowAt(scenes, first.owner)
    if (located.flow.kind !== 'stages') throw new Error(`R13 confirm: lossy owner 非 stages ${key}`)
    const projection: P7CommandProjectionContext = {
      ir: args.ir,
      owner: owner.identity,
      entityScenes: sceneIndex,
    }
    const compiled = compileLossyConfirmOwner({
      key,
      label: located.label,
      flow: located.flow,
      owner,
      specs,
      ir: args.ir,
      audit: args.sourceAudit,
      translation: args.translation,
      projection,
      ownerSpec: first.owner,
    })
    located.replace!(compiled.flow)
    recoveredStates.push(...compiled.recoveredStates)
    const finalFlowDigest = stableJsonSha256(compiled.flow)
    for (const decision of compiled.decisions) {
      const { spec } = decision
      logicalEvidence.push({
        siteId: spec.siteId,
        sourceAddress: spec.sourceAddress,
        sourceCommandSha256: sourceManifest.get(spec.siteId)!.sourceCommandSha256,
        ownerKey: key,
        noTargetAddress: spec.noTargetAddress,
        yesFallthroughAddress: spec.sourceAddress + 1,
        terminal: decision.terminal,
        status: 'lossy-transformed',
        p3StructureId: decision.structure.id,
        sourceOnNoDigest: stableJsonSha256(decision.noBody),
        parentYesSuffixDigest: decision.split.parentYesSuffixDigest,
      })
      const state = compiled.flow.machine.states[decision.split.stateId]
      const command = state?.body.find(
        (candidate) => candidate.kind === 'confirm' && candidate.id === decision.commandId,
      )
      if (!state || !command)
        throw new Error(`R13 confirm: final selector 缺失 ${key}/${decision.commandId}`)
      transformedPhysical.push({
        logicalSiteId: spec.siteId,
        selector: {
          ownerKey: key,
          flowKind: 'stateMachine',
          machineId: compiled.flow.machine.id,
          stateId: decision.split.stateId,
          commandId: decision.commandId,
          commandDigest: stableJsonSha256(command),
        },
        noTransitionDigest: decision.split.noTransitionDigest,
        yesTransitionDigest: decision.split.yesTransitionDigest,
        flowDigest: finalFlowDigest,
      })
    }
  }
  if (retiredStageCursors !== 26)
    throw new Error(`R13 confirm: retired stage cursors=${retiredStageCursors}/26`)

  for (const spec of EXACT_SPECS) {
    const terminal: R13ConfirmTerminal =
      spec.terminalFamily === 'end'
        ? { kind: 'end' }
        : spec.terminalFamily === 'loop'
          ? { kind: 'loop', targetState: 'cycle', yield: 'macroTask' }
          : spec.terminalFamily === 'reset'
            ? { kind: 'reset', targetState: 'initial' }
            : { kind: 'advance', targetState: 'source-backed' }
    logicalEvidence.push({
      siteId: spec.siteId,
      sourceAddress: spec.sourceAddress,
      sourceCommandSha256: sourceManifest.get(spec.siteId)!.sourceCommandSha256,
      ownerKey: ownerSpecKey(spec.owner),
      noTargetAddress: spec.noTargetAddress,
      yesFallthroughAddress: spec.sourceAddress + 1,
      terminal,
      status: 'exact-preserved',
    })
  }
  recoveredStates.sort(
    (left, right) =>
      left.ownerKey.localeCompare(right.ownerKey) || left.stateId.localeCompare(right.stateId),
  )
  const recoveredAddresses = [...new Set(recoveredStates.map((state) => state.sourceAddress))].sort(
    (left, right) => left - right,
  )
  if (
    recoveredStates.length !== 6 ||
    stableJson(recoveredAddresses) !== stableJson([15409, 15993, 17536, 19350, 21226, 21230])
  )
    throw new Error(`R13 confirm: recovered durable state 漂移 ${stableJson(recoveredAddresses)}`)
  const translationMaterialization = materializeTranslationOutput(
    args.snapshot,
    args.translation.finish(),
  )

  const changedSceneIds = [...new Set(LOSSY_SPECS.map((spec) => spec.owner.sceneId))].sort()
  if (stableJson(changedSceneIds) !== stableJson([...R13_CONFIRM_LOSSY_SCENE_IDS].sort()))
    throw new Error('R13 confirm: changed scene manifest 漂移')
  const files = translationMaterialization.files
  for (const sceneId of changedSceneIds) {
    const scene = scenes.find((candidate) => candidate.id === sceneId)
    if (!scene) throw new Error(`R13 confirm: changed scene 缺失 ${sceneId}`)
    files.set(`content/scenes/${sceneId}.json`, clone(scene) as unknown as MigrationJson)
  }
  const snapshot: MigrationSnapshot = {
    ...args.snapshot,
    files,
    managedFiles: new Set(args.snapshot.managedFiles),
    ...(args.snapshot.hashes ? { hashes: new Map(args.snapshot.hashes) } : {}),
  }
  const finalScenes = readScenes(snapshot, { clone: false })
  if (sceneConfirmCount(finalScenes) !== 31)
    throw new Error('R13 confirm: final physical confirm != 31')
  const exactSceneDigests = R13_CONFIRM_EXACT_SCENE_IDS.map((sceneId) => {
    const scene = finalScenes.find((candidate) => candidate.id === sceneId)
    if (!scene) throw new Error(`R13 confirm: exact scene 缺失 ${sceneId}`)
    const digest = stableJsonSha256(scene)
    if (digest !== exactBefore.get(sceneId))
      throw new Error(`R13 confirm: exact scene 被修改 ${sceneId}`)
    return { sceneId, digest }
  })
  const physicalSites = [...exactPhysical, ...transformedPhysical].sort(
    (left, right) =>
      left.logicalSiteId.localeCompare(right.logicalSiteId) ||
      stableJson(left.selector).localeCompare(stableJson(right.selector)),
  )
  if (physicalSites.length !== 31 || transformedPhysical.length !== 22)
    throw new Error('R13 confirm: physical evidence 口径漂移')
  logicalEvidence.sort((left, right) => left.siteId.localeCompare(right.siteId))
  const withoutDigest = {
    kind: 'r13-confirm-control-flow-evidence' as const,
    version: 1 as const,
    generator: {
      id: 'r13-confirm-control-flow' as const,
      version: 1 as const,
    },
    inputs: {
      sourceCensusDigest: R13_CONFIRM_SOURCE_CENSUS_DIGEST,
      p3FlowStructuresDigest: stableJsonSha256(args.ir.flowStructures),
      triggerActivationEvidenceDigest: stableJsonSha256(args.triggerActivationEvidence),
      c8EvidenceDigest: stableJsonSha256(args.c8Evidence),
      parentConfirmDigest,
    },
    summary: {
      rawInstructions: 26 as const,
      logicalSites: 28 as const,
      physicalSites: 31 as const,
      exactLogicalSites: 6 as const,
      exactPhysicalSites: 9 as const,
      transformedLogicalSites: 22 as const,
      transformedPhysicalSites: 22 as const,
      transformedFlows: 18 as const,
      retiredStageCursors: 26 as const,
      recoveredDurableStates: 6 as const,
      materializedLocaleEntries: translationMaterialization.localeIds.length,
      materializedSpriteDefinitions: translationMaterialization.spriteIds.length,
      changedScenes: 13 as const,
      terminalFamilies: {
        raw: { end: 2 as const, advance: 18 as const, reset: 5 as const, loop: 1 as const },
        logical: { end: 2 as const, advance: 20 as const, reset: 5 as const, loop: 1 as const },
        physical: { end: 3 as const, advance: 20 as const, reset: 6 as const, loop: 2 as const },
      },
    },
    changedSceneIds,
    exactSceneDigests,
    logicalSites: logicalEvidence,
    physicalSites,
    recoveredStates,
    materializedLocaleIds: translationMaterialization.localeIds,
    materializedLocaleDigest: localeTargetDigest(snapshot, translationMaterialization.localeIds),
    materializedSpriteIds: translationMaterialization.spriteIds,
    successorConfirmDigest: confirmSnapshotDigest(snapshot),
  }
  const evidence: R13ConfirmControlFlowEvidenceV1 = {
    ...withoutDigest,
    digest: stableJsonSha256(withoutDigest),
  }
  assertR13ConfirmControlFlowEvidence(evidence)
  assertR13ConfirmDispositionBacked(args.snapshot, snapshot, evidence)
  return { snapshot, evidence }
}

export function assertR13ConfirmControlFlowEvidence(
  evidence: R13ConfirmControlFlowEvidenceV1,
): void {
  if (
    evidence.kind !== 'r13-confirm-control-flow-evidence' ||
    evidence.version !== 1 ||
    evidence.generator.id !== 'r13-confirm-control-flow' ||
    evidence.generator.version !== 1
  )
    throw new Error('R13 confirm evidence: header 漂移')
  if (
    evidence.inputs.sourceCensusDigest !== R13_CONFIRM_SOURCE_CENSUS_DIGEST ||
    evidence.summary.rawInstructions !== 26 ||
    evidence.summary.logicalSites !== 28 ||
    evidence.summary.physicalSites !== 31 ||
    evidence.summary.exactLogicalSites !== 6 ||
    evidence.summary.exactPhysicalSites !== 9 ||
    evidence.summary.transformedLogicalSites !== 22 ||
    evidence.summary.transformedPhysicalSites !== 22 ||
    evidence.summary.transformedFlows !== 18 ||
    evidence.summary.retiredStageCursors !== 26 ||
    evidence.summary.recoveredDurableStates !== 6 ||
    evidence.summary.materializedLocaleEntries !== evidence.materializedLocaleIds.length ||
    evidence.summary.materializedSpriteDefinitions !== evidence.materializedSpriteIds.length ||
    stableJson(evidence.materializedLocaleIds) !==
      stableJson([...R13_CONFIRM_MATERIALIZED_LOCALE_IDS]) ||
    evidence.materializedLocaleDigest !== R13_CONFIRM_MATERIALIZED_LOCALE_DIGEST ||
    evidence.materializedSpriteIds.length !== 0 ||
    evidence.summary.changedScenes !== 13 ||
    evidence.logicalSites.length !== 28 ||
    evidence.physicalSites.length !== 31 ||
    evidence.recoveredStates.length !== 6 ||
    evidence.exactSceneDigests.length !== 5 ||
    stableJson(evidence.changedSceneIds) !== stableJson([...R13_CONFIRM_LOSSY_SCENE_IDS].sort()) ||
    stableJson(evidence.exactSceneDigests.map(({ sceneId }) => sceneId).sort()) !==
      stableJson([...R13_CONFIRM_EXACT_SCENE_IDS].sort()) ||
    stableJson(evidence.summary.terminalFamilies) !==
      stableJson({
        raw: { end: 2, advance: 18, reset: 5, loop: 1 },
        logical: { end: 2, advance: 20, reset: 5, loop: 1 },
        physical: { end: 3, advance: 20, reset: 6, loop: 2 },
      })
  )
    throw new Error('R13 confirm evidence: summary 漂移')
  const logicalIds = new Set(evidence.logicalSites.map((site) => site.siteId))
  if (logicalIds.size !== 28) throw new Error('R13 confirm evidence: logical site 重复')
  const logicalById = new Map(evidence.logicalSites.map((site) => [site.siteId, site]))
  for (const spec of CONFIRM_LOGICAL_SPECS) {
    const logical = logicalById.get(spec.siteId)
    if (
      !logical ||
      logical.sourceAddress !== spec.sourceAddress ||
      logical.ownerKey !== ownerSpecKey(spec.owner) ||
      logical.noTargetAddress !== spec.noTargetAddress ||
      logical.yesFallthroughAddress !== spec.sourceAddress + 1 ||
      logical.status !== (spec.status === 'lossy' ? 'lossy-transformed' : 'exact-preserved') ||
      logical.terminal.kind !== spec.terminalFamily
    )
      throw new Error(`R13 confirm evidence: logical manifest 漂移 ${spec.siteId}`)
  }
  const physicalMultiplicity = new Map<string, number>()
  for (const physical of evidence.physicalSites)
    physicalMultiplicity.set(
      physical.logicalSiteId,
      (physicalMultiplicity.get(physical.logicalSiteId) ?? 0) + 1,
    )
  for (const logical of evidence.logicalSites) {
    const expected =
      logical.status === 'exact-preserved' && [7452, 7484, 14486].includes(logical.sourceAddress)
        ? 2
        : 1
    if (physicalMultiplicity.get(logical.siteId) !== expected)
      throw new Error(`R13 confirm evidence: physical multiplicity 漂移 ${logical.siteId}`)
  }
  const recoveredRoster = evidence.recoveredStates.map(
    ({ ownerKey, stateId, sourceAddress, kind }) => ({
      ownerKey,
      stateId,
      sourceAddress,
      kind,
    }),
  )
  if (
    stableJson(recoveredRoster) !==
    stableJson([
      {
        ownerKey: 'entity:s091:e1682:trigger:default',
        stateId: 'recovered-001',
        sourceAddress: 15409,
        kind: 'translated-durable',
      },
      {
        ownerKey: 'entity:s100:e1824:trigger:default',
        stateId: 'recovered-001',
        sourceAddress: 17536,
        kind: 'translated-durable',
      },
      {
        ownerKey: 'entity:s102:e1882:trigger:default',
        stateId: 'recovered-001',
        sourceAddress: 21226,
        kind: 'translated-durable',
      },
      {
        ownerKey: 'entity:s102:e1882:trigger:default',
        stateId: 'recovered-002',
        sourceAddress: 21230,
        kind: 'translated-durable',
      },
      {
        ownerKey: 'entity:s128:e2245:trigger:legacy-001',
        stateId: 'decision-001',
        sourceAddress: 19350,
        kind: 'shared-decision',
      },
      {
        ownerKey: 'entity:s131:e2292:trigger:default',
        stateId: 'recovered-001',
        sourceAddress: 15993,
        kind: 'translated-durable',
      },
    ])
  )
    throw new Error('R13 confirm evidence: recovered state roster 漂移')
  if (
    new Set(evidence.recoveredStates.map((state) => `${state.ownerKey}/${state.stateId}`)).size !==
    6
  )
    throw new Error('R13 confirm evidence: recovered state 重复')
  for (const physical of evidence.physicalSites) {
    if (!logicalIds.has(physical.logicalSiteId))
      throw new Error(`R13 confirm evidence: physical 缺 logical ${physical.logicalSiteId}`)
    const selector = physical.selector
    if (
      selector.ownerKey.includes('/L-') ||
      selector.machineId?.includes('/L-') ||
      selector.stateId?.includes('/L-') ||
      selector.stageId?.includes('/L-') ||
      selector.commandId?.includes('/L-')
    )
      throw new Error(`R13 confirm evidence: selector 泄漏 PAL 地址 ${physical.logicalSiteId}`)
    if (
      selector.flowKind === 'stateMachine'
        ? !selector.machineId || !selector.stateId || !selector.commandId || selector.stageId
        : !selector.stageId || selector.machineId || selector.stateId || selector.commandId
    )
      throw new Error(`R13 confirm evidence: selector 形状非法 ${physical.logicalSiteId}`)
  }
  if (
    new Set(evidence.physicalSites.map((site) => stableJson(site.selector))).size !==
    evidence.physicalSites.length
  )
    throw new Error('R13 confirm evidence: physical selector 重复')
  const { digest, ...withoutDigest } = evidence
  if (digest !== stableJsonSha256(withoutDigest))
    throw new Error('R13 confirm evidence: digest 漂移')
}

function snapshotFlowByOwnerKey(snapshot: MigrationSnapshot): Map<string, ScriptFlowV5> {
  const result = new Map<string, ScriptFlowV5>()
  for (const scene of readScenes(snapshot, { clone: false })) {
    for (const entityValue of scene.entities)
      for (const channel of ['trigger', 'auto'] as const)
        for (const [behaviorId, behavior] of Object.entries(
          entityValue.behaviors?.[channel] ?? {},
        )) {
          const key = `entity:${scene.id}:${entityValue.id}:${channel}:${behaviorId}`
          if (result.has(key)) throw new Error(`R13 confirm: final owner 重复 ${key}`)
          result.set(key, behavior.flow)
        }
    for (const slot of ['onEnter', 'onTeleport'] as const)
      for (const [hookId, behavior] of Object.entries(scene.hooks?.[slot]?.variants ?? {})) {
        const key = `hook:${scene.id}:${slot}:${hookId}`
        if (result.has(key)) throw new Error(`R13 confirm: final owner 重复 ${key}`)
        result.set(key, behavior.flow)
      }
  }
  return result
}

function assertR13ConfirmPhysicalSelectorsBacked(
  snapshot: MigrationSnapshot,
  evidence: R13ConfirmControlFlowEvidenceV1,
  options: { immutableAuthority: boolean },
): void {
  const flows = snapshotFlowByOwnerKey(snapshot)
  const logicalById = new Map(evidence.logicalSites.map((site) => [site.siteId, site]))
  if (
    options.immutableAuthority &&
    sceneConfirmCount(readScenes(snapshot, { clone: false })) !== evidence.summary.physicalSites
  )
    throw new Error('R13 confirm: final physical confirm 数量漂移')
  for (const physical of evidence.physicalSites) {
    const { selector } = physical
    const logical = logicalById.get(physical.logicalSiteId)
    if (!logical)
      throw new Error(`R13 confirm: final selector 缺 logical ${physical.logicalSiteId}`)
    const flow = flows.get(selector.ownerKey)
    if (!flow || flow.kind !== selector.flowKind)
      throw new Error(`R13 confirm: final selector owner 漂移 ${physical.logicalSiteId}`)
    if (options.immutableAuthority && stableJsonSha256(flow) !== physical.flowDigest)
      throw new Error(`R13 confirm: final flow digest 漂移 ${physical.logicalSiteId}`)
    if (flow.kind === 'stateMachine') {
      if (flow.machine.id !== selector.machineId)
        throw new Error(`R13 confirm: final machine id 漂移 ${physical.logicalSiteId}`)
      const state = flow.machine.states[selector.stateId!]
      const matches = state
        ? topLevelConfirms(state.body).filter(
            ({ command }) =>
              command.id === selector.commandId &&
              stableJsonSha256(command) === selector.commandDigest,
          )
        : []
      if (matches.length !== 1)
        throw new Error(`R13 confirm: final state selector 非唯一 ${physical.logicalSiteId}`)
      const next = state!.next
      const noTransition =
        logical.status === 'lossy-transformed' &&
        next.kind === 'commandOutcome' &&
        next.then.kind === 'continue'
          ? flow.machine.states[next.then.state]?.next
          : next.kind === 'commandOutcome'
            ? next.then
            : undefined
      if (
        next.kind !== 'commandOutcome' ||
        next.commandId !== selector.commandId ||
        next.command !== 'confirm' ||
        next.outcome !== 'no' ||
        !noTransition ||
        stableJsonSha256(noTransition) !== physical.noTransitionDigest ||
        stableJsonSha256(next.else) !== physical.yesTransitionDigest
      )
        throw new Error(`R13 confirm: final commandOutcome 漂移 ${physical.logicalSiteId}`)
    } else {
      const stage = flow.stages.find((candidate) => candidate.id === selector.stageId)
      const matches = stage
        ? topLevelConfirms(stage.body).filter(
            ({ command }) => stableJsonSha256(command) === selector.commandDigest,
          )
        : []
      if (
        matches.length !== 1 ||
        stableJsonSha256({ kind: 'stay' }) !== physical.noTransitionDigest ||
        stableJsonSha256({ kind: 'stay' }) !== physical.yesTransitionDigest
      )
        throw new Error(`R13 confirm: final stage selector 非唯一 ${physical.logicalSiteId}`)
    }
  }
}

function assertR13ConfirmRecoveredStatesBacked(
  snapshot: MigrationSnapshot,
  evidence: R13ConfirmControlFlowEvidenceV1,
  options: { immutableAuthority: boolean },
): void {
  const flows = snapshotFlowByOwnerKey(snapshot)
  for (const recovered of evidence.recoveredStates) {
    const flow = flows.get(recovered.ownerKey)
    const state = flow?.kind === 'stateMachine' ? flow.machine.states[recovered.stateId] : undefined
    if (
      !state ||
      stableJsonSha256(state.next) !== recovered.transitionDigest ||
      (options.immutableAuthority && stableJsonSha256(state.body) !== recovered.bodyDigest)
    )
      throw new Error(
        `R13 confirm: recovered state snapshot 漂移 ${recovered.ownerKey}/${recovered.stateId}`,
      )
  }
}

function recordEntries(
  value: MigrationJson | undefined,
  context: string,
): Record<string, MigrationJson> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`R13 confirm: ${context} 无效`)
  return value as Record<string, MigrationJson>
}

/**
 * 证明 evidence 不只是自洽账本：parent/successor 的场景、locale、sprite 差分必须
 * 精确等于 R13-4 白名单，且 31 个 final selector 必须逐一解析回实际命令与 transition。
 */
export function assertR13ConfirmDispositionBacked(
  parentSnapshot: MigrationSnapshot,
  successorSnapshot: MigrationSnapshot,
  evidence: R13ConfirmControlFlowEvidenceV1,
): void {
  assertR13ConfirmControlFlowEvidence(evidence)
  if (confirmSnapshotDigest(parentSnapshot) !== evidence.inputs.parentConfirmDigest)
    throw new Error('R13 confirm: parent snapshot digest 漂移')
  if (confirmSnapshotDigest(successorSnapshot) !== evidence.successorConfirmDigest)
    throw new Error('R13 confirm: successor snapshot digest 漂移')

  const parentScenes = new Map(
    readScenes(parentSnapshot, { clone: false }).map((scene) => [scene.id, scene]),
  )
  const successorScenes = new Map(
    readScenes(successorSnapshot, { clone: false }).map((scene) => [scene.id, scene]),
  )
  const changedScenes = [...successorScenes.entries()]
    .filter(([sceneId, scene]) => stableJson(scene) !== stableJson(parentScenes.get(sceneId)))
    .map(([sceneId]) => sceneId)
    .sort()
  if (stableJson(changedScenes) !== stableJson(evidence.changedSceneIds))
    throw new Error('R13 confirm: changed scene snapshot 差分漂移')
  for (const exact of evidence.exactSceneDigests) {
    const parent = parentScenes.get(exact.sceneId)
    const successor = successorScenes.get(exact.sceneId)
    if (
      !parent ||
      !successor ||
      stableJsonSha256(parent) !== exact.digest ||
      stableJsonSha256(successor) !== exact.digest
    )
      throw new Error(`R13 confirm: exact scene snapshot 漂移 ${exact.sceneId}`)
  }

  const parentLocale = recordEntries(
    parentSnapshot.files.get('content/locale.json'),
    'parent locale',
  )
  const successorLocale = recordEntries(
    successorSnapshot.files.get('content/locale.json'),
    'successor locale',
  )
  const localeIds = Object.keys(successorLocale)
    .filter((id) => parentLocale[id] === undefined)
    .sort()
  if (
    stableJson(localeIds) !== stableJson(evidence.materializedLocaleIds) ||
    localeTargetDigest(successorSnapshot, localeIds) !== evidence.materializedLocaleDigest ||
    Object.keys(parentLocale).some(
      (id) => stableJson(parentLocale[id]) !== stableJson(successorLocale[id]),
    ) ||
    localeIds.some((id) => typeof successorLocale[id] !== 'string')
  )
    throw new Error('R13 confirm: locale materialization snapshot 差分漂移')

  const parentSprites = parentSnapshot.files.get('content/sprites.json')
  const successorSprites = successorSnapshot.files.get('content/sprites.json')
  if (!Array.isArray(parentSprites) || !Array.isArray(successorSprites))
    throw new Error('R13 confirm: sprites snapshot 无效')
  const parentSpriteIds = new Set(
    parentSprites.map((sprite) => String((sprite as { id?: unknown }).id)),
  )
  const materializedSpriteIds = successorSprites
    .map((sprite) => String((sprite as { id?: unknown }).id))
    .filter((id) => !parentSpriteIds.has(id))
    .sort()
  if (
    stableJson(materializedSpriteIds) !== stableJson(evidence.materializedSpriteIds) ||
    (evidence.materializedSpriteIds.length === 0 &&
      stableJson(parentSprites) !== stableJson(successorSprites))
  )
    throw new Error('R13 confirm: sprite materialization snapshot 差分漂移')
  assertR13ConfirmPhysicalSelectorsBacked(successorSnapshot, evidence, {
    immutableAuthority: true,
  })
  assertR13ConfirmRecoveredStatesBacked(successorSnapshot, evidence, {
    immutableAuthority: true,
  })
}

/**
 * 后续 append-only pass 与作者 merge 可以修改无关 scene/locale/sprite 或 command body；
 * R13-4 只继续拥有其 31 个 selector、分支 transition、6 个 recovered state transition
 * 与 19 条 source locale 值。
 */
export function assertR13ConfirmFinalTargetClosure(
  snapshot: MigrationSnapshot,
  evidence: R13ConfirmControlFlowEvidenceV1,
): void {
  assertR13ConfirmControlFlowEvidence(evidence)
  if (
    localeTargetDigest(snapshot, evidence.materializedLocaleIds) !==
    evidence.materializedLocaleDigest
  )
    throw new Error('R13 confirm: final locale target 漂移')
  assertR13ConfirmPhysicalSelectorsBacked(snapshot, evidence, {
    immutableAuthority: false,
  })
  assertR13ConfirmRecoveredStatesBacked(snapshot, evidence, {
    immutableAuthority: false,
  })
}
