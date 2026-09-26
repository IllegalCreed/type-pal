/**
 * 实体命令族：移动/新增/删除/修改实体，以及 prop 精灵引用切换。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { EntityDef, Facing, GridPos } from '@type-pal/content'
import type { Command } from './command-contract.js'
import {
  entityPos,
  findScene,
  withEntities,
  withEntityPos,
  withScene,
} from './command-scene-state.js'
import type { EditorState } from './edit-session.js'
import type { CurrentProjectReferenceIndexProvider } from './project-reference-adapters.js'

/**
 * 移动实体(布置模式核心操作)。apply 记下旧 pos → invert 用旧 pos 还原。
 * 旧 pos 在首次 apply 时捕获(此时 state 还是初始态);invert 用的也是它。
 */
export class MoveEntityCommand implements Command {
  readonly label = '移动实体'
  private readonly sceneId: string
  private readonly entityId: string
  private readonly to: GridPos
  private oldPos: GridPos | undefined

  constructor(sceneId: string, entityId: string, to: GridPos) {
    this.sceneId = sceneId
    this.entityId = entityId
    this.to = to
  }

  apply(state: EditorState): EditorState {
    if (this.oldPos === undefined) this.oldPos = entityPos(state, this.sceneId, this.entityId)
    return withEntityPos(state, this.sceneId, this.entityId, this.to)
  }

  invert(state: EditorState): EditorState {
    // oldPos 在 apply 时已捕获;redo 走 apply 不需它。防御:缺则查当前(理论不会)。
    const back = this.oldPos ?? entityPos(state, this.sceneId, this.entityId)
    if (!back) return state
    return withEntityPos(state, this.sceneId, this.entityId, back)
  }
}

/**
 * 新增实体到场景(追加到 entities 末尾)。invert 移除该实体。
 * 不可变:新实体为深拷贝(独立于构造入参 entity,避免外部改动回写命令态)。
 */
export class AddEntityCommand implements Command {
  readonly label = '新增实体'
  private readonly sceneId: string
  private readonly entity: EntityDef
  private added: boolean = false

  constructor(sceneId: string, entity: EntityDef) {
    this.sceneId = sceneId
    // 深拷贝入参:命令持有自己的副本,外部再改原对象不影响 apply/invert。
    this.entity = structuredClone(entity)
  }

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    this.added = true
    return withEntities(state, this.sceneId, [...scene.entities, this.entity])
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    return withEntities(
      state,
      this.sceneId,
      scene.entities.filter((e) => e.id !== this.entity.id),
    )
  }
}

/**
 * 删除实体。apply 记下**被删实体 + 其原索引**,invert 把它**插回原索引**(非末尾)。
 * 原实体/原索引在首次 apply 时捕获。
 */
export class DeleteEntityCommand implements Command {
  readonly label = '删除实体'
  private readonly sceneId: string
  private readonly entityId: string
  private removed: { entity: EntityDef; index: number } | undefined

  constructor(
    sceneId: string,
    entityId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {
    this.sceneId = sceneId
    this.entityId = entityId
  }

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    const index = scene.entities.findIndex((e) => e.id === this.entityId)
    if (index === -1) return state
    const entity = scene.entities[index]!
    const target = { kind: 'entity' as const, sceneId: this.sceneId, entityId: this.entityId }
    const currentIndex = this.currentReferences(state)
    const references = currentIndex.deletionImpact(
      target,
      currentIndex.deletionScopeFor([target]),
    ).blockers
    if (references.length)
      throw new Error(`实体 "${this.sceneId}/${this.entityId}" 仍被引用：${references[0]!.where}`)
    // 首次成功 apply 才捕获被删实体 + 原索引；失败的引用保护不得污染 undo 历史。
    if (!this.removed) this.removed = { entity: structuredClone(entity), index }
    return withEntities(
      state,
      this.sceneId,
      scene.entities.filter((_, i) => i !== index),
    )
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    // 插回原索引:splice 语义(不可变版:切开两半 + 中间插入)。
    const { entity, index } = this.removed
    const next = [...scene.entities]
    next.splice(index, 0, entity)
    return withEntities(state, this.sceneId, next)
  }
}

/** UpdateEntity 的 patch 范围(collide / facing / hostile / hidden / pages)。
 *  C0:'sprite' 移出——实体引用(actor⊕sprite)切换是 C1 的专门命令/UI,patch 不表达联合切换。
 *  B9:hostile 整对象替换(非深合并);传 undefined = 撤销敌对。 */
export type EntityPatch = Partial<{
  collide: EntityDef['collide']
  facing: Facing
  hostile: EntityDef['hostile']
  hidden: EntityDef['hidden']
  pages: EntityDef['pages']
}>

/**
 * 改实体字段(collide/interact/facing/hostile)。apply 记下**被 patch 覆盖的旧值**,
 * invert 把那些字段还原成旧值(patch 里没出现的字段不动)。
 * 旧值在首次 apply 时捕获(整条 patch 的旧值快照一次记全)。
 */
export class UpdateEntityCommand implements Command {
  readonly label = '修改实体'
  private readonly sceneId: string
  private readonly entityId: string
  private readonly patch: EntityPatch
  private oldPatch: EntityPatch | undefined

  constructor(sceneId: string, entityId: string, patch: EntityPatch) {
    this.sceneId = sceneId
    this.entityId = entityId
    this.patch = { ...patch }
    // 嵌套对象深拷贝，防外部入参回写（同 UpdateSceneCommand entry）。
    if (this.patch.hostile) this.patch.hostile = structuredClone(this.patch.hostile)
    if (this.patch.pages) this.patch.pages = structuredClone(this.patch.pages)
  }

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    const entity = scene.entities.find((e) => e.id === this.entityId)
    if (!entity) return state
    // 首次 apply:对 patch 涉及的每个键,记下当前旧值(含 undefined)。
    if (!this.oldPatch) this.oldPatch = this.captureOld(entity)
    if ('zone' in entity && 'facing' in this.patch && this.patch.facing !== undefined)
      throw new Error(`触发区 "${this.sceneId}/${this.entityId}" 无朝向`)
    return withEntities(
      state,
      this.sceneId,
      scene.entities.map((e) => {
        if (e.id !== this.entityId) return e
        if ('zone' in e) {
          const { facing: _facing, ...patch } = this.patch
          return { ...e, ...patch }
        }
        return { ...e, ...this.patch }
      }),
    )
  }

  /** 按 this.patch 出现的键,从 entity 上摘旧值(EntityPatch 形状)。 */
  private captureOld(entity: EntityDef): EntityPatch {
    const old: EntityPatch = {}
    if ('collide' in this.patch) old.collide = entity.collide
    if ('facing' in this.patch) old.facing = entity.facing
    if ('hidden' in this.patch) old.hidden = entity.hidden
    if ('hostile' in this.patch)
      old.hostile = entity.hostile ? structuredClone(entity.hostile) : undefined
    if ('pages' in this.patch) old.pages = entity.pages ? structuredClone(entity.pages) : undefined
    return old
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    // 用旧 patch 覆盖回去(只动当初 patch 涉及的键)。
    return withEntities(
      state,
      this.sceneId,
      scene.entities.map((e) => {
        if (e.id !== this.entityId) return e
        if ('zone' in e) {
          const { facing: _facing, ...patch } = this.oldPatch!
          return { ...e, ...patch }
        }
        return { ...e, ...this.oldPatch }
      }),
    )
  }
}

/**
 * 换 prop 实体的精灵引用(放置 palette 配套;actor 实体不适用 —— 角色精灵在角色模式改)。
 */
export class SetEntitySpriteCommand implements Command {
  readonly label = '换实体精灵'
  private readonly sceneId: string
  private readonly entityId: string
  private readonly spriteId: string
  private old: string | undefined
  private captured = false

  constructor(sceneId: string, entityId: string, spriteId: string) {
    this.sceneId = sceneId
    this.entityId = entityId
    this.spriteId = spriteId
  }

  private swap(state: EditorState, to: string): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    const entities = scene.entities.map((e) => {
      if (e.id !== this.entityId || !('sprite' in e)) return e
      return { ...e, sprite: to }
    })
    return withScene(state, this.sceneId, { ...scene, entities })
  }

  apply(state: EditorState): EditorState {
    const e = findScene(state, this.sceneId)?.entities.find((x) => x.id === this.entityId)
    if (!e || !('sprite' in e)) return state
    if (!this.captured) {
      this.captured = true
      this.old = e.sprite
    }
    return this.swap(state, this.spriteId)
  }

  invert(state: EditorState): EditorState {
    if (!this.captured || this.old === undefined) return state
    return this.swap(state, this.old)
  }
}
