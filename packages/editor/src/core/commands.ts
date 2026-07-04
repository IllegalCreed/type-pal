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
  EnemyDef,
  EnemyTeamDef,
  EntityDef,
  GridPos,
  ItemData,
  LevelUpSkill,
  SceneDef,
  ScriptStage,
  SpriteDef,
} from '@type-pal/content'
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
export type EntityPatch = Partial<Pick<EntityDef, 'collide' | 'interact' | 'facing' | 'hostile'>>

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
    if ('interact' in this.patch) old.interact = entity.interact
    if ('facing' in this.patch) old.facing = entity.facing
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

/** UpdateScene 的 patch 范围(paletteId / entry / musicId / entries)。 */
export type ScenePatch = Partial<Pick<SceneDef, 'paletteId' | 'entry' | 'musicId' | 'entries'>>

/**
 * 改场景字段(paletteId/entry/musicId)。apply 记下旧值,invert 还原。语义同 UpdateEntityCommand。
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
    // ⚠ 不能无条件写 entry 键:patch 只有 paletteId/musicId 时,旧写法把 entry:undefined
    //   显式塞进 patch → spread 把必填 scene.entry 覆成 undefined → 渲染 entry.facing 崩。
    this.patch = { ...patch }
    if (this.patch.entry) this.patch.entry = structuredClone(this.patch.entry)
    if (this.patch.entries) this.patch.entries = structuredClone(this.patch.entries)
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
    if ('musicId' in this.patch) old.musicId = scene.musicId // undefined=「延续」也是合法旧值
    if ('entry' in this.patch && this.patch.entry) {
      old.entry = scene.entry ? structuredClone(scene.entry) : undefined
    }
    if ('entries' in this.patch)
      old.entries = scene.entries ? structuredClone(scene.entries) : undefined
    return old
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    return withScene(state, this.sceneId, { ...scene, ...this.oldPatch })
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
  | { kind: 'trigger'; entityId: string }
  | { kind: 'auto'; entityId: string }

/** 取脚本源当前 stages(不存在 → undefined)。 */
export function getScriptStages(
  scene: SceneDef,
  ref: ScriptSourceRef,
): readonly ScriptStage[] | undefined {
  if (ref.kind === 'onEnter') return scene.onEnter
  const e = scene.entities.find((x) => x.id === ref.entityId)
  const page = e?.pages?.[0]
  return ref.kind === 'trigger' ? page?.trigger?.stages : page?.auto?.stages
}

/** 不可变:把脚本源的 stages 整体替换(源缺失原样返回)。 */
function withScriptStages(scene: SceneDef, ref: ScriptSourceRef, stages: ScriptStage[]): SceneDef {
  if (ref.kind === 'onEnter') return { ...scene, onEnter: stages }
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
