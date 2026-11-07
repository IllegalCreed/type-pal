import type { ActorDef } from './actor.js'
import {
  type AuthorDialogueCue,
  checkAuthorDialogueCue,
  dialogueCuesAtNode,
  resolveAuthorDialogueCue,
  resolveDialogueIdentity,
} from './author-dialogue.js'
import {
  type CommandValidationOptions,
  checkBaseAuthorCommands,
  checkBaseEntityBehaviors,
  checkBaseEntityPages,
  checkBaseSceneHooks,
  checkBaseScriptFlow,
  checkBaseScriptLibrary,
  type EntityAddress,
} from './author-script-core.js'
import type { DialogueCue } from './index.js'
import {
  type AcquisitionItems,
  type AuthorAcquisitionFlow,
  type AuthorGrantRewardCommand,
  checkAcquisitionFlow,
  checkGrantRewardCommand,
  expandAcquisitionFlow,
  expandGrantReward,
} from './item-acquisition.js'
import type {
  RuntimeCommand,
  RuntimeEntityBehavior,
  RuntimeEntityPage,
  RuntimeSceneHook,
  RuntimeScriptFlow,
  RuntimeScriptLibrary,
} from './runtime-script.js'
import { runtimeCommandValidationOptions } from './runtime-script.js'

/** 作者意图保留类型化参数；仅在运行态投影边界展开，不回写作者正文。 */
export type RewriteAuthorDialogueTree<T> = T extends RuntimeScriptFlow
  ? AuthorScriptFlow
  : T extends { kind: 'dialog'; cue: DialogueCue }
    ? Omit<T, 'cue'> & { cue: AuthorDialogueCue }
    : T extends readonly (infer Item)[]
      ? RuntimeCommand extends Item
        ? AuthorCommand[]
        : RewriteAuthorDialogueTree<Item>[]
      : T extends object
        ? { [Key in keyof T]: RewriteAuthorDialogueTree<T[Key]> }
        : T

export type AuthorCommand = RewriteAuthorDialogueTree<RuntimeCommand> | AuthorGrantRewardCommand
export interface AuthorStagesFlow extends Omit<RuntimeScriptFlow, 'stages'> {
  stages: RewriteAuthorDialogueTree<RuntimeScriptFlow['stages'][number]>[]
}
export type AuthorScriptFlow = AuthorStagesFlow | AuthorAcquisitionFlow
export interface AuthorEntityBehaviors {
  trigger?: Record<string, Omit<RuntimeEntityBehavior, 'flow'> & { flow: AuthorScriptFlow }>
  auto?: Record<string, Omit<RuntimeEntityBehavior, 'flow'> & { flow: AuthorStagesFlow }>
}
export type AuthorEntityPage = RewriteAuthorDialogueTree<RuntimeEntityPage>
export type AuthorSceneHooks = Partial<
  Record<
    'onEnter' | 'onTeleport',
    {
      initial?: string
      variants: Record<string, Omit<RuntimeSceneHook, 'flow'> & { flow: AuthorStagesFlow }>
    }
  >
>
export type AuthorScriptLibrary = RewriteAuthorDialogueTree<RuntimeScriptLibrary>

type ResolveArrayEntry<T> = T extends AuthorGrantRewardCommand
  ? RuntimeCommand
  : ResolveAuthorDialogueTree<T>

export type ResolveAuthorDialogueTree<T> = T extends AuthorAcquisitionFlow
  ? RuntimeScriptFlow
  : T extends AuthorGrantRewardCommand
    ? RuntimeCommand[]
    : T extends { kind: 'dialog'; cue: AuthorDialogueCue }
      ? Omit<T, 'cue'> & { cue: DialogueCue }
      : T extends readonly (infer Item)[]
        ? ResolveArrayEntry<Item>[]
        : T extends object
          ? { [Key in keyof T]: ResolveAuthorDialogueTree<T[Key]> }
          : T

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export interface AuthorScriptResolutionContext {
  items?: AcquisitionItems
  /** Required for a standalone owned acquisition flow; whole scenes derive each entity owner. */
  self?: EntityAddress
}

type ExpandedArrayEntry<T> = T extends AuthorGrantRewardCommand
  ? AuthorCommand
  : ExpandedAuthorScriptTree<T>

export type ExpandedAuthorScriptTree<T> = T extends AuthorAcquisitionFlow
  ? AuthorStagesFlow
  : T extends AuthorGrantRewardCommand
    ? AuthorCommand[]
    : T extends readonly (infer Item)[]
      ? ExpandedArrayEntry<Item>[]
      : T extends object
        ? { [Key in keyof T]: ExpandedAuthorScriptTree<T[Key]> }
        : T

function transformAuthorScriptTree(
  input: unknown,
  rootPath: string,
  context: AuthorScriptResolutionContext,
  resolveCue?: (cue: AuthorDialogueCue, path: string) => DialogueCue,
): unknown {
  const visit = (value: unknown, path: string, self: EntityAddress | undefined): unknown => {
    if (Array.isArray(value))
      return value.flatMap((entry, index) => {
        const resolved = visit(entry, `${path}[${index}]`, self)
        return isRecord(entry) && entry.kind === 'grantReward'
          ? (resolved as unknown[])
          : [resolved]
      })
    if (!isRecord(value)) return value
    if (value.kind === 'grantReward') {
      checkGrantRewardCommand(value, path)
      return visit(expandGrantReward(value, context.items ?? []), path, self)
    }
    if (value.kind === 'acquisition') {
      checkAcquisitionFlow(value, path)
      if (!self) throw new Error(`${path}: 取物流程缺所属实体`)
      return visit(expandAcquisitionFlow(value, self, context.items ?? []), path, self)
    }
    if (
      typeof value.id === 'string' &&
      typeof value.mapId === 'string' &&
      Array.isArray(value.entities)
    ) {
      const sceneId = value.id
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
          key,
          key === 'entities' && Array.isArray(child)
            ? child.map((entity, index) => {
                if (!isRecord(entity) || typeof entity.id !== 'string')
                  throw new Error(`${path}.entities[${index}]: 缺实体 ID`)
                return visit(entity, `${path}.entities[${index}]`, {
                  scene: sceneId,
                  entity: entity.id,
                })
              })
            : visit(child, `${path}.${key}`, undefined),
        ]),
      )
    }
    if (value.kind === 'dialog' && resolveCue) {
      if (!('cue' in value)) throw new Error(`${path}.cue: dialog 缺 cue`)
      const next = Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => key !== 'cue')
          .map(([key, child]) => [key, visit(child, `${path}.${key}`, self)]),
      )
      next.cue = resolveCue(value.cue as AuthorDialogueCue, `${path}.cue`)
      return next
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, visit(child, `${path}.${key}`, self)]),
    )
  }
  return visit(input, rootPath, context.self)
}

/** Expand only authored recipe intent, preserving dialogue identities for source and trace tools. */
export function expandAuthorScriptTree<T>(
  input: T,
  rootPath = 'content',
  context: AuthorScriptResolutionContext = {},
): ExpandedAuthorScriptTree<T> {
  return transformAuthorScriptTree(input, rootPath, context) as ExpandedAuthorScriptTree<T>
}

/** 唯一运行时投影：展开内置意图，再把作者 identity 投成显示 cue。 */
export function resolveAuthorDialogueTree<T>(
  input: T,
  actorsById: Readonly<Record<string, ActorDef>>,
  rootPath = 'content',
  context: AuthorScriptResolutionContext = {},
): ResolveAuthorDialogueTree<T> {
  return transformAuthorScriptTree(input, rootPath, context, (cue, path) =>
    resolveAuthorDialogueCue(cue, actorsById, path),
  ) as ResolveAuthorDialogueTree<T>
}

/** 全树 Actor/expression fail-closed；不靠 AssetId 或显示文本猜人物。 */
export function assertAuthorDialogueReferences(
  input: unknown,
  actorsById: Readonly<Record<string, ActorDef>>,
  rootPath = 'content',
): void {
  const visit = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        visit(entry, `${path}[${index}]`)
      })
      return
    }
    if (!isRecord(value)) return
    for (const site of dialogueCuesAtNode(value)) {
      const cuePath = `${path}.${site.path.join('.')}`
      checkAuthorDialogueCue(site.cue, cuePath)
      resolveDialogueIdentity(site.cue.identity, actorsById, `${cuePath}.identity`)
    }
    for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`)
  }
  visit(input, rootPath)
}

/** 所有作者内容根共用的当前命令校验选项。 */
export function authorCommandValidationOptions(
  options: CommandValidationOptions = {},
): CommandValidationOptions {
  const runtime = runtimeCommandValidationOptions({
    ...options,
    checkDialogueCue: checkAuthorDialogueCue,
  })
  return {
    ...runtime,
    commandKinds: { ...runtime.commandKinds, grantReward: true },
    checkExtensionCommand(command, path, validation) {
      if (command.kind !== 'grantReward')
        return runtime.checkExtensionCommand?.(command, path, validation) ?? false
      checkGrantRewardCommand(command, path)
      if (validation.rootScope === 'prepare' && command.notice.kind !== 'silent')
        throw new Error(`${path}: 入场准备只允许静默发放奖励`)
      return true
    },
    checkExtensionFlow(flow, path, owner) {
      if (flow.kind !== 'acquisition') return false
      if (owner !== undefined && owner !== 'trigger')
        throw new Error(`${path}: 取物流程只能属于实体交互方案`)
      checkAcquisitionFlow(flow, path)
      return true
    },
  }
}

export function checkAuthorCommands(
  value: unknown,
  path: string,
  options: CommandValidationOptions = {},
): asserts value is AuthorCommand[] {
  checkBaseAuthorCommands(value, path, authorCommandValidationOptions(options))
}

export function checkAuthorScriptFlow(
  value: unknown,
  path: string,
  options: { allowSceneEntry?: boolean; forbidLoadScene?: boolean } = {},
): asserts value is AuthorScriptFlow {
  checkBaseScriptFlow(value, path, authorCommandValidationOptions(options))
}

export function checkAuthorEntityBehaviors(
  value: unknown,
  path: string,
): asserts value is AuthorEntityBehaviors {
  checkBaseEntityBehaviors(value, path, authorCommandValidationOptions())
}

export function checkAuthorEntityPages(
  pages: unknown,
  behaviors: unknown,
  initialPage: unknown,
  path: string,
): asserts pages is AuthorEntityPage[] {
  checkBaseEntityPages(pages, behaviors, initialPage, path, authorCommandValidationOptions())
}

export function checkAuthorSceneHooks(
  value: unknown,
  path: string,
): asserts value is AuthorSceneHooks {
  checkBaseSceneHooks(value, path, authorCommandValidationOptions())
}

export function checkAuthorScriptLibrary(
  value: unknown,
  path = 'content/shared-scripts.json',
): asserts value is AuthorScriptLibrary {
  checkBaseScriptLibrary(value, path, authorCommandValidationOptions())
}
