import type { ActorDef } from './actor.js'
import type { AssetId } from './asset.js'
import type { DialogueCue, DialogueRow, TextId } from './index.js'

export type DialogueSide = 'left' | 'right'

/** Actor 对话只能引用人物自己的主立绘或命名表情，不允许直接夹带全局 AssetId。 */
export type DialogueActorPortrait =
  | { kind: 'default'; side: DialogueSide }
  | { kind: 'expression'; expression: string; side: DialogueSide }

/**
 * 当前作者对话身份联合。
 *
 * `unbound` 是对旧工程与非人物称谓的正式表达，不是迁移临时态；它至少保留 speaker/portrait
 * 之一。`slot` 仍是窗口表现，不参与身份判别。
 */
export type DialogueIdentity =
  | { kind: 'narration' }
  | {
      kind: 'actor'
      actor: string
      speakerOverride?: TextId
      portrait?: DialogueActorPortrait
    }
  | {
      kind: 'unbound'
      speaker?: TextId
      portrait?: { asset: AssetId; side: DialogueSide }
    }

export interface AuthorDialogueCue {
  identity: DialogueIdentity
  rows: DialogueRow[]
  autoAdvance?: number
  slot?: 'top' | 'bottom' | 'narration' | 'center'
  cursorFrame?: 0 | 1 | 2
}

/** runtime、编辑器预览与树摘要共享的唯一解析结果。 */
export interface ResolvedDialogueIdentity {
  speaker?: TextId
  portrait?: { asset: AssetId; side: DialogueSide }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const keys = new Set(allowed)
  for (const key of Object.keys(value))
    if (!keys.has(key)) throw new Error(`${path}.${key}: 未知字段`)
}

function nonEmptyString(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0 || value !== value.trim())
    throw new Error(`${path}: 期望非空且无首尾空格的 string`)
}

function checkSide(value: unknown, path: string): asserts value is DialogueSide {
  if (value !== 'left' && value !== 'right') throw new Error(`${path}: 期望 left|right`)
}

function checkDirectPortrait(
  value: unknown,
  path: string,
): asserts value is { asset: AssetId; side: DialogueSide } {
  const portrait = record(value, path)
  exactKeys(portrait, ['asset', 'side'], path)
  nonEmptyString(portrait.asset, `${path}.asset`)
  checkSide(portrait.side, `${path}.side`)
}

function checkActorPortrait(value: unknown, path: string): asserts value is DialogueActorPortrait {
  const portrait = record(value, path)
  if (portrait.kind === 'default') {
    exactKeys(portrait, ['kind', 'side'], path)
    checkSide(portrait.side, `${path}.side`)
    return
  }
  if (portrait.kind === 'expression') {
    exactKeys(portrait, ['kind', 'expression', 'side'], path)
    nonEmptyString(portrait.expression, `${path}.expression`)
    checkSide(portrait.side, `${path}.side`)
    return
  }
  throw new Error(`${path}.kind: 期望 default|expression`)
}

export function checkDialogueIdentity(
  value: unknown,
  path: string,
): asserts value is DialogueIdentity {
  const identity = record(value, path)
  if (identity.kind === 'narration') {
    exactKeys(identity, ['kind'], path)
    return
  }
  if (identity.kind === 'actor') {
    exactKeys(identity, ['kind', 'actor', 'speakerOverride', 'portrait'], path)
    nonEmptyString(identity.actor, `${path}.actor`)
    if (identity.speakerOverride !== undefined)
      nonEmptyString(identity.speakerOverride, `${path}.speakerOverride`)
    if (identity.portrait !== undefined) checkActorPortrait(identity.portrait, `${path}.portrait`)
    return
  }
  if (identity.kind === 'unbound') {
    exactKeys(identity, ['kind', 'speaker', 'portrait'], path)
    if (identity.speaker !== undefined) nonEmptyString(identity.speaker, `${path}.speaker`)
    if (identity.portrait !== undefined) checkDirectPortrait(identity.portrait, `${path}.portrait`)
    if (identity.speaker === undefined && identity.portrait === undefined)
      throw new Error(`${path}: unbound 至少需要 speaker 或 portrait`)
    return
  }
  throw new Error(`${path}.kind: 期望 narration|actor|unbound`)
}

/**
 * 作者 cue 的唯一形状守卫；不接受身份旧字段的半迁移状态。
 */
export function checkAuthorDialogueCue(
  value: unknown,
  path: string,
): asserts value is AuthorDialogueCue {
  const cue = record(value, path)
  exactKeys(cue, ['identity', 'rows', 'autoAdvance', 'slot', 'cursorFrame'], path)
  checkDialogueIdentity(cue.identity, `${path}.identity`)
  if (!Array.isArray(cue.rows) || cue.rows.length === 0)
    throw new Error(`${path}.rows: 期望非空数组`)
  cue.rows.forEach((rawRow, index) => {
    const row = record(rawRow, `${path}.rows[${index}]`)
    exactKeys(row, ['text', 'speed'], `${path}.rows[${index}]`)
    nonEmptyString(row.text, `${path}.rows[${index}].text`)
    if (
      row.speed !== undefined &&
      (typeof row.speed !== 'number' || !Number.isFinite(row.speed) || row.speed < 0)
    )
      throw new Error(`${path}.rows[${index}].speed: 期望非负有限数`)
  })
  if (
    cue.autoAdvance !== undefined &&
    (typeof cue.autoAdvance !== 'number' ||
      !Number.isFinite(cue.autoAdvance) ||
      cue.autoAdvance < 0)
  )
    throw new Error(`${path}.autoAdvance: 期望非负有限数`)
  if (
    cue.slot !== undefined &&
    cue.slot !== 'top' &&
    cue.slot !== 'bottom' &&
    cue.slot !== 'narration' &&
    cue.slot !== 'center'
  )
    throw new Error(`${path}.slot: 期望 top|bottom|narration|center`)
  if (
    cue.cursorFrame !== undefined &&
    cue.cursorFrame !== 0 &&
    cue.cursorFrame !== 1 &&
    cue.cursorFrame !== 2
  )
    throw new Error(`${path}.cursorFrame: 期望 0|1|2`)
}

/** 禁止 fallback；Actor、主立绘、表情任一缺失都在唯一解析器 fail-loud。 */
export function resolveDialogueIdentity(
  identity: DialogueIdentity,
  actorsById: Readonly<Record<string, ActorDef>>,
  path = 'dialogue.identity',
): ResolvedDialogueIdentity {
  checkDialogueIdentity(identity, path)
  if (identity.kind === 'narration') return {}
  if (identity.kind === 'unbound')
    return {
      ...(identity.speaker !== undefined ? { speaker: identity.speaker } : {}),
      ...(identity.portrait !== undefined ? { portrait: { ...identity.portrait } } : {}),
    }

  const actor = actorsById[identity.actor]
  if (!actor) throw new Error(`${path}.actor: 未知 Actor "${identity.actor}"`)
  let portrait: ResolvedDialogueIdentity['portrait']
  if (identity.portrait?.kind === 'default') {
    if (!actor.portraits?.default)
      throw new Error(`${path}.portrait: Actor "${identity.actor}" 缺 portraits.default`)
    portrait = { asset: actor.portraits.default, side: identity.portrait.side }
  } else if (identity.portrait?.kind === 'expression') {
    const asset = actor.portraits?.expressions?.[identity.portrait.expression]
    if (!asset)
      throw new Error(
        `${path}.portrait.expression: Actor "${identity.actor}" 缺表情 "${identity.portrait.expression}"`,
      )
    portrait = { asset, side: identity.portrait.side }
  }
  return {
    speaker: identity.speakerOverride ?? actor.name,
    ...(portrait ? { portrait } : {}),
  }
}

export function resolveAuthorDialogueCue(
  cue: AuthorDialogueCue,
  actorsById: Readonly<Record<string, ActorDef>>,
  path = 'dialogue.cue',
): DialogueCue {
  checkAuthorDialogueCue(cue, path)
  const resolved = resolveDialogueIdentity(cue.identity, actorsById, `${path}.identity`)
  return {
    ...resolved,
    rows: cue.rows.map((row) => ({ ...row })),
    ...(cue.autoAdvance !== undefined ? { autoAdvance: cue.autoAdvance } : {}),
    ...(cue.slot !== undefined ? { slot: cue.slot } : {}),
    ...(cue.cursorFrame !== undefined ? { cursorFrame: cue.cursorFrame } : {}),
  }
}
