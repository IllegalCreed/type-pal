import type { ActorDef } from './actor.js'
import {
  type AuthorDialogueCue,
  checkAuthorDialogueCue,
  resolveAuthorDialogueCue,
  resolveDialogueIdentity,
} from './author-dialogue.js'
import type { CommandValidationOptions, EntityAddress } from './author-script-core.js'
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
  RuntimeEntityBehaviors,
  RuntimeEntityPage,
  RuntimeSceneHooks,
  RuntimeScriptFlow,
  RuntimeScriptLibrary,
} from './runtime-script.js'
import {
  checkRuntimeCommands,
  checkRuntimeEntityBehaviors,
  checkRuntimeEntityPages,
  checkRuntimeSceneHooks,
  checkRuntimeScriptFlow,
  checkRuntimeScriptLibrary,
  runtimeCommandValidationOptions,
} from './runtime-script.js'

/** 作者意图保留类型化参数；仅在运行态投影边界展开，不回写作者正文。 */
export type RewriteAuthorDialogueTree<T> = T extends RuntimeScriptFlow
  ? AuthorScriptFlow
  : T extends { kind: 'dialog'; cue: DialogueCue }
    ? Omit<T, 'cue'> & { cue: AuthorDialogueCue }
    : T extends readonly RuntimeCommand[]
      ? AuthorCommand[]
      : T extends readonly (infer Item)[]
        ? RewriteAuthorDialogueTree<Item>[]
        : T extends object
          ? { [Key in keyof T]: RewriteAuthorDialogueTree<T[Key]> }
          : T

export type AuthorCommand = RewriteAuthorDialogueTree<RuntimeCommand> | AuthorGrantRewardCommand
export interface AuthorStagesFlow extends Omit<RuntimeScriptFlow, 'stages'> {
  stages: RewriteAuthorDialogueTree<RuntimeScriptFlow['stages'][number]>[]
}
export type AuthorScriptFlow = AuthorStagesFlow | AuthorAcquisitionFlow
export type AuthorEntityBehaviors = RewriteAuthorDialogueTree<RuntimeEntityBehaviors>
export type AuthorEntityPage = RewriteAuthorDialogueTree<RuntimeEntityPage>
export type AuthorSceneHooks = RewriteAuthorDialogueTree<RuntimeSceneHooks>
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

/** 唯一运行时投影：展开内置意图，再把作者 identity 投成显示 cue。 */
export function resolveAuthorDialogueTree<T>(
  input: T,
  actorsById: Readonly<Record<string, ActorDef>>,
  rootPath = 'content',
  context: AuthorScriptResolutionContext = {},
): ResolveAuthorDialogueTree<T> {
  const visit = (value: unknown, path: string, self = context.self): unknown => {
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
    if (value.kind === 'dialog') {
      if (!('cue' in value)) throw new Error(`${path}.cue: dialog 缺 cue`)
      const next = Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => key !== 'cue')
          .map(([key, child]) => [key, visit(child, `${path}.${key}`, self)]),
      )
      next.cue = resolveAuthorDialogueCue(value.cue as AuthorDialogueCue, actorsById, `${path}.cue`)
      return next
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, visit(child, `${path}.${key}`, self)]),
    )
  }
  return visit(input, rootPath) as ResolveAuthorDialogueTree<T>
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
    if (value.kind === 'dialog') {
      checkAuthorDialogueCue(value.cue, `${path}.cue`)
      resolveDialogueIdentity(value.cue.identity, actorsById, `${path}.cue.identity`)
    }
    for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`)
  }
  visit(input, rootPath)
}

/** 所有作者内容根共用的当前命令校验选项。 */
export function authorCommandValidationOptions(
  options: CommandValidationOptions = {},
): CommandValidationOptions {
  return runtimeCommandValidationOptions({
    ...options,
    checkDialogueCue: checkAuthorDialogueCue,
  })
}

export function checkAuthorCommands(
  value: unknown,
  path: string,
  options: CommandValidationOptions = {},
): asserts value is AuthorCommand[] {
  checkRuntimeCommands(value, path, authorCommandValidationOptions(options))
}

export function checkAuthorScriptFlow(
  value: unknown,
  path: string,
  options: { allowSceneEntry?: boolean; forbidLoadScene?: boolean } = {},
): asserts value is AuthorScriptFlow {
  checkRuntimeScriptFlow(value, path, authorCommandValidationOptions(options))
}

export function checkAuthorEntityBehaviors(
  value: unknown,
  path: string,
): asserts value is AuthorEntityBehaviors {
  checkRuntimeEntityBehaviors(value, path, authorCommandValidationOptions())
}

export function checkAuthorEntityPages(
  pages: unknown,
  behaviors: unknown,
  initialPage: unknown,
  path: string,
): asserts pages is AuthorEntityPage[] {
  checkRuntimeEntityPages(pages, behaviors, initialPage, path, authorCommandValidationOptions())
}

export function checkAuthorSceneHooks(
  value: unknown,
  path: string,
): asserts value is AuthorSceneHooks {
  checkRuntimeSceneHooks(value, path, authorCommandValidationOptions())
}

export function checkAuthorScriptLibrary(
  value: unknown,
  path = 'content/shared-scripts.json',
): asserts value is AuthorScriptLibrary {
  checkRuntimeScriptLibrary(value, path, authorCommandValidationOptions())
}
