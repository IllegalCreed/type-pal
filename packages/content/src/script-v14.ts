import type { ActorDef } from './actor.js'
import {
  checkDialogueCueV14,
  dialogueCueV14ToV13Shape,
  resolveDialogueIdentityV14,
  resolveDialogueCueV14,
  type DialogueCueV14,
  upgradeDialogueCueV13ToV14,
} from './dialogue-v14.js'
import type { DialogueCue } from './index.js'
import type { CheckAuthorCommandsV5Options } from './script-v5.js'
import type {
  AuthorCommandV13,
  EntityBehaviorsV13,
  EntityPageV13,
  SceneHooksV13,
  ScriptFlowV13,
  SharedScriptLibraryV13,
} from './script-v13.js'
import {
  checkAuthorCommandsV13,
  checkEntityBehaviorsV13,
  checkEntityPagesV13,
  checkSceneHooksV13,
  checkScriptFlowV13,
  checkSharedScriptLibraryV13,
} from './script-v13.js'

/** 只替换 dialog cue；其余历史 v13 命令词汇与递归结构逐字段保持。 */
export type RewriteDialogueTreeV14<T> = T extends { kind: 'dialog'; cue: DialogueCue }
  ? Omit<T, 'cue'> & { cue: DialogueCueV14 }
  : T extends readonly (infer Item)[]
    ? RewriteDialogueTreeV14<Item>[]
    : T extends object
      ? { [Key in keyof T]: RewriteDialogueTreeV14<T[Key]> }
      : T

export type AuthorCommandV14 = RewriteDialogueTreeV14<AuthorCommandV13>
export type ScriptFlowV14 = RewriteDialogueTreeV14<ScriptFlowV13>
export type EntityBehaviorsV14 = RewriteDialogueTreeV14<EntityBehaviorsV13>
export type EntityPageV14 = RewriteDialogueTreeV14<EntityPageV13>
export type SceneHooksV14 = RewriteDialogueTreeV14<SceneHooksV13>
export type SharedScriptLibraryV14 = RewriteDialogueTreeV14<SharedScriptLibraryV13>

export interface DialogueTreeV14UpgradeResult<T> {
  value: RewriteDialogueTreeV14<T>
  upgradedCues: number
}

export type ResolveDialogueTreeV14<T> = T extends { kind: 'dialog'; cue: DialogueCueV14 }
  ? Omit<T, 'cue'> & { cue: DialogueCue }
  : T extends readonly (infer Item)[]
    ? ResolveDialogueTreeV14<Item>[]
    : T extends object
      ? { [Key in keyof T]: ResolveDialogueTreeV14<T[Key]> }
      : T

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * 任意 canonical command surface 的纯 v13→v14 升级。判定只看真正的 dialog command，
 * 因而 scene/item/shared/enemy ai.hooks/onDefeated/choreography 共用同一棵 walker。
 */
export function upgradeDialogueTreeV13ToV14WithCount<T>(
  input: T,
): DialogueTreeV14UpgradeResult<T> {
  let upgradedCues = 0
  const visit = (value: unknown, path: string): unknown => {
    if (Array.isArray(value)) return value.map((entry, index) => visit(entry, `${path}[${index}]`))
    if (!isRecord(value)) return value
    if (value.kind === 'dialog') {
      if (!('cue' in value)) throw new Error(`${path}.cue: dialog 缺 cue`)
      if (isRecord(value.cue) && 'identity' in value.cue)
        throw new Error(`${path}.cue.identity: 输入已是 content14，拒绝重复升级`)
      upgradedCues++
      const next: Record<string, unknown> = {}
      for (const [key, child] of Object.entries(value))
        next[key] =
          key === 'cue'
            ? upgradeDialogueCueV13ToV14(child as DialogueCue)
            : visit(child, `${path}.${key}`)
      return next
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, visit(child, `${path}.${key}`)]),
    )
  }
  return {
    value: visit(input, 'content') as RewriteDialogueTreeV14<T>,
    upgradedCues,
  }
}

export function upgradeDialogueTreeV13ToV14<T>(input: T): RewriteDialogueTreeV14<T> {
  return upgradeDialogueTreeV13ToV14WithCount(input).value
}

/** v14→v13 shape inverse；C1 seal另用冻结 key-order提示恢复原始 JSON 字节。 */
export function downgradeDialogueTreeV14ToV13<T>(input: T): T {
  const visit = (value: unknown, path: string): unknown => {
    if (Array.isArray(value)) return value.map((entry, index) => visit(entry, `${path}[${index}]`))
    if (!isRecord(value)) return value
    if (value.kind === 'dialog') {
      checkDialogueCueV14(value.cue, `${path}.cue`)
      const cue = value.cue
      if (cue.identity.kind === 'actor')
        throw new Error(`${path}.cue.identity: actor 身份无法无损回退 content13`)
      const legacyCueRecord: Record<string, unknown> = {}
      for (const [key, child] of Object.entries(cue)) {
        if (key !== 'identity') {
          legacyCueRecord[key] = cloneJson(child)
          continue
        }
        if (cue.identity.kind !== 'unbound') continue
        for (const [identityKey, identityValue] of Object.entries(cue.identity)) {
          if (identityKey === 'kind') continue
          legacyCueRecord[identityKey] = cloneJson(identityValue)
        }
      }
      const legacyCue = legacyCueRecord as unknown as DialogueCue
      const next: Record<string, unknown> = {}
      for (const [key, child] of Object.entries(value))
        next[key] = key === 'cue' ? legacyCue : visit(child, `${path}.${key}`)
      return next
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, visit(child, `${path}.${key}`)]),
    )
  }
  return visit(input, 'content') as T
}

/** v14 validator 复用冻结 v13 shape guard 的副本；会先严格验证每一个 identity。 */
export function sanitizeDialogueTreeV14ToV13Shape<T>(input: T, rootPath = 'content'): T {
  const visit = (value: unknown, path: string): unknown => {
    if (Array.isArray(value)) return value.map((entry, index) => visit(entry, `${path}[${index}]`))
    if (!isRecord(value)) return value
    if (value.kind === 'dialog') {
      if (!('cue' in value)) throw new Error(`${path}.cue: dialog 缺 cue`)
      checkDialogueCueV14(value.cue, `${path}.cue`)
      const next = Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => key !== 'cue')
          .map(([key, child]) => [key, visit(child, `${path}.${key}`)]),
      )
      next.cue = dialogueCueV14ToV13Shape(value.cue)
      return next
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, visit(child, `${path}.${key}`)]),
    )
  }
  return visit(input, rootPath) as T
}

/** K1 runtime 投影：只经唯一 resolver 把作者 identity 投成冻结 v13 的显示 cue。 */
export function resolveDialogueTreeV14ToV13<T>(
  input: T,
  actorsById: Readonly<Record<string, ActorDef>>,
  rootPath = 'content',
): ResolveDialogueTreeV14<T> {
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
      next.cue = resolveDialogueCueV14(
        value.cue as DialogueCueV14,
        actorsById,
        `${path}.cue`,
      )
      return next
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, visit(child, `${path}.${key}`)]),
    )
  }
  return visit(input, rootPath) as ResolveDialogueTreeV14<T>
}

/** 全树 Actor/expression fail-closed；不靠 AssetId 或显示文本猜人物。 */
export function assertDialogueIdentityReferencesV14(
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
      checkDialogueCueV14(value.cue, `${path}.cue`)
      resolveDialogueIdentityV14(value.cue.identity, actorsById, `${path}.cue.identity`)
    }
    for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`)
  }
  visit(input, rootPath)
}

export function checkAuthorCommandsV14(
  value: unknown,
  path: string,
  options: CheckAuthorCommandsV5Options = {},
): asserts value is AuthorCommandV14[] {
  checkAuthorCommandsV13(sanitizeDialogueTreeV14ToV13Shape(value, path), path, options)
}

export function checkScriptFlowV14(
  value: unknown,
  path: string,
  options: { allowSceneEntry?: boolean; forbidLoadScene?: boolean } = {},
): asserts value is ScriptFlowV14 {
  checkScriptFlowV13(sanitizeDialogueTreeV14ToV13Shape(value, path), path, options)
}

export function checkEntityBehaviorsV14(
  value: unknown,
  path: string,
): asserts value is EntityBehaviorsV14 {
  checkEntityBehaviorsV13(sanitizeDialogueTreeV14ToV13Shape(value, path), path)
}

export function checkEntityPagesV14(
  pages: unknown,
  behaviors: unknown,
  initialPage: unknown,
  path: string,
): asserts pages is EntityPageV14[] {
  checkEntityPagesV13(
    sanitizeDialogueTreeV14ToV13Shape(pages, `${path}.pages`),
    sanitizeDialogueTreeV14ToV13Shape(behaviors, `${path}.behaviors`),
    initialPage,
    path,
  )
}

export function checkSceneHooksV14(value: unknown, path: string): asserts value is SceneHooksV14 {
  checkSceneHooksV13(sanitizeDialogueTreeV14ToV13Shape(value, path), path)
}

export function checkSharedScriptLibraryV14(
  value: unknown,
  path = 'content/shared-scripts.json',
): asserts value is SharedScriptLibraryV14 {
  checkSharedScriptLibraryV13(sanitizeDialogueTreeV14ToV13Shape(value, path), path)
}
