import { checkActorConditionCommandShape } from './actor-condition.js'
import type { AssetId } from './asset.js'
import { checkBattleChoreography } from './battle-choreography.js'
import type { CommandValidationOptions } from './command-validation-options.js'
import type { GridPos } from './grid.js'
import type { Facing } from './index.js'
import type { Command as RuntimeCommandBase, SceneReveal, SceneSpawn, WalkSpeed } from './script.js'
import { SCENE_ENTRY_PREPARE_SAFETY } from './script.js'
import type { SpriteActionBinding } from './sprite.js'

export type PageId = string
export type BehaviorId = string
export type StageId = string
export type LoopId = string
export type HookId = string
export type ScriptId = string

export interface EntityAddress {
  scene: string
  entity: string
}

export type Selection<T> = { kind: 'inherit' } | { kind: 'disabled' } | { kind: 'use'; value: T }

export type PageSelection = { kind: 'inherit' } | { kind: 'use'; value: PageId }

export interface TriggerActivation {
  on: 'interact' | 'touch'
  range?: number
}

export type FlowCursor = { kind: 'stage'; stage: StageId } | { kind: 'completed' }

export type StepExit = { kind: 'stay' } | { kind: 'stage'; stage: StageId } | { kind: 'complete' }

export interface BehaviorCursor {
  behavior: BehaviorId
  at: FlowCursor
  /** Engine-only continuation within an automatic flow; not an authored step/state. */
  resume?: AutoScriptContinuation
}

export type AutoCommandControl =
  | { kind: 'branch'; arm: 'then' | 'else' }
  | { kind: 'loop'; phase: 'body' | 'test' }
  | { kind: 'repeat'; iteration: number }
  | { kind: 'confirm'; arm: 'onYes' | 'onNo' }
  | { kind: 'startBattle'; arm: 'onLose' | 'onFlee' | 'none' }
  | { kind: 'teleportOut'; failed: boolean }
  | { kind: 'leaf'; command: 'stepEntity' | 'chasePlayer'; phase: 'continuation' | 'done' }

export interface AutoCommandFrame {
  /** Execution ordinal in the exact content digest, never an entity/behavior identity. */
  index: number
  control?: AutoCommandControl
}

export interface AutoScriptContinuation {
  digest: string
  frames: AutoCommandFrame[]
}

export interface ActiveBehaviorSlot {
  selection?: Exclude<Selection<BehaviorId>, { kind: 'inherit' }>
  cursor?: BehaviorCursor
}

export interface WorldEntityBehaviorState {
  page?: PageId
  trigger?: ActiveBehaviorSlot
  auto?: ActiveBehaviorSlot
  triggerActivation?: Exclude<Selection<TriggerActivation>, { kind: 'inherit' }>
}

export interface WorldSceneHookSlot {
  selection?: Exclude<Selection<HookId>, { kind: 'inherit' }>
  cursor?: { hook: HookId; at: FlowCursor }
}

export type WorldSceneHookState = Partial<Record<'onEnter' | 'onTeleport', WorldSceneHookSlot>>

export interface WorldBehaviorState {
  entities?: Record<string, Record<string, WorldEntityBehaviorState>>
  scenes?: Record<string, WorldSceneHookState>
}

export interface WorldScriptState {
  flags: Record<string, boolean>
  vars: Record<string, number>
  entityState: Record<string, Record<string, number>>
  entityPos?: Record<string, Record<string, GridPos>>
  entityLayer?: Record<string, Record<string, number>>
  behaviors: WorldBehaviorState
  followers?: string[]
  mapOverride?: Record<string, string>
}

export function emptyWorldScriptState(): WorldScriptState {
  return {
    flags: {},
    vars: {},
    entityState: {},
    behaviors: {},
  }
}

export type AuthorCondition =
  | { kind: 'flag'; flag: string; is: boolean }
  | { kind: 'var'; var: string; op: '==' | '!=' | '>=' | '<=' | '>' | '<'; value: number }
  | { kind: 'currentScene'; scene: string }
  | { kind: 'entityState'; target: EntityAddress; is: number }
  | { kind: 'entityInScene'; target: EntityAddress }
  | { kind: 'entitiesNear'; from: EntityAddress; to: EntityAddress; range: number }
  | { kind: 'facingEntity'; target: EntityAddress; range?: number }
  | { kind: 'chance'; percent: number }
  | { kind: 'hasItem'; itemId: string; atLeast?: number }
  | { kind: 'ownsItem'; itemId: string; atLeast?: number }
  | { kind: 'itemEquipped'; itemId: string; atLeast?: number }
  | { kind: 'allFullHp' }
  | { kind: 'hasMoney'; atLeast: number }
  | { kind: 'inParty'; actorId: string }
  | { kind: 'all'; of: AuthorCondition[] }
  | { kind: 'any'; of: AuthorCondition[] }
  | { kind: 'not'; cond: AuthorCondition }

export const AUTHOR_CONDITION_KINDS = {
  flag: true,
  var: true,
  currentScene: true,
  entityState: true,
  entityInScene: true,
  entitiesNear: true,
  facingEntity: true,
  chance: true,
  hasItem: true,
  ownsItem: true,
  itemEquipped: true,
  allFullHp: true,
  hasMoney: true,
  inParty: true,
  all: true,
  any: true,
  not: true,
} satisfies Record<AuthorCondition['kind'], true>

type ReplacedAuthorCommandKind =
  | 'animEntity'
  | 'branch'
  | 'callScript'
  | 'confirm'
  | 'returnScript'
  | 'jumpScript'
  | 'mountParty'
  | 'moveEntity'
  | 'nudgeEntity'
  | 'playEntityAction'
  | 'releaseEntity'
  | 'ride'
  | 'setEntityAuto'
  | 'setEntityFacing'
  | 'setEntityFrame'
  | 'setEntityLayer'
  | 'setEntityPos'
  | 'setEntityPosRelParty'
  | 'setEntityState'
  | 'setEntityTrigger'
  | 'setEntityTriggerMode'
  | 'setMultiEntityState'
  | 'setSceneOnEnter'
  | 'setSceneOnTeleport'
  | 'clearSceneScripts'
  | 'startBattle'
  | 'stepEntity'
  | 'stopEntityAction'
  | 'takeEntity'
  | 'teleportOut'
  | 'vanishEntity'

type AuthorLeafCommand = Exclude<RuntimeCommandBase, { kind: ReplacedAuthorCommandKind }>

export type BaseAuthorCommand =
  | AuthorLeafCommand
  | { kind: 'vanishEntity'; target?: EntityAddress; seconds?: number }
  | { kind: 'setEntityState'; target: EntityAddress; state: number }
  | { kind: 'setMultiEntityState'; targets: EntityAddress[]; state: number }
  | { kind: 'setEntityPos'; target: EntityAddress; pos: GridPos }
  | { kind: 'setEntityPosRelParty'; target: EntityAddress; dcol: number; drow: number }
  | { kind: 'setEntityLayer'; target: EntityAddress; layer: number }
  | { kind: 'setEntityFacing'; target: EntityAddress; facing: Facing }
  | { kind: 'setEntityFrame'; target: EntityAddress; frame: number }
  | {
      kind: 'playEntityAction'
      target: EntityAddress
      sprite: string
      action: string
      loop: boolean
      startAtMs?: number
      wait?: boolean
    }
  | { kind: 'stopEntityAction'; target: EntityAddress; reset: boolean }
  | { kind: 'moveEntity'; target: EntityAddress; to: GridPos; speed: WalkSpeed }
  | { kind: 'stepEntity'; target: EntityAddress; dir: Facing }
  | { kind: 'animEntity'; target: EntityAddress }
  | { kind: 'nudgeEntity'; target: EntityAddress; dx: number; dy: number }
  | { kind: 'takeEntity'; target: EntityAddress }
  | { kind: 'releaseEntity'; target?: EntityAddress }
  | {
      kind: 'mountParty'
      target: EntityAddress
      dx?: number
      dy?: number
      riders?: Array<{ target: EntityAddress; dx?: number; dy?: number }>
    }
  | { kind: 'ride'; target: EntityAddress; to: GridPos; speed: WalkSpeed }
  | {
      kind: 'startBattle'
      enemyTeamId: string
      onLose?: BaseAuthorCommand[]
      onFlee?: BaseAuthorCommand[]
      auto?: boolean
      boss?: boolean
      fieldId?: number
      music?: AssetId | null
      choreography?: import('./enemy.js').BattleChoreography[]
    }
  | { kind: 'teleportOut'; onFail?: BaseAuthorCommand[] }
  | { kind: 'confirm'; onYes: BaseAuthorCommand[]; onNo: BaseAuthorCommand[] }
  | { kind: 'finishStep'; next: StepExit }
  | { kind: 'returnScript' }
  | { kind: 'breakLoop' }
  | { kind: 'continueLoop'; loop?: LoopId }
  | { kind: 'repeat'; id?: LoopId; label?: string; count: number; body: BaseAuthorCommand[] }
  | { kind: 'branch'; cond: AuthorCondition; then: BaseAuthorCommand[]; else?: BaseAuthorCommand[] }
  | {
      kind: 'loop'
      id?: LoopId
      label?: string
      mode: 'while' | 'until'
      cond: AuthorCondition
      body: BaseAuthorCommand[]
    }
  | { kind: 'loop'; id?: LoopId; label?: string; mode: 'forever'; body: BaseAuthorCommand[] }
  | {
      kind: 'selectEntityBehavior'
      target: EntityAddress
      channel: 'trigger' | 'auto'
      selection: Selection<BehaviorId>
    }
  | {
      kind: 'selectEntityPage'
      target: EntityAddress
      selection: PageSelection
    }
  | {
      kind: 'setEntityTriggerActivation'
      target: EntityAddress
      selection: Selection<TriggerActivation>
    }
  | {
      kind: 'selectSceneHooks'
      scene: string
      selection: Partial<Record<'onEnter' | 'onTeleport', Selection<HookId>>>
    }
  | { kind: 'callScript'; script: ScriptId; self?: EntityAddress }
  | { kind: 'runEntityTrigger'; target: EntityAddress }

/**
 * Canonical author command vocabulary. The runtime command table supplies the retained leaf kinds while
 * retired control/binding kinds are explicitly disabled and current author structural commands are added.
 */
const RETAINED_RUNTIME_COMMAND_KINDS = Object.fromEntries(
  Object.keys(SCENE_ENTRY_PREPARE_SAFETY).map((kind) => [kind, true] as const),
) as Record<RuntimeCommandBase['kind'], true>

const AUTHOR_ONLY_COMMAND_KINDS = {
  loop: true,
  repeat: true,
  finishStep: true,
  breakLoop: true,
  continueLoop: true,
  runEntityTrigger: true,
  selectEntityBehavior: true,
  selectEntityPage: true,
  setEntityTriggerActivation: true,
  selectSceneHooks: true,
} satisfies Record<Exclude<BaseAuthorCommand['kind'], RuntimeCommandBase['kind']>, true>

const AUTHOR_COMMAND_KIND_TABLE = {
  ...RETAINED_RUNTIME_COMMAND_KINDS,
  jumpScript: false,
  setEntityAuto: false,
  setEntityTrigger: false,
  setEntityTriggerMode: false,
  setSceneOnEnter: false,
  setSceneOnTeleport: false,
  clearSceneScripts: false,
  ...AUTHOR_ONLY_COMMAND_KINDS,
} satisfies Record<BaseAuthorCommand['kind'], boolean> & Record<string, boolean>

export const BASE_AUTHOR_COMMAND_KINDS: Readonly<Record<string, boolean>> =
  AUTHOR_COMMAND_KIND_TABLE

export interface BaseSceneEntryPresentation {
  prepare: BaseAuthorCommand[]
  reveal: SceneReveal
}

export type StageNext = StageId | { kind: 'complete' }

export interface BaseAuthorStage {
  id: StageId
  /** Optional author-facing purpose; identity and execution always use id. */
  label?: string
  entry?: BaseSceneEntryPresentation
  body: BaseAuthorCommand[]
  next?: StageNext
}

export type BaseScriptFlow = {
  kind: 'stages'
  initial: StageId
  stages: BaseAuthorStage[]
}

/** Completion may be selected inside a branch as well as at the natural end of a step. */
export function flowCanComplete(flow: {
  kind: 'stages'
  stages: readonly { next?: StageNext; body?: readonly unknown[] }[]
}): boolean {
  const hasCompletion = (commands: readonly unknown[]): boolean =>
    commands.some((command) => {
      if (!command || typeof command !== 'object') return false
      if (
        'kind' in command &&
        command.kind === 'finishStep' &&
        'next' in command &&
        command.next &&
        typeof command.next === 'object' &&
        'kind' in command.next &&
        command.next.kind === 'complete'
      )
        return true
      for (const key of ['body', 'then', 'else', 'onYes', 'onNo', 'onLose', 'onFlee', 'onFail'])
        if (
          key in command &&
          Array.isArray(Reflect.get(command, key)) &&
          hasCompletion(Reflect.get(command, key))
        )
          return true
      return false
    })
  return flow.stages.some(
    (stage) =>
      (typeof stage.next === 'object' && stage.next.kind === 'complete') ||
      hasCompletion(stage.body ?? []),
  )
}

export interface BaseEntityBehavior {
  label: string
  order: number
  flow: BaseScriptFlow
}

export interface BaseEntityBehaviors {
  trigger?: Record<BehaviorId, BaseEntityBehavior>
  auto?: Record<BehaviorId, BaseEntityBehavior>
}

export interface BaseEntityPage {
  id: PageId
  label: string
  trigger?: BehaviorId
  auto?: BehaviorId
  triggerActivation?: TriggerActivation
  animation?: SpriteActionBinding
}

export interface BaseSceneHook {
  label: string
  order: number
  flow: BaseScriptFlow
}

export interface BaseSceneHookChannel {
  initial?: HookId
  variants: Record<HookId, BaseSceneHook>
}

export type BaseSceneHooks = Partial<Record<'onEnter' | 'onTeleport', BaseSceneHookChannel>>

export interface BaseSharedScript {
  name: string
  description?: string
  self: 'none' | 'optional' | 'required'
  body: BaseAuthorCommand[]
}

export type BaseScriptLibrary = Record<ScriptId, BaseSharedScript>

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0)
    throw new Error(`${path}: 期望非空字符串`)
  return value
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const set = new Set(allowed)
  for (const key of Object.keys(value))
    if (!set.has(key)) throw new Error(`${path}.${key}: 未知字段`)
}

export function checkEntityAddress(value: unknown, path: string): asserts value is EntityAddress {
  const address = record(value, path)
  exactKeys(address, ['scene', 'entity'], path)
  nonEmptyString(address.scene, `${path}.scene`)
  nonEmptyString(address.entity, `${path}.entity`)
}

function checkSelection(
  value: unknown,
  path: string,
  checkValue: (value: unknown, path: string) => void,
  allowDisabled = true,
): void {
  const selection = record(value, path)
  const kind = selection.kind
  if (kind === 'inherit' || (allowDisabled && kind === 'disabled')) {
    exactKeys(selection, ['kind'], path)
    return
  }
  if (kind !== 'use')
    throw new Error(`${path}.kind: 期望 ${allowDisabled ? 'inherit|disabled|use' : 'inherit|use'}`)
  exactKeys(selection, ['kind', 'value'], path)
  checkValue(selection.value, `${path}.value`)
}

function checkTriggerActivation(value: unknown, path: string): void {
  const activation = record(value, path)
  exactKeys(activation, ['on', 'range'], path)
  if (activation.on !== 'interact' && activation.on !== 'touch')
    throw new Error(`${path}.on: 期望 interact|touch`)
  if (
    activation.range !== undefined &&
    (!Number.isFinite(activation.range) || Number(activation.range) < 0)
  )
    throw new Error(`${path}.range: 期望非负有限数`)
}

function checkCondition(value: unknown, path: string): void {
  const condition = record(value, path)
  const kind = nonEmptyString(condition.kind, `${path}.kind`)
  if (!Object.hasOwn(AUTHOR_CONDITION_KINDS, kind))
    throw new Error(`${path}.kind: 未知作者条件 ${kind}`)
  switch (kind as AuthorCondition['kind']) {
    case 'flag':
      exactKeys(condition, ['kind', 'flag', 'is'], path)
      nonEmptyString(condition.flag, `${path}.flag`)
      if (typeof condition.is !== 'boolean') throw new Error(`${path}.is: 期望 boolean`)
      return
    case 'var':
      exactKeys(condition, ['kind', 'var', 'op', 'value'], path)
      nonEmptyString(condition.var, `${path}.var`)
      if (!['==', '!=', '>=', '<=', '>', '<'].includes(String(condition.op)))
        throw new Error(`${path}.op: 期望 ==|!=|>=|<=|>|<`)
      if (!Number.isFinite(condition.value)) throw new Error(`${path}.value: 期望有限数`)
      return
    case 'currentScene':
      exactKeys(condition, ['kind', 'scene'], path)
      nonEmptyString(condition.scene, `${path}.scene`)
      return
    case 'entityState':
      exactKeys(condition, ['kind', 'target', 'is'], path)
      if ('entity' in condition) throw new Error(`${path}.entity: 当前作者态禁止裸实体 id`)
      checkEntityAddress(condition.target, `${path}.target`)
      if (!Number.isFinite(condition.is)) throw new Error(`${path}.is: 期望有限数`)
      return
    case 'entityInScene':
      exactKeys(condition, ['kind', 'target'], path)
      if ('entity' in condition) throw new Error(`${path}.entity: 当前作者态禁止裸实体 id`)
      checkEntityAddress(condition.target, `${path}.target`)
      return
    case 'facingEntity':
      exactKeys(condition, ['kind', 'target', 'range'], path)
      if ('entity' in condition) throw new Error(`${path}.entity: 当前作者态禁止裸实体 id`)
      checkEntityAddress(condition.target, `${path}.target`)
      if (
        condition.range !== undefined &&
        (!Number.isFinite(condition.range) || Number(condition.range) < 0)
      )
        throw new Error(`${path}.range: 期望非负有限数`)
      return
    case 'entitiesNear':
      exactKeys(condition, ['kind', 'from', 'to', 'range'], path)
      checkEntityAddress(condition.from, `${path}.from`)
      checkEntityAddress(condition.to, `${path}.to`)
      if (!Number.isFinite(condition.range) || Number(condition.range) < 0)
        throw new Error(`${path}.range: 期望非负有限数`)
      return
    case 'chance':
      exactKeys(condition, ['kind', 'percent'], path)
      if (
        !Number.isFinite(condition.percent) ||
        Number(condition.percent) < 0 ||
        Number(condition.percent) > 100
      )
        throw new Error(`${path}.percent: 期望 0..100 有限数`)
      return
    case 'hasItem':
    case 'ownsItem':
    case 'itemEquipped':
      exactKeys(condition, ['kind', 'itemId', 'atLeast'], path)
      nonEmptyString(condition.itemId, `${path}.itemId`)
      if (
        condition.atLeast !== undefined &&
        (!Number.isInteger(condition.atLeast) || Number(condition.atLeast) <= 0)
      )
        throw new Error(`${path}.atLeast: 期望正整数`)
      return
    case 'allFullHp':
      exactKeys(condition, ['kind'], path)
      return
    case 'hasMoney':
      exactKeys(condition, ['kind', 'atLeast'], path)
      if (!Number.isSafeInteger(condition.atLeast) || Number(condition.atLeast) < 0)
        throw new Error(`${path}.atLeast: 期望非负安全整数`)
      return
    case 'inParty':
      exactKeys(condition, ['kind', 'actorId'], path)
      nonEmptyString(condition.actorId, `${path}.actorId`)
      return
    case 'all':
    case 'any':
      exactKeys(condition, ['kind', 'of'], path)
      if (!Array.isArray(condition.of)) throw new Error(`${path}.of: 期望条件数组`)
      condition.of.forEach((entry, index) => {
        checkCondition(entry, `${path}.of[${index}]`)
      })
      return
    case 'not':
      exactKeys(condition, ['kind', 'cond'], path)
      checkCondition(condition.cond, `${path}.cond`)
      return
  }
}

/** 受限 runtime context 可复用的 canonical 条件严格 guard。 */
export function checkAuthorCondition(
  value: unknown,
  path: string,
): asserts value is AuthorCondition {
  checkCondition(value, path)
}

const RETIRED_CONTROL_KINDS = new Set([
  'jumpScript',
  'setEntityAuto',
  'setEntityTrigger',
  'setEntityTriggerMode',
  'setSceneOnEnter',
  'setSceneOnTeleport',
  'clearSceneScripts',
])

const ENTITY_TARGET_KINDS = new Set([
  'animEntity',
  'mountParty',
  'moveEntity',
  'nudgeEntity',
  'playEntityAction',
  'ride',
  'setEntityFacing',
  'setEntityFrame',
  'setEntityLayer',
  'setEntityPos',
  'setEntityPosRelParty',
  'setEntityState',
  'stepEntity',
  'stopEntityAction',
  'takeEntity',
])

export type { CommandValidationOptions } from './command-validation-options.js'

function checkFacing(value: unknown, path: string): void {
  if (value !== 'up' && value !== 'down' && value !== 'left' && value !== 'right')
    throw new Error(`${path}: 期望 up/down/left/right`)
}

function checkGridPos(value: unknown, path: string): void {
  const pos = record(value, path)
  exactKeys(pos, ['col', 'row', 'height'], path)
  for (const key of ['col', 'row', 'height'] as const)
    if (typeof pos[key] !== 'number' || !Number.isFinite(pos[key]))
      throw new Error(`${path}.${key}: 期望有限数`)
}

function checkSceneTransition(value: unknown, path: string): void {
  const transition = record(value, path)
  const kind = transition.kind
  if (kind === 'modern') {
    exactKeys(transition, ['kind', 'outMs', 'inMs', 'color'], path)
    if (transition.outMs !== 260 || transition.inMs !== 260 || transition.color !== 'black')
      throw new Error(`${path}: modern 必须是 260/260 black`)
    return
  }
  if (kind === 'source') {
    exactKeys(transition, ['kind', 'outMs', 'inMs', 'color', 'evidenceId'], path)
    for (const key of ['outMs', 'inMs'] as const)
      if (
        typeof transition[key] !== 'number' ||
        !Number.isFinite(transition[key]) ||
        Number(transition[key]) < 0
      )
        throw new Error(`${path}.${key}: 期望非负有限数`)
    if (transition.color !== 'black') throw new Error(`${path}.color: 只支持 black`)
    nonEmptyString(transition.evidenceId, `${path}.evidenceId`)
    return
  }
  throw new Error(`${path}.kind: 未知过渡类型`)
}

export function checkBaseAuthorCommands(
  value: unknown,
  path: string,
  providedOptions: CommandValidationOptions = {},
): asserts value is BaseAuthorCommand[] {
  if (!Array.isArray(value)) throw new Error(`${path}: 期望 BaseAuthorCommand[]`)
  const options = { ...providedOptions, loopAncestors: providedOptions.loopAncestors ?? [] }
  if (!providedOptions.loopAncestors) {
    const ids = new Set<string>()
    const collect = (commands: unknown[]) => {
      for (const value of commands) {
        if (!value || typeof value !== 'object') continue
        const node = value as Record<string, unknown>
        if ((node.kind === 'loop' || node.kind === 'repeat') && node.id !== undefined) {
          const id = nonEmptyString(node.id, `${path}.loop.id`)
          if (ids.has(id)) throw new Error(`${path}: 同一命令根重复循环 id ${id}`)
          ids.add(id)
        }
        for (const key of ['body', 'then', 'else', 'onYes', 'onNo', 'onLose', 'onFlee', 'onFail'])
          if (Array.isArray(node[key])) collect(node[key])
      }
    }
    collect(value)
  }
  value.forEach((entry, index) => {
    const command = record(entry, `${path}[${index}]`)
    const commandPath = `${path}[${index}]`
    const kind = nonEmptyString(command.kind, `${commandPath}.kind`)
    if (options.checkExtensionCommand?.(command, commandPath)) return
    const commandKinds = options.commandKinds ?? BASE_AUTHOR_COMMAND_KINDS
    if (commandKinds[kind] !== true)
      throw new Error(
        `${commandPath}.kind: 未知或已退役的 ${options.dialectLabel ?? 'author'} 命令 ${kind}`,
      )
    if (RETIRED_CONTROL_KINDS.has(kind))
      throw new Error(`${commandPath}.kind: 当前作者态已退役命令 ${kind}`)
    if (kind === 'applyActorCondition' || kind === 'clearActorCondition')
      checkActorConditionCommandShape(command, commandPath)
    if (kind === 'loadScene' && options.forbidLoadScene)
      throw new Error(`${commandPath}: auto 行为禁止 loadScene`)
    if (kind === 'playFrameAnimation') {
      exactKeys(
        command,
        [
          'kind',
          'asset',
          'startFrame',
          'endFrame',
          'frameRate',
          'holdLastFrame',
          'initialFadeInMs',
        ],
        commandPath,
      )
      if (command.holdLastFrame !== undefined && typeof command.holdLastFrame !== 'boolean')
        throw new Error(`${commandPath}.holdLastFrame: 期望 boolean`)
      if (
        command.initialFadeInMs !== undefined &&
        (!Number.isFinite(command.initialFadeInMs) || Number(command.initialFadeInMs) < 0)
      )
        throw new Error(`${commandPath}.initialFadeInMs: 期望非负有限数`)
    }
    if (kind === 'clearFrameAnimation') exactKeys(command, ['kind'], commandPath)
    if (kind === 'runEntityTrigger') {
      exactKeys(command, ['kind', 'target'], commandPath)
      checkEntityAddress(command.target, `${commandPath}.target`)
      if (options.forbidRunEntityTrigger)
        throw new Error(
          `${commandPath}: ${options.forbidRunEntityTrigger} 禁止 runEntityTrigger，仅允许 interactive`,
        )
    }
    if (kind === 'loadScene') {
      exactKeys(command, ['kind', 'scene', 'entryId', 'pos', 'facing', 'transition'], commandPath)
      nonEmptyString(command.scene, `${commandPath}.scene`)
      if (command.entryId !== undefined) nonEmptyString(command.entryId, `${commandPath}.entryId`)
      if (command.entryId !== undefined && command.pos !== undefined)
        throw new Error(`${commandPath}: entryId 与 pos 不能同时存在`)
      if (command.pos !== undefined) checkGridPos(command.pos, `${commandPath}.pos`)
      if (command.facing !== undefined) checkFacing(command.facing, `${commandPath}.facing`)
      if (command.transition !== undefined)
        checkSceneTransition(command.transition, `${commandPath}.transition`)
    }
    if (kind === 'holdScreen') {
      exactKeys(command, ['kind', 'color', 'token'], commandPath)
      if (command.color !== 'black') throw new Error(`${commandPath}.color: 只支持 black`)
      nonEmptyString(command.token, `${commandPath}.token`)
    }
    if (kind === 'revealScreen') {
      exactKeys(command, ['kind', 'token'], commandPath)
      nonEmptyString(command.token, `${commandPath}.token`)
    }
    if (kind === 'dialog') options.checkDialogueCue?.(command.cue, `${commandPath}.cue`)
    if (kind === 'mountParty' && command.riders !== undefined) {
      checkEntityAddress(command.target, `${commandPath}.target`)
      if (!Array.isArray(command.riders)) throw new Error(`${commandPath}.riders: 期望数组`)
      const seen = new Set([`${command.target.scene}/${command.target.entity}`])
      for (const [index, value] of command.riders.entries()) {
        const path = `${commandPath}.riders[${index}]`
        const rider = record(value, path)
        exactKeys(rider, ['target', 'dx', 'dy'], path)
        checkEntityAddress(rider.target, `${path}.target`)
        if (rider.target.scene !== command.target.scene)
          throw new Error(`${path}.target: 搭乘实体必须与载具同场景`)
        const key = `${rider.target.scene}/${rider.target.entity}`
        if (seen.has(key)) throw new Error(`${path}.target: 重复搭乘实体或载具自身`)
        seen.add(key)
        if (rider.dx !== undefined && !Number.isFinite(rider.dx))
          throw new Error(`${path}.dx: 期望有限数`)
        if (rider.dy !== undefined && !Number.isFinite(rider.dy))
          throw new Error(`${path}.dy: 期望有限数`)
      }
    }
    if (ENTITY_TARGET_KINDS.has(kind)) {
      if ('entity' in command) throw new Error(`${commandPath}.entity: 当前作者态禁止裸实体 id`)
      checkEntityAddress(command.target, `${commandPath}.target`)
    }
    if (kind === 'vanishEntity' || kind === 'releaseEntity') {
      if ('entity' in command) throw new Error(`${commandPath}.entity: 当前作者态禁止裸实体 id`)
      if (command.target !== undefined) checkEntityAddress(command.target, `${commandPath}.target`)
    }
    if (kind === 'setMultiEntityState') {
      if ('entities' in command) throw new Error(`${commandPath}.entities: 当前作者态禁止裸实体 id`)
      if (!Array.isArray(command.targets) || command.targets.length === 0)
        throw new Error(`${commandPath}.targets: 期望非空 EntityAddress[]`)
      command.targets.forEach((target, targetIndex) => {
        checkEntityAddress(target, `${commandPath}.targets[${targetIndex}]`)
      })
    }
    if (kind === 'branch') {
      checkCondition(command.cond, `${commandPath}.cond`)
      checkBaseAuthorCommands(command.then, `${commandPath}.then`, options)
      if (command.else !== undefined)
        checkBaseAuthorCommands(command.else, `${commandPath}.else`, options)
    }
    if (kind === 'finishStep') {
      exactKeys(command, ['kind', 'next'], commandPath)
      if (options.rootScope !== 'flow') throw new Error(`${commandPath}: finishStep 仅允许步骤正文`)
      const next = record(command.next, `${commandPath}.next`)
      if (next.kind === 'stage') {
        exactKeys(next, ['kind', 'stage'], `${commandPath}.next`)
        const target = nonEmptyString(next.stage, `${commandPath}.next.stage`)
        if (!options.stageIds?.has(target))
          throw new Error(`${commandPath}.next.stage: 未命中 stage ${target}`)
      } else {
        exactKeys(next, ['kind'], `${commandPath}.next`)
        if (next.kind !== 'stay' && next.kind !== 'complete')
          throw new Error(`${commandPath}.next.kind: 期望 stay|stage|complete`)
      }
    }
    if (kind === 'returnScript') {
      exactKeys(command, ['kind'], commandPath)
      if ((options.rootScope ?? 'script') !== 'script')
        throw new Error(`${commandPath}: returnScript 仅允许独立脚本根`)
    }
    if (kind === 'breakLoop') {
      exactKeys(command, ['kind'], commandPath)
      if (!(options.loopDepth && options.loopDepth > 0))
        throw new Error(`${commandPath}: breakLoop 需要同一命令根内的循环`)
    }
    if (kind === 'continueLoop') {
      exactKeys(command, ['kind', 'loop'], commandPath)
      if (options.loopAncestors.length === 0)
        throw new Error(`${commandPath}: continueLoop 需要词法循环祖先`)
      if (command.loop !== undefined) {
        const target = nonEmptyString(command.loop, `${commandPath}.loop`)
        if (!options.loopAncestors.includes(target))
          throw new Error(`${commandPath}.loop: 不是同根词法祖先 ${target}`)
      }
    }
    if (kind === 'loop' || kind === 'repeat') {
      if (command.id !== undefined) nonEmptyString(command.id, `${commandPath}.id`)
      if (command.label !== undefined) nonEmptyString(command.label, `${commandPath}.label`)
      if (options.rootScope === 'prepare') throw new Error(`${commandPath}: prepare 禁止循环`)
      if (kind === 'repeat') {
        exactKeys(command, ['kind', 'id', 'label', 'count', 'body'], commandPath)
        if (!Number.isSafeInteger(command.count) || Number(command.count) < 1)
          throw new Error(`${commandPath}.count: 期望正安全整数`)
      } else if (command.mode === 'forever') {
        exactKeys(command, ['kind', 'id', 'label', 'mode', 'body'], commandPath)
      } else {
        exactKeys(command, ['kind', 'id', 'label', 'mode', 'cond', 'body'], commandPath)
        if (command.mode !== 'while' && command.mode !== 'until')
          throw new Error(`${commandPath}.mode: 期望 while|until|forever`)
        checkCondition(command.cond, `${commandPath}.cond`)
      }
      checkBaseAuthorCommands(command.body, `${commandPath}.body`, {
        ...options,
        loopDepth: (options.loopDepth ?? 0) + 1,
        loopAncestors: [
          ...options.loopAncestors,
          typeof command.id === 'string' ? command.id : undefined,
        ],
      })
    }
    if (kind === 'startBattle') {
      exactKeys(
        command,
        [
          'kind',
          'enemyTeamId',
          'onLose',
          'onFlee',
          'auto',
          'boss',
          'fieldId',
          'music',
          'choreography',
        ],
        commandPath,
      )
      if (typeof command.enemyTeamId !== 'string' || command.enemyTeamId.length === 0)
        throw new Error(`${commandPath}.enemyTeamId: 期望非空字符串`)
      for (const key of ['auto', 'boss'] as const)
        if (command[key] !== undefined && typeof command[key] !== 'boolean')
          throw new Error(`${commandPath}.${key}: 期望 boolean`)
      if (
        command.fieldId !== undefined &&
        (!Number.isSafeInteger(command.fieldId) || Number(command.fieldId) < 0)
      )
        throw new Error(`${commandPath}.fieldId: 期望非负安全整数`)
      if (
        command.music !== undefined &&
        command.music !== null &&
        (typeof command.music !== 'string' || command.music.length === 0)
      )
        throw new Error(`${commandPath}.music: 期望非空 AssetId|null`)
      if (command.onLose !== undefined)
        checkBaseAuthorCommands(command.onLose, `${commandPath}.onLose`, options)
      if (command.onFlee !== undefined)
        checkBaseAuthorCommands(command.onFlee, `${commandPath}.onFlee`, options)
      if (command.choreography !== undefined)
        checkBattleChoreography(command.choreography, `${commandPath}.choreography`, options)
    }
    if (kind === 'openShop') {
      exactKeys(command, ['kind', 'shop', 'mode'], commandPath)
      if (!Number.isSafeInteger(command.shop) || Number(command.shop) < 0)
        throw new Error(`${commandPath}.shop: 期望非负安全整数`)
      if (command.mode !== 'buy' && command.mode !== 'sell')
        throw new Error(`${commandPath}.mode: 期望 buy|sell`)
    }
    if (kind === 'teleportOut' && command.onFail !== undefined)
      checkBaseAuthorCommands(command.onFail, `${commandPath}.onFail`, options)
    if (kind === 'confirm') {
      exactKeys(command, ['kind', 'onYes', 'onNo'], commandPath)
      checkBaseAuthorCommands(command.onYes, `${commandPath}.onYes`, options)
      checkBaseAuthorCommands(command.onNo, `${commandPath}.onNo`, options)
    }
    if (kind === 'callScript') {
      if ('ref' in command)
        throw new Error(`${commandPath}.ref: current callScript 只存稳定 script id`)
      nonEmptyString(command.script, `${commandPath}.script`)
      if (command.self !== undefined) checkEntityAddress(command.self, `${commandPath}.self`)
    }
    if (kind === 'selectEntityBehavior') {
      exactKeys(command, ['kind', 'target', 'channel', 'selection'], commandPath)
      checkEntityAddress(command.target, `${commandPath}.target`)
      if (command.channel !== 'trigger' && command.channel !== 'auto')
        throw new Error(`${commandPath}.channel: 期望 trigger|auto`)
      checkSelection(command.selection, `${commandPath}.selection`, nonEmptyString)
    }
    if (kind === 'selectEntityPage') {
      checkEntityAddress(command.target, `${commandPath}.target`)
      checkSelection(command.selection, `${commandPath}.selection`, nonEmptyString, false)
    }
    if (kind === 'setEntityTriggerActivation') {
      checkEntityAddress(command.target, `${commandPath}.target`)
      checkSelection(command.selection, `${commandPath}.selection`, checkTriggerActivation)
    }
    if (kind === 'selectSceneHooks') {
      nonEmptyString(command.scene, `${commandPath}.scene`)
      const selection = record(command.selection, `${commandPath}.selection`)
      exactKeys(selection, ['onEnter', 'onTeleport'], `${commandPath}.selection`)
      if (Object.keys(selection).length === 0)
        throw new Error(`${commandPath}.selection: 至少选择一个 hook 槽`)
      for (const slot of ['onEnter', 'onTeleport'] as const)
        if (selection[slot] !== undefined)
          checkSelection(selection[slot], `${commandPath}.selection.${slot}`, nonEmptyString)
    }
  })
}

function checkSceneEntry(value: unknown, path: string, options: CommandValidationOptions): void {
  const entry = record(value, path)
  exactKeys(entry, ['prepare', 'reveal'], path)
  checkBaseAuthorCommands(entry.prepare, `${path}.prepare`, {
    ...options,
    forbidRunEntityTrigger: 'prepare',
    rootScope: 'prepare',
    loopDepth: 0,
    loopAncestors: undefined,
  })
  const reveal = record(entry.reveal, `${path}.reveal`)
  if (reveal.kind !== 'dither' && reveal.kind !== 'fade' && reveal.kind !== 'cut')
    throw new Error(`${path}.reveal.kind: 期望 dither|fade|cut`)
}

export interface CheckBaseScriptFlowOptions extends CommandValidationOptions {
  allowSceneEntry?: boolean
}

export function checkBaseScriptFlow(
  value: unknown,
  path: string,
  options: CheckBaseScriptFlowOptions = {},
): asserts value is BaseScriptFlow {
  const flow = record(value, path)
  exactKeys(flow, ['kind', 'initial', 'stages'], path)
  if (flow.kind !== 'stages') throw new Error(`${path}.kind: 期望 stages`)
  const initial = nonEmptyString(flow.initial, `${path}.initial`)
  if (!Array.isArray(flow.stages) || flow.stages.length === 0)
    throw new Error(`${path}.stages: 期望非空数组`)
  const ids = new Set<string>()
  flow.stages.forEach((raw, index) => {
    const stage = record(raw, `${path}.stages[${index}]`)
    exactKeys(stage, ['id', 'label', 'entry', 'body', 'next'], `${path}.stages[${index}]`)
    const id = nonEmptyString(stage.id, `${path}.stages[${index}].id`)
    if (ids.has(id)) throw new Error(`${path}.stages[${index}].id: 重复 ${id}`)
    ids.add(id)
  })
  if (!ids.has(initial)) throw new Error(`${path}.initial: 未命中 stage ${initial}`)
  flow.stages.forEach((raw, index) => {
    const stage = record(raw, `${path}.stages[${index}]`)
    const stagePath = `${path}.stages[${index}]`
    if (stage.label !== undefined) nonEmptyString(stage.label, `${stagePath}.label`)
    if (stage.entry !== undefined) {
      if (!options.allowSceneEntry || stage.id !== initial)
        throw new Error(`${stagePath}.entry: 只允许 onEnter initial stage`)
      checkSceneEntry(stage.entry, `${stagePath}.entry`, options)
    }
    checkBaseAuthorCommands(stage.body, `${stagePath}.body`, {
      ...options,
      rootScope: 'flow',
      stageIds: ids,
      loopDepth: 0,
      loopAncestors: undefined,
    })
    const next = stage.next
    if (typeof next === 'object' && next !== null) {
      const completion = record(next, `${stagePath}.next`)
      exactKeys(completion, ['kind'], `${stagePath}.next`)
      if (completion.kind !== 'complete') throw new Error(`${stagePath}.next.kind: 期望 complete`)
    } else if (next !== undefined && (typeof next !== 'string' || !ids.has(next)))
      throw new Error(`${stagePath}.next: 未命中 stage ${String(next)}`)
  })
}

export function checkBaseEntityBehaviors(
  behaviorsValue: unknown,
  path: string,
  options: CommandValidationOptions = {},
): Record<'trigger' | 'auto', Set<string>> {
  const behaviors = behaviorsValue === undefined ? {} : record(behaviorsValue, `${path}.behaviors`)
  exactKeys(behaviors, ['trigger', 'auto'], `${path}.behaviors`)
  const behaviorIds: Record<'trigger' | 'auto', Set<string>> = {
    trigger: new Set(),
    auto: new Set(),
  }
  for (const channel of ['trigger', 'auto'] as const) {
    if (behaviors[channel] === undefined) continue
    const registry = record(behaviors[channel], `${path}.behaviors.${channel}`)
    for (const [id, raw] of Object.entries(registry)) {
      nonEmptyString(id, `${path}.behaviors.${channel} id`)
      const behavior = record(raw, `${path}.behaviors.${channel}.${id}`)
      exactKeys(behavior, ['label', 'order', 'flow'], `${path}.behaviors.${channel}.${id}`)
      nonEmptyString(behavior.label, `${path}.behaviors.${channel}.${id}.label`)
      if (!Number.isInteger(behavior.order) || Number(behavior.order) < 0)
        throw new Error(`${path}.behaviors.${channel}.${id}.order: 期望非负整数`)
      checkBaseScriptFlow(behavior.flow, `${path}.behaviors.${channel}.${id}.flow`, {
        ...options,
        forbidLoadScene: channel === 'auto',
        ...(channel === 'auto' ? { forbidRunEntityTrigger: 'auto' as const } : {}),
      })
      behaviorIds[channel].add(id)
    }
  }
  return behaviorIds
}

export function checkBaseEntityPages(
  pagesValue: unknown,
  behaviorsValue: unknown,
  initialPageValue: unknown,
  path: string,
  options: CommandValidationOptions = {},
): void {
  if (!Array.isArray(pagesValue) || pagesValue.length === 0)
    throw new Error(`${path}.pages: 期望非空数组`)
  const behaviorIds = checkBaseEntityBehaviors(behaviorsValue, path, options)
  const pageIds = new Set<string>()
  pagesValue.forEach((raw, index) => {
    const page = record(raw, `${path}.pages[${index}]`)
    exactKeys(
      page,
      ['id', 'label', 'trigger', 'auto', 'triggerActivation', 'animation'],
      `${path}.pages[${index}]`,
    )
    const id = nonEmptyString(page.id, `${path}.pages[${index}].id`)
    if (pageIds.has(id)) throw new Error(`${path}.pages[${index}].id: 重复 ${id}`)
    pageIds.add(id)
    nonEmptyString(page.label, `${path}.pages[${index}].label`)
    for (const channel of ['trigger', 'auto'] as const) {
      if (page[channel] === undefined) continue
      const behaviorId = nonEmptyString(page[channel], `${path}.pages[${index}].${channel}`)
      if (!behaviorIds[channel].has(behaviorId))
        throw new Error(`${path}.pages[${index}].${channel}: 未命中 behavior ${behaviorId}`)
    }
    if (page.triggerActivation !== undefined)
      checkTriggerActivation(page.triggerActivation, `${path}.pages[${index}].triggerActivation`)
  })
  const initialPage = nonEmptyString(initialPageValue, `${path}.initialPage`)
  if (!pageIds.has(initialPage)) throw new Error(`${path}.initialPage: 未命中 page ${initialPage}`)
}

export function checkBaseSceneHooks(
  value: unknown,
  path: string,
  options: CommandValidationOptions = {},
): void {
  if (value === undefined) return
  const hooks = record(value, path)
  exactKeys(hooks, ['onEnter', 'onTeleport'], path)
  for (const slot of ['onEnter', 'onTeleport'] as const) {
    if (hooks[slot] === undefined) continue
    const channel = record(hooks[slot], `${path}.${slot}`)
    exactKeys(channel, ['initial', 'variants'], `${path}.${slot}`)
    const variants = record(channel.variants, `${path}.${slot}.variants`)
    const ids = new Set(Object.keys(variants))
    if (ids.size === 0) throw new Error(`${path}.${slot}.variants: 不能为空`)
    if (channel.initial !== undefined) {
      const initial = nonEmptyString(channel.initial, `${path}.${slot}.initial`)
      if (!ids.has(initial)) throw new Error(`${path}.${slot}.initial: 未命中 hook ${initial}`)
    }
    for (const [id, raw] of Object.entries(variants)) {
      nonEmptyString(id, `${path}.${slot}.variants id`)
      const hook = record(raw, `${path}.${slot}.variants.${id}`)
      exactKeys(hook, ['label', 'order', 'flow'], `${path}.${slot}.variants.${id}`)
      nonEmptyString(hook.label, `${path}.${slot}.variants.${id}.label`)
      if (!Number.isInteger(hook.order) || Number(hook.order) < 0)
        throw new Error(`${path}.${slot}.variants.${id}.order: 期望非负整数`)
      checkBaseScriptFlow(hook.flow, `${path}.${slot}.variants.${id}.flow`, {
        ...options,
        allowSceneEntry: slot === 'onEnter',
      })
    }
  }
}

export function checkBaseScriptLibrary(
  value: unknown,
  path = 'content/shared-scripts.json',
  options: CommandValidationOptions = {},
): asserts value is BaseScriptLibrary {
  const library = record(value, path)
  for (const [id, raw] of Object.entries(library)) {
    nonEmptyString(id, `${path} script id`)
    const script = record(raw, `${path}.${id}`)
    exactKeys(script, ['name', 'description', 'self', 'body'], `${path}.${id}`)
    nonEmptyString(script.name, `${path}.${id}.name`)
    if (script.description !== undefined && typeof script.description !== 'string')
      throw new Error(`${path}.${id}.description: 期望 string`)
    if (script.self !== 'none' && script.self !== 'optional' && script.self !== 'required')
      throw new Error(`${path}.${id}.self: 期望 none|optional|required`)
    checkBaseAuthorCommands(script.body, `${path}.${id}.body`, {
      ...options,
      rootScope: 'script',
      loopDepth: 0,
      stageIds: undefined,
      loopAncestors: undefined,
    })
  }
}

function checkFlowCursor(value: unknown, path: string): void {
  const cursor = record(value, path)
  if (cursor.kind === 'completed') {
    exactKeys(cursor, ['kind'], path)
    return
  }
  if (cursor.kind === 'stage') {
    exactKeys(cursor, ['kind', 'stage'], path)
    nonEmptyString(cursor.stage, `${path}.stage`)
    return
  }
  throw new Error(`${path}.kind: 期望 stage|completed`)
}

function checkPersistedSelection(
  value: unknown,
  path: string,
  checkValue: (value: unknown, path: string) => void,
): void {
  const selection = record(value, path)
  if (selection.kind === 'disabled') {
    exactKeys(selection, ['kind'], path)
    return
  }
  if (selection.kind !== 'use') throw new Error(`${path}.kind: 持久覆写只允许 disabled|use`)
  exactKeys(selection, ['kind', 'value'], path)
  checkValue(selection.value, `${path}.value`)
}

export function checkAutoScriptContinuation(value: unknown, path = 'resume'): void {
  const resume = record(value, path)
  exactKeys(resume, ['digest', 'frames'], path)
  if (typeof resume.digest !== 'string' || !/^[a-f0-9]{64}$/.test(resume.digest))
    throw new Error(`${path}.digest: 期望小写 SHA-256`)
  if (!Array.isArray(resume.frames) || resume.frames.length === 0 || resume.frames.length > 256)
    throw new Error(`${path}.frames: 期望1..256个执行帧`)
  for (let i = 0; i < resume.frames.length; i++) {
    const p = `${path}.frames[${i}]`
    const frame = record(resume.frames[i], p)
    exactKeys(frame, ['index', 'control'], p)
    if (!Number.isSafeInteger(frame.index) || Number(frame.index) < 0)
      throw new Error(`${p}.index: 期望非负安全整数`)
    if (frame.control === undefined) continue
    const control = record(frame.control, `${p}.control`)
    const cp = `${p}.control`
    switch (control.kind) {
      case 'leaf':
        exactKeys(control, ['kind', 'command', 'phase'], cp)
        if (control.command !== 'stepEntity' && control.command !== 'chasePlayer')
          throw new Error(`${cp}.command: 非法自动单步命令`)
        if (control.phase !== 'continuation' && control.phase !== 'done')
          throw new Error(`${cp}.phase: 非法自动单步相位`)
        break
      case 'branch':
        exactKeys(control, ['kind', 'arm'], cp)
        if (control.arm !== 'then' && control.arm !== 'else') throw new Error(`${cp}.arm: 非法分支`)
        break
      case 'loop':
        exactKeys(control, ['kind', 'phase'], cp)
        if (control.phase !== 'body' && control.phase !== 'test')
          throw new Error(`${cp}.phase: 非法循环相位`)
        break
      case 'repeat':
        exactKeys(control, ['kind', 'iteration'], cp)
        if (!Number.isSafeInteger(control.iteration) || Number(control.iteration) < 1)
          throw new Error(`${cp}.iteration: 期望正安全整数`)
        break
      case 'confirm':
        exactKeys(control, ['kind', 'arm'], cp)
        if (control.arm !== 'onYes' && control.arm !== 'onNo')
          throw new Error(`${cp}.arm: 期望 onYes|onNo`)
        break
      case 'startBattle':
        exactKeys(control, ['kind', 'arm'], cp)
        if (control.arm !== 'onLose' && control.arm !== 'onFlee' && control.arm !== 'none')
          throw new Error(`${cp}.arm: 非法战斗结果分支`)
        break
      case 'teleportOut':
        exactKeys(control, ['kind', 'failed'], cp)
        if (typeof control.failed !== 'boolean') throw new Error(`${cp}.failed: 期望boolean`)
        break
      default:
        throw new Error(`${cp}.kind: 非法控制帧`)
    }
  }
}

function checkWorldEntityBehaviorSlot(value: unknown, path: string, allowResume: boolean): void {
  const slot = record(value, path)
  exactKeys(slot, ['selection', 'cursor'], path)
  if (slot.selection !== undefined)
    checkPersistedSelection(slot.selection, `${path}.selection`, (entry, entryPath) => {
      nonEmptyString(entry, entryPath)
    })
  if (slot.cursor !== undefined) {
    const cursor = record(slot.cursor, `${path}.cursor`)
    exactKeys(cursor, ['behavior', 'at', ...(allowResume ? ['resume'] : [])], `${path}.cursor`)
    nonEmptyString(cursor.behavior, `${path}.cursor.behavior`)
    checkFlowCursor(cursor.at, `${path}.cursor.at`)
    if (cursor.resume !== undefined) {
      if (record(cursor.at, `${path}.cursor.at`).kind === 'completed')
        throw new Error(`${path}.cursor.resume: completed不能有续跑帧`)
      checkAutoScriptContinuation(cursor.resume, `${path}.cursor.resume`)
    }
  }
}

function checkWorldSceneHookSlot(value: unknown, path: string): void {
  const slot = record(value, path)
  exactKeys(slot, ['selection', 'cursor'], path)
  if (slot.selection !== undefined)
    checkPersistedSelection(slot.selection, `${path}.selection`, (entry, entryPath) => {
      nonEmptyString(entry, entryPath)
    })
  if (slot.cursor !== undefined) {
    const cursor = record(slot.cursor, `${path}.cursor`)
    exactKeys(cursor, ['hook', 'at'], `${path}.cursor`)
    nonEmptyString(cursor.hook, `${path}.cursor.hook`)
    checkFlowCursor(cursor.at, `${path}.cursor.at`)
  }
}

function checkNestedNumberRecord(
  value: unknown,
  path: string,
  check: (value: unknown, path: string) => void,
): void {
  const scenes = record(value, path)
  for (const [sceneId, rawEntities] of Object.entries(scenes)) {
    nonEmptyString(sceneId, `${path} scene id`)
    const entities = record(rawEntities, `${path}.${sceneId}`)
    for (const [entityId, entry] of Object.entries(entities)) {
      nonEmptyString(entityId, `${path}.${sceneId} entity id`)
      check(entry, `${path}.${sceneId}.${entityId}`)
    }
  }
}

/**
 * SAVE11 的脚本世界态严格 guard。静态 inherit 不落盘；持久层只记录显式 disabled/use，
 * cursor 始终携带所属 behavior/hook，避免换槽后把旧位置串到新 flow。
 */
export function checkWorldScriptState(
  value: unknown,
  path = 'world.script',
): asserts value is WorldScriptState {
  const world = record(value, path)
  exactKeys(
    world,
    [
      'flags',
      'vars',
      'entityState',
      'entityPos',
      'entityLayer',
      'behaviors',
      'followers',
      'mapOverride',
    ],
    path,
  )
  const flags = record(world.flags, `${path}.flags`)
  for (const [id, entry] of Object.entries(flags)) {
    nonEmptyString(id, `${path}.flags id`)
    if (typeof entry !== 'boolean') throw new Error(`${path}.flags.${id}: 期望 boolean`)
  }
  const vars = record(world.vars, `${path}.vars`)
  for (const [id, entry] of Object.entries(vars)) {
    nonEmptyString(id, `${path}.vars id`)
    if (!Number.isFinite(entry)) throw new Error(`${path}.vars.${id}: 期望有限数`)
  }
  checkNestedNumberRecord(world.entityState, `${path}.entityState`, (entry, entryPath) => {
    if (!Number.isFinite(entry) || !Number.isInteger(entry))
      throw new Error(`${entryPath}: 期望有限整数`)
  })
  if (world.entityPos !== undefined)
    checkNestedNumberRecord(world.entityPos, `${path}.entityPos`, (entry, entryPath) => {
      const pos = record(entry, entryPath)
      exactKeys(pos, ['col', 'row', 'height'], entryPath)
      for (const axis of ['col', 'row', 'height'] as const)
        if (!Number.isFinite(pos[axis])) throw new Error(`${entryPath}.${axis}: 期望有限数`)
    })
  if (world.entityLayer !== undefined)
    checkNestedNumberRecord(world.entityLayer, `${path}.entityLayer`, (entry, entryPath) => {
      if (!Number.isFinite(entry) || !Number.isInteger(entry))
        throw new Error(`${entryPath}: 期望有限整数`)
    })

  const behaviors = record(world.behaviors, `${path}.behaviors`)
  exactKeys(behaviors, ['entities', 'scenes'], `${path}.behaviors`)
  if (behaviors.entities !== undefined) {
    const scenes = record(behaviors.entities, `${path}.behaviors.entities`)
    for (const [sceneId, rawEntities] of Object.entries(scenes)) {
      nonEmptyString(sceneId, `${path}.behaviors.entities scene id`)
      const entities = record(rawEntities, `${path}.behaviors.entities.${sceneId}`)
      for (const [entityId, rawEntity] of Object.entries(entities)) {
        nonEmptyString(entityId, `${path}.behaviors.entities.${sceneId} entity id`)
        const entityPath = `${path}.behaviors.entities.${sceneId}.${entityId}`
        const entity = record(rawEntity, entityPath)
        exactKeys(entity, ['page', 'trigger', 'auto', 'triggerActivation'], entityPath)
        if (entity.page !== undefined) nonEmptyString(entity.page, `${entityPath}.page`)
        for (const channel of ['trigger', 'auto'] as const)
          if (entity[channel] !== undefined)
            checkWorldEntityBehaviorSlot(
              entity[channel],
              `${entityPath}.${channel}`,
              channel === 'auto',
            )
        if (entity.triggerActivation !== undefined)
          checkPersistedSelection(
            entity.triggerActivation,
            `${entityPath}.triggerActivation`,
            checkTriggerActivation,
          )
      }
    }
  }
  if (behaviors.scenes !== undefined) {
    const scenes = record(behaviors.scenes, `${path}.behaviors.scenes`)
    for (const [sceneId, rawScene] of Object.entries(scenes)) {
      nonEmptyString(sceneId, `${path}.behaviors.scenes scene id`)
      const scenePath = `${path}.behaviors.scenes.${sceneId}`
      const scene = record(rawScene, scenePath)
      exactKeys(scene, ['onEnter', 'onTeleport'], scenePath)
      for (const hook of ['onEnter', 'onTeleport'] as const)
        if (scene[hook] !== undefined) checkWorldSceneHookSlot(scene[hook], `${scenePath}.${hook}`)
    }
  }
  if (world.followers !== undefined) {
    if (!Array.isArray(world.followers)) throw new Error(`${path}.followers: 期望 string[]`)
    world.followers.forEach((entry, index) => {
      nonEmptyString(entry, `${path}.followers[${index}]`)
    })
  }
  if (world.mapOverride !== undefined) {
    const overrides = record(world.mapOverride, `${path}.mapOverride`)
    for (const [sceneId, mapId] of Object.entries(overrides)) {
      nonEmptyString(sceneId, `${path}.mapOverride scene id`)
      nonEmptyString(mapId, `${path}.mapOverride.${sceneId}`)
    }
  }
}

export type { SceneReveal, SceneSpawn }
