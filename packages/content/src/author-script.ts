import type { ActorDef } from './actor.js'
import {
  checkAuthorDialogueCue,
  resolveDialogueIdentity,
  resolveAuthorDialogueCue,
  type AuthorDialogueCue,
} from './author-dialogue.js'
import type { DialogueCue } from './index.js'
import type { CommandValidationOptions } from './author-script-core.js'
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

/** 作者树只扩展 dialog cue；其余命令词汇与递归结构共享运行时模型。 */
export type RewriteAuthorDialogueTree<T> = T extends { kind: 'dialog'; cue: DialogueCue }
  ? Omit<T, 'cue'> & { cue: AuthorDialogueCue }
  : T extends readonly (infer Item)[]
    ? RewriteAuthorDialogueTree<Item>[]
    : T extends object
      ? { [Key in keyof T]: RewriteAuthorDialogueTree<T[Key]> }
      : T

export type AuthorCommand = RewriteAuthorDialogueTree<RuntimeCommand>
export type AuthorScriptFlow = RewriteAuthorDialogueTree<RuntimeScriptFlow>
export type AuthorEntityBehaviors = RewriteAuthorDialogueTree<RuntimeEntityBehaviors>
export type AuthorEntityPage = RewriteAuthorDialogueTree<RuntimeEntityPage>
export type AuthorSceneHooks = RewriteAuthorDialogueTree<RuntimeSceneHooks>
export type AuthorScriptLibrary = RewriteAuthorDialogueTree<RuntimeScriptLibrary>

export type ResolveAuthorDialogueTree<T> = T extends { kind: 'dialog'; cue: AuthorDialogueCue }
  ? Omit<T, 'cue'> & { cue: DialogueCue }
  : T extends readonly (infer Item)[]
    ? ResolveAuthorDialogueTree<Item>[]
    : T extends object
      ? { [Key in keyof T]: ResolveAuthorDialogueTree<T[Key]> }
      : T

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** 运行时投影：只经唯一 resolver 把作者 identity 投成显示 cue。 */
export function resolveAuthorDialogueTree<T>(
  input: T,
  actorsById: Readonly<Record<string, ActorDef>>,
  rootPath = 'content',
): ResolveAuthorDialogueTree<T> {
  const visit = (value: unknown, path: string): unknown => {
    if (Array.isArray(value)) return value.map((entry, index) => visit(entry, `${path}[${index}]`))
    if (!isRecord(value)) return value
    if (value.kind === 'dialog') {
      if (!('cue' in value)) throw new Error(`${path}.cue: dialog 缺 cue`)
      const next = Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => key !== 'cue')
          .map(([key, child]) => [key, visit(child, `${path}.${key}`)]),
      )
      next.cue = resolveAuthorDialogueCue(
        value.cue as AuthorDialogueCue,
        actorsById,
        `${path}.cue`,
      )
      return next
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, visit(child, `${path}.${key}`)]),
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
      value.forEach((entry, index) => visit(entry, `${path}[${index}]`))
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

export function checkAuthorSceneHooks(value: unknown, path: string): asserts value is AuthorSceneHooks {
  checkRuntimeSceneHooks(value, path, authorCommandValidationOptions())
}

export function checkAuthorScriptLibrary(
  value: unknown,
  path = 'content/shared-scripts.json',
): asserts value is AuthorScriptLibrary {
  checkRuntimeScriptLibrary(value, path, authorCommandValidationOptions())
}
