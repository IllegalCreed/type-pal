import { renameDialoguePortraitExpressionV14 } from '@type-pal/content'
import type { EditorState } from './edit-session.js'
import type { Command } from './commands.js'
import { collectEditorDialoguePortraitReferences } from './actor-references.js'

type DialogueStateSlice = Pick<
  EditorState,
  'actors' | 'scenes' | 'items' | 'sharedScripts' | 'scriptChunks' | 'enemies'
>

function capture(state: EditorState): DialogueStateSlice {
  return {
    actors: structuredClone(state.actors),
    scenes: structuredClone(state.scenes),
    items: structuredClone(state.items),
    sharedScripts: state.sharedScripts ? structuredClone(state.sharedScripts) : undefined,
    scriptChunks: structuredClone(state.scriptChunks),
    enemies: state.enemies ? structuredClone(state.enemies) : undefined,
  }
}

function restore(state: EditorState, slice: DialogueStateSlice): EditorState {
  return {
    ...state,
    actors: structuredClone(slice.actors),
    scenes: structuredClone(slice.scenes),
    items: structuredClone(slice.items),
    sharedScripts: slice.sharedScripts ? structuredClone(slice.sharedScripts) : undefined,
    scriptChunks: structuredClone(slice.scriptChunks),
    enemies: slice.enemies ? structuredClone(slice.enemies) : undefined,
  }
}

function expressionBlockers(state: EditorState, actorId: string, expression?: string) {
  return collectEditorDialoguePortraitReferences(state).filter(
    (reference) =>
      reference.actorId === actorId &&
      (expression === undefined ||
        (reference.portraitKind === 'expression' && reference.expression === expression)),
  )
}

/** 表情 key 与全部 content14 cue 引用一次改写、一次 undo。 */
export class RenameActorPortraitExpressionCommand implements Command {
  readonly label = '重命名人物表情'
  private previous: DialogueStateSlice | undefined

  constructor(
    private readonly actorId: string,
    private readonly from: string,
    private readonly to: string,
  ) {}

  apply(state: EditorState): EditorState {
    const to = this.to.trim()
    if (!to || to !== this.to) throw new Error('表情名不能为空或包含首尾空格')
    if (this.from === to) return state
    const actorIndex = state.actors.findIndex((actor) => actor.id === this.actorId)
    const actor = state.actors[actorIndex]
    if (!actor?.portraits?.expressions?.[this.from])
      throw new Error(`人物 ${this.actorId} 不存在表情“${this.from}”`)
    if (actor.portraits.expressions[to])
      throw new Error(`人物 ${this.actorId} 已存在表情“${to}”`)
    if (!this.previous) this.previous = capture(state)

    const expressions = { ...actor.portraits.expressions }
    const asset = expressions[this.from]!
    delete expressions[this.from]
    expressions[to] = asset
    const actors = state.actors.map((candidate, index) =>
      index === actorIndex
        ? { ...candidate, portraits: { ...actor.portraits!, expressions } }
        : candidate,
    )
    let rewritten = 0
    const rename = <T,>(value: T): T => {
      const result = renameDialoguePortraitExpressionV14(value, this.actorId, this.from, to)
      rewritten += result.rewritten
      return result.value
    }
    const scenes = rename(state.scenes)
    const items = rename(state.items)
    const sharedScripts = state.sharedScripts ? rename(state.sharedScripts) : undefined
    const scriptChunks = rename(state.scriptChunks)
    const enemies = state.enemies ? rename(state.enemies) : undefined
    const expected = expressionBlockers(state, this.actorId, this.from).length
    if (rewritten !== expected)
      throw new Error(`表情引用改写不闭合：期望 ${expected}，实际 ${rewritten}`)
    return { ...state, actors, scenes, items, sharedScripts, scriptChunks, enemies }
  }

  invert(state: EditorState): EditorState {
    return this.previous ? restore(state, this.previous) : state
  }
}

/** 被 cue 引用的表情不可删除；换 asset 不影响稳定 expression key。 */
export class RemoveActorPortraitExpressionCommand implements Command {
  readonly label = '删除人物表情'
  private previous: DialogueStateSlice | undefined

  constructor(
    private readonly actorId: string,
    private readonly expression: string,
  ) {}

  apply(state: EditorState): EditorState {
    const blockers = expressionBlockers(state, this.actorId, this.expression)
    if (blockers.length)
      throw new Error(
        `人物 ${this.actorId} 的表情“${this.expression}”仍被 ${blockers.length} 处对话引用：\n${blockers
          .slice(0, 20)
          .map((reference) => `${reference.label} · ${reference.where}`)
          .join('\n')}`,
      )
    const actorIndex = state.actors.findIndex((actor) => actor.id === this.actorId)
    const actor = state.actors[actorIndex]
    const expressions = actor?.portraits?.expressions
    if (!actor?.portraits || !expressions?.[this.expression]) return state
    if (!this.previous) this.previous = capture(state)
    const nextExpressions = { ...expressions }
    delete nextExpressions[this.expression]
    const portraits = Object.keys(nextExpressions).length
      ? { ...actor.portraits, expressions: nextExpressions }
      : { default: actor.portraits.default }
    return {
      ...state,
      actors: state.actors.map((candidate, index) =>
        index === actorIndex ? { ...candidate, portraits } : candidate,
      ),
    }
  }

  invert(state: EditorState): EditorState {
    return this.previous ? restore(state, this.previous) : state
  }
}

/** 主立绘或任一表情被人物 cue 使用时，整个立绘组不可删除。 */
export class RemoveActorPortraitSetCommand implements Command {
  readonly label = '删除人物立绘组'
  private previous: DialogueStateSlice | undefined

  constructor(private readonly actorId: string) {}

  apply(state: EditorState): EditorState {
    const blockers = expressionBlockers(state, this.actorId)
    if (blockers.length)
      throw new Error(
        `人物 ${this.actorId} 的立绘组仍被 ${blockers.length} 处对话引用：\n${blockers
          .slice(0, 20)
          .map((reference) => `${reference.label} · ${reference.where}`)
          .join('\n')}`,
      )
    const actorIndex = state.actors.findIndex((actor) => actor.id === this.actorId)
    const actor = state.actors[actorIndex]
    if (!actor?.portraits) return state
    if (!this.previous) this.previous = capture(state)
    const next = { ...actor }
    delete next.portraits
    return {
      ...state,
      actors: state.actors.map((candidate, index) => (index === actorIndex ? next : candidate)),
    }
  }

  invert(state: EditorState): EditorState {
    return this.previous ? restore(state, this.previous) : state
  }
}
