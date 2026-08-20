import type { AssetId } from './asset.js'
import { checkBattleChoreography } from './enemy-script.js'
import type { GridPos } from './grid.js'
import type { Facing } from './index.js'
import type { Command as RuntimeCommandBase, SceneReveal, SceneSpawn, WalkSpeed } from './script.js'
import { SCENE_ENTRY_PREPARE_SAFETY } from './script.js'
import type { SpriteActionBinding } from './sprite.js'

export type PageId = string
export type BehaviorId = string
export type StageId = string
export type MachineId = string
export type StateId = string
export type HookId = string
export type ScriptId = string
export type CommandId = string

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

export type FlowCursor =
  | { kind: 'stage'; stage: StageId }
  | { kind: 'state'; machine: MachineId; state: StateId }

export interface CursorHandoff {
  kind: 'stateMap'
  fromBehavior: BehaviorId
  cases: Array<{
    from: FlowCursor
    to: FlowCursor
  }>
  onUnmapped: 'error'
}

export interface BehaviorCursor {
  behavior: BehaviorId
  at: FlowCursor
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
  | { kind: 'mountParty'; target: EntityAddress; dx?: number; dy?: number }
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
  | { kind: 'confirm'; id?: CommandId; onNo: BaseAuthorCommand[] }
  | { kind: 'branch'; cond: AuthorCondition; then: BaseAuthorCommand[]; else?: BaseAuthorCommand[] }
  | {
      kind: 'loop'
      mode: 'while' | 'until'
      cond: AuthorCondition
      body: BaseAuthorCommand[]
      yield: 'worldTick'
      maxIterations: number
    }
  | {
      kind: 'selectEntityBehavior'
      target: EntityAddress
      channel: 'trigger' | 'auto'
      selection: Selection<BehaviorId>
      cursorHandoff?: CursorHandoff
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

/**
 * Canonical author command vocabulary. The runtime command table supplies the retained leaf kinds while
 * retired control/binding kinds are explicitly disabled and current author structural commands are added.
 */
const RETAINED_RUNTIME_COMMAND_KINDS = Object.fromEntries(
  Object.keys(SCENE_ENTRY_PREPARE_SAFETY).map((kind) => [kind, true] as const),
) as Record<RuntimeCommandBase['kind'], true>

const AUTHOR_ONLY_COMMAND_KINDS = {
  loop: true,
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

export interface BaseAuthorStage {
  id: StageId
  entry?: BaseSceneEntryPresentation
  body: BaseAuthorCommand[]
  next?: StageId
}

export type BaseStateTransition =
  | { kind: 'stay' }
  | { kind: 'restart' }
  | { kind: 'continue'; state: StateId }
  | { kind: 'advance'; state: StateId }
  | { kind: 'to'; state: StateId; yield: 'macroTask' | 'worldTick' }
  | {
      kind: 'branch'
      cond: AuthorCondition
      then: BaseStateTransition
      else: BaseStateTransition
    }
  | {
      kind: 'commandOutcome'
      commandId: CommandId
      command: 'confirm'
      outcome: 'no'
      then: BaseStateTransition
      else: BaseStateTransition
    }

export interface BaseScriptStateMachine {
  id: MachineId
  label: string
  /**
   * When set to `transition`, state bodies execute without implicit per-command pacing.
   * Every scheduling boundary must be expressed by the state's transition.
   * Omitted machines keep the default per-command cadence.
   */
  cadence?: 'transition'
  initial: StateId
  states: Record<
    StateId,
    {
      label: string
      entry?: BaseSceneEntryPresentation
      body: BaseAuthorCommand[]
      next: BaseStateTransition
    }
  >
}

export type BaseScriptFlow =
  | { kind: 'stages'; initial: StageId; stages: BaseAuthorStage[] }
  | { kind: 'stateMachine'; machine: BaseScriptStateMachine }

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

export interface CommandValidationOptions {
  forbidLoadScene?: boolean
  /** Current author dialect extensions are validated in place; no tree-shape downgrade. */
  commandKinds?: Readonly<Record<string, boolean>>
  checkExtensionCommand?: (command: Record<string, unknown>, path: string) => boolean
  checkDialogueCue?: (cue: unknown, path: string) => void
  dialectLabel?: string
}

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
  options: CommandValidationOptions = {},
): asserts value is BaseAuthorCommand[] {
  if (!Array.isArray(value)) throw new Error(`${path}: 期望 BaseAuthorCommand[]`)
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
    if (kind === 'loadScene' && options.forbidLoadScene)
      throw new Error(`${commandPath}: auto 行为禁止 loadScene`)
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
    if (kind === 'loop') {
      if (command.mode !== 'while' && command.mode !== 'until')
        throw new Error(`${commandPath}.mode: 期望 while|until`)
      checkCondition(command.cond, `${commandPath}.cond`)
      checkBaseAuthorCommands(command.body, `${commandPath}.body`, options)
      if (command.yield !== 'worldTick')
        throw new Error(`${commandPath}.yield: canonical loop 必须 worldTick`)
      if (!Number.isInteger(command.maxIterations) || Number(command.maxIterations) <= 0)
        throw new Error(`${commandPath}.maxIterations: 期望正整数`)
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
        checkBattleChoreography(command.choreography, `${commandPath}.choreography`)
    }
    if (kind === 'teleportOut' && command.onFail !== undefined)
      checkBaseAuthorCommands(command.onFail, `${commandPath}.onFail`, options)
    if (kind === 'confirm') {
      exactKeys(command, ['kind', 'id', 'onNo'], commandPath)
      if (command.id !== undefined) nonEmptyString(command.id, `${commandPath}.id`)
      checkBaseAuthorCommands(command.onNo, `${commandPath}.onNo`, options)
    }
    if (kind === 'callScript') {
      if ('ref' in command) throw new Error(`${commandPath}.ref: current callScript 只存稳定 script id`)
      nonEmptyString(command.script, `${commandPath}.script`)
      if (command.self !== undefined) checkEntityAddress(command.self, `${commandPath}.self`)
    }
    if (kind === 'selectEntityBehavior') {
      exactKeys(command, ['kind', 'target', 'channel', 'selection', 'cursorHandoff'], commandPath)
      checkEntityAddress(command.target, `${commandPath}.target`)
      if (command.channel !== 'trigger' && command.channel !== 'auto')
        throw new Error(`${commandPath}.channel: 期望 trigger|auto`)
      checkSelection(command.selection, `${commandPath}.selection`, nonEmptyString)
      if (command.cursorHandoff !== undefined) {
        if (
          !command.selection ||
          typeof command.selection !== 'object' ||
          !('kind' in command.selection) ||
          command.selection.kind !== 'use'
        )
          throw new Error(`${commandPath}.cursorHandoff: 仅 selection.use 可声明游标交接`)
        checkCursorHandoff(command.cursorHandoff, `${commandPath}.cursorHandoff`)
      }
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

function checkCursorHandoff(value: unknown, path: string): void {
  const handoff = record(value, path)
  exactKeys(handoff, ['kind', 'fromBehavior', 'cases', 'onUnmapped'], path)
  if (handoff.kind !== 'stateMap') throw new Error(`${path}.kind: 期望 stateMap`)
  nonEmptyString(handoff.fromBehavior, `${path}.fromBehavior`)
  if (handoff.onUnmapped !== 'error') throw new Error(`${path}.onUnmapped: 期望 error`)
  if (!Array.isArray(handoff.cases) || handoff.cases.length === 0)
    throw new Error(`${path}.cases: 期望非空映射数组`)
  const seen = new Set<string>()
  handoff.cases.forEach((rawCase, index) => {
    const casePath = `${path}.cases[${index}]`
    const mapping = record(rawCase, casePath)
    exactKeys(mapping, ['from', 'to'], casePath)
    checkFlowCursor(mapping.from, `${casePath}.from`)
    checkFlowCursor(mapping.to, `${casePath}.to`)
    const sourceKey = flowCursorKey(mapping.from as FlowCursor)
    if (seen.has(sourceKey)) throw new Error(`${casePath}.from: 游标映射来源重复`)
    seen.add(sourceKey)
  })
}

function checkSceneEntry(
  value: unknown,
  path: string,
  options: CommandValidationOptions,
): void {
  const entry = record(value, path)
  exactKeys(entry, ['prepare', 'reveal'], path)
  checkBaseAuthorCommands(entry.prepare, `${path}.prepare`, options)
  const reveal = record(entry.reveal, `${path}.reveal`)
  if (reveal.kind !== 'dither' && reveal.kind !== 'fade' && reveal.kind !== 'cut')
    throw new Error(`${path}.reveal.kind: 期望 dither|fade|cut`)
}

interface StateCommandIds {
  all: ReadonlySet<string>
  topLevelResults: ReadonlyMap<string, 'confirm'>
}

function collectStateCommandIds(value: unknown, path: string): StateCommandIds {
  if (!Array.isArray(value)) throw new Error(`${path}: 期望 BaseAuthorCommand[]`)
  const all = new Set<string>()
  const topLevelResults = new Map<string, 'confirm'>()

  const visit = (commands: unknown[], commandsPath: string, topLevel: boolean): void => {
    commands.forEach((entry, index) => {
      const commandPath = `${commandsPath}[${index}]`
      const command = record(entry, commandPath)
      const kind = nonEmptyString(command.kind, `${commandPath}.kind`)
      if (kind === 'confirm' && command.id !== undefined) {
        const id = nonEmptyString(command.id, `${commandPath}.id`)
        if (all.has(id)) throw new Error(`${commandPath}.id: 同一 state 内重复 CommandId ${id}`)
        all.add(id)
        if (topLevel) topLevelResults.set(id, 'confirm')
      }
      if (kind === 'branch') {
        visit(command.then as unknown[], `${commandPath}.then`, false)
        if (command.else !== undefined)
          visit(command.else as unknown[], `${commandPath}.else`, false)
      } else if (kind === 'loop') {
        visit(command.body as unknown[], `${commandPath}.body`, false)
      } else if (kind === 'startBattle') {
        if (command.onLose !== undefined)
          visit(command.onLose as unknown[], `${commandPath}.onLose`, false)
        if (command.onFlee !== undefined)
          visit(command.onFlee as unknown[], `${commandPath}.onFlee`, false)
      } else if (kind === 'teleportOut' && command.onFail !== undefined) {
        visit(command.onFail as unknown[], `${commandPath}.onFail`, false)
      } else if (kind === 'confirm') {
        visit(command.onNo as unknown[], `${commandPath}.onNo`, false)
      }
    })
  }

  visit(value, path, true)
  return { all, topLevelResults }
}

function checkStateTarget(value: unknown, path: string, stateIds: ReadonlySet<string>): string {
  const state = nonEmptyString(value, path)
  if (!stateIds.has(state)) throw new Error(`${path}: 未知 state ${state}`)
  return state
}

function checkStateTransition(
  value: unknown,
  path: string,
  stateIds: ReadonlySet<string>,
  commands: StateCommandIds,
): void {
  const transition = record(value, path)
  if (transition.kind === 'stay' || transition.kind === 'restart') {
    exactKeys(transition, ['kind'], path)
    return
  }
  if (transition.kind === 'continue' || transition.kind === 'advance') {
    exactKeys(transition, ['kind', 'state'], path)
    checkStateTarget(transition.state, `${path}.state`, stateIds)
    return
  }
  if (transition.kind === 'to') {
    exactKeys(transition, ['kind', 'state', 'yield'], path)
    checkStateTarget(transition.state, `${path}.state`, stateIds)
    if (transition.yield !== 'macroTask' && transition.yield !== 'worldTick')
      throw new Error(`${path}.yield: 期望 macroTask|worldTick`)
    return
  }
  if (transition.kind === 'branch') {
    exactKeys(transition, ['kind', 'cond', 'then', 'else'], path)
    checkCondition(transition.cond, `${path}.cond`)
    checkStateTransition(transition.then, `${path}.then`, stateIds, commands)
    checkStateTransition(transition.else, `${path}.else`, stateIds, commands)
    return
  }
  if (transition.kind === 'commandOutcome') {
    exactKeys(transition, ['kind', 'commandId', 'command', 'outcome', 'then', 'else'], path)
    const commandId = nonEmptyString(transition.commandId, `${path}.commandId`)
    if (transition.command !== 'confirm') throw new Error(`${path}.command: 期望 confirm`)
    if (transition.outcome !== 'no') throw new Error(`${path}.outcome: confirm 期望 no`)
    const commandKind = commands.topLevelResults.get(commandId)
    if (!commandKind)
      throw new Error(`${path}.commandId: 未命中同一 state 顶层结果命令 ${commandId}`)
    if (commandKind !== transition.command)
      throw new Error(`${path}.command: 与 ${commandId} 的命令 kind 不匹配`)
    checkStateTransition(transition.then, `${path}.then`, stateIds, commands)
    checkStateTransition(transition.else, `${path}.else`, stateIds, commands)
    return
  }
  throw new Error(`${path}.kind: 期望 stay|restart|continue|advance|to|branch|commandOutcome`)
}

function collectContinueTargets(value: unknown, targets: Set<string>): void {
  const transition = value as BaseStateTransition
  if (transition.kind === 'continue') {
    targets.add(transition.state)
    return
  }
  if (transition.kind === 'branch' || transition.kind === 'commandOutcome') {
    collectContinueTargets(transition.then, targets)
    collectContinueTargets(transition.else, targets)
  }
}

function checkContinueGraph(graph: ReadonlyMap<string, ReadonlySet<string>>, path: string): void {
  const done = new Set<string>()
  const active = new Set<string>()
  const stack: string[] = []

  const visit = (state: string): void => {
    if (done.has(state)) return
    if (active.has(state)) {
      const start = stack.indexOf(state)
      const cycle = [...stack.slice(start), state].join(' -> ')
      throw new Error(`${path}: continue 转移形成无让步环 ${cycle}`)
    }
    active.add(state)
    stack.push(state)
    for (const target of graph.get(state) ?? []) visit(target)
    stack.pop()
    active.delete(state)
    done.add(state)
  }

  for (const state of graph.keys()) visit(state)
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
  if (flow.kind === 'stages') {
    exactKeys(flow, ['kind', 'initial', 'stages'], path)
    const initial = nonEmptyString(flow.initial, `${path}.initial`)
    if (!Array.isArray(flow.stages) || flow.stages.length === 0)
      throw new Error(`${path}.stages: 期望非空数组`)
    const ids = new Set<string>()
    flow.stages.forEach((raw, index) => {
      const stage = record(raw, `${path}.stages[${index}]`)
      exactKeys(stage, ['id', 'entry', 'body', 'next'], `${path}.stages[${index}]`)
      const id = nonEmptyString(stage.id, `${path}.stages[${index}].id`)
      if (ids.has(id)) throw new Error(`${path}.stages[${index}].id: 重复 ${id}`)
      ids.add(id)
      if (stage.entry !== undefined) {
        if (!options.allowSceneEntry || id !== initial)
          throw new Error(`${path}.stages[${index}].entry: 只允许 onEnter initial stage`)
        checkSceneEntry(stage.entry, `${path}.stages[${index}].entry`, options)
      }
      checkBaseAuthorCommands(stage.body, `${path}.stages[${index}].body`, options)
    })
    if (!ids.has(initial)) throw new Error(`${path}.initial: 未命中 stage ${initial}`)
    flow.stages.forEach((raw, index) => {
      const next = (raw as { next?: unknown }).next
      if (next !== undefined && (typeof next !== 'string' || !ids.has(next)))
        throw new Error(`${path}.stages[${index}].next: 未命中 stage ${String(next)}`)
    })
    return
  }
  if (flow.kind === 'stateMachine') {
    exactKeys(flow, ['kind', 'machine'], path)
    const machine = record(flow.machine, `${path}.machine`)
    exactKeys(machine, ['id', 'label', 'cadence', 'initial', 'states'], `${path}.machine`)
    nonEmptyString(machine.id, `${path}.machine.id`)
    nonEmptyString(machine.label, `${path}.machine.label`)
    if (machine.cadence !== undefined && machine.cadence !== 'transition')
      throw new Error(`${path}.machine.cadence: 期望 transition`)
    const initial = nonEmptyString(machine.initial, `${path}.machine.initial`)
    const states = record(machine.states, `${path}.machine.states`)
    const stateIds = new Set(Object.keys(states))
    const continueGraph = new Map<string, ReadonlySet<string>>()
    if (stateIds.size === 0) throw new Error(`${path}.machine.states: 不能为空`)
    if (!stateIds.has(initial)) throw new Error(`${path}.machine.initial: 未命中 state ${initial}`)
    for (const [stateId, raw] of Object.entries(states)) {
      nonEmptyString(stateId, `${path}.machine.states id`)
      const state = record(raw, `${path}.machine.states.${stateId}`)
      exactKeys(state, ['label', 'entry', 'body', 'next'], `${path}.machine.states.${stateId}`)
      nonEmptyString(state.label, `${path}.machine.states.${stateId}.label`)
      if (state.entry !== undefined) {
        if (!options.allowSceneEntry || stateId !== initial)
          throw new Error(`${path}.machine.states.${stateId}.entry: 只允许 onEnter initial state`)
        checkSceneEntry(state.entry, `${path}.machine.states.${stateId}.entry`, options)
      }
      checkBaseAuthorCommands(state.body, `${path}.machine.states.${stateId}.body`, options)
      const commandIds = collectStateCommandIds(
        state.body,
        `${path}.machine.states.${stateId}.body`,
      )
      checkStateTransition(
        state.next,
        `${path}.machine.states.${stateId}.next`,
        stateIds,
        commandIds,
      )
      const continueTargets = new Set<string>()
      collectContinueTargets(state.next, continueTargets)
      continueGraph.set(stateId, continueTargets)
    }
    checkContinueGraph(continueGraph, `${path}.machine`)
    return
  }
  throw new Error(`${path}.kind: 期望 stages|stateMachine`)
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
    checkBaseAuthorCommands(script.body, `${path}.${id}.body`, options)
  }
}

function checkFlowCursor(value: unknown, path: string): void {
  const cursor = record(value, path)
  if (cursor.kind === 'stage') {
    exactKeys(cursor, ['kind', 'stage'], path)
    nonEmptyString(cursor.stage, `${path}.stage`)
    return
  }
  if (cursor.kind === 'state') {
    exactKeys(cursor, ['kind', 'machine', 'state'], path)
    nonEmptyString(cursor.machine, `${path}.machine`)
    nonEmptyString(cursor.state, `${path}.state`)
    return
  }
  throw new Error(`${path}.kind: 期望 stage|state`)
}

function flowCursorKey(cursor: FlowCursor): string {
  return cursor.kind === 'stage'
    ? JSON.stringify(['stage', cursor.stage])
    : JSON.stringify(['state', cursor.machine, cursor.state])
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

function checkWorldEntityBehaviorSlot(value: unknown, path: string): void {
  const slot = record(value, path)
  exactKeys(slot, ['selection', 'cursor'], path)
  if (slot.selection !== undefined)
    checkPersistedSelection(slot.selection, `${path}.selection`, (entry, entryPath) => {
      nonEmptyString(entry, entryPath)
    })
  if (slot.cursor !== undefined) {
    const cursor = record(slot.cursor, `${path}.cursor`)
    exactKeys(cursor, ['behavior', 'at'], `${path}.cursor`)
    nonEmptyString(cursor.behavior, `${path}.cursor.behavior`)
    checkFlowCursor(cursor.at, `${path}.cursor.at`)
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
 * SAVE8 的脚本世界态严格 guard。静态 inherit 不落盘；持久层只记录显式 disabled/use，
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
            checkWorldEntityBehaviorSlot(entity[channel], `${entityPath}.${channel}`)
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
        if (scene[hook] !== undefined)
          checkWorldSceneHookSlot(scene[hook], `${scenePath}.${hook}`)
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
