/**
 * 人物命令族：增删改/复制、解除实体关联、切换战斗精灵。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { ActorDef, AssetId, EntityDef, LevelUpSkill } from '@type-pal/content'
import { validateActors } from '@type-pal/content'
import type { Command } from './command-contract.js'
import { findScene, withEntities } from './command-scene-state.js'
import type { EditorState } from './edit-session.js'
import type { ProjectReferenceEdge } from './project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

/** 不可变:替换 actorId 角色;旁角色同引用。 */
function withActor(state: EditorState, actorId: string, newActor: ActorDef): EditorState {
  let hit = false
  const actors = state.actors.map((a) => {
    if (a.id !== actorId) return a
    hit = true
    return newActor
  })
  return hit ? { ...state, actors } : state
}

function assertActorCanBeAdded(state: EditorState, actor: ActorDef): void {
  validateActors([actor])
  for (const [field, value] of [
    ['id', actor.id],
    ['name', actor.name],
    ['spriteId', actor.spriteId],
  ] as const)
    if (!value.trim() || value !== value.trim())
      throw new Error(`人物 ${field} 必须是无首尾空格的非空字符串`)
  if (state.actors.some((candidate) => candidate.id === actor.id))
    throw new Error(`人物 id 已存在：${actor.id}`)
  if (!state.sprites.some((sprite) => sprite.id === actor.spriteId))
    throw new Error(`人物 ${actor.id} 的默认精灵不存在：${actor.spriteId}`)
  if (!(actor.name in state.locale) || !state.locale[actor.name]?.trim())
    throw new Error(`人物 ${actor.id} 的名称文本不存在或为空：${actor.name}`)
  const assertAsset = (id: AssetId | undefined, kind: 'portrait' | 'face', field: string): void => {
    if (!id) return
    const record = state.assetCatalog.assets[id]
    if (!record || record.kind !== kind)
      throw new Error(`人物 ${actor.id} 的${field}资源不存在或类型错误：${id}`)
  }
  assertAsset(actor.portraits?.default, 'portrait', '默认立绘')
  for (const [expression, id] of Object.entries(actor.portraits?.expressions ?? {}))
    assertAsset(id, 'portrait', `立绘“${expression}”`)
  assertAsset(actor.face, 'face', '小头像')
  if (
    actor.battler &&
    !state.battleSprites.some((battleSprite) => battleSprite.id === actor.battler!.battleSprite)
  )
    throw new Error(`人物 ${actor.id} 的战斗精灵不存在：${actor.battler.battleSprite}`)
  if (
    actor.battler?.coveredBy &&
    !state.actors.some((candidate) => candidate.id === actor.battler!.coveredBy)
  )
    throw new Error(`人物 ${actor.id} 的援护者不存在：${actor.battler.coveredBy}`)
}

function assertActorPatchCanBeApplied(
  state: EditorState,
  previous: ActorDef,
  actor: ActorDef,
  patch: ActorPatch,
): void {
  if (
    'spriteId' in patch &&
    actor.spriteId !== previous.spriteId &&
    !state.sprites.some((sprite) => sprite.id === actor.spriteId)
  )
    throw new Error(`人物 ${actor.id} 的默认精灵不存在：${actor.spriteId}`)
  const assertAsset = (id: AssetId | undefined, kind: 'portrait' | 'face', field: string): void => {
    if (!id) return
    const record = state.assetCatalog.assets[id]
    if (!record || record.kind !== kind)
      throw new Error(`人物 ${actor.id} 的${field}资源不存在或类型错误：${id}`)
  }
  if ('portraits' in patch) {
    const previousPortraits = new Set([
      ...(previous.portraits?.default ? [previous.portraits.default] : []),
      ...Object.values(previous.portraits?.expressions ?? {}),
    ])
    if (!previousPortraits.has(actor.portraits?.default ?? ''))
      assertAsset(actor.portraits?.default, 'portrait', '默认立绘')
    for (const [expression, id] of Object.entries(actor.portraits?.expressions ?? {}))
      if (!previousPortraits.has(id)) assertAsset(id, 'portrait', `立绘“${expression}”`)
  }
  if ('face' in patch && actor.face !== previous.face) assertAsset(actor.face, 'face', '小头像')
  if ('battler' in patch && actor.battler) {
    if (
      actor.battler.battleSprite !== previous.battler?.battleSprite &&
      !state.battleSprites.some((battleSprite) => battleSprite.id === actor.battler!.battleSprite)
    )
      throw new Error(`人物 ${actor.id} 的战斗精灵不存在：${actor.battler.battleSprite}`)
    if (
      actor.battler.coveredBy &&
      actor.battler.coveredBy !== previous.battler?.coveredBy &&
      !state.actors.some((candidate) => candidate.id === actor.battler!.coveredBy)
    )
      throw new Error(`人物 ${actor.id} 的援护者不存在：${actor.battler.coveredBy}`)
  }
}

/** 新建人物定义；locale 文本应由同一 CompositeCommand 在本命令前写入。 */
export class AddActorCommand implements Command {
  readonly label = '新增人物'
  private readonly actor: ActorDef
  private readonly requestedIndex: number | undefined

  constructor(actor: ActorDef, index?: number) {
    this.actor = structuredClone(actor)
    this.requestedIndex = index
  }

  apply(state: EditorState): EditorState {
    assertActorCanBeAdded(state, this.actor)
    const actors = [...state.actors]
    const index = Math.min(Math.max(0, this.requestedIndex ?? actors.length), actors.length)
    actors.splice(index, 0, structuredClone(this.actor))
    return { ...state, actors }
  }

  invert(state: EditorState): EditorState {
    const index = state.actors.findIndex((actor) => actor.id === this.actor.id)
    if (index < 0) return state
    return { ...state, actors: state.actors.filter((actor) => actor.id !== this.actor.id) }
  }
}

/** 复制人物定义及其 levelUp 伴随表；共享资源仍按 id 引用，不复制资产。 */
export class CopyActorCommand implements Command {
  readonly label = '复制人物'
  private copied = false
  private copiedActor: ActorDef | undefined
  private copiedLevelUp: LevelUpSkill[] | undefined

  constructor(
    private readonly sourceActorId: string,
    private readonly nextActorId: string,
    private readonly nextNameId: string,
  ) {}

  apply(state: EditorState): EditorState {
    if (!this.copiedActor) {
      const source = state.actors.find((actor) => actor.id === this.sourceActorId)
      if (!source) throw new Error(`复制来源人物不存在：${this.sourceActorId}`)
      this.copiedActor = structuredClone(source)
      this.copiedActor.id = this.nextActorId
      this.copiedActor.name = this.nextNameId
      this.copiedLevelUp = state.levelUp[this.sourceActorId]
        ? structuredClone(state.levelUp[this.sourceActorId])
        : undefined
    }
    const actor = structuredClone(this.copiedActor)
    assertActorCanBeAdded(state, actor)
    this.copied = true
    return {
      ...state,
      actors: [...state.actors, actor],
      levelUp: this.copiedLevelUp
        ? { ...state.levelUp, [this.nextActorId]: structuredClone(this.copiedLevelUp) }
        : state.levelUp,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.copied) return state
    const levelUp = { ...state.levelUp }
    delete levelUp[this.nextActorId]
    return {
      ...state,
      actors: state.actors.filter((actor) => actor.id !== this.nextActorId),
      levelUp,
    }
  }
}

/** 删除前重算 Actor 全引用闭包；levelUp 是伴随数据，随人物同事务清理与恢复。 */
export class ActorInUseError extends Error {
  constructor(
    readonly actorId: string,
    readonly references: readonly ProjectReferenceEdge[],
  ) {
    super(
      `人物 ${actorId} 仍被 ${references.length} 处引用：\n${references
        .slice(0, 20)
        .map((reference) => `${reference.source.label} · ${reference.where}`)
        .join('\n')}`,
    )
    this.name = 'ActorInUseError'
  }
}

export class DeleteActorCommand implements Command {
  readonly label = '删除人物'
  private removed: ActorDef | undefined
  private removedLevelUp: LevelUpSkill[] | undefined
  private hadLevelUp = false
  private index = -1

  constructor(
    private readonly actorId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const index = state.actors.findIndex((actor) => actor.id === this.actorId)
    if (index < 0) return state
    const blockers = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'actor',
      id: this.actorId,
    }).blockers
    if (blockers.length) throw new ActorInUseError(this.actorId, blockers)
    if (!this.removed) {
      this.removed = structuredClone(state.actors[index]!)
      this.index = index
      this.hadLevelUp = Object.hasOwn(state.levelUp, this.actorId)
      this.removedLevelUp = state.levelUp[this.actorId]
        ? structuredClone(state.levelUp[this.actorId])
        : undefined
    }
    const levelUp = { ...state.levelUp }
    delete levelUp[this.actorId]
    return {
      ...state,
      actors: state.actors.filter((actor) => actor.id !== this.actorId),
      levelUp,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    if (state.actors.some((actor) => actor.id === this.actorId))
      throw new Error(`无法撤销删除：人物 id 已被占用 ${this.actorId}`)
    const actors = [...state.actors]
    actors.splice(
      Math.min(Math.max(0, this.index), actors.length),
      0,
      structuredClone(this.removed),
    )
    const levelUp = { ...state.levelUp }
    if (this.hadLevelUp && this.removedLevelUp)
      levelUp[this.actorId] = structuredClone(this.removedLevelUp)
    else delete levelUp[this.actorId]
    return { ...state, actors, levelUp }
  }
}

/** actor 实例解除关联为当前默认 sprite；除判别字段外逐字段原样保留。 */
export class DetachActorEntityCommand implements Command {
  readonly label = '解除人物关联'
  private original: EntityDef | undefined

  constructor(
    private readonly sceneId: string,
    private readonly entityId: string,
  ) {}

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    const entity = scene?.entities.find((candidate) => candidate.id === this.entityId)
    if (!scene || !entity || !('actor' in entity)) return state
    const actor = state.actors.find((candidate) => candidate.id === entity.actor)
    if (!actor)
      throw new Error(`实体 ${this.sceneId}/${this.entityId} 的人物不存在：${entity.actor}`)
    if (!state.sprites.some((sprite) => sprite.id === actor.spriteId))
      throw new Error(`人物 ${actor.id} 的默认精灵不存在：${actor.spriteId}`)
    if (!this.original) this.original = structuredClone(entity)
    const { actor: _actor, ...instance } = entity
    const detached: EntityDef = { ...instance, sprite: actor.spriteId }
    return withEntities(
      state,
      this.sceneId,
      scene.entities.map((candidate) => (candidate.id === this.entityId ? detached : candidate)),
    )
  }

  invert(state: EditorState): EditorState {
    if (!this.original) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    return withEntities(
      state,
      this.sceneId,
      scene.entities.map((candidate) =>
        candidate.id === this.entityId ? structuredClone(this.original!) : candidate,
      ),
    )
  }
}

/** UpdateActor 的 patch 范围(名字 / 头像组 / 小头像 / 战斗数据 / 精灵引用)。 */
export type ActorPatch = Partial<
  Pick<ActorDef, 'name' | 'portraits' | 'face' | 'battler' | 'spriteId'>
>

/** 改角色字段。语义同上:首次 apply 捕获旧值,invert 还原;portraits/battler 深拷贝。 */
export class UpdateActorCommand implements Command {
  readonly label = '修改角色'
  private readonly actorId: string
  private readonly patch: ActorPatch
  private oldPatch: ActorPatch | undefined

  constructor(actorId: string, patch: ActorPatch) {
    this.actorId = actorId
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const a = state.actors.find((x) => x.id === this.actorId)
    if (!a) return state
    if (!this.oldPatch) this.oldPatch = this.captureOld(a)
    const next = { ...a, ...this.patch }
    assertActorPatchCanBeApplied(state, a, next, this.patch)
    return withActor(state, this.actorId, next)
  }

  private captureOld(a: ActorDef): ActorPatch {
    const old: ActorPatch = {}
    if ('name' in this.patch) old.name = a.name
    if ('spriteId' in this.patch) old.spriteId = a.spriteId
    if ('face' in this.patch) old.face = a.face
    if ('portraits' in this.patch)
      old.portraits = a.portraits ? structuredClone(a.portraits) : undefined
    if ('battler' in this.patch) old.battler = a.battler ? structuredClone(a.battler) : undefined
    return old
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const a = state.actors.find((x) => x.id === this.actorId)
    if (!a) return state
    return withActor(state, this.actorId, { ...a, ...this.oldPatch })
  }
}

/** 只切换角色语义定义；无 battler 的角色保持 no-op。 */
export class SetActorBattleSpriteCommand implements Command {
  readonly label = '设置角色战斗精灵'
  private previous: string | undefined

  constructor(
    private readonly actorId: string,
    private readonly definitionId: string,
  ) {}

  apply(state: EditorState): EditorState {
    const actor = state.actors.find((entry) => entry.id === this.actorId)
    if (!actor?.battler) return state
    const definition = state.battleSprites.find((entry) => entry.id === this.definitionId)
    if (!definition || definition.profile.kind !== 'player-fighter')
      throw new Error(`角色只能引用 player-fighter profile：${this.definitionId}`)
    this.previous ??= actor.battler.battleSprite
    return {
      ...state,
      actors: state.actors.map((entry) =>
        entry.id === this.actorId && entry.battler
          ? {
              ...entry,
              battler: { ...entry.battler, battleSprite: this.definitionId },
            }
          : entry,
      ),
    }
  }

  invert(state: EditorState): EditorState {
    if (this.previous === undefined) return state
    return {
      ...state,
      actors: state.actors.map((entry) =>
        entry.id === this.actorId && entry.battler
          ? { ...entry, battler: { ...entry.battler, battleSprite: this.previous! } }
          : entry,
      ),
    }
  }
}
