/**
 * Command 接口 + 布置命令集(D-B0 地基 + D-B1 布置模式命令)。
 *
 * 所有编辑 = Command:apply 产新态(不可变)、invert 把「apply 后的态」还原回 apply 前。
 * EditSession 用 apply/invert 驱动 undo/redo。B1 布置模式发本文件的命令集。
 *
 * 不可变铁律:命令不得原地 mutate 传入 state(展开/map 构造新对象);测钉「源不变」。
 * 旧值/旧索引在**首次 apply 时捕获**(apply 时的 state 即初始态),供 invert 还原。
 *
 * 见 docs/phase2/editor/editor-design.md §4。
 */
import type { EditorState } from './edit-session.js'
import type { EntityDef, GridPos, SceneDef } from '@type-pal/content'

/**
 * 一次编辑操作。apply/invert 都返回**新** EditorState(不可变 —— 不得 mutate 传入)。
 * invert(s) 接收的是 apply 之后的态,要还原成 apply 之前的态。
 */
export interface Command {
  readonly label: string
  apply(s: EditorState): EditorState
  invert(s: EditorState): EditorState
}

// ── 不可变更新工具 ──────────────────────────────────────────
// 照 MoveEntityCommand 的写法:展开 state → map scenes → 命中 sceneId 时展开 scene → 改。
// 旁场景/旁实体保持同引用(只展开命中路径,最小拷贝)。

/** 不可变:把 sceneId 场景整体替换成 newScene;旁场景同引用。scene 不存在返回原 state。 */
function withScene(
  state: EditorState,
  sceneId: string,
  newScene: SceneDef,
): EditorState {
  let hit = false
  const scenes = state.scenes.map((s) => {
    if (s.id !== sceneId) return s
    hit = true
    return newScene
  })
  return hit ? { ...state, scenes } : state
}

/** 不可变:把 sceneId 场景的 entities 替换成 newEntities。scene 不存在返回原 state。 */
function withEntities(
  state: EditorState,
  sceneId: string,
  newEntities: EntityDef[],
): EditorState {
  let hit = false
  const scenes = state.scenes.map((s) => {
    if (s.id !== sceneId) return s
    hit = true
    return { ...s, entities: newEntities }
  })
  return hit ? { ...state, scenes } : state
}

/** 在 state 里查 scene;找不到 undefined。 */
function findScene(state: EditorState, sceneId: string): SceneDef | undefined {
  return state.scenes.find((s) => s.id === sceneId)
}

/** 不可变更新:把 sceneId 场景里 entityId 实体的 pos 换成 newPos;返回新 state。 */
function withEntityPos(
  state: EditorState,
  sceneId: string,
  entityId: string,
  newPos: GridPos,
): EditorState {
  const scene = findScene(state, sceneId)
  if (!scene) return state
  return withEntities(
    state,
    sceneId,
    scene.entities.map((e) => (e.id === entityId ? { ...e, pos: newPos } : e)),
  )
}

/** 取实体当前 pos(用于 apply 时捕获旧 pos 供 invert)。 */
function entityPos(state: EditorState, sceneId: string, entityId: string): GridPos | undefined {
  const scene = state.scenes.find((s) => s.id === sceneId)
  return scene?.entities.find((e) => e.id === entityId)?.pos
}

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

// ════════════════════════════════════════════════════════════════════
// B1 布置模式命令集(Add/Delete/Update 实体 · Update 场景)
// 契约签名钉死(见 editor-b1-logic-plan「契约」),Claude 照此搭 UI。
// ════════════════════════════════════════════════════════════════════

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

  constructor(sceneId: string, entityId: string) {
    this.sceneId = sceneId
    this.entityId = entityId
  }

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    const index = scene.entities.findIndex((e) => e.id === this.entityId)
    if (index === -1) return state
    // 首次 apply 捕获被删实体(拷贝) + 原索引,供 invert 插回原位。
    const entity = scene.entities[index]!
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

/** UpdateEntity 的 patch 范围(sprite / collide / interact)。 */
export type EntityPatch = Partial<Pick<EntityDef, 'sprite' | 'collide' | 'interact'>>

/**
 * 改实体字段(sprite/collide/interact)。apply 记下**被 patch 覆盖的旧值**,
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
  }

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    const entity = scene.entities.find((e) => e.id === this.entityId)
    if (!entity) return state
    // 首次 apply:对 patch 涉及的每个键,记下当前旧值(含 undefined)。
    if (!this.oldPatch) this.oldPatch = this.captureOld(entity)
    return withEntities(
      state,
      this.sceneId,
      scene.entities.map((e) => (e.id === this.entityId ? { ...e, ...this.patch } : e)),
    )
  }

  /** 按 this.patch 出现的键,从 entity 上摘旧值(EntityPatch 形状)。 */
  private captureOld(entity: EntityDef): EntityPatch {
    const old: EntityPatch = {}
    if ('sprite' in this.patch) old.sprite = entity.sprite
    if ('collide' in this.patch) old.collide = entity.collide
    if ('interact' in this.patch) old.interact = entity.interact
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
      scene.entities.map((e) => (e.id === this.entityId ? { ...e, ...this.oldPatch } : e)),
    )
  }
}

/** UpdateScene 的 patch 范围(paletteId / entry)。 */
export type ScenePatch = Partial<Pick<SceneDef, 'paletteId' | 'entry'>>

/**
 * 改场景字段(paletteId/entry)。apply 记下旧值,invert 还原。语义同 UpdateEntityCommand。
 * entry 是对象,patch 传整个新 entry(整体替换,非深合并)。
 */
export class UpdateSceneCommand implements Command {
  readonly label = '修改场景'
  private readonly sceneId: string
  private readonly patch: ScenePatch
  private oldPatch: ScenePatch | undefined

  constructor(sceneId: string, patch: ScenePatch) {
    this.sceneId = sceneId
    // entry 若有,深拷贝(独立于外部入参,防回写)。
    this.patch = {
      ...patch,
      entry: patch.entry ? structuredClone(patch.entry) : patch.entry,
    }
  }

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    if (!this.oldPatch) this.oldPatch = this.captureOld(scene)
    return withScene(state, this.sceneId, { ...scene, ...this.patch })
  }

  /** 按 this.patch 出现的键,从 scene 上摘旧值(entry 深拷贝)。 */
  private captureOld(scene: SceneDef): ScenePatch {
    const old: ScenePatch = {}
    if ('paletteId' in this.patch) old.paletteId = scene.paletteId
    if ('entry' in this.patch && this.patch.entry) {
      old.entry = scene.entry ? structuredClone(scene.entry) : undefined
    }
    return old
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    return withScene(state, this.sceneId, { ...scene, ...this.oldPatch })
  }
}
