import type { SceneReveal } from './script.js'
import type {
  AuthorCommandV5,
  AuthorConditionV5,
  AuthorStageV5,
  CheckAuthorCommandsV5Options,
  EntityAddress,
  EntityPageV5,
  NamedEntityBehaviorV5,
  NamedSceneHookV5,
  ScriptStateMachineV5,
} from './script-v5.js'
import {
  AUTHOR_COMMAND_V5_KINDS,
  checkAuthorCommandsV5,
  checkEntityAddress,
  checkEntityBehaviorsV5,
  checkEntityPagesV5,
  checkSceneHooksV5,
  checkScriptFlowV5,
  checkSharedScriptLibraryV5,
} from './script-v5.js'

export type LifecycleCommandV13 =
  | { kind: 'suspendEntity'; target: EntityAddress; ticks: number }
  | { kind: 'hideEntity'; target: EntityAddress; ticks: number }
  | { kind: 'restoreEntity'; target: EntityAddress }
  | { kind: 'removeEntity'; target: EntityAddress }

/** 将 v5 命令联合中所有递归 command[] arm 一并换成 v13，避免只收紧顶层。 */
type RewriteCommandTreeV13<T> = T extends AuthorCommandV5[]
  ? AuthorCommandV13[]
  : T extends readonly (infer Item)[]
    ? RewriteCommandTreeV13<Item>[]
    : T extends object
      ? { [Key in keyof T]: RewriteCommandTreeV13<T[Key]> }
      : T

type RetainedAuthorCommandV13 = RewriteCommandTreeV13<
  Exclude<AuthorCommandV5, { kind: 'vanishEntity' }>
>

/** 顶层与递归 arm 的 v13 command vocabulary；旧 v5 的 vanishEntity 只存在于历史输入端。 */
export type AuthorCommandV13 = RetainedAuthorCommandV13 | LifecycleCommandV13

export interface AuthorSceneEntryPresentationV13 {
  prepare: AuthorCommandV13[]
  reveal: SceneReveal
}

export interface AuthorStageV13 {
  id: AuthorStageV5['id']
  entry?: AuthorSceneEntryPresentationV13
  body: AuthorCommandV13[]
  next?: AuthorStageV5['next']
}

export type StateTransitionV13 =
  | { kind: 'stay' }
  | { kind: 'restart' }
  | { kind: 'continue'; state: string }
  | { kind: 'advance'; state: string }
  | { kind: 'to'; state: string; yield: 'macroTask' | 'worldTick' }
  | {
      kind: 'branch'
      cond: AuthorConditionV5
      then: StateTransitionV13
      else: StateTransitionV13
    }
  | {
      kind: 'commandOutcome'
      commandId: string
      command: 'confirm'
      outcome: 'no'
      then: StateTransitionV13
      else: StateTransitionV13
    }

export interface ScriptStateMachineV13 {
  id: ScriptStateMachineV5['id']
  label: string
  cadence?: 'transition'
  initial: string
  states: Record<
    string,
    {
      label: string
      entry?: AuthorSceneEntryPresentationV13
      body: AuthorCommandV13[]
      next: StateTransitionV13
    }
  >
}

export type ScriptFlowV13 =
  | { kind: 'stages'; initial: string; stages: AuthorStageV13[] }
  | { kind: 'stateMachine'; machine: ScriptStateMachineV13 }

export interface NamedEntityBehaviorV13 {
  label: NamedEntityBehaviorV5['label']
  order: NamedEntityBehaviorV5['order']
  flow: ScriptFlowV13
}

export interface EntityBehaviorsV13 {
  trigger?: Record<string, NamedEntityBehaviorV13>
  auto?: Record<string, NamedEntityBehaviorV13>
}

export interface EntityPageV13 extends Omit<EntityPageV5, 'trigger' | 'auto'> {
  trigger?: string
  auto?: string
}

export interface NamedSceneHookV13 {
  label: NamedSceneHookV5['label']
  order: NamedSceneHookV5['order']
  flow: ScriptFlowV13
}

export interface SceneHookChannelV13 {
  initial?: string
  variants: Record<string, NamedSceneHookV13>
}

export type SceneHooksV13 = Partial<Record<'onEnter' | 'onTeleport', SceneHookChannelV13>>

export interface SharedAuthorScriptV13 {
  name: string
  description?: string
  self: 'none' | 'optional' | 'required'
  body: AuthorCommandV13[]
}

export type SharedScriptLibraryV13 = Record<string, SharedAuthorScriptV13>

export const AUTHOR_COMMAND_V13_KINDS: Readonly<Record<string, boolean>> = Object.freeze({
  // Keep the retained v5 leaf table as the compatibility baseline. Nested validation below
  // rewrites only the four new lifecycle leaves before delegating shape checks to v5.
  ...AUTHOR_COMMAND_V5_KINDS,
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

/**
 * Replace lifecycle leaves with a harmless retained v5 leaf solely for legacy shape checking.
 * The returned tree is never exposed; this lets v5 validate every old field while this walker
 * enforces the new recursive command boundary and rejects vanishEntity at any nesting depth.
 */
function sanitizeForV5(value: unknown, path: string): unknown {
  if (Array.isArray(value))
    return value.map((entry, index) => sanitizeForV5(entry, `${path}[${index}]`))
  if (!value || typeof value !== 'object') return value
  const object = record(value, path)
  if (typeof object.kind === 'string') {
    if (object.kind === 'vanishEntity')
      throw new Error(`${path}.kind: v13 禁止 vanishEntity；请使用显式生命周期命令`)
    if (
      object.kind === 'suspendEntity' ||
      object.kind === 'hideEntity' ||
      object.kind === 'restoreEntity' ||
      object.kind === 'removeEntity'
    ) {
      checkLifecycleCommand(object, path)
      return { kind: 'wait', ms: 0 }
    }
  }
  return Object.fromEntries(
    Object.entries(object).map(([key, child]) => [key, sanitizeForV5(child, `${path}.${key}`)]),
  )
}

export interface CheckScriptFlowV13Options {
  allowSceneEntry?: boolean
  forbidLoadScene?: boolean
}

export function checkScriptFlowV13(
  value: unknown,
  path: string,
  options: CheckScriptFlowV13Options = {},
): asserts value is ScriptFlowV13 {
  checkScriptFlowV5(sanitizeForV5(value, path), path, options)
}

export function checkEntityBehaviorsV13(
  value: unknown,
  path: string,
): asserts value is EntityBehaviorsV13 {
  checkEntityBehaviorsV5(sanitizeForV5(value, path), path)
}

export function checkEntityPagesV13(
  pages: unknown,
  behaviors: unknown,
  initialPage: unknown,
  path: string,
): asserts pages is EntityPageV13[] {
  checkEntityPagesV5(
    sanitizeForV5(pages, `${path}.pages`),
    sanitizeForV5(behaviors, `${path}.behaviors`),
    initialPage,
    path,
  )
}

export function checkSceneHooksV13(value: unknown, path: string): asserts value is SceneHooksV13 {
  checkSceneHooksV5(sanitizeForV5(value, path), path)
}

export function checkSharedScriptLibraryV13(
  value: unknown,
  path = 'content/shared-scripts.json',
): asserts value is SharedScriptLibraryV13 {
  checkSharedScriptLibraryV5(sanitizeForV5(value, path), path)
}

export function checkAuthorCommandsV13(
  value: unknown,
  path: string,
  options: CheckAuthorCommandsV5Options = {},
): asserts value is AuthorCommandV13[] {
  if (!Array.isArray(value)) throw new Error(`${path}: 期望 AuthorCommandV13[]`)
  const sanitized = sanitizeForV5(value, path)
  checkAuthorCommandsV5(sanitized, path, options)
}
