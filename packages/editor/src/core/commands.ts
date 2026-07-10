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

import type {
  ActorDef,
  AmbienceDef,
  BattleFieldDef,
  EnemyDef,
  EnemyTeamDef,
  EntityDef,
  EntryPoint,
  GridPos,
  ItemData,
  LevelUpSkill,
  PoisonDef,
  SceneDef,
  SceneMap,
  SkillData,
  ScriptStage,
  SpriteDef,
} from '@type-pal/content'
import type { OwnMap, OwnMapCollisionEdit, OwnMapLayer, OwnMapTileEdit, TilesetDef } from '@type-pal/reforge'
import {
  insertOwnMapLayer,
  moveOwnMapLayer,
  paintOwnMapCollision,
  paintOwnMapTiles,
  removeOwnMapLayer,
  resizeOwnMap,
  updateOwnMapLayer,
} from '@type-pal/reforge'
import type { EditorState } from './edit-session.js'

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
function withScene(state: EditorState, sceneId: string, newScene: SceneDef): EditorState {
  let hit = false
  const scenes = state.scenes.map((s) => {
    if (s.id !== sceneId) return s
    hit = true
    return newScene
  })
  return hit ? { ...state, scenes } : state
}

/** 不可变:把 sceneId 场景的 entities 替换成 newEntities。scene 不存在返回原 state。 */
function withEntities(state: EditorState, sceneId: string, newEntities: EntityDef[]): EditorState {
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

/** UpdateEntity 的 patch 范围(collide / interact / facing / hostile)。
 *  C0:'sprite' 移出——实体引用(actor⊕sprite)切换是 C1 的专门命令/UI,patch 不表达联合切换。
 *  B9:hostile 整对象替换(非深合并);传 undefined = 撤销敌对。 */
export type EntityPatch = Partial<Pick<EntityDef, 'collide' | 'facing' | 'hostile' | 'hidden'>>

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
    // hostile 是嵌套对象,深拷贝防外部入参回写(同 UpdateSceneCommand entry)
    if (this.patch.hostile) this.patch.hostile = structuredClone(this.patch.hostile)
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
    if ('collide' in this.patch) old.collide = entity.collide
    if ('facing' in this.patch) old.facing = entity.facing
    if ('hidden' in this.patch) old.hidden = entity.hidden
    if ('hostile' in this.patch)
      old.hostile = entity.hostile ? structuredClone(entity.hostile) : undefined
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

/** UpdateScene 的 patch 范围(entry / musicId / entries / map 整替换)。 */
export type ScenePatch = Partial<Pick<SceneDef, 'entry' | 'musicId' | 'entries' | 'map'>>

/**
 * 改场景字段(map/entry/musicId)。apply 记下旧值,invert 还原。语义同 UpdateEntityCommand。
 * entry 是对象,patch 传整个新 entry(整体替换,非深合并)。
 * musicId 传 undefined = 清成「延续上一曲」(JSON 落盘时 undefined 键自然消失)。
 */
export class UpdateSceneCommand implements Command {
  readonly label = '修改场景'
  private readonly sceneId: string
  private readonly patch: ScenePatch
  private oldPatch: ScenePatch | undefined

  constructor(sceneId: string, patch: ScenePatch) {
    this.sceneId = sceneId
    // entry 若有,深拷贝(独立于外部入参,防回写)。
    // ⚠ 不能无条件写 entry 键:patch 只有 musicId 时,旧写法把 entry:undefined
    //   显式塞进 patch → spread 把必填 scene.entry 覆成 undefined → 渲染 entry.facing 崩。
    this.patch = { ...patch }
    if (this.patch.entry) this.patch.entry = structuredClone(this.patch.entry)
    if (this.patch.entries) this.patch.entries = structuredClone(this.patch.entries)
    if (this.patch.map) this.patch.map = structuredClone(this.patch.map)
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
    if ('musicId' in this.patch) old.musicId = scene.musicId // undefined=「延续」也是合法旧值
    if ('entry' in this.patch && this.patch.entry) {
      old.entry = scene.entry ? structuredClone(scene.entry) : undefined
    }
    if ('entries' in this.patch)
      old.entries = scene.entries ? structuredClone(scene.entries) : undefined
    if ('map' in this.patch && this.patch.map) old.map = structuredClone(scene.map)
    return old
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    return withScene(state, this.sceneId, { ...scene, ...this.oldPatch })
  }
}

/**
 * 新建自有地图(W7a-5):把场景从「复用原版」切成「自有地图」。
 * 一步做两件事(须原子,故不复用 UpdateSceneCommand):
 *   ① scene.map = { ownMap: <相对路径> } + 进场点重置到图内(原坐标系是原版图,可能越界新图);
 *   ② state.maps[相对路径] = 空白 OwnMap v1(渲染读它,保存序列化成 content/maps/<id>.json)。
 * invert 还原 scene.map/entry 并丢掉 maps 该键(连带磁盘孤儿由 diffFiles 删)。
 */
export class CreateOwnMapCommand implements Command {
  readonly label = '新建自有地图'
  private prevMap: SceneMap | undefined
  private prevEntry: SceneDef['entry'] | undefined

  constructor(
    private readonly sceneId: string,
    private readonly ownMapRel: string,
    private readonly tilemap: OwnMap,
    private readonly entryPos: GridPos,
  ) {}

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    if (this.prevMap === undefined) {
      this.prevMap = structuredClone(scene.map)
      this.prevEntry = structuredClone(scene.entry)
    }
    const next = withScene(state, this.sceneId, {
      ...scene,
      map: { ownMap: this.ownMapRel },
      entry: { ...scene.entry, pos: { ...this.entryPos } },
    })
    return { ...next, maps: { ...next.maps, [this.ownMapRel]: this.tilemap } }
  }

  invert(state: EditorState): EditorState {
    if (this.prevMap === undefined) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    const next = withScene(state, this.sceneId, {
      ...scene,
      map: this.prevMap,
      entry: this.prevEntry ?? scene.entry,
    })
    const { [this.ownMapRel]: _drop, ...restMaps } = next.maps
    return { ...next, maps: restMaps }
  }
}

/**
 * 画瓦片(W7D):载荷使用稳定 layer.id + lattice 行列，不再出现旧 word/mask/h。
 */
export class PaintTilesCommand implements Command {
  readonly label = '画瓦片'
  private prev: OwnMapTileEdit[] | undefined

  constructor(
    private readonly mapRel: string,
    private readonly edits: readonly OwnMapTileEdit[],
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    if (!this.prev) {
      const seen = new Set<string>()
      this.prev = []
      for (const e of this.edits) {
        const key = `${e.layerId},${e.col},${e.row}`
        if (seen.has(key)) continue
        seen.add(key)
        const tileId = map.layers.find((layer) => layer.id === e.layerId)?.tiles[e.row]?.[e.col]
        if (tileId === undefined) continue
        this.prev.push({ ...e, tileId })
      }
    }
    return { ...state, maps: { ...state.maps, [this.mapRel]: paintOwnMapTiles(map, this.edits) } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || !this.prev) return state
    return { ...state, maps: { ...state.maps, [this.mapRel]: paintOwnMapTiles(map, this.prev) } }
  }
}

/** 独立碰撞层的一笔；非零语义由 schema 保留，当前 UI 写 0/1。 */
export class PaintCollisionCommand implements Command {
  readonly label = '画碰撞'
  private prev: OwnMapCollisionEdit[] | undefined

  constructor(
    private readonly mapRel: string,
    private readonly edits: readonly OwnMapCollisionEdit[],
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    if (!this.prev) {
      const seen = new Set<string>()
      this.prev = []
      for (const edit of this.edits) {
        const key = `${edit.col},${edit.row}`
        if (seen.has(key)) continue
        seen.add(key)
        const value = map.collision[edit.row]?.[edit.col]
        if (value !== undefined) this.prev.push({ ...edit, value })
      }
    }
    return {
      ...state,
      maps: { ...state.maps, [this.mapRel]: paintOwnMapCollision(map, this.edits) },
    }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || !this.prev) return state
    return {
      ...state,
      maps: { ...state.maps, [this.mapRel]: paintOwnMapCollision(map, this.prev) },
    }
  }
}

export class AddOwnMapLayerCommand implements Command {
  readonly label = '新增地图层'
  private readonly layer: OwnMapLayer
  private insertedIndex: number | undefined

  constructor(
    private readonly mapRel: string,
    layer: OwnMapLayer,
    private readonly index?: number,
  ) {
    this.layer = structuredClone(layer)
  }

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    if (this.insertedIndex === undefined)
      this.insertedIndex = Math.max(0, Math.min(this.index ?? map.layers.length, map.layers.length))
    const next = insertOwnMapLayer(map, this.layer, this.insertedIndex)
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    const next = removeOwnMapLayer(map, this.layer.id)
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }
}

export class RemoveOwnMapLayerCommand implements Command {
  readonly label = '删除地图层'
  private removed: OwnMapLayer | undefined
  private removedIndex: number | undefined

  constructor(
    private readonly mapRel: string,
    private readonly layerId: string,
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || map.layers.length <= 1) return state
    if (!this.removed) {
      const index = map.layers.findIndex((layer) => layer.id === this.layerId)
      if (index < 0) return state
      this.removed = structuredClone(map.layers[index])
      this.removedIndex = index
    }
    const next = removeOwnMapLayer(map, this.layerId)
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || !this.removed || this.removedIndex === undefined) return state
    const next = insertOwnMapLayer(map, this.removed, this.removedIndex)
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }
}

export class MoveOwnMapLayerCommand implements Command {
  readonly label = '重排地图层'
  private fromIndex: number | undefined

  constructor(
    private readonly mapRel: string,
    private readonly layerId: string,
    private readonly toIndex: number,
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    if (this.fromIndex === undefined)
      this.fromIndex = map.layers.findIndex((l) => l.id === this.layerId)
    const next = moveOwnMapLayer(map, this.layerId, this.toIndex)
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || this.fromIndex === undefined || this.fromIndex < 0) return state
    const next = moveOwnMapLayer(map, this.layerId, this.fromIndex)
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }
}

export class UpdateOwnMapLayerCommand implements Command {
  readonly label = '修改地图层'
  private oldPatch: Partial<Pick<OwnMapLayer, 'name' | 'occlude'>> | undefined

  constructor(
    private readonly mapRel: string,
    private readonly layerId: string,
    private readonly patch: Partial<Pick<OwnMapLayer, 'name' | 'occlude'>>,
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    const layer = map?.layers.find((candidate) => candidate.id === this.layerId)
    if (!map || !layer) return state
    if (!this.oldPatch) {
      this.oldPatch = {}
      if ('name' in this.patch) this.oldPatch.name = layer.name
      if ('occlude' in this.patch) this.oldPatch.occlude = layer.occlude
    }
    const next = updateOwnMapLayer(map, this.layerId, this.patch)
    return { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || !this.oldPatch) return state
    return {
      ...state,
      maps: { ...state.maps, [this.mapRel]: updateOwnMapLayer(map, this.layerId, this.oldPatch) },
    }
  }
}

/**
 * 改图尺寸(W7c-4):左上锚定裁剪/扩展。裁剪破坏性 → prev 直接留 apply 前的整图引用
 * (不可变数据,零拷贝),invert 整图还原,被裁内容精确回来。
 */
export class ResizeOwnMapCommand implements Command {
  readonly label = '改图尺寸'
  private prev: OwnMap | undefined

  constructor(
    private readonly mapRel: string,
    private readonly width: number,
    private readonly height: number,
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    const next = resizeOwnMap(map, this.width, this.height)
    if (next === map) return state
    if (!this.prev) this.prev = map
    return { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || !this.prev) return state
    return { ...state, maps: { ...state.maps, [this.mapRel]: this.prev } }
  }
}

/**
 * 换自有地图绑定的 tileset(W7B):OwnMap.tileset = 注册表 id(或借用路径)。
 * 换绑不重映射瓦片索引(套件间同位替换是常见玩法;索引超出新集 = 渲染空,可换回)。
 */
export class SetOwnMapTilesetCommand implements Command {
  readonly label = '换瓦片集'
  private prev: string | undefined

  constructor(
    private readonly mapRel: string,
    private readonly tileset: string,
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || map.tileset === this.tileset) return state
    if (this.prev === undefined) this.prev = map.tileset
    return { ...state, maps: { ...state.maps, [this.mapRel]: { ...map, tileset: this.tileset } } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || this.prev === undefined) return state
    return { ...state, maps: { ...state.maps, [this.mapRel]: { ...map, tileset: this.prev } } }
  }
}

/**
 * 标注瓦片遮挡格高(W7 高度补全):tilesets[id].tiles[tileIdx].height。
 * height undefined = 清除标注(渲染回缺省 1);0 = 纯地面不遮挡。单位 = 半格 8px(原版同源):一格高家具 = 2,三格高墙的墙顶 = 6。
 * tiles 稀疏数组按需补齐空对象(下标 = 瓦片索引,与 RLE 帧序同源)。
 */
export class UpdateTilesetTileHeightCommand implements Command {
  readonly label = '标瓦片高度'
  private prev: number | undefined
  private captured = false

  constructor(
    private readonly tilesetId: string,
    private readonly tileIdx: number,
    private readonly height: number | undefined,
  ) {}

  private write(state: EditorState, height: number | undefined): EditorState {
    const list = state.tilesets ?? []
    const index = list.findIndex((t) => t.id === this.tilesetId)
    if (index < 0) return state
    const def = list[index]!
    const tiles = [...(def.tiles ?? [])]
    while (tiles.length <= this.tileIdx) tiles.push({})
    tiles[this.tileIdx] = height === undefined ? {} : { height }
    const next = [...list]
    next[index] = { ...def, tiles }
    return { ...state, tilesets: next }
  }

  apply(state: EditorState): EditorState {
    if (!this.captured) {
      this.prev = (state.tilesets ?? []).find((t) => t.id === this.tilesetId)?.tiles?.[
        this.tileIdx
      ]?.height
      this.captured = true
    }
    return this.write(state, this.height)
  }

  invert(state: EditorState): EditorState {
    if (!this.captured) return state
    return this.write(state, this.prev)
  }
}

/**
 * 上传 tileset 入库(W7B):注册表条目 + .rle 字节暂存原子加入;invert 同时移除。
 * blob 键 = def.path(资产相对路径);保存时 serializeProject 并入文件集。
 */
export class AddTilesetCommand implements Command {
  readonly label = '上传瓦片集'
  private readonly def: TilesetDef
  private readonly blob: ArrayBuffer

  constructor(def: TilesetDef, blob: ArrayBuffer) {
    this.def = structuredClone(def)
    this.blob = blob
  }

  apply(state: EditorState): EditorState {
    if ((state.tilesets ?? []).some((t) => t.id === this.def.id)) return state
    return {
      ...state,
      tilesets: [...(state.tilesets ?? []), this.def],
      tilesetBlobs: { ...state.tilesetBlobs, [this.def.path]: this.blob },
    }
  }

  invert(state: EditorState): EditorState {
    const { [this.def.path]: _drop, ...restBlobs } = state.tilesetBlobs
    return {
      ...state,
      tilesets: (state.tilesets ?? []).filter((t) => t.id !== this.def.id),
      tilesetBlobs: restBlobs,
    }
  }
}

/**
 * 移除 tileset 条目(W7B):捕获条目与暂存字节(若有)供 invert 还原。
 * 已落盘的 .rle 文件不删(可能被旧存档/其他地图引用;孤儿清理是后续维护活)。
 */
export class RemoveTilesetCommand implements Command {
  readonly label = '移除瓦片集'
  private removed: TilesetDef | undefined
  private removedIndex: number | undefined
  private removedBlob: ArrayBuffer | undefined

  constructor(private readonly tilesetId: string) {}

  apply(state: EditorState): EditorState {
    const list = state.tilesets ?? []
    const index = list.findIndex((t) => t.id === this.tilesetId)
    if (index < 0) return state
    if (!this.removed) {
      this.removed = structuredClone(list[index])
      this.removedIndex = index
      this.removedBlob = state.tilesetBlobs[list[index]!.path]
    }
    const { [list[index]!.path]: _drop, ...restBlobs } = state.tilesetBlobs
    return {
      ...state,
      tilesets: list.filter((t) => t.id !== this.tilesetId),
      tilesetBlobs: restBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed || this.removedIndex === undefined) return state
    const list = [...(state.tilesets ?? [])]
    list.splice(this.removedIndex, 0, this.removed)
    return {
      ...state,
      tilesets: list,
      tilesetBlobs:
        this.removedBlob !== undefined
          ? { ...state.tilesetBlobs, [this.removed.path]: this.removedBlob }
          : state.tilesetBlobs,
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// C1 数据模式/角色模式命令集(改精灵布局·姿势 / 角色属性)
// ════════════════════════════════════════════════════════════════════

/** 不可变:替换 spriteId 精灵;旁精灵同引用。 */
function withSprite(state: EditorState, spriteId: string, newSprite: SpriteDef): EditorState {
  let hit = false
  const sprites = state.sprites.map((s) => {
    if (s.id !== spriteId) return s
    hit = true
    return newSprite
  })
  return hit ? { ...state, sprites } : state
}

/** UpdateSprite 的 patch 范围(布局 / 命名姿势 / 标签)。 */
export type SpritePatch = Partial<Pick<SpriteDef, 'layout' | 'poses' | 'label'>>

/**
 * 改精灵字段(layout/poses/label)。语义同 UpdateEntityCommand:首次 apply 捕获旧值,invert 还原。
 * layout/poses 是对象 → 深拷贝入参 + 捕获时深拷贝旧值(防回写)。
 */
export class UpdateSpriteCommand implements Command {
  readonly label = '修改精灵'
  private readonly spriteId: string
  private readonly patch: SpritePatch
  private oldPatch: SpritePatch | undefined

  constructor(spriteId: string, patch: SpritePatch) {
    this.spriteId = spriteId
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const sp = state.sprites.find((s) => s.id === this.spriteId)
    if (!sp) return state
    if (!this.oldPatch) this.oldPatch = this.captureOld(sp)
    return withSprite(state, this.spriteId, { ...sp, ...this.patch })
  }

  private captureOld(sp: SpriteDef): SpritePatch {
    const old: SpritePatch = {}
    if ('layout' in this.patch) old.layout = structuredClone(sp.layout)
    if ('poses' in this.patch) old.poses = sp.poses ? structuredClone(sp.poses) : undefined
    if ('label' in this.patch) old.label = sp.label
    return old
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const sp = state.sprites.find((s) => s.id === this.spriteId)
    if (!sp) return state
    return withSprite(state, this.spriteId, { ...sp, ...this.oldPatch })
  }
}

// ════════════════════════════════════════════════════════════════════
// C-track v1 脚本编辑命令(事件模式:改/插/删/移命令 → 整 stages 替换)
// ════════════════════════════════════════════════════════════════════

/** 脚本源定位:场景 onEnter,或实体 pages[0] 的 trigger/auto。 */
export type ScriptSourceRef =
  | { kind: 'onEnter' }
  | { kind: 'onTeleport' }
  | { kind: 'trigger'; entityId: string }
  | { kind: 'auto'; entityId: string }

/** 取脚本源当前 stages(不存在 → undefined)。 */
export function getScriptStages(
  scene: SceneDef,
  ref: ScriptSourceRef,
): readonly ScriptStage[] | undefined {
  if (ref.kind === 'onEnter') return scene.onEnter
  if (ref.kind === 'onTeleport') return scene.onTeleport
  const e = scene.entities.find((x) => x.id === ref.entityId)
  const page = e?.pages?.[0]
  return ref.kind === 'trigger' ? page?.trigger?.stages : page?.auto?.stages
}

/** 不可变:把脚本源的 stages 整体替换(源缺失原样返回)。 */
function withScriptStages(scene: SceneDef, ref: ScriptSourceRef, stages: ScriptStage[]): SceneDef {
  if (ref.kind === 'onEnter') return { ...scene, onEnter: stages }
  if (ref.kind === 'onTeleport') return { ...scene, onTeleport: stages }
  const entities = scene.entities.map((e) => {
    if (e.id !== ref.entityId) return e
    const page = e.pages?.[0]
    if (!page) return e
    const newPage =
      ref.kind === 'trigger'
        ? page.trigger
          ? { ...page, trigger: { ...page.trigger, stages } }
          : page
        : page.auto
          ? { ...page, auto: { ...page.auto, stages } }
          : page
    if (newPage === page) return e
    return { ...e, pages: [newPage, ...(e.pages?.slice(1) ?? [])] }
  })
  return { ...scene, entities }
}

/** 改实体触发方式(交互/触碰 + 距离)。数据位:pages[0].trigger.on/range。 */
export class UpdateTriggerModeCommand implements Command {
  readonly label = '改触发方式'
  private readonly sceneId: string
  private readonly entityId: string
  private readonly on: 'interact' | 'touch'
  private readonly range: number | undefined
  private old: { on: 'interact' | 'touch'; range: number | undefined } | undefined

  constructor(
    sceneId: string,
    entityId: string,
    on: 'interact' | 'touch',
    range: number | undefined,
  ) {
    this.sceneId = sceneId
    this.entityId = entityId
    this.on = on
    this.range = range
  }

  private write(
    state: EditorState,
    on: 'interact' | 'touch',
    range: number | undefined,
  ): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    const entities = scene.entities.map((e) => {
      if (e.id !== this.entityId) return e
      const page = e.pages?.[0]
      if (!page?.trigger) return e
      const trigger = { ...page.trigger, on }
      if (range === undefined) delete (trigger as { range?: number }).range
      else trigger.range = range
      return { ...e, pages: [{ ...page, trigger }, ...(e.pages?.slice(1) ?? [])] }
    })
    return withEntities(state, this.sceneId, entities)
  }

  apply(state: EditorState): EditorState {
    if (!this.old) {
      const t = findScene(state, this.sceneId)?.entities.find((e) => e.id === this.entityId)
        ?.pages?.[0]?.trigger
      if (!t) return state
      this.old = { on: t.on ?? 'interact', range: t.range }
    }
    return this.write(state, this.on, this.range)
  }

  invert(state: EditorState): EditorState {
    if (!this.old) return state
    return this.write(state, this.old.on, this.old.range)
  }
}

/** 删除脚本源(trigger/auto 槽或 onEnter/onTeleport)。undo 原样恢复(含 trigger 的 on/range)。 */
export class DeleteScriptSourceCommand implements Command {
  readonly label = '删除脚本'
  private readonly sceneId: string
  private readonly ref: ScriptSourceRef
  private old: unknown

  constructor(sceneId: string, ref: ScriptSourceRef) {
    this.sceneId = sceneId
    this.ref = ref
  }

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    if (this.ref.kind === 'onEnter' || this.ref.kind === 'onTeleport') {
      const cur = this.ref.kind === 'onEnter' ? scene.onEnter : scene.onTeleport
      if (!cur) return state
      if (this.old === undefined) this.old = structuredClone(cur)
      const next = { ...scene }
      delete (next as Record<string, unknown>)[this.ref.kind]
      return withScene(state, this.sceneId, next)
    }
    const entityId = this.ref.entityId
    const kind = this.ref.kind
    const entities = scene.entities.map((e) => {
      if (e.id !== entityId) return e
      const page = e.pages?.[0]
      const slot = kind === 'trigger' ? page?.trigger : page?.auto
      if (!page || !slot) return e
      if (this.old === undefined) this.old = structuredClone(slot)
      const newPage = { ...page }
      delete (newPage as Record<string, unknown>)[kind]
      return { ...e, pages: [newPage, ...(e.pages?.slice(1) ?? [])] }
    })
    return withEntities(state, this.sceneId, entities)
  }

  invert(state: EditorState): EditorState {
    if (this.old === undefined) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    if (this.ref.kind === 'onEnter' || this.ref.kind === 'onTeleport') {
      return withScene(state, this.sceneId, {
        ...scene,
        [this.ref.kind]: structuredClone(this.old),
      } as typeof scene)
    }
    const entityId = this.ref.entityId
    const kind = this.ref.kind
    const entities = scene.entities.map((e) => {
      if (e.id !== entityId) return e
      const page = e.pages?.[0] ?? {}
      return {
        ...e,
        pages: [{ ...page, [kind]: structuredClone(this.old) }, ...(e.pages?.slice(1) ?? [])],
      }
    })
    return withEntities(state, this.sceneId, entities)
  }
}

/**
 * 修改脚本(粗粒度:整 stages 替换 —— undo 语义简单可靠;细粒度差分交给
 * script-edit.ts 的纯函数在 UI 层算好再发命令)。首次 apply 捕获旧 stages。
 */
export class UpdateScriptCommand implements Command {
  readonly label = '修改脚本'
  private readonly sceneId: string
  private readonly ref: ScriptSourceRef
  private readonly stages: ScriptStage[]
  private old: ScriptStage[] | undefined

  constructor(sceneId: string, ref: ScriptSourceRef, stages: readonly ScriptStage[]) {
    this.sceneId = sceneId
    this.ref = ref
    this.stages = structuredClone(stages) as ScriptStage[]
  }

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    if (!this.old) {
      const cur = getScriptStages(scene, this.ref)
      if (!cur) return state // 源不存在:no-op(v1 不新建脚本源)
      this.old = structuredClone(cur) as ScriptStage[]
    }
    return withScene(state, this.sceneId, withScriptStages(scene, this.ref, this.stages))
  }

  invert(state: EditorState): EditorState {
    if (!this.old) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    return withScene(state, this.sceneId, withScriptStages(scene, this.ref, this.old))
  }
}

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

/** UpdateActor 的 patch 范围(名字 / 头像组 / 战斗数据 / 精灵引用)。 */
export type ActorPatch = Partial<Pick<ActorDef, 'name' | 'portraits' | 'battler' | 'spriteId'>>

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
    return withActor(state, this.actorId, { ...a, ...this.patch })
  }

  private captureOld(a: ActorDef): ActorPatch {
    const old: ActorPatch = {}
    if ('name' in this.patch) old.name = a.name
    if ('spriteId' in this.patch) old.spriteId = a.spriteId
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

// ════════════════════════════════════════════════════════════════════
// M4c-3 敌人工作台命令(敌人库 增/删/改 + 敌队整表)
// ════════════════════════════════════════════════════════════════════

/** 不可变:替换 enemyId 敌人;旁敌同引用。 */
/** 物品补丁(浅字段;equip/use/throw 整体替换)。 */
type ItemPatch = Partial<Omit<ItemData, 'id'>>

function withItem(state: EditorState, itemId: string, next: ItemData): EditorState {
  let hit = false
  const items = state.items.map((i) => {
    if (i.id !== itemId) return i
    hit = true
    return next
  })
  return hit ? { ...state, items } : state
}

/** 修改物品字段(undo 恢复旧值;undefined 值 = 删键,如清空 use)。 */
export class UpdateItemCommand implements Command {
  readonly label = '修改物品'
  private readonly itemId: string
  private readonly patch: ItemPatch
  private oldPatch: ItemPatch | undefined

  constructor(itemId: string, patch: ItemPatch) {
    this.itemId = itemId
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const it = state.items.find((x) => x.id === this.itemId)
    if (!it) return state
    if (!this.oldPatch) {
      const old: Record<string, unknown> = {}
      for (const k of Object.keys(this.patch))
        old[k] = structuredClone((it as unknown as Record<string, unknown>)[k])
      this.oldPatch = old as ItemPatch
    }
    const next = { ...it, ...this.patch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.patch)) if (v === undefined) delete next[k]
    return withItem(state, this.itemId, next as unknown as ItemData)
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const it = state.items.find((x) => x.id === this.itemId)
    if (!it) return state
    const restored = { ...it, ...this.oldPatch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.oldPatch)) if (v === undefined) delete restored[k]
    return withItem(state, this.itemId, restored as unknown as ItemData)
  }
}

function withBattleField(state: EditorState, fieldId: number, next: BattleFieldDef): EditorState {
  const list = state.battleFields ?? []
  let hit = false
  const battleFields = list.map((f) => {
    if (f.id !== fieldId) return f
    hit = true
    return next
  })
  return hit ? { ...state, battleFields } : state
}

/** UpdateBattleField 的 patch 范围(id 不可改 —— 数字稳定身份被场景/脚本引用)。 */
export type BattleFieldPatch = Partial<Pick<BattleFieldDef, 'name' | 'bg' | 'screenWave' | 'magicEffect'>>

/** 改战场字段(D24 战场页)。语义同 UpdateItemCommand:首次 apply 捕获旧值,invert 还原。 */
export class UpdateBattleFieldCommand implements Command {
  readonly label = '修改战场'
  private readonly fieldId: number
  private readonly patch: BattleFieldPatch
  private oldPatch: BattleFieldPatch | undefined

  constructor(fieldId: number, patch: BattleFieldPatch) {
    this.fieldId = fieldId
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const f = (state.battleFields ?? []).find((x) => x.id === this.fieldId)
    if (!f) return state
    if (!this.oldPatch) {
      const old: Record<string, unknown> = {}
      for (const k of Object.keys(this.patch))
        old[k] = structuredClone((f as unknown as Record<string, unknown>)[k])
      this.oldPatch = old as BattleFieldPatch
    }
    const next = { ...f, ...this.patch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.patch)) if (v === undefined) delete next[k]
    return withBattleField(state, this.fieldId, next as unknown as BattleFieldDef)
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const f = (state.battleFields ?? []).find((x) => x.id === this.fieldId)
    if (!f) return state
    const restored = { ...f, ...this.oldPatch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.oldPatch)) if (v === undefined) delete restored[k]
    return withBattleField(state, this.fieldId, restored as unknown as BattleFieldDef)
  }
}

function withEnemy(state: EditorState, enemyId: string, next: EnemyDef): EditorState {
  const list = state.enemies ?? []
  let hit = false
  const enemies = list.map((e) => {
    if (e.id !== enemyId) return e
    hit = true
    return next
  })
  return hit ? { ...state, enemies } : state
}

/** UpdateEnemy 的 patch 范围(name 是 locale 键,名字文本走 locale 命令另做)。 */
export type EnemyPatch = Partial<
  Pick<
    EnemyDef,
    | 'spriteNum'
    | 'spritePath'
    | 'stats'
    | 'ai'
    | 'anim'
    | 'sounds'
    | 'steal'
    | 'attackEquivItem'
    | 'choreography'
    | 'onDefeated'
  >
>

/** 改敌人字段。语义同 UpdateActorCommand:首次 apply 捕获旧值,invert 还原;对象深拷贝。 */
export class UpdateEnemyCommand implements Command {
  readonly label = '修改敌人'
  private readonly enemyId: string
  private readonly patch: EnemyPatch
  private oldPatch: EnemyPatch | undefined

  constructor(enemyId: string, patch: EnemyPatch) {
    this.enemyId = enemyId
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const e = (state.enemies ?? []).find((x) => x.id === this.enemyId)
    if (!e) return state
    if (!this.oldPatch) {
      const old: Record<string, unknown> = {}
      for (const k of Object.keys(this.patch))
        old[k] = structuredClone((e as unknown as Record<string, unknown>)[k])
      this.oldPatch = old as EnemyPatch
    }
    return withEnemy(state, this.enemyId, { ...e, ...this.patch })
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const e = (state.enemies ?? []).find((x) => x.id === this.enemyId)
    if (!e) return state
    const restored = { ...e, ...this.oldPatch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.oldPatch)) if (v === undefined) delete restored[k]
    return withEnemy(state, this.enemyId, restored as unknown as EnemyDef)
  }
}

/** 新增敌人(末尾)。invert 移除。 */
export class AddEnemyCommand implements Command {
  readonly label = '新增敌人'
  private readonly enemy: EnemyDef
  constructor(enemy: EnemyDef) {
    this.enemy = structuredClone(enemy)
  }
  apply(state: EditorState): EditorState {
    return { ...state, enemies: [...(state.enemies ?? []), this.enemy] }
  }
  invert(state: EditorState): EditorState {
    return { ...state, enemies: (state.enemies ?? []).filter((e) => e.id !== this.enemy.id) }
  }
}

/** 删除敌人。apply 记原索引,invert 插回原位。 */
export class DeleteEnemyCommand implements Command {
  readonly label = '删除敌人'
  private readonly enemyId: string
  private removed: { enemy: EnemyDef; index: number } | undefined
  constructor(enemyId: string) {
    this.enemyId = enemyId
  }
  apply(state: EditorState): EditorState {
    const list = state.enemies ?? []
    const index = list.findIndex((e) => e.id === this.enemyId)
    if (index === -1) return state
    if (!this.removed) this.removed = { enemy: structuredClone(list[index]!), index }
    return { ...state, enemies: list.filter((_, i) => i !== index) }
  }
  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    const next = [...(state.enemies ?? [])]
    next.splice(this.removed.index, 0, this.removed.enemy)
    return { ...state, enemies: next }
  }
}

/** 敌队整表替换(380 队,粗粒度 undo 足够;成员/增删队都经它)。 */
export class UpdateEnemyTeamsCommand implements Command {
  readonly label = '修改敌队'
  private readonly teams: EnemyTeamDef[]
  private old: EnemyTeamDef[] | undefined
  constructor(teams: readonly EnemyTeamDef[]) {
    this.teams = structuredClone(teams) as EnemyTeamDef[]
  }
  apply(state: EditorState): EditorState {
    if (!this.old) this.old = structuredClone(state.enemyTeams ?? []) as EnemyTeamDef[]
    return { ...state, enemyTeams: this.teams }
  }
  invert(state: EditorState): EditorState {
    if (!this.old) return state
    return { ...state, enemyTeams: this.old }
  }
}

/** 改 locale 单键文本(敌人/角色名等;invert 还原,新键还原 = 删除)。 */
export class UpdateLocaleCommand implements Command {
  readonly label = '修改文本'
  private readonly key: string
  private readonly text: string
  private old: string | undefined
  private had = false
  private captured = false

  constructor(key: string, text: string) {
    this.key = key
    this.text = text
  }

  apply(state: EditorState): EditorState {
    if (!this.captured) {
      this.captured = true
      this.had = this.key in state.locale
      this.old = state.locale[this.key]
    }
    return { ...state, locale: { ...state.locale, [this.key]: this.text } }
  }

  invert(state: EditorState): EditorState {
    const locale = { ...state.locale }
    if (this.had) locale[this.key] = this.old!
    else delete locale[this.key]
    return { ...state, locale }
  }
}

// ════════════════════════════════════════════════════════════════════
// W5 音乐库命令(音乐页起别名)
// ════════════════════════════════════════════════════════════════════

/** 改音乐库条目别名(空串/undefined = 清名,回显编号)。 */
export class UpdateMusicNameCommand implements Command {
  readonly label = '改音乐名'
  private readonly musicId: number
  private readonly name: string | undefined
  private old: string | undefined
  private captured = false

  constructor(musicId: number, name: string | undefined) {
    this.musicId = musicId
    this.name = name || undefined // 空串规整成 undefined(JSON 落盘键消失)
  }

  apply(state: EditorState): EditorState {
    const list = state.music ?? []
    const i = list.findIndex((m) => m.id === this.musicId)
    if (i < 0) return state
    if (!this.captured) {
      this.captured = true
      this.old = list[i]!.name
    }
    const next = [...list]
    next[i] = this.name ? { ...next[i]!, name: this.name } : { id: next[i]!.id }
    return { ...state, music: next }
  }

  invert(state: EditorState): EditorState {
    const list = state.music ?? []
    const i = list.findIndex((m) => m.id === this.musicId)
    if (i < 0) return state
    const next = [...list]
    next[i] = this.old ? { ...next[i]!, name: this.old } : { id: next[i]!.id }
    return { ...state, music: next }
  }
}

// ════════════════════════════════════════════════════════════════════
// C6 升级学技能表命令(skills.json 的 levelUp 键:角色 → [{level, skillId}])
// ════════════════════════════════════════════════════════════════════

/** 改角色的升级学技能行(整列表替换;空/undefined = 删该角色键)。 */
export class UpdateLevelUpCommand implements Command {
  readonly label = '改升级学技能'
  private readonly actorId: string
  private readonly rows: LevelUpSkill[] | undefined
  private old: LevelUpSkill[] | undefined
  private had = false
  private captured = false

  constructor(actorId: string, rows: LevelUpSkill[] | undefined) {
    this.actorId = actorId
    this.rows = rows?.length ? structuredClone(rows) : undefined
  }

  apply(state: EditorState): EditorState {
    if (!this.captured) {
      this.captured = true
      this.had = this.actorId in state.levelUp
      this.old = state.levelUp[this.actorId]
        ? structuredClone(state.levelUp[this.actorId])
        : undefined
    }
    const levelUp = { ...state.levelUp }
    if (this.rows) levelUp[this.actorId] = structuredClone(this.rows)
    else delete levelUp[this.actorId]
    return { ...state, levelUp }
  }

  invert(state: EditorState): EditorState {
    const levelUp = { ...state.levelUp }
    if (this.had && this.old) levelUp[this.actorId] = structuredClone(this.old)
    else delete levelUp[this.actorId]
    return { ...state, levelUp }
  }
}

// ════════════════════════════════════════════════════════════════════
// 创建脚本源(2026-07-05 审计断点 #5:事件空态死路 —— 解除「v1 不新建」限制)
// ════════════════════════════════════════════════════════════════════

/**
 * 创建脚本源(空 stages 起步,后续编辑走 UpdateScriptCommand):
 * onEnter / 实体 trigger(interact 缺省,可指定 touch) / 实体 auto。
 * 已存在同源 = no-op(不覆盖);实体无 pages 时创建 pages[0]。invert 删回。
 */
export class CreateScriptSourceCommand implements Command {
  readonly label = '创建脚本源'
  private readonly sceneId: string
  private readonly ref: ScriptSourceRef
  private readonly triggerOn: 'interact' | 'touch'
  private created = false

  constructor(sceneId: string, ref: ScriptSourceRef, triggerOn: 'interact' | 'touch' = 'interact') {
    this.sceneId = sceneId
    this.ref = ref
    this.triggerOn = triggerOn
  }

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    if (getScriptStages(scene, this.ref)) return state // 已存在 → no-op
    this.created = true
    const empty: ScriptStage[] = [{ body: [] }]
    if (this.ref.kind === 'onEnter') return withScene(state, this.sceneId, { ...scene, onEnter: empty })
    if (this.ref.kind === 'onTeleport')
      return withScene(state, this.sceneId, { ...scene, onTeleport: empty })
    const entityId = this.ref.entityId
    const kind = this.ref.kind
    const entities = scene.entities.map((e) => {
      if (e.id !== entityId) return e
      const page = e.pages?.[0] ?? {}
      const newPage =
        kind === 'trigger'
          ? { ...page, trigger: { on: this.triggerOn, stages: empty } }
          : { ...page, auto: { stages: empty } }
      return { ...e, pages: [newPage, ...(e.pages?.slice(1) ?? [])] }
    })
    return withScene(state, this.sceneId, { ...scene, entities })
  }

  invert(state: EditorState): EditorState {
    if (!this.created) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    if (this.ref.kind === 'onEnter') {
      const next = { ...scene }
      delete (next as { onEnter?: unknown }).onEnter
      return withScene(state, this.sceneId, next)
    }
    if (this.ref.kind === 'onTeleport') {
      const next = { ...scene }
      delete (next as { onTeleport?: unknown }).onTeleport
      return withScene(state, this.sceneId, next)
    }
    const entityId = this.ref.entityId
    const kind = this.ref.kind
    const entities = scene.entities.map((e) => {
      if (e.id !== entityId) return e
      const page = e.pages?.[0]
      if (!page) return e
      const newPage = { ...page }
      if (kind === 'trigger') delete (newPage as { trigger?: unknown }).trigger
      else delete (newPage as { auto?: unknown }).auto
      // 页空了(无 trigger/auto/state)→ 整个 pages 键删回(落盘干净)
      const pageEmpty = !newPage.trigger && !newPage.auto && newPage.state === undefined
      const rest = e.pages?.slice(1) ?? []
      if (pageEmpty && rest.length === 0) {
        const ne = { ...e }
        delete (ne as { pages?: unknown }).pages
        return ne
      }
      return { ...e, pages: [newPage, ...rest] }
    })
    return withScene(state, this.sceneId, { ...scene, entities })
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

/** 不可变:替换 skillId 技能;旁技能同引用。 */
function withSkill(state: EditorState, skillId: string, next: SkillData): EditorState {
  let hit = false
  const skills = state.skills.map((s) => {
    if (s.id !== skillId) return s
    hit = true
    return next
  })
  return hit ? { ...state, skills } : state
}

/** UpdateSkill 的 patch 范围(同 UpdateItem 模式:undefined 值 = 删键)。 */
export type SkillPatch = Partial<Omit<SkillData, 'id'>>

/** 修改技能字段(undo 恢复旧值)。 */
export class UpdateSkillCommand implements Command {
  readonly label = '修改技能'
  private readonly skillId: string
  private readonly patch: SkillPatch
  private oldPatch: SkillPatch | undefined

  constructor(skillId: string, patch: SkillPatch) {
    this.skillId = skillId
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const sk = state.skills.find((x) => x.id === this.skillId)
    if (!sk) return state
    if (!this.oldPatch) {
      const old: Record<string, unknown> = {}
      for (const k of Object.keys(this.patch))
        old[k] = structuredClone((sk as unknown as Record<string, unknown>)[k])
      this.oldPatch = old as SkillPatch
    }
    const next = { ...sk, ...this.patch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.patch)) if (v === undefined) delete next[k]
    return withSkill(state, this.skillId, next as unknown as SkillData)
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const sk = state.skills.find((x) => x.id === this.skillId)
    if (!sk) return state
    const next = { ...sk, ...this.oldPatch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.oldPatch)) if (v === undefined) delete next[k]
    return withSkill(state, this.skillId, next as unknown as SkillData)
  }
}

/**
 * 新建场景(复用地图号起步;entry 给定落点;空实体/对话)。invert 删回。
 * id 由 UI 保证唯一(重复 = no-op 防御)。
 */
export class AddSceneCommand implements Command {
  readonly label = '新建场景'
  private readonly scene: SceneDef
  private added = false

  constructor(id: string, mapNum: number, entry: SceneDef['entry']) {
    this.scene = {
      id,
      map: { reuseOriginalMap: mapNum },
      entry: structuredClone(entry),
      entities: [],
    }
  }

  apply(state: EditorState): EditorState {
    if (state.scenes.some((s) => s.id === this.scene.id)) return state // 重名防御
    this.added = true
    return { ...state, scenes: [...state.scenes, structuredClone(this.scene)] }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    return { ...state, scenes: state.scenes.filter((s) => s.id !== this.scene.id) }
  }
}

/**
 * 新建技能(SkillTab「＋」;缺省单 damage 效果 + 空动画)。invert 删回。
 */
export class AddSkillCommand implements Command {
  readonly label = '新建技能'
  private readonly skill: SkillData
  private added = false

  constructor(id: string, name: string) {
    this.skill = {
      id,
      name,
      desc: '',
      cost: { mp: 10 },
      usableOutsideBattle: false,
      target: 'oneEnemy',
      effects: [{ kind: 'damage', power: 20, elemental: 0 }],
      animation: { effectSprite: 0, placement: 'normal', xOffset: 0, yOffset: 0, speed: 0, fireDelay: 0, effectTimes: 0, shake: 0, sound: 0 },
    }
  }

  apply(state: EditorState): EditorState {
    if (state.skills.some((s) => s.id === this.skill.id)) return state
    this.added = true
    return { ...state, skills: [...state.skills, structuredClone(this.skill)] }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    return { ...state, skills: state.skills.filter((s) => s.id !== this.skill.id) }
  }
}

/**
 * 改 startWorld.learnedSkills[actorId](新档初始技能 —— 战斗技能的真实来源;
 * buildWorld 直取,actor.battler.initialMagic 是原版数据存留不参与战斗)。
 * manifest.startWorld 同引用整替换,序列化随 manifest.json 落盘。
 */
export class UpdateStartSkillsCommand implements Command {
  readonly label = '改初始技能'
  private readonly actorId: string
  private readonly ids: string[]
  private old: string[] | undefined
  private had = false
  private captured = false

  constructor(actorId: string, ids: string[]) {
    this.actorId = actorId
    this.ids = [...ids]
  }

  private withSkills(state: EditorState, ids: string[] | undefined): EditorState {
    const learned = { ...state.manifest.startWorld.learnedSkills }
    if (ids) learned[this.actorId] = [...ids]
    else delete learned[this.actorId]
    const startWorld = { ...state.manifest.startWorld, learnedSkills: learned }
    const manifest = { ...state.manifest, startWorld }
    return { ...state, manifest, startWorld }
  }

  apply(state: EditorState): EditorState {
    if (!this.captured) {
      this.captured = true
      this.had = this.actorId in state.manifest.startWorld.learnedSkills
      this.old = state.manifest.startWorld.learnedSkills[this.actorId]?.slice()
    }
    return this.withSkills(state, this.ids)
  }

  invert(state: EditorState): EditorState {
    return this.withSkills(state, this.had ? this.old : undefined)
  }
}

/**
 * 入口点(开局档)编辑:整表替换 manifest.entryPoints(增删改一次一命令)。
 * apply 首次捕获旧表供 invert 还原。缺省(manifest 无 entryPoints)= 从 entryScene 合成一条 new-game。
 */
export class SetEntryPointsCommand implements Command {
  readonly label = '编辑入口点'
  private readonly next: EntryPoint[]
  private old: EntryPoint[] | undefined
  private captured = false

  constructor(next: EntryPoint[]) {
    this.next = structuredClone(next)
  }

  apply(state: EditorState): EditorState {
    if (!this.captured) {
      this.old = state.manifest.entryPoints ? structuredClone(state.manifest.entryPoints) : undefined
      this.captured = true
    }
    return { ...state, manifest: { ...state.manifest, entryPoints: structuredClone(this.next) } }
  }

  invert(state: EditorState): EditorState {
    const restored = { ...state.manifest }
    if (this.old) restored.entryPoints = structuredClone(this.old)
    else delete restored.entryPoints
    return { ...state, manifest: restored }
  }
}

// ── B10 毒定义(状态/毒系结构化编辑)────────────────────────────────

export type PoisonPatch = Partial<Omit<PoisonDef, 'id'>>

function withPoison(state: EditorState, id: number, next: PoisonDef): EditorState {
  let hit = false
  const poisons = (state.poisons ?? []).map((p) => {
    if (p.id !== id) return p
    hit = true
    return next
  })
  return hit ? { ...state, poisons } : state
}

/** 改毒定义(patch 语义同 UpdateItemCommand:undefined 值 = 删键,如清掉 lethalWith)。 */
export class UpdatePoisonCommand implements Command {
  readonly label = '修改毒'
  private readonly id: number
  private readonly patch: PoisonPatch
  private oldPatch: PoisonPatch | undefined

  constructor(id: number, patch: PoisonPatch) {
    this.id = id
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const p = (state.poisons ?? []).find((x) => x.id === this.id)
    if (!p) return state
    if (!this.oldPatch) {
      const old: Record<string, unknown> = {}
      for (const k of Object.keys(this.patch))
        old[k] = structuredClone((p as unknown as Record<string, unknown>)[k])
      this.oldPatch = old as PoisonPatch
    }
    const next = { ...p, ...this.patch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.patch)) if (v === undefined) delete next[k]
    return withPoison(state, this.id, next as unknown as PoisonDef)
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const p = (state.poisons ?? []).find((x) => x.id === this.id)
    if (!p) return state
    const restored = { ...p, ...this.oldPatch } as Record<string, unknown>
    for (const [k, v] of Object.entries(this.oldPatch)) if (v === undefined) delete restored[k]
    return withPoison(state, this.id, restored as unknown as PoisonDef)
  }
}

// ── A4 自有精灵上传(镜像 W7B tileset:def 入注册表 + 字节暂存 tilesetBlobs)──
// tilesetBlobs 名字是 W7B 起的,现泛化为「一切上传二进制」(键 = 工程相对路径);
// serializeProject 对它一视同仁产出文件,不区分素材种类。

/** 上传精灵入库:SpriteDef(含 path)入注册表 + .rle 字节暂存(保存时落盘)。 */
export class AddSpriteCommand implements Command {
  readonly label = '上传精灵'
  private readonly def: SpriteDef
  private readonly blob: ArrayBuffer

  constructor(def: SpriteDef, blob: ArrayBuffer) {
    this.def = structuredClone(def)
    this.blob = blob
  }

  apply(state: EditorState): EditorState {
    if (state.sprites.some((s) => s.id === this.def.id)) return state
    const path = this.def.path
    return {
      ...state,
      sprites: [...state.sprites, structuredClone(this.def)],
      ...(path ? { tilesetBlobs: { ...state.tilesetBlobs, [path]: this.blob } } : {}),
    }
  }

  invert(state: EditorState): EditorState {
    const path = this.def.path
    let tilesetBlobs = state.tilesetBlobs
    if (path) {
      const { [path]: _drop, ...rest } = state.tilesetBlobs
      tilesetBlobs = rest
    }
    return {
      ...state,
      sprites: state.sprites.filter((s) => s.id !== this.def.id),
      tilesetBlobs,
    }
  }
}

/** 移除上传精灵条目(捕获条目+暂存字节供 invert;原版精灵条目也可移,引用悬空由校验层报)。 */
export class RemoveSpriteCommand implements Command {
  readonly label = '移除精灵'
  private removed: SpriteDef | undefined
  private removedIndex: number | undefined
  private removedBlob: ArrayBuffer | undefined

  constructor(private readonly spriteId: string) {}

  apply(state: EditorState): EditorState {
    const index = state.sprites.findIndex((s) => s.id === this.spriteId)
    if (index < 0) return state
    const def = state.sprites[index]!
    if (!this.removed) {
      this.removed = structuredClone(def)
      this.removedIndex = index
      this.removedBlob = def.path ? state.tilesetBlobs[def.path] : undefined
    }
    let tilesetBlobs = state.tilesetBlobs
    if (def.path) {
      const { [def.path]: _drop, ...rest } = state.tilesetBlobs
      tilesetBlobs = rest
    }
    return {
      ...state,
      sprites: state.sprites.filter((s) => s.id !== this.spriteId),
      tilesetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed || this.removedIndex === undefined) return state
    const sprites = [...state.sprites]
    sprites.splice(this.removedIndex, 0, this.removed)
    return {
      ...state,
      sprites,
      tilesetBlobs:
        this.removedBlob !== undefined && this.removed.path
          ? { ...state.tilesetBlobs, [this.removed.path]: this.removedBlob }
          : state.tilesetBlobs,
    }
  }
}

// ── A4c 战斗外观上传(敌/我;patch path + blob 暂存一步 undo;路径按 id 定死重传即覆盖)──

/** 上传敌人战斗外观:enemy.spritePath 指到工程内 .rle + 字节暂存。 */
export class SetEnemyBattleSpriteCommand implements Command {
  readonly label = '上传敌人外观'
  private oldPath: string | undefined
  private oldBlob: ArrayBuffer | undefined
  private captured = false

  constructor(
    private readonly enemyId: string,
    private readonly path: string,
    private readonly blob: ArrayBuffer,
  ) {}

  apply(state: EditorState): EditorState {
    const e = (state.enemies ?? []).find((x) => x.id === this.enemyId)
    if (!e) return state
    if (!this.captured) {
      this.oldPath = e.spritePath
      this.oldBlob = state.tilesetBlobs[this.path]
      this.captured = true
    }
    return {
      ...state,
      enemies: (state.enemies ?? []).map((x) =>
        x.id === this.enemyId ? { ...x, spritePath: this.path } : x,
      ),
      tilesetBlobs: { ...state.tilesetBlobs, [this.path]: this.blob },
    }
  }

  invert(state: EditorState): EditorState {
    const enemies = (state.enemies ?? []).map((x) => {
      if (x.id !== this.enemyId) return x
      const next = { ...x, spritePath: this.oldPath }
      if (this.oldPath === undefined) delete (next as Record<string, unknown>).spritePath
      return next
    })
    let tilesetBlobs = state.tilesetBlobs
    if (this.oldBlob !== undefined) tilesetBlobs = { ...tilesetBlobs, [this.path]: this.oldBlob }
    else {
      const { [this.path]: _drop, ...rest } = tilesetBlobs
      tilesetBlobs = rest
    }
    return { ...state, enemies, tilesetBlobs }
  }
}

/** 上传角色战斗形象:battler.battleSpritePath + 字节暂存(无 battler 的角色 no-op)。 */
export class SetActorBattleSpriteCommand implements Command {
  readonly label = '上传战斗形象'
  private oldPath: string | undefined
  private oldBlob: ArrayBuffer | undefined
  private captured = false

  constructor(
    private readonly actorId: string,
    private readonly path: string,
    private readonly blob: ArrayBuffer,
  ) {}

  apply(state: EditorState): EditorState {
    const a = state.actors.find((x) => x.id === this.actorId)
    if (!a?.battler) return state
    if (!this.captured) {
      this.oldPath = a.battler.battleSpritePath
      this.oldBlob = state.tilesetBlobs[this.path]
      this.captured = true
    }
    return {
      ...state,
      actors: state.actors.map((x) =>
        x.id === this.actorId && x.battler
          ? { ...x, battler: { ...x.battler, battleSpritePath: this.path } }
          : x,
      ),
      tilesetBlobs: { ...state.tilesetBlobs, [this.path]: this.blob },
    }
  }

  invert(state: EditorState): EditorState {
    const actors = state.actors.map((x) => {
      if (x.id !== this.actorId || !x.battler) return x
      const battler = { ...x.battler, battleSpritePath: this.oldPath }
      if (this.oldPath === undefined) delete (battler as Record<string, unknown>).battleSpritePath
      return { ...x, battler }
    })
    let tilesetBlobs = state.tilesetBlobs
    if (this.oldBlob !== undefined) tilesetBlobs = { ...tilesetBlobs, [this.path]: this.oldBlob }
    else {
      const { [this.path]: _drop, ...rest } = tilesetBlobs
      tilesetBlobs = rest
    }
    return { ...state, actors, tilesetBlobs }
  }
}

// ── W6 氛围(昼夜)────────────────────────────────────────────────

export type AmbiencePatch = Partial<Omit<AmbienceDef, 'id'>>

/** 改氛围定义(name/tint)。 */
export class UpdateAmbienceCommand implements Command {
  readonly label = '修改氛围'
  private readonly id: string
  private readonly patch: AmbiencePatch
  private oldPatch: AmbiencePatch | undefined

  constructor(id: string, patch: AmbiencePatch) {
    this.id = id
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const a = (state.ambiences ?? []).find((x) => x.id === this.id)
    if (!a) return state
    if (!this.oldPatch) {
      const old: Record<string, unknown> = {}
      for (const k of Object.keys(this.patch))
        old[k] = structuredClone((a as unknown as Record<string, unknown>)[k])
      this.oldPatch = old as AmbiencePatch
    }
    const ambiences = (state.ambiences ?? []).map((x) =>
      x.id === this.id ? { ...x, ...this.patch } : x,
    )
    return { ...state, ambiences }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const ambiences = (state.ambiences ?? []).map((x) =>
      x.id === this.id ? { ...x, ...this.oldPatch } : x,
    )
    return { ...state, ambiences }
  }
}

/** 新建氛围(缺省恒等白 = 不染;作者随后调色)。 */
export class AddAmbienceCommand implements Command {
  readonly label = '新建氛围'
  private readonly ambience: AmbienceDef
  private added = false

  constructor(id: string, name: string) {
    this.ambience = { id, name, tint: [255, 255, 255] }
  }

  apply(state: EditorState): EditorState {
    if ((state.ambiences ?? []).some((a) => a.id === this.ambience.id)) return state
    this.added = true
    return { ...state, ambiences: [...(state.ambiences ?? []), structuredClone(this.ambience)] }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    return { ...state, ambiences: (state.ambiences ?? []).filter((a) => a.id !== this.ambience.id) }
  }
}

/** 新建毒(最小可用缺省:常规可解、单 tick 扣血;作者随后在表单里改)。 */
export class AddPoisonCommand implements Command {
  readonly label = '新建毒'
  private readonly poison: PoisonDef
  private added = false

  constructor(id: number, name: string) {
    this.poison = {
      id,
      name,
      curability: 'common',
      color: 0,
      playerTicks: [{ hpDelta: -10 }],
      enemyTicks: [{ hpDelta: -10 }],
    }
  }

  apply(state: EditorState): EditorState {
    if ((state.poisons ?? []).some((p) => p.id === this.poison.id)) return state
    this.added = true
    return { ...state, poisons: [...(state.poisons ?? []), structuredClone(this.poison)] }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    return { ...state, poisons: (state.poisons ?? []).filter((p) => p.id !== this.poison.id) }
  }
}
