import type {
  AuthorCondition,
  BaseAuthorCommand,
  BaseAuthorStage,
  BaseEntityBehavior,
  BaseEntityPage,
  BaseSceneHook,
  BaseScriptStateMachine,
  CommandValidationOptions,
  EntityAddress,
} from './author-script-core.js'
import {
  BASE_AUTHOR_COMMAND_KINDS,
  checkBaseAuthorCommands,
  checkBaseEntityBehaviors,
  checkBaseEntityPages,
  checkBaseSceneHooks,
  checkBaseScriptFlow,
  checkBaseScriptLibrary,
  checkEntityAddress,
} from './author-script-core.js'
import type { SceneReveal } from './script.js'

export type EntityLifecycleCommand =
  | { kind: 'suspendEntity'; target: EntityAddress; ticks: number }
  | { kind: 'hideEntity'; target: EntityAddress; ticks: number }
  | { kind: 'restoreEntity'; target: EntityAddress }
  | { kind: 'removeEntity'; target: EntityAddress }

/** 在保留的递归命令树上换入当前运行时命令词表。 */
type RewriteRuntimeCommandTree<T> = T extends BaseAuthorCommand[]
  ? RuntimeCommand[]
  : T extends readonly (infer Item)[]
    ? RewriteRuntimeCommandTree<Item>[]
    : T extends object
      ? { [Key in keyof T]: RewriteRuntimeCommandTree<T[Key]> }
      : T

type RetainedRuntimeCommand = RewriteRuntimeCommandTree<
  Exclude<BaseAuthorCommand, { kind: 'vanishEntity' }>
>

/** 顶层与递归 arm 共享的当前运行时命令词表。 */
export type RuntimeCommand = RetainedRuntimeCommand | EntityLifecycleCommand

export interface RuntimeSceneEntryPresentation {
  prepare: RuntimeCommand[]
  reveal: SceneReveal
}

export interface RuntimeStage {
  id: BaseAuthorStage['id']
  entry?: RuntimeSceneEntryPresentation
  body: RuntimeCommand[]
  next?: BaseAuthorStage['next']
}

export type RuntimeStateTransition =
  | { kind: 'stay' }
  | { kind: 'restart' }
  | { kind: 'continue'; state: string }
  | { kind: 'advance'; state: string }
  | { kind: 'to'; state: string; yield: 'macroTask' | 'worldTick' }
  | {
      kind: 'branch'
      cond: AuthorCondition
      then: RuntimeStateTransition
      else: RuntimeStateTransition
    }
  | {
      kind: 'commandOutcome'
      commandId: string
      command: 'confirm'
      outcome: 'no'
      then: RuntimeStateTransition
      else: RuntimeStateTransition
    }

export interface RuntimeScriptStateMachine {
  id: BaseScriptStateMachine['id']
  label: string
  cadence?: 'transition'
  initial: string
  states: Record<
    string,
    {
      label: string
      entry?: RuntimeSceneEntryPresentation
      body: RuntimeCommand[]
      next: RuntimeStateTransition
    }
  >
}

export type RuntimeScriptFlow =
  | { kind: 'stages'; initial: string; stages: RuntimeStage[] }
  | { kind: 'stateMachine'; machine: RuntimeScriptStateMachine }

export interface RuntimeEntityBehavior {
  label: BaseEntityBehavior['label']
  order: BaseEntityBehavior['order']
  flow: RuntimeScriptFlow
}

export interface RuntimeEntityBehaviors {
  trigger?: Record<string, RuntimeEntityBehavior>
  auto?: Record<string, RuntimeEntityBehavior>
}

export interface RuntimeEntityPage extends Omit<BaseEntityPage, 'trigger' | 'auto'> {
  trigger?: string
  auto?: string
}

export interface RuntimeSceneHook {
  label: BaseSceneHook['label']
  order: BaseSceneHook['order']
  flow: RuntimeScriptFlow
}

export interface RuntimeSceneHookChannel {
  initial?: string
  variants: Record<string, RuntimeSceneHook>
}

export type RuntimeSceneHooks = Partial<Record<'onEnter' | 'onTeleport', RuntimeSceneHookChannel>>

export interface RuntimeSharedScript {
  name: string
  description?: string
  self: 'none' | 'optional' | 'required'
  body: RuntimeCommand[]
}

export type RuntimeScriptLibrary = Record<string, RuntimeSharedScript>

export const RUNTIME_COMMAND_KINDS: Readonly<Record<string, boolean>> = Object.freeze({
  ...BASE_AUTHOR_COMMAND_KINDS,
  suspendEntity: true,
  hideEntity: true,
  restoreEntity: true,
  removeEntity: true,
  vanishEntity: false,
})

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const allowedKeys = new Set(allowed)
  for (const key of Object.keys(value))
    if (!allowedKeys.has(key)) throw new Error(`${path}.${key}: 未知字段`)
}

function positiveSafeInt(value: unknown, path: string): void {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) throw new Error(`${path}: 期望正安全整数`)
}

function checkLifecycleCommand(value: Record<string, unknown>, path: string): void {
  const kind = value.kind
  if (kind === 'suspendEntity' || kind === 'hideEntity') {
    exactKeys(value, ['kind', 'target', 'ticks'], path)
    checkEntityAddress(value.target, `${path}.target`)
    positiveSafeInt(value.ticks, `${path}.ticks`)
    return
  }
  if (kind === 'restoreEntity' || kind === 'removeEntity') {
    exactKeys(value, ['kind', 'target'], path)
    checkEntityAddress(value.target, `${path}.target`)
    return
  }
  throw new Error(`${path}.kind: 未知生命周期命令 ${String(kind)}`)
}

export interface CheckRuntimeScriptFlowOptions {
  allowSceneEntry?: boolean
  forbidLoadScene?: boolean
  checkDialogueCue?: (cue: unknown, path: string) => void
}

export function runtimeCommandValidationOptions(
  options: CommandValidationOptions = {},
): CommandValidationOptions {
  return {
    ...options,
    commandKinds: RUNTIME_COMMAND_KINDS,
    dialectLabel: 'current',
    checkExtensionCommand(command, path) {
      if (command.kind === 'vanishEntity')
        throw new Error(`${path}.kind: current 禁止 vanishEntity；请使用显式生命周期命令`)
      if (
        command.kind === 'suspendEntity' ||
        command.kind === 'hideEntity' ||
        command.kind === 'restoreEntity' ||
        command.kind === 'removeEntity'
      ) {
        checkLifecycleCommand(command, path)
        return true
      }
      return false
    },
  }
}

export function checkRuntimeScriptFlow(
  value: unknown,
  path: string,
  options: CheckRuntimeScriptFlowOptions = {},
): asserts value is RuntimeScriptFlow {
  checkBaseScriptFlow(value, path, runtimeCommandValidationOptions(options))
}

export function checkRuntimeEntityBehaviors(
  value: unknown,
  path: string,
  options: CommandValidationOptions = {},
): asserts value is RuntimeEntityBehaviors {
  checkBaseEntityBehaviors(value, path, runtimeCommandValidationOptions(options))
}

export function checkRuntimeEntityPages(
  pages: unknown,
  behaviors: unknown,
  initialPage: unknown,
  path: string,
  options: CommandValidationOptions = {},
): asserts pages is RuntimeEntityPage[] {
  checkBaseEntityPages(
    pages,
    behaviors,
    initialPage,
    path,
    runtimeCommandValidationOptions(options),
  )
}

export function checkRuntimeSceneHooks(
  value: unknown,
  path: string,
  options: CommandValidationOptions = {},
): asserts value is RuntimeSceneHooks {
  checkBaseSceneHooks(value, path, runtimeCommandValidationOptions(options))
}

export function checkRuntimeScriptLibrary(
  value: unknown,
  path = 'content/shared-scripts.json',
  options: CommandValidationOptions = {},
): asserts value is RuntimeScriptLibrary {
  checkBaseScriptLibrary(value, path, runtimeCommandValidationOptions(options))
}

export function checkRuntimeCommands(
  value: unknown,
  path: string,
  options: CommandValidationOptions = {},
): asserts value is RuntimeCommand[] {
  if (!Array.isArray(value)) throw new Error(`${path}: 期望 RuntimeCommand[]`)
  checkBaseAuthorCommands(value, path, runtimeCommandValidationOptions(options))
}
