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
  AssetId,
  AssetRecordV1,
  AssetRole,
  BattleFieldDef,
  BattleSpriteDef,
  EnemyDef,
  EnemyTeamDef,
  EntityDef,
  EntryPoint,
  GridPos,
  ItemData,
  LevelUpSkill,
  MapAssetDefV1,
  PoisonDef,
  SceneDef,
  SceneEntryPoint,
  Command as ScriptCommand,
  ScriptStage,
  SharedScriptMetaV1,
  SkillData,
  SpriteDef,
  WorldVariableDefinitionV1,
} from '@type-pal/content'
import {
  battleSpriteDefinitionFrameDemand,
  checkCommands,
  collectBattleSpriteDefinitionReferences,
  collectSpriteActionReferences,
  collectSpriteDefinitionReferences,
  createScriptIndex,
  DEFAULT_BATTLE_FIELD_ID,
  findScriptOwnerChunk,
  MAP_INDEX_PATH,
  mapIdStem,
  mapInstanceHeight,
  mapInstanceTilesetId,
  nextMapAssetId,
  normalizeScriptLibrary,
  removeAuthoredScript,
  spriteDefinitionFrameDemand,
  spriteDefinitionFrameIndices,
  upsertAuthoredScript,
  validateActors,
  validateBattleFields,
  validateBattleSprites,
  validateMapIndex,
  validateProjectRelativePath,
  validateSprites,
  validateStartWorld,
  validateWorldVariableIdV1,
  validateWorldVariableRegistryV1,
} from '@type-pal/content'
import type {
  IsometricMapLayer,
  ProjectMap,
  ProjectMapCollisionEdit,
  ProjectMapTileEdit,
  TilesetDef,
} from '@type-pal/reforge'
import {
  insertProjectMapLayer,
  moveProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  removeProjectMapLayer,
  updateProjectMapLayer,
} from '@type-pal/reforge'
import { blockingActorReferences } from './actor-references.js'
import {
  type BlockingAmbienceReference,
  blockingAmbienceReferences,
} from './ambience-references.js'
import {
  type BattleDataReference,
  blockingEnemyReferences,
  blockingPoisonReferences,
  blockingSkillReferences,
} from './battle-data-references.js'
import {
  type BlockingBattleFieldReference,
  blockingBattleFieldReferences,
} from './battle-field-references.js'
import type { EditorState } from './edit-session.js'
import { blockingEnemyTeamReferences } from './enemy-team-references.js'
import { collectEntityAddressReferences } from './entity-address-references.js'
import { createEmptyScriptStages } from './entity-placement.js'
import { blockingItemReferences } from './item-references.js'
import {
  applyPreparedProjectMapPatch,
  cloneMapPatchPermission,
  cloneProjectMapPatch,
  type MapPatchPermissionSnapshot,
  ordinaryProjectMapPatchOwnershipIssues,
  type PreparedProjectMapPatch,
  type ProjectMapPatch,
  ProjectMapPatchError,
  preparedProjectMapPatchChanged,
  prepareProjectMapPatch,
} from './map-patch.js'
import { findSceneEntryReferences, findScriptReferences } from './script-references.js'
import type { ScriptEditorState } from './script-editor.js'
import {
  resolveStampStructureOperation,
  type StampStructureResolutionOptions,
} from './stamp-lifecycle.js'
import { inheritStampPlacementIndex } from './stamp-ownership.js'
import {
  assertTilesetRemovalAllowed,
  assertTilesetReplacementAllowed,
  type TilesetRemovalProof,
  type TilesetReplacementProof,
} from './tileset-references.js'
import {
  collectWorldVariableReferencesV1,
  worldVariableScriptStateFromEditorStateV1,
} from './world-variable-references.js'

/**
 * 一次编辑操作。apply/invert 都返回**新** EditorState(不可变 —— 不得 mutate 传入)。
 * invert(s) 接收的是 apply 之后的态,要还原成 apply 之前的态。
 */
export interface Command {
  readonly label: string
  apply(s: EditorState): EditorState
  invert(s: EditorState): EditorState
}

export class WorldVariableInUseError extends Error {
  constructor(
    readonly variableId: string,
    readonly referenceCount: number,
  ) {
    super(`世界变量 "${variableId}" 仍有 ${referenceCount} 处脚本引用`)
    this.name = 'WorldVariableInUseError'
  }
}

export class AddWorldVariableCommand implements Command {
  readonly label = '新建世界变量'
  private added = false

  constructor(
    private readonly id: string,
    private readonly definition: WorldVariableDefinitionV1,
  ) {
    validateWorldVariableIdV1(id)
    validateWorldVariableRegistryV1({ [id]: definition })
  }

  apply(state: EditorState): EditorState {
    if (state.worldVariables?.[this.id]) return state
    this.added = true
    return {
      ...state,
      worldVariables: validateWorldVariableRegistryV1({
        ...(state.worldVariables ?? {}),
        [this.id]: structuredClone(this.definition),
      }),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    const worldVariables = { ...(state.worldVariables ?? {}) }
    delete worldVariables[this.id]
    return { ...state, worldVariables }
  }
}

export class UpdateWorldVariableCommand implements Command {
  readonly label = '修改世界变量'
  private previous?: WorldVariableDefinitionV1

  constructor(
    private readonly id: string,
    private readonly definition: WorldVariableDefinitionV1,
  ) {
    validateWorldVariableRegistryV1({ [id]: definition })
  }

  apply(state: EditorState): EditorState {
    const current = state.worldVariables?.[this.id]
    if (!current) return state
    if (
      current.kind === this.definition.kind &&
      current.name === this.definition.name &&
      current.description === this.definition.description &&
      current.initial === this.definition.initial
    )
      return state
    if (!this.previous) this.previous = structuredClone(current)
    return {
      ...state,
      worldVariables: validateWorldVariableRegistryV1({
        ...(state.worldVariables ?? {}),
        [this.id]: structuredClone(this.definition),
      }),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.previous) return state
    return {
      ...state,
      worldVariables: {
        ...(state.worldVariables ?? {}),
        [this.id]: structuredClone(this.previous),
      },
    }
  }
}

export class DeleteWorldVariableCommand implements Command {
  readonly label = '删除世界变量'
  private previous?: WorldVariableDefinitionV1

  constructor(private readonly id: string) {}

  apply(state: EditorState): EditorState {
    const current = state.worldVariables?.[this.id]
    if (!current) return state
    const references = collectWorldVariableReferencesV1(
      worldVariableScriptStateFromEditorStateV1(state),
    ).byId.get(this.id)
    if (references?.length) throw new WorldVariableInUseError(this.id, references.length)
    if (!this.previous) this.previous = structuredClone(current)
    const worldVariables = { ...(state.worldVariables ?? {}) }
    delete worldVariables[this.id]
    return { ...state, worldVariables }
  }

  invert(state: EditorState): EditorState {
    if (!this.previous) return state
    if (state.worldVariables?.[this.id])
      throw new Error(`无法撤销删除：变量 id 已被占用 ${this.id}`)
    return {
      ...state,
      worldVariables: {
        ...(state.worldVariables ?? {}),
        [this.id]: structuredClone(this.previous),
      },
    }
  }
}

/**
 * 多个命令的一次原子编辑：任一 apply 抛错时 EditSession 看不到中间态；undo 按逆序回滚。
 * 资源导入 + 语义引用切换必须走此命令，避免留下孤儿定义或半写 catalog。
 */
export class CompositeCommand implements Command {
  constructor(
    readonly label: string,
    private readonly commands: readonly Command[],
  ) {}

  apply(state: EditorState): EditorState {
    return this.commands.reduce((current, command) => command.apply(current), state)
  }

  invert(state: EditorState): EditorState {
    return [...this.commands].reverse().reduce((current, command) => command.invert(current), state)
  }
}

function sameAssetRecord(left: AssetRecordV1, right: AssetRecordV1): boolean {
  return (
    left.kind === right.kind &&
    left.path === right.path &&
    left.mediaType === right.mediaType &&
    left.bytes === right.bytes &&
    left.sha256 === right.sha256 &&
    left.label === right.label &&
    left.origin.kind === right.origin.kind &&
    left.origin.ref === right.origin.ref
  )
}

function assertTilesetRecord(record: AssetRecordV1, bytes: ArrayBuffer): void {
  if (record.kind !== 'tileset') throw new Error('瓦片集资源 kind 必须是 tileset')
  if (record.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error('瓦片集资源 mediaType 必须是 application/vnd.type-pal.rle')
  validateProjectRelativePath(record.path, '瓦片集资源路径')
  if (record.bytes !== bytes.byteLength) throw new Error('瓦片集资源 bytes 与二进制长度不一致')
  if (!/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error('瓦片集资源 sha256 非法')
  const view = new Uint8Array(bytes)
  if (view[0] !== 0x1f || view[1] !== 0x8b) throw new Error('瓦片集资源必须是 canonical gzip')
}

function assertSpriteRecord(record: AssetRecordV1, bytes: ArrayBuffer): void {
  if (record.kind !== 'sprite') throw new Error('大世界精灵资源 kind 必须是 sprite')
  if (record.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error('大世界精灵资源 mediaType 必须是 application/vnd.type-pal.rle')
  validateProjectRelativePath(record.path, '大世界精灵资源路径')
  if (record.bytes !== bytes.byteLength) throw new Error('大世界精灵资源 bytes 与二进制长度不一致')
  if (!/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error('大世界精灵资源 sha256 非法')
  const view = new Uint8Array(bytes)
  if (view[0] !== 0x1f || view[1] !== 0x8b) throw new Error('大世界精灵资源必须是 canonical gzip')
}

function assertBattleSpriteRecord(record: AssetRecordV1, bytes: ArrayBuffer): void {
  if (record.kind !== 'battle-sprite') throw new Error('战斗精灵资源 kind 必须是 battle-sprite')
  if (record.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error('战斗精灵资源 mediaType 必须是 application/vnd.type-pal.rle')
  validateProjectRelativePath(record.path, '战斗精灵资源路径')
  if (record.bytes !== bytes.byteLength) throw new Error('战斗精灵资源 bytes 与二进制长度不一致')
  if (!/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error('战斗精灵资源 sha256 非法')
  const view = new Uint8Array(bytes)
  if (view[0] !== 0x1f || view[1] !== 0x8b) throw new Error('战斗精灵资源必须是 canonical gzip')
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
    const entity = scene.entities[index]!
    const next = withEntities(
      state,
      this.sceneId,
      scene.entities.filter((_, i) => i !== index),
    )
    const references = collectEntityAddressReferences(next).filter(
      (reference) => reference.sceneId === this.sceneId && reference.entityId === this.entityId,
    )
    if (references.length)
      throw new Error(
        '实体 "' + this.sceneId + '/' + this.entityId + '" 仍被引用：' + references[0]!.path,
      )
    // 首次成功 apply 才捕获被删实体 + 原索引；失败的引用保护不得污染 undo 历史。
    if (!this.removed) this.removed = { entity: structuredClone(entity), index }
    return next
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
export type EntityPatch = Partial<
  Pick<EntityDef, 'collide' | 'facing' | 'hostile' | 'hidden' | 'pages'>
>

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
      scene.entities.map((e) => (e.id === this.entityId ? { ...e, ...this.oldPatch } : e)),
    )
  }
}

/** UpdateScene 的 patch 范围(entry / music / entries / mapId / battleFieldId)。 */
export type ScenePatch = Partial<
  Pick<SceneDef, 'entry' | 'music' | 'entries' | 'mapId' | 'battleFieldId'>
>

/**
 * 改场景字段(mapId/entry/music)。apply 记下旧值,invert 还原。语义同 UpdateEntityCommand。
 * entry 是对象,patch 传整个新 entry(整体替换,非深合并)。
 * music 传 undefined =「延续上一曲」；null = 显式停曲；AssetId = 指定曲。
 */
export class UpdateSceneCommand implements Command {
  readonly label = '修改场景'
  private readonly sceneId: string
  private readonly patch: ScenePatch
  private oldPatch: ScenePatch | undefined

  constructor(sceneId: string, patch: ScenePatch) {
    this.sceneId = sceneId
    // entry 若有,深拷贝(独立于外部入参,防回写)。
    // ⚠ 不能无条件写 entry 键:patch 只有 music 时,旧写法把 entry:undefined
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
    if ('music' in this.patch) old.music = scene.music
    if ('entry' in this.patch && this.patch.entry) {
      old.entry = scene.entry ? structuredClone(scene.entry) : undefined
    }
    if ('entries' in this.patch)
      old.entries = scene.entries ? structuredClone(scene.entries) : undefined
    if ('mapId' in this.patch) old.mapId = scene.mapId
    if ('battleFieldId' in this.patch) old.battleFieldId = scene.battleFieldId
    return old
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    return withScene(state, this.sceneId, { ...scene, ...this.oldPatch })
  }
}

/** 新增或修改一个命名落点；稳定 id 是 record key，不随 label 修改。 */
export class UpsertSceneEntryCommand implements Command {
  readonly label = '修改落点'
  private previous: SceneEntryPoint | undefined
  private existed: boolean | undefined

  constructor(
    private readonly sceneId: string,
    private readonly entryId: string,
    private readonly entry: SceneEntryPoint,
  ) {
    if (!entryId) throw new Error('落点 id 不能为空')
    this.entry = structuredClone(entry)
  }

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    if (this.existed === undefined) {
      this.existed = scene.entries?.[this.entryId] !== undefined
      this.previous = scene.entries?.[this.entryId]
        ? structuredClone(scene.entries[this.entryId])
        : undefined
    }
    return withScene(state, this.sceneId, {
      ...scene,
      entries: { ...(scene.entries ?? {}), [this.entryId]: structuredClone(this.entry) },
    })
  }

  invert(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene || this.existed === undefined) return state
    const entries = { ...(scene.entries ?? {}) }
    if (this.existed && this.previous) entries[this.entryId] = structuredClone(this.previous)
    else delete entries[this.entryId]
    return withScene(state, this.sceneId, {
      ...scene,
      entries: Object.keys(entries).length ? entries : undefined,
    })
  }
}

export class SceneEntryInUseError extends Error {
  constructor(
    readonly sceneId: string,
    readonly entryId: string,
    readonly references: ReturnType<typeof findSceneEntryReferences>,
  ) {
    super(`落点 ${sceneId}/${entryId} 正被 ${references.length} 处脚本引用`)
    this.name = 'SceneEntryInUseError'
  }
}

/** 删除未引用的命名落点；引用保护在 Command 层，键盘、按钮与未来调用方行为一致。 */
export class DeleteSceneEntryCommand implements Command {
  readonly label = '删除落点'
  private removed: SceneEntryPoint | undefined

  constructor(
    private readonly sceneId: string,
    private readonly entryId: string,
  ) {}

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    const entry = scene?.entries?.[this.entryId]
    if (!scene || !entry) return state
    const references = findSceneEntryReferences(state, this.sceneId, this.entryId)
    if (references.length) throw new SceneEntryInUseError(this.sceneId, this.entryId, references)
    if (!this.removed) this.removed = structuredClone(entry)
    const entries = { ...(scene.entries ?? {}) }
    delete entries[this.entryId]
    return withScene(state, this.sceneId, {
      ...scene,
      entries: Object.keys(entries).length ? entries : undefined,
    })
  }

  invert(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene || !this.removed) return state
    return withScene(state, this.sceneId, {
      ...scene,
      entries: {
        ...(scene.entries ?? {}),
        [this.entryId]: structuredClone(this.removed),
      },
    })
  }
}

function withMapCatalogManifest(state: EditorState): EditorState['manifest'] {
  if (state.manifest.content.maps) return state.manifest
  return {
    ...state.manifest,
    content: { ...state.manifest.content, maps: MAP_INDEX_PATH },
  }
}

function addMapAsset(state: EditorState, def: MapAssetDefV1, map: ProjectMap): EditorState {
  const mapIndex = state.mapIndex ?? { version: 1 as const, maps: [] }
  if (mapIndex.maps.some((asset) => asset.id === def.id) || state.maps[def.id])
    throw new Error(`地图 id "${def.id}" 已存在`)
  const nextIndex = validateMapIndex({ version: 1, maps: [...mapIndex.maps, def] })
  return {
    ...state,
    manifest: withMapCatalogManifest(state),
    mapIndex: nextIndex,
    maps: { ...state.maps, [def.id]: structuredClone(map) },
  }
}

function removeMapAsset(state: EditorState, id: string): EditorState {
  const { [id]: _drop, ...maps } = state.maps
  return {
    ...state,
    mapIndex: {
      version: 1,
      maps: state.mapIndex.maps.filter((asset) => asset.id !== id),
    },
    maps,
  }
}

/** 临时窄反查；ED-3 落地统一 ProjectReferenceIndex 后删除。 */
export function mapAssetSceneReferences(scenes: readonly SceneDef[], mapId: string): string[] {
  return scenes.filter((scene) => scene.mapId === mapId).map((scene) => scene.id)
}

export class MapAssetInUseError extends Error {
  constructor(
    readonly mapId: string,
    readonly sceneIds: string[],
  ) {
    super(`地图 "${mapId}" 正被场景使用: ${sceneIds.join(', ')}`)
    this.name = 'MapAssetInUseError'
  }
}

/** 独立创建地图资产，不依赖任何场景引用。 */
export class CreateMapAssetCommand implements Command {
  readonly label = '新建地图'
  private readonly def: MapAssetDefV1
  private readonly map: ProjectMap
  private previousManifest: EditorState['manifest'] | undefined
  private added = false

  constructor(def: MapAssetDefV1, map: ProjectMap) {
    this.def = structuredClone(def)
    this.map = structuredClone(map)
  }

  apply(state: EditorState): EditorState {
    if (this.previousManifest === undefined) this.previousManifest = state.manifest
    const next = addMapAsset(state, this.def, this.map)
    this.added = true
    return next
  }

  invert(state: EditorState): EditorState {
    if (!this.added || !this.previousManifest) return state
    return { ...removeMapAsset(state, this.def.id), manifest: this.previousManifest }
  }
}

/** 深复制已有地图为新资产；后续编辑互不影响。 */
export class DuplicateMapAssetCommand implements Command {
  readonly label = '复制地图'
  private readonly def: MapAssetDefV1
  private copiedMap: ProjectMap | undefined
  private previousManifest: EditorState['manifest'] | undefined

  constructor(
    private readonly sourceId: string,
    def: MapAssetDefV1,
  ) {
    this.def = structuredClone(def)
  }

  apply(state: EditorState): EditorState {
    const source = state.maps[this.sourceId]
    if (!source) return state
    if (!this.copiedMap) this.copiedMap = structuredClone(source)
    if (!this.previousManifest) this.previousManifest = state.manifest
    return addMapAsset(state, this.def, this.copiedMap)
  }

  invert(state: EditorState): EditorState {
    if (!this.copiedMap || !this.previousManifest) return state
    return { ...removeMapAsset(state, this.def.id), manifest: this.previousManifest }
  }
}

/** 只改显示名；稳定 id/path 永不随改名变化。 */
export class RenameMapAssetCommand implements Command {
  readonly label = '重命名地图'
  private previousName: string | undefined

  constructor(
    private readonly mapId: string,
    private readonly name: string,
  ) {}

  private write(state: EditorState, name: string): EditorState {
    const index = state.mapIndex.maps.findIndex((asset) => asset.id === this.mapId)
    if (index < 0) return state
    const maps = [...state.mapIndex.maps]
    maps[index] = { ...maps[index]!, name }
    return { ...state, mapIndex: { version: 1, maps } }
  }

  apply(state: EditorState): EditorState {
    const asset = state.mapIndex.maps.find((candidate) => candidate.id === this.mapId)
    const name = this.name.trim()
    if (!asset || !name || asset.name === name) return state
    if (this.previousName === undefined) this.previousName = asset.name
    return this.write(state, name)
  }

  invert(state: EditorState): EditorState {
    return this.previousName === undefined ? state : this.write(state, this.previousName)
  }
}

/** 场景换绑到已登记地图；不复制地图内容。 */
export class BindSceneMapCommand implements Command {
  readonly label = '绑定场景地图'
  private previousMapId: string | undefined

  constructor(
    private readonly sceneId: string,
    private readonly mapId: string,
  ) {}

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene || !state.mapIndex.maps.some((asset) => asset.id === this.mapId)) return state
    if (scene.mapId === this.mapId) return state
    if (this.previousMapId === undefined) this.previousMapId = scene.mapId
    return withScene(state, this.sceneId, { ...scene, mapId: this.mapId })
  }

  invert(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene || this.previousMapId === undefined) return state
    return withScene(state, this.sceneId, { ...scene, mapId: this.previousMapId })
  }
}

/** 删除未被场景引用的地图资产；index/maps 同一命令原子更新。 */
export class DeleteMapAssetCommand implements Command {
  readonly label = '删除地图'
  private removed: { def: MapAssetDefV1; map: ProjectMap; index: number } | undefined

  constructor(private readonly mapId: string) {}

  apply(state: EditorState): EditorState {
    const references = mapAssetSceneReferences(state.scenes, this.mapId)
    if (references.length) throw new MapAssetInUseError(this.mapId, references)
    const index = state.mapIndex.maps.findIndex((asset) => asset.id === this.mapId)
    const map = state.maps[this.mapId]
    if (index < 0 || !map) return state
    if (!this.removed)
      this.removed = {
        def: structuredClone(state.mapIndex.maps[index]!),
        map: structuredClone(map),
        index,
      }
    return removeMapAsset(state, this.mapId)
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    const defs = [...state.mapIndex.maps]
    defs.splice(this.removed.index, 0, this.removed.def)
    return {
      ...state,
      mapIndex: { version: 1, maps: defs },
      maps: { ...state.maps, [this.mapId]: this.removed.map },
    }
  }
}

/**
 * 便捷包装：创建资产、绑定场景、重置进场点一次完成。
 * 新 UI 分别使用 CreateMapAssetCommand / BindSceneMapCommand。
 */
export class CreateProjectMapCommand implements Command {
  readonly label = '新建并绑定地图'
  private prevMapId: string | undefined
  private prevEntry: SceneDef['entry'] | undefined
  private previousManifest: EditorState['manifest'] | undefined
  private mapId: string | undefined

  constructor(
    private readonly sceneId: string,
    private readonly projectMapRel: string,
    private readonly tilemap: ProjectMap,
    private readonly entryPos: GridPos,
  ) {}

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    if (this.prevMapId === undefined) {
      this.prevMapId = scene.mapId
      this.prevEntry = structuredClone(scene.entry)
      this.previousManifest = state.manifest
      this.mapId = nextMapAssetId(state.mapIndex, mapIdStem(this.projectMapRel))
    }
    if (!this.mapId) return state
    const withAsset = addMapAsset(
      state,
      { id: this.mapId, name: this.mapId, path: this.projectMapRel },
      this.tilemap,
    )
    const next = withScene(state, this.sceneId, {
      ...scene,
      mapId: this.mapId,
      entry: { ...scene.entry, pos: { ...this.entryPos } },
    })
    return { ...withAsset, scenes: next.scenes }
  }

  invert(state: EditorState): EditorState {
    if (this.prevMapId === undefined) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    const next = withScene(state, this.sceneId, {
      ...scene,
      mapId: this.prevMapId,
      entry: this.prevEntry ?? scene.entry,
    })
    if (!this.mapId) return next
    return {
      ...removeMapAsset(next, this.mapId),
      manifest: this.previousManifest ?? next.manifest,
    }
  }
}

/**
 * 画瓦片(W7D):载荷使用稳定 layer.id + lattice 行列，不再出现旧 word/mask/h。
 */
export class PaintTilesCommand implements Command {
  readonly label = '画瓦片'
  private prev: ProjectMapTileEdit[] | undefined

  constructor(
    private readonly mapRel: string,
    private readonly edits: readonly ProjectMapTileEdit[],
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    const ownershipIssues = ordinaryProjectMapPatchOwnershipIssues(map, {
      visual: this.edits.flatMap((edit) => [
        { channel: 'tileId' as const, ref: edit, value: edit.tileId },
        { channel: 'tilesetId' as const, ref: edit, value: edit.tilesetId },
        { channel: 'height' as const, ref: edit, value: edit.height },
      ]),
      collision: [],
    })
    if (ownershipIssues.length > 0) throw new ProjectMapPatchError(ownershipIssues)
    if (!this.prev) {
      const seen = new Set<string>()
      this.prev = []
      for (const e of this.edits) {
        const key = `${e.layerId},${e.col},${e.row}`
        if (seen.has(key)) continue
        seen.add(key)
        const tileId = map.layers.find((layer) => layer.id === e.layerId)?.tiles[e.row]?.[e.col]
        const layer = map.layers.find((candidate) => candidate.id === e.layerId)
        if (tileId === undefined) continue
        this.prev.push({
          ...e,
          tileId,
          tilesetId: layer ? (mapInstanceTilesetId(map, layer, e.row, e.col) ?? null) : null,
          height: layer ? mapInstanceHeight(layer, e.row, e.col) : 0,
        })
      }
    }
    const next = paintProjectMapTiles(map, this.edits)
    inheritStampPlacementIndex(map, next)
    return {
      ...state,
      maps: { ...state.maps, [this.mapRel]: next },
    }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || !this.prev) return state
    const next = paintProjectMapTiles(map, this.prev)
    inheritStampPlacementIndex(map, next)
    return {
      ...state,
      maps: { ...state.maps, [this.mapRel]: next },
    }
  }
}

/** 独立碰撞层的一笔；非零语义由 schema 保留，当前 UI 写 0/1。 */
export class PaintCollisionCommand implements Command {
  readonly label = '画碰撞'
  private prev: ProjectMapCollisionEdit[] | undefined

  constructor(
    private readonly mapRel: string,
    private readonly edits: readonly ProjectMapCollisionEdit[],
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    const ownershipIssues = ordinaryProjectMapPatchOwnershipIssues(map, {
      visual: [],
      collision: this.edits.map((edit) => ({ ref: edit, value: edit.value })),
    })
    if (ownershipIssues.length > 0) throw new ProjectMapPatchError(ownershipIssues)
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
    const next = paintProjectMapCollision(map, this.edits)
    inheritStampPlacementIndex(map, next)
    return {
      ...state,
      maps: { ...state.maps, [this.mapRel]: next },
    }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || !this.prev) return state
    const next = paintProjectMapCollision(map, this.prev)
    inheritStampPlacementIndex(map, next)
    return {
      ...state,
      maps: { ...state.maps, [this.mapRel]: next },
    }
  }
}

/** W8：跨层 tile/height + 独立 collision 的一次原子、可逆 patch。 */
export class ApplyProjectMapPatchCommand implements Command {
  readonly label: string
  private readonly patch: ProjectMapPatch
  private readonly permission: MapPatchPermissionSnapshot
  private prepared: PreparedProjectMapPatch | undefined

  constructor(
    private readonly mapId: string,
    patch: ProjectMapPatch,
    permission: MapPatchPermissionSnapshot,
    label = '修改地图选区',
  ) {
    this.label = label
    this.patch = cloneProjectMapPatch(patch)
    this.permission = cloneMapPatchPermission(permission)
  }

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapId]
    if (!map)
      throw new ProjectMapPatchError([
        { code: 'map-missing', message: `地图 "${this.mapId}" 尚未加载或不存在` },
      ])
    if (!this.prepared) this.prepared = prepareProjectMapPatch(map, this.patch, this.permission)
    if (!preparedProjectMapPatchChanged(this.prepared)) return state
    const next = applyPreparedProjectMapPatch(map, this.prepared, 'next')
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapId]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapId]
    if (!this.prepared || !preparedProjectMapPatchChanged(this.prepared)) return state
    if (!map)
      throw new ProjectMapPatchError([
        { code: 'map-missing', message: `地图 "${this.mapId}" 尚未加载或不存在` },
      ])
    const previous = applyPreparedProjectMapPatch(map, this.prepared, 'prev')
    return previous === map ? state : { ...state, maps: { ...state.maps, [this.mapId]: previous } }
  }
}

export class AddProjectMapLayerCommand implements Command {
  readonly label = '新增地图层'
  private readonly layer: IsometricMapLayer
  private insertedIndex: number | undefined

  constructor(
    private readonly mapRel: string,
    layer: IsometricMapLayer,
    private readonly index?: number,
  ) {
    this.layer = structuredClone(layer)
  }

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    if (this.insertedIndex === undefined)
      this.insertedIndex = Math.max(0, Math.min(this.index ?? map.layers.length, map.layers.length))
    const next = insertProjectMapLayer(map, this.layer, this.insertedIndex)
    inheritStampPlacementIndex(map, next)
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    const next = removeProjectMapLayer(map, this.layer.id)
    inheritStampPlacementIndex(map, next)
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }
}

export class RemoveProjectMapLayerCommand implements Command {
  readonly label = '删除地图层'
  private prev: ProjectMap | undefined

  constructor(
    private readonly mapRel: string,
    private readonly layerId: string,
    private readonly stampOptions: StampStructureResolutionOptions = {},
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || map.layers.length <= 1) return state
    const next = resolveStampStructureOperation(
      map,
      { kind: 'remove-layer', layerId: this.layerId },
      this.stampOptions,
    )
    if (next !== map && !this.prev) this.prev = map
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || !this.prev) return state
    return { ...state, maps: { ...state.maps, [this.mapRel]: this.prev } }
  }
}

export class MoveProjectMapLayerCommand implements Command {
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
    const next = moveProjectMapLayer(map, this.layerId, this.toIndex)
    inheritStampPlacementIndex(map, next)
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || this.fromIndex === undefined || this.fromIndex < 0) return state
    const next = moveProjectMapLayer(map, this.layerId, this.fromIndex)
    inheritStampPlacementIndex(map, next)
    return next === map ? state : { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }
}

export class UpdateProjectMapLayerCommand implements Command {
  readonly label = '修改地图层'
  private oldPatch: Partial<Pick<IsometricMapLayer, 'name'>> | undefined

  constructor(
    private readonly mapRel: string,
    private readonly layerId: string,
    private readonly patch: Partial<Pick<IsometricMapLayer, 'name'>>,
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    const layer = map?.layers.find((candidate) => candidate.id === this.layerId)
    if (!map || !layer) return state
    if (!this.oldPatch) {
      this.oldPatch = {}
      if ('name' in this.patch) this.oldPatch.name = layer.name
    }
    const next = updateProjectMapLayer(map, this.layerId, this.patch)
    inheritStampPlacementIndex(map, next)
    return { ...state, maps: { ...state.maps, [this.mapRel]: next } }
  }

  invert(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map || !this.oldPatch) return state
    const next = updateProjectMapLayer(map, this.layerId, this.oldPatch)
    inheritStampPlacementIndex(map, next)
    return {
      ...state,
      maps: {
        ...state.maps,
        [this.mapRel]: next,
      },
    }
  }
}

/**
 * 改图尺寸(W7c-4):左上锚定裁剪/扩展。裁剪破坏性 → prev 直接留 apply 前的整图引用
 * (不可变数据,零拷贝),invert 整图还原,被裁内容精确回来。
 */
export class ResizeProjectMapCommand implements Command {
  readonly label = '改图尺寸'
  private prev: ProjectMap | undefined

  constructor(
    private readonly mapRel: string,
    private readonly width: number,
    private readonly height: number,
    private readonly stampOptions: StampStructureResolutionOptions = {},
  ) {}

  apply(state: EditorState): EditorState {
    const map = state.maps[this.mapRel]
    if (!map) return state
    const next = resolveStampStructureOperation(
      map,
      { kind: 'resize', width: this.width, height: this.height },
      this.stampOptions,
    )
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
 * 上传 tileset 入库：定义 + catalog record + pending gzip 字节原子加入。
 */
export class AddTilesetCommand implements Command {
  readonly label = '上传瓦片集'
  private readonly def: TilesetDef
  private readonly record: AssetRecordV1
  private readonly blob: ArrayBuffer
  private createdAsset = false

  constructor(def: TilesetDef, record: AssetRecordV1, blob: ArrayBuffer) {
    this.def = structuredClone(def)
    this.record = structuredClone(record)
    this.blob = blob
  }

  apply(state: EditorState): EditorState {
    if ((state.tilesets ?? []).some((t) => t.id === this.def.id))
      throw new Error(`瓦片集定义 id 已存在: ${this.def.id}`)
    assertTilesetRecord(this.record, this.blob)
    if (!this.def.asset) throw new Error('瓦片集定义缺 AssetId')
    const existing = state.assetCatalog.assets[this.def.asset]
    if (existing && !sameAssetRecord(existing, this.record))
      throw new Error(`瓦片集 AssetId 已存在且记录不同: ${this.def.asset}`)
    const pathOwner = Object.entries(state.assetCatalog.assets).find(
      ([id, record]) => id !== this.def.asset && record.path === this.record.path,
    )
    if (pathOwner) throw new Error(`瓦片集资源路径已由 ${pathOwner[0]} 登记`)
    this.createdAsset = !existing
    return {
      ...state,
      tilesets: [...(state.tilesets ?? []), this.def],
      assetCatalog: existing
        ? state.assetCatalog
        : {
            ...state.assetCatalog,
            assets: { ...state.assetCatalog.assets, [this.def.asset]: this.record },
          },
      assetBlobs: existing
        ? state.assetBlobs
        : { ...state.assetBlobs, [this.record.path]: this.blob.slice(0) },
    }
  }

  invert(state: EditorState): EditorState {
    const assets = { ...state.assetCatalog.assets }
    if (this.createdAsset) delete assets[this.def.asset]
    const assetBlobs = { ...state.assetBlobs }
    if (
      this.createdAsset &&
      !Object.values(assets).some((record) => record.path === this.record.path)
    )
      delete assetBlobs[this.record.path]
    return {
      ...state,
      tilesets: (state.tilesets ?? []).filter((t) => t.id !== this.def.id),
      assetCatalog: { ...state.assetCatalog, assets },
      assetBlobs,
    }
  }
}

/**
 * 移除定义；只有零其它定义引用时才连带移除 catalog record/pending bytes。
 */
export class RemoveTilesetCommand implements Command {
  readonly label = '移除瓦片集'
  private removed: TilesetDef | undefined
  private removedIndex: number | undefined
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined

  constructor(
    private readonly tilesetId: string,
    private readonly proof?: TilesetRemovalProof,
    private readonly persistedBytes?: ArrayBuffer,
  ) {}

  apply(state: EditorState): EditorState {
    const list = state.tilesets ?? []
    const index = list.findIndex((t) => t.id === this.tilesetId)
    if (index < 0) return state
    assertTilesetRemovalAllowed(state, this.tilesetId, this.proof)
    if (!this.removed) {
      this.removed = structuredClone(list[index])
      this.removedIndex = index
      this.oldCatalog = state.assetCatalog
      this.oldBlobs = state.assetBlobs
    }
    const removed = list[index]!
    const nextTilesets = list.filter((t) => t.id !== this.tilesetId)
    if (nextTilesets.some((candidate) => candidate.asset === removed.asset))
      return { ...state, tilesets: nextTilesets }
    const assets = { ...state.assetCatalog.assets }
    const record = assets[removed.asset]
    delete assets[removed.asset]
    const assetBlobs = { ...state.assetBlobs }
    if (record && !Object.values(assets).some((candidate) => candidate.path === record.path))
      delete assetBlobs[record.path]
    return {
      ...state,
      tilesets: nextTilesets,
      assetCatalog: { ...state.assetCatalog, assets },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed || this.removedIndex === undefined) return state
    const list = [...(state.tilesets ?? [])]
    list.splice(this.removedIndex, 0, this.removed)
    return {
      ...state,
      tilesets: list,
      assetCatalog: this.oldCatalog ?? state.assetCatalog,
      assetBlobs: (() => {
        const blobs = { ...(this.oldBlobs ?? state.assetBlobs) }
        const record = this.oldCatalog?.assets[this.removed.asset]
        if (record && this.persistedBytes) blobs[record.path] = this.persistedBytes.slice(0)
        return blobs
      })(),
    }
  }
}

/** 改名/分类只改领域定义，不触碰资源诊断 label。 */
export class UpdateTilesetMetadataCommand implements Command {
  readonly label = '修改瓦片集信息'
  private previous: Pick<TilesetDef, 'name' | 'category'> | undefined

  constructor(
    private readonly id: string,
    private readonly patch: Partial<Pick<TilesetDef, 'name' | 'category'>>,
  ) {}

  apply(state: EditorState): EditorState {
    const current = (state.tilesets ?? []).find((entry) => entry.id === this.id)
    if (!current) return state
    if (this.patch.name !== undefined && !this.patch.name.trim())
      throw new Error('瓦片集名称不能为空')
    if (this.patch.category !== undefined && !this.patch.category.trim())
      throw new Error('瓦片集分类不能为空')
    this.previous ??= { name: current.name, category: current.category }
    return {
      ...state,
      tilesets: (state.tilesets ?? []).map((entry) =>
        entry.id === this.id ? { ...entry, ...this.patch } : entry,
      ),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.previous) return state
    return {
      ...state,
      tilesets: (state.tilesets ?? []).map((entry) =>
        entry.id === this.id ? { ...entry, ...this.previous } : entry,
      ),
    }
  }
}

/** 替换保持 TilesetDef.id 与 AssetId，仅更新该共享二进制的 record/bytes。 */
export class ReplaceTilesetAssetCommand implements Command {
  readonly label = '替换瓦片集图像'
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined

  constructor(
    private readonly tilesetId: string,
    private readonly asset: AssetId,
    private readonly record: AssetRecordV1,
    private readonly bytes: ArrayBuffer,
    private readonly previousBytes?: ArrayBuffer,
    private readonly proof?: TilesetReplacementProof,
  ) {}

  apply(state: EditorState): EditorState {
    const previous = state.assetCatalog.assets[this.asset]
    if (!previous) return state
    assertTilesetRecord(this.record, this.bytes)
    if (previous.kind !== 'tileset') throw new Error('瓦片集替换只能更新 kind=tileset 的资源')
    const pathOwner = Object.entries(state.assetCatalog.assets).find(
      ([id, candidate]) => id !== this.asset && candidate.path === this.record.path,
    )
    if (pathOwner) throw new Error(`瓦片集替换路径已由 ${pathOwner[0]} 登记`)
    const target = (state.tilesets ?? []).find((entry) => entry.id === this.tilesetId)
    if (!target || target.asset !== this.asset) throw new Error('瓦片集定义与待替换 AssetId 不一致')
    assertTilesetReplacementAllowed(state, this.tilesetId, this.asset, this.proof)
    if (!this.oldCatalog) {
      this.oldCatalog = state.assetCatalog
      this.oldBlobs = state.assetBlobs
    }
    const assetBlobs = { ...state.assetBlobs }
    if (
      previous.path !== this.record.path &&
      !Object.entries(state.assetCatalog.assets).some(
        ([id, candidate]) => id !== this.asset && candidate.path === previous.path,
      )
    )
      delete assetBlobs[previous.path]
    assetBlobs[this.record.path] = this.bytes.slice(0)
    return {
      ...state,
      assetCatalog: {
        ...state.assetCatalog,
        assets: { ...state.assetCatalog.assets, [this.asset]: structuredClone(this.record) },
      },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldCatalog || !this.oldBlobs) return state
    const blobs = { ...this.oldBlobs }
    const record = this.oldCatalog.assets[this.asset]
    if (record && this.previousBytes) blobs[record.path] = this.previousBytes.slice(0)
    return { ...state, assetCatalog: this.oldCatalog, assetBlobs: blobs }
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

/** 布局/姿势编辑在预览时解码出的资源事实；SHA 防止预览后资源已被替换。 */
export interface SpriteLayoutEditProof {
  asset: AssetId
  sha256: string
  actualFrameCount: number
}

function assertSpriteEditShape(sprite: Pick<SpriteDef, 'id' | 'layout' | 'poses'>): void {
  if (
    sprite.layout.kind === 'loop' ||
    (sprite.layout.kind === 'directional' &&
      (!Number.isInteger(sprite.layout.framesPerDir) || sprite.layout.framesPerDir <= 0))
  )
    throw new Error(`精灵 ${sprite.id} 的布局非法；自动循环请创建预制动作`)
  for (const [actionId, action] of Object.entries(sprite.poses ?? {})) {
    if (
      !actionId ||
      !action.label.trim() ||
      action.steps.length === 0 ||
      action.steps.some(
        (step) =>
          !Number.isInteger(step.frame) ||
          step.frame < 0 ||
          !Number.isInteger(step.durationMs) ||
          step.durationMs <= 0 ||
          step.cues?.some((cue) => cue.kind !== 'sound' || !cue.asset),
      ) ||
      (action.order !== undefined && (!Number.isInteger(action.order) || action.order < 0)) ||
      (action.loopFrom !== undefined &&
        (!Number.isInteger(action.loopFrom) ||
          action.loopFrom < 0 ||
          action.loopFrom >= action.steps.length))
    )
      throw new Error(`精灵 ${sprite.id} 的预制动作 ${actionId} 非法`)
  }
}

/**
 * 改精灵字段(layout/poses/label)。语义同 UpdateEntityCommand:首次 apply 捕获旧值,invert 还原。
 * layout/poses 是对象 → 深拷贝入参 + 捕获时深拷贝旧值(防回写)。
 */
export class UpdateSpriteCommand implements Command {
  readonly label = '修改精灵'
  private readonly spriteId: string
  private readonly patch: SpritePatch
  private oldPatch: SpritePatch | undefined

  constructor(
    spriteId: string,
    patch: SpritePatch,
    private readonly proof?: SpriteLayoutEditProof,
  ) {
    this.spriteId = spriteId
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const sp = state.sprites.find((s) => s.id === this.spriteId)
    if (!sp) return state
    if ('layout' in this.patch || 'poses' in this.patch) {
      const proof = this.proof
      const record = state.assetCatalog.assets[sp.asset]
      if (
        record?.kind !== 'sprite' ||
        !proof ||
        proof.asset !== sp.asset ||
        proof.sha256 !== record.sha256
      )
        throw new Error('精灵布局证明缺失或已过期，请等待帧资源重新载入')
      if (!Number.isInteger(proof.actualFrameCount) || proof.actualFrameCount <= 0)
        throw new Error('精灵布局证明的实际帧数非法')
      const next = { ...sp, ...this.patch }
      assertSpriteEditShape(next)
      if ('poses' in this.patch) {
        const removedActionIds = Object.keys(sp.poses ?? {}).filter(
          (actionId) => !next.poses?.[actionId],
        )
        if (removedActionIds.length) {
          const blocking = collectSpriteActionReferences(state).filter(
            (reference) =>
              reference.sprite === sp.id && removedActionIds.includes(reference.action),
          )
          if (blocking.length)
            throw new Error(
              `动作 ${blocking[0]!.action} 仍被 ${blocking[0]!.where} 引用，不能删除或更换 ActionId`,
            )
        }
      }
      const previousMissing = new Set(
        [...spriteDefinitionFrameIndices(sp)].filter((frame) => frame >= proof.actualFrameCount),
      )
      const nextMissing = [...spriteDefinitionFrameIndices(next)].filter(
        (frame) => frame >= proof.actualFrameCount,
      )
      const addedMissing = nextMissing.filter((frame) => !previousMissing.has(frame))
      if (addedMissing.length)
        throw new Error(
          `布局会新增越界帧 ${addedMissing.join(', ')}，资源实际只有 ${proof.actualFrameCount} 帧`,
        )
    }
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

/** 脚本源定位:场景 onEnter/onTeleport，或实体指定页的 trigger/auto。 */
export type ScriptSourceRef =
  | { kind: 'onEnter' }
  | { kind: 'onTeleport' }
  | { kind: 'trigger'; entityId: string; pageIndex?: number }
  | { kind: 'auto'; entityId: string; pageIndex?: number }

/** 取脚本源当前 stages(不存在 → undefined)。 */
export function getScriptStages(
  scene: SceneDef,
  ref: ScriptSourceRef,
): readonly ScriptStage[] | undefined {
  if (ref.kind === 'onEnter') return scene.onEnter
  if (ref.kind === 'onTeleport') return scene.onTeleport
  const e = scene.entities.find((x) => x.id === ref.entityId)
  const page = e?.pages?.[ref.pageIndex ?? 0]
  return ref.kind === 'trigger' ? page?.trigger?.stages : page?.auto?.stages
}

/** 不可变:把脚本源的 stages 整体替换(源缺失原样返回)。 */
function withScriptStages(scene: SceneDef, ref: ScriptSourceRef, stages: ScriptStage[]): SceneDef {
  if (ref.kind === 'onEnter') return { ...scene, onEnter: stages }
  if (ref.kind === 'onTeleport') return { ...scene, onTeleport: stages }
  const entities = scene.entities.map((e) => {
    if (e.id !== ref.entityId) return e
    const pageIndex = ref.pageIndex ?? 0
    const page = e.pages?.[pageIndex]
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
    return {
      ...e,
      pages: e.pages?.map((candidate, index) => (index === pageIndex ? newPage : candidate)),
    }
  })
  return { ...scene, entities }
}

/** 改实体指定页的触发方式(交互/触碰 + 距离)。 */
export class UpdateTriggerModeCommand implements Command {
  readonly label = '改触发方式'
  private readonly sceneId: string
  private readonly entityId: string
  private readonly on: 'interact' | 'touch'
  private readonly range: number | undefined
  private readonly pageIndex: number
  private old: { on: 'interact' | 'touch'; range: number | undefined } | undefined

  constructor(
    sceneId: string,
    entityId: string,
    on: 'interact' | 'touch',
    range: number | undefined,
    pageIndex = 0,
  ) {
    this.sceneId = sceneId
    this.entityId = entityId
    this.on = on
    this.range = range
    this.pageIndex = pageIndex
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
      const page = e.pages?.[this.pageIndex]
      if (!page?.trigger) return e
      const trigger = { ...page.trigger, on }
      if (range === undefined) delete (trigger as { range?: number }).range
      else trigger.range = range
      return {
        ...e,
        pages: e.pages?.map((candidate, index) =>
          index === this.pageIndex ? { ...page, trigger } : candidate,
        ),
      }
    })
    return withEntities(state, this.sceneId, entities)
  }

  apply(state: EditorState): EditorState {
    if (!this.old) {
      const t = findScene(state, this.sceneId)?.entities.find((e) => e.id === this.entityId)
        ?.pages?.[this.pageIndex]?.trigger
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
    const pageIndex = this.ref.pageIndex ?? 0
    const entities = scene.entities.map((e) => {
      if (e.id !== entityId) return e
      const page = e.pages?.[pageIndex]
      const slot = kind === 'trigger' ? page?.trigger : page?.auto
      if (!page || !slot) return e
      if (this.old === undefined) this.old = structuredClone(slot)
      const newPage = { ...page }
      delete (newPage as Record<string, unknown>)[kind]
      return {
        ...e,
        pages: e.pages?.map((candidate, index) => (index === pageIndex ? newPage : candidate)),
      }
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
    const pageIndex = this.ref.pageIndex ?? 0
    const entities = scene.entities.map((e) => {
      if (e.id !== entityId) return e
      const pages = [...(e.pages ?? [])]
      while (pages.length <= pageIndex) pages.push({})
      const page = pages[pageIndex] ?? {}
      pages[pageIndex] = { ...page, [kind]: structuredClone(this.old) }
      return {
        ...e,
        pages,
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

interface ScriptStateSnapshot {
  index: EditorState['scriptIndex']
  chunks: EditorState['scriptChunks']
  scriptsPath: string | undefined
}

function captureScriptState(state: EditorState): ScriptStateSnapshot {
  return {
    index: state.scriptIndex ? structuredClone(state.scriptIndex) : undefined,
    chunks: structuredClone(state.scriptChunks ?? {}),
    scriptsPath: state.manifest.content?.scripts,
  }
}

function restoreScriptState(state: EditorState, snapshot: ScriptStateSnapshot): EditorState {
  const content = { ...(state.manifest.content ?? {}) }
  if (snapshot.scriptsPath === undefined) delete content.scripts
  else content.scripts = snapshot.scriptsPath
  return {
    ...state,
    manifest: { ...state.manifest, content },
    scriptIndex: snapshot.index ? structuredClone(snapshot.index) : undefined,
    scriptChunks: structuredClone(snapshot.chunks),
  }
}

function withScriptLibrary(
  state: EditorState,
  index: NonNullable<EditorState['scriptIndex']>,
  chunks: EditorState['scriptChunks'],
): EditorState {
  return {
    ...state,
    manifest: {
      ...state.manifest,
      content: {
        ...(state.manifest.content ?? {}),
        scripts: state.manifest.content?.scripts ?? 'content/scripts/',
      },
    },
    scriptIndex: index,
    scriptChunks: chunks,
  }
}

/** 新建/改名/修改作者共享脚本；首次创建时原子补 manifest + index + chunk。 */
export class UpsertAuthoredScriptCommand implements Command {
  readonly label = '保存共享脚本'
  private old: ScriptStateSnapshot | undefined

  constructor(
    private readonly id: string,
    private readonly meta: SharedScriptMetaV1,
    private readonly body: readonly ScriptCommand[],
  ) {}

  apply(state: EditorState): EditorState {
    if (!this.old) this.old = captureScriptState(state)
    const result = upsertAuthoredScript(
      state.scriptIndex ?? createScriptIndex(),
      state.scriptChunks ?? {},
      this.id,
      this.meta,
      this.body,
    )
    return withScriptLibrary(state, result.index, result.chunks)
  }

  invert(state: EditorState): EditorState {
    return this.old ? restoreScriptState(state, this.old) : state
  }
}

/** 修改任意已存在的分片脚本体；是否共享由 library 元数据决定。 */
export class UpdateScriptBodyCommand implements Command {
  readonly label = '修改脚本内容'
  private old: ScriptStateSnapshot | undefined

  constructor(
    private readonly id: string,
    private readonly body: readonly ScriptCommand[],
  ) {}

  apply(state: EditorState): EditorState {
    if (!state.scriptIndex) throw new Error(`脚本 ${this.id} 没有 index`)
    checkCommands(this.body, `scripts.${this.id}`)
    const owner = findScriptOwnerChunk(state.scriptChunks ?? {}, this.id)
    if (!owner) throw new Error(`脚本不存在 ${this.id}`)
    if (!this.old) this.old = captureScriptState(state)
    const chunks = structuredClone(state.scriptChunks) as EditorState['scriptChunks']
    const ownerChunk = chunks[owner]
    if (!ownerChunk) throw new Error(`脚本 ${this.id} 的分片 ${owner} 不存在`)
    chunks[owner] = {
      ...ownerChunk,
      scripts: {
        ...ownerChunk.scripts,
        [this.id]: structuredClone(this.body) as ScriptCommand[],
      },
    }
    const result = normalizeScriptLibrary(state.scriptIndex, chunks)
    return withScriptLibrary(state, result.index, result.chunks)
  }

  invert(state: EditorState): EditorState {
    return this.old ? restoreScriptState(state, this.old) : state
  }
}

/** 删除无外部调用方的作者脚本；引用检查只在删除动作发生时运行。 */
export class DeleteAuthoredScriptCommand implements Command {
  readonly label = '删除共享脚本'
  private old: ScriptStateSnapshot | undefined

  constructor(private readonly id: string) {}

  apply(state: EditorState): EditorState {
    if (!state.scriptIndex?.library?.[this.id]) throw new Error(`作者脚本不存在 ${this.id}`)
    const external = findScriptReferences(state, this.id).filter(
      (entry) => entry.caller.type !== 'script' || entry.caller.scriptId !== this.id,
    )
    if (external.length)
      throw new Error(
        `共享脚本仍被 ${external.length} 处引用:\n${external
          .slice(0, 8)
          .map((entry) => `${entry.caller.label}${entry.path}`)
          .join('\n')}`,
      )
    if (!this.old) this.old = captureScriptState(state)
    const result = removeAuthoredScript(state.scriptIndex, state.scriptChunks ?? {}, this.id)
    return withScriptLibrary(state, result.index, result.chunks)
  }

  invert(state: EditorState): EditorState {
    return this.old ? restoreScriptState(state, this.old) : state
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
  private insertedIndex = -1

  constructor(actor: ActorDef, index?: number) {
    this.actor = structuredClone(actor)
    this.requestedIndex = index
  }

  apply(state: EditorState): EditorState {
    assertActorCanBeAdded(state, this.actor)
    const actors = [...state.actors]
    const index = Math.min(Math.max(0, this.requestedIndex ?? actors.length), actors.length)
    this.insertedIndex = index
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
export class DeleteActorCommand implements Command {
  readonly label = '删除人物'
  private removed: ActorDef | undefined
  private removedLevelUp: LevelUpSkill[] | undefined
  private hadLevelUp = false
  private index = -1

  constructor(private readonly actorId: string) {}

  apply(state: EditorState): EditorState {
    const index = state.actors.findIndex((actor) => actor.id === this.actorId)
    if (index < 0) return state
    const blockers = blockingActorReferences(state, this.actorId)
    if (blockers.length)
      throw new Error(
        `人物 ${this.actorId} 仍被 ${blockers.length} 处引用：\n${blockers
          .slice(0, 20)
          .map((reference) => `${reference.label} · ${reference.where}`)
          .join('\n')}`,
      )
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

/** 新增物品；id 冲突必须 fail-loud，避免复制/异步导入覆盖既有定义。 */
export class AddItemCommand implements Command {
  readonly label = '新增物品'
  private readonly item: ItemData
  private readonly index: number | undefined

  constructor(item: ItemData, index?: number) {
    this.item = structuredClone(item)
    this.index = index
  }

  apply(state: EditorState): EditorState {
    if (state.items.some((item) => item.id === this.item.id))
      throw new Error(`物品 id 已存在：${this.item.id}`)
    const index = Math.min(Math.max(0, this.index ?? state.items.length), state.items.length)
    const items = [...state.items]
    items.splice(index, 0, structuredClone(this.item))
    return { ...state, items }
  }

  invert(state: EditorState): EditorState {
    if (!state.items.some((item) => item.id === this.item.id)) return state
    return { ...state, items: state.items.filter((item) => item.id !== this.item.id) }
  }
}

/** 删除前每次从当前 EditorState 重算完整引用闭包；任何外部引用都拒绝删除。 */
export class DeleteItemCommand implements Command {
  readonly label = '删除物品'
  private removed: ItemData | undefined
  private index = -1
  private migrationDiagnosticsBeforeDelete: EditorState['migrationDiagnostics'] | undefined
  private capturedMigrationDiagnostics = false

  constructor(
    private readonly itemId: string,
    private readonly canonicalState:
      | (() => ScriptEditorState | undefined)
      | undefined = undefined,
  ) {}

  apply(state: EditorState): EditorState {
    const index = state.items.findIndex((item) => item.id === this.itemId)
    if (index < 0) return state
    const canonicalState = this.canonicalState?.()
    if (this.canonicalState && !canonicalState)
      throw new Error('删除物品前无法读取 canonical 脚本引用')
    const blockers = blockingItemReferences(state, this.itemId, canonicalState)
    if (blockers.length)
      throw new Error(
        `物品 ${this.itemId} 仍被 ${blockers.length} 处引用：\n${blockers
          .slice(0, 20)
          .map((reference) => `${reference.label} · ${reference.detail}`)
          .join('\n')}`,
      )
    if (!this.removed) {
      this.removed = structuredClone(state.items[index]!)
      this.index = index
    }
    if (!this.capturedMigrationDiagnostics) {
      this.migrationDiagnosticsBeforeDelete = state.migrationDiagnostics
        ? structuredClone(state.migrationDiagnostics)
        : undefined
      this.capturedMigrationDiagnostics = true
    }
    const migrationDiagnostics = state.migrationDiagnostics
      ? {
          ...state.migrationDiagnostics,
          diagnostics: state.migrationDiagnostics.diagnostics.filter(
            (diagnostic) =>
              !(diagnostic.target.domain === 'item' && diagnostic.target.objectId === this.itemId),
          ),
        }
      : undefined
    return {
      ...state,
      items: state.items.filter((item) => item.id !== this.itemId),
      migrationDiagnostics,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    if (state.items.some((item) => item.id === this.itemId))
      throw new Error(`无法撤销删除：物品 id 已被占用 ${this.itemId}`)
    const items = [...state.items]
    items.splice(Math.min(Math.max(0, this.index), items.length), 0, structuredClone(this.removed))
    return {
      ...state,
      items,
      migrationDiagnostics: this.migrationDiagnosticsBeforeDelete
        ? structuredClone(this.migrationDiagnosticsBeforeDelete)
        : undefined,
    }
  }
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

export const BATTLE_FIELDS_PATH = 'content/battle-fields.json'

export function nextBattleFieldId(fields: readonly BattleFieldDef[]): number {
  if (fields.length === 0) return DEFAULT_BATTLE_FIELD_ID
  const next = Math.max(...fields.map((field) => field.id)) + 1
  if (!Number.isSafeInteger(next)) throw new Error('无法分配新的战场 id：已超出安全整数范围')
  return next
}

interface BattleFieldTableSnapshot {
  manifest: EditorState['manifest']
  battleFields: BattleFieldDef[] | undefined
}

function captureBattleFieldTable(state: EditorState): BattleFieldTableSnapshot {
  return {
    manifest: structuredClone(state.manifest),
    battleFields:
      state.battleFields === undefined ? undefined : structuredClone(state.battleFields),
  }
}

function restoreBattleFieldTable(
  state: EditorState,
  snapshot: BattleFieldTableSnapshot | undefined,
): EditorState {
  if (!snapshot) return state
  return {
    ...state,
    manifest: structuredClone(snapshot.manifest),
    battleFields:
      snapshot.battleFields === undefined ? undefined : structuredClone(snapshot.battleFields),
  }
}

function appendBattleField(state: EditorState, field: BattleFieldDef): EditorState {
  const battleFields = [...(state.battleFields ?? []), structuredClone(field)]
  validateBattleFields(battleFields)
  return {
    ...state,
    manifest: {
      ...state.manifest,
      content: {
        ...state.manifest.content,
        battleFields: state.manifest.content.battleFields ?? BATTLE_FIELDS_PATH,
      },
    },
    battleFields,
  }
}

/** 新建战场；首次创建时与 manifest.content.battleFields 原子登记并整体可撤销。 */
export class AddBattleFieldCommand implements Command {
  readonly label = '新建战场'
  private readonly field: BattleFieldDef
  private before: BattleFieldTableSnapshot | undefined

  constructor(field: BattleFieldDef) {
    this.field = structuredClone(field)
    validateBattleFields([this.field])
  }

  apply(state: EditorState): EditorState {
    if ((state.battleFields ?? []).some((field) => field.id === this.field.id))
      throw new Error(`战场 id 已存在：${this.field.id}`)
    this.before ??= captureBattleFieldTable(state)
    return appendBattleField(state, this.field)
  }

  invert(state: EditorState): EditorState {
    return restoreBattleFieldTable(state, this.before)
  }
}

/** 复制战场定义到新稳定 id；资源引用保持共享，不复制资源文件。 */
export class CopyBattleFieldCommand implements Command {
  readonly label = '复制战场'
  private readonly sourceId: number
  private readonly nextId: number
  private before: BattleFieldTableSnapshot | undefined
  private copy: BattleFieldDef | undefined

  constructor(sourceId: number, nextId: number) {
    this.sourceId = sourceId
    this.nextId = nextId
  }

  apply(state: EditorState): EditorState {
    const source = (state.battleFields ?? []).find((field) => field.id === this.sourceId)
    if (!source) throw new Error(`复制失败：找不到战场 ${this.sourceId}`)
    if ((state.battleFields ?? []).some((field) => field.id === this.nextId))
      throw new Error(`战场 id 已存在：${this.nextId}`)
    this.before ??= captureBattleFieldTable(state)
    this.copy ??= { ...structuredClone(source), id: this.nextId }
    return appendBattleField(state, this.copy)
  }

  invert(state: EditorState): EditorState {
    return restoreBattleFieldTable(state, this.before)
  }
}

export class BattleFieldInUseError extends Error {
  readonly fieldId: number
  readonly references: readonly BlockingBattleFieldReference[]

  constructor(fieldId: number, references: readonly BlockingBattleFieldReference[]) {
    super(`战场 ${fieldId} 仍被 ${references.length} 处引用，不能删除`)
    this.name = 'BattleFieldInUseError'
    this.fieldId = fieldId
    this.references = references
  }
}

/** 删除未使用战场；最后一项删除后仍保留已声明的空表文件。 */
export class DeleteBattleFieldCommand implements Command {
  readonly label = '删除战场'
  private readonly fieldId: number
  private before: BattleFieldTableSnapshot | undefined

  constructor(fieldId: number) {
    this.fieldId = fieldId
  }

  apply(state: EditorState): EditorState {
    const index = (state.battleFields ?? []).findIndex((field) => field.id === this.fieldId)
    if (index < 0) return state
    const references = blockingBattleFieldReferences(state, this.fieldId)
    if (references.length > 0) throw new BattleFieldInUseError(this.fieldId, references)
    this.before ??= captureBattleFieldTable(state)
    return {
      ...state,
      battleFields: (state.battleFields ?? []).filter((field) => field.id !== this.fieldId),
    }
  }

  invert(state: EditorState): EditorState {
    return restoreBattleFieldTable(state, this.before)
  }
}

/** UpdateBattleField 的 patch 范围(id 不可改 —— 数字稳定身份被场景/脚本引用)。 */
export type BattleFieldPatch = Partial<
  Pick<BattleFieldDef, 'name' | 'background' | 'screenWave' | 'magicEffect'>
>

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
    validateBattleFields(
      (state.battleFields ?? []).map((field) =>
        field.id === this.fieldId ? (next as unknown as BattleFieldDef) : field,
      ),
    )
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
    | 'battleSprite'
    | 'yPosOffset'
    | 'stats'
    | 'ai'
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
export class BattleDataInUseError extends Error {
  readonly references: readonly BattleDataReference[]

  constructor(kind: string, id: string, references: readonly BattleDataReference[]) {
    super(`${kind} ${id} 仍被 ${references.length} 处引用`)
    this.name = 'BattleDataInUseError'
    this.references = references
  }
}

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
    const references = blockingEnemyReferences(state, this.enemyId)
    if (references.length) throw new BattleDataInUseError('敌人', this.enemyId, references)
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

function withEnemyTeam(state: EditorState, teamId: string, next: EnemyTeamDef): EditorState {
  let hit = false
  const enemyTeams = (state.enemyTeams ?? []).map((team) => {
    if (team.id !== teamId) return team
    hit = true
    return next
  })
  return hit ? { ...state, enemyTeams } : state
}

/** 新增独立敌队预制。稳定 id 创建后不可修改。 */
export class AddEnemyTeamCommand implements Command {
  readonly label = '新增敌队'
  private readonly team: EnemyTeamDef
  constructor(team: EnemyTeamDef) {
    this.team = structuredClone(team)
  }
  apply(state: EditorState): EditorState {
    if ((state.enemyTeams ?? []).some((candidate) => candidate.id === this.team.id)) return state
    return { ...state, enemyTeams: [...(state.enemyTeams ?? []), this.team] }
  }
  invert(state: EditorState): EditorState {
    return {
      ...state,
      enemyTeams: (state.enemyTeams ?? []).filter((candidate) => candidate.id !== this.team.id),
    }
  }
}

/** 修改敌队语义槽；槽位最多五个，null 保留空洞。 */
export class UpdateEnemyTeamCommand implements Command {
  readonly label = '修改敌队'
  private previous: EnemyTeamDef | undefined
  private readonly next: EnemyTeamDef
  constructor(
    private readonly teamId: string,
    next: EnemyTeamDef,
  ) {
    this.next = structuredClone(next)
  }
  apply(state: EditorState): EditorState {
    const team = (state.enemyTeams ?? []).find((candidate) => candidate.id === this.teamId)
    if (!team) return state
    if (!this.previous) this.previous = structuredClone(team)
    return withEnemyTeam(state, this.teamId, {
      ...this.next,
      id: this.teamId,
      slots: this.next.slots.slice(0, 5),
    })
  }
  invert(state: EditorState): EditorState {
    return this.previous ? withEnemyTeam(state, this.teamId, this.previous) : state
  }
}

export class EnemyTeamInUseError extends Error {
  readonly references: ReturnType<typeof blockingEnemyTeamReferences>
  constructor(teamId: string, references: ReturnType<typeof blockingEnemyTeamReferences>) {
    super(`敌队 ${teamId} 仍被 ${references.length} 处引用`)
    this.name = 'EnemyTeamInUseError'
    this.references = references
  }
}

/** 删除未被场景或脚本引用的敌队；invert 插回原索引。 */
export class DeleteEnemyTeamCommand implements Command {
  readonly label = '删除敌队'
  private removed: { team: EnemyTeamDef; index: number } | undefined
  constructor(private readonly teamId: string) {}
  apply(state: EditorState): EditorState {
    const teams = state.enemyTeams ?? []
    const index = teams.findIndex((candidate) => candidate.id === this.teamId)
    if (index === -1) return state
    const references = blockingEnemyTeamReferences(state, this.teamId)
    if (references.length) throw new EnemyTeamInUseError(this.teamId, references)
    if (!this.removed) this.removed = { team: structuredClone(teams[index]!), index }
    return { ...state, enemyTeams: teams.filter((_, candidateIndex) => candidateIndex !== index) }
  }
  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    const enemyTeams = [...(state.enemyTeams ?? [])]
    enemyTeams.splice(this.removed.index, 0, this.removed.team)
    return { ...state, enemyTeams }
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
// A7 资源注册表命令(音乐首切片)
// ════════════════════════════════════════════════════════════════════

/** 改资源显示名；AssetId/path/引用保持不变。 */
export class UpdateAssetLabelCommand implements Command {
  readonly label = '修改资源名称'
  private readonly assetId: AssetId
  private readonly next: string | undefined
  private old: string | undefined
  private captured = false

  constructor(assetId: AssetId, label: string | undefined) {
    this.assetId = assetId
    this.next = label || undefined
  }

  apply(state: EditorState): EditorState {
    const current = state.assetCatalog.assets[this.assetId]
    if (!current) return state
    if (!this.captured) {
      this.captured = true
      this.old = current.label
    }
    const record = { ...current, label: this.next }
    if (!this.next) delete record.label
    return {
      ...state,
      assetCatalog: {
        ...state.assetCatalog,
        assets: { ...state.assetCatalog.assets, [this.assetId]: record },
      },
    }
  }

  invert(state: EditorState): EditorState {
    const current = state.assetCatalog.assets[this.assetId]
    if (!current) return state
    const record = { ...current, label: this.old }
    if (!this.old) delete record.label
    return {
      ...state,
      assetCatalog: {
        ...state.assetCatalog,
        assets: { ...state.assetCatalog.assets, [this.assetId]: record },
      },
    }
  }
}

/** 新增或替换资源；替换保持 AssetId，二进制按新 record.path 暂存在会话。 */
export class UpsertAssetCommand implements Command {
  readonly label = '导入资源'
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined

  constructor(
    private readonly assetId: AssetId,
    private readonly record: AssetRecordV1,
    private readonly bytes: ArrayBuffer,
    /** 旧资源可能只在磁盘上；保留字节使保存后撤销仍可物化旧 record。 */
    private readonly previousBytes?: ArrayBuffer,
  ) {}

  apply(state: EditorState): EditorState {
    if (!this.oldCatalog) {
      this.oldCatalog = state.assetCatalog
      this.oldBlobs = state.assetBlobs
    }
    const previous = state.assetCatalog.assets[this.assetId]
    const assetBlobs = { ...state.assetBlobs }
    if (
      previous &&
      previous.path !== this.record.path &&
      !Object.entries(state.assetCatalog.assets).some(
        ([id, asset]) => id !== this.assetId && asset.path === previous.path,
      )
    )
      delete assetBlobs[previous.path]
    assetBlobs[this.record.path] = this.bytes.slice(0)
    return {
      ...state,
      assetCatalog: {
        ...state.assetCatalog,
        assets: {
          ...state.assetCatalog.assets,
          [this.assetId]: structuredClone(this.record),
        },
      },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldCatalog || !this.oldBlobs) return state
    const assetBlobs = { ...this.oldBlobs }
    const previous = this.oldCatalog.assets[this.assetId]
    if (previous && this.previousBytes) assetBlobs[previous.path] = this.previousBytes.slice(0)
    return { ...state, assetCatalog: this.oldCatalog, assetBlobs }
  }
}

/** 删除未被内容引用的资源；引用保护由调用方在 dispatch 前执行。 */
export class DeleteAssetCommand implements Command {
  readonly label = '删除资源'
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined

  constructor(
    private readonly assetId: AssetId,
    /** 删除前预读磁盘字节，避免保存删文件后撤销只恢复空 record。 */
    private readonly previousBytes?: ArrayBuffer,
  ) {}

  apply(state: EditorState): EditorState {
    if (!state.assetCatalog.assets[this.assetId]) return state
    if (!this.oldCatalog) {
      this.oldCatalog = state.assetCatalog
      this.oldBlobs = state.assetBlobs
    }
    const assets = { ...state.assetCatalog.assets }
    const path = assets[this.assetId]!.path
    delete assets[this.assetId]
    const assetBlobs = { ...state.assetBlobs }
    if (!Object.values(assets).some((asset) => asset.path === path)) delete assetBlobs[path]
    return {
      ...state,
      assetCatalog: { ...state.assetCatalog, assets },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldCatalog || !this.oldBlobs) return state
    const assetBlobs = { ...this.oldBlobs }
    const previous = this.oldCatalog.assets[this.assetId]
    if (previous && this.previousBytes) assetBlobs[previous.path] = this.previousBytes.slice(0)
    return { ...state, assetCatalog: this.oldCatalog, assetBlobs }
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
  private capturedEntityPages = false
  private oldEntityPages: EntityDef['pages']

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
    const empty: ScriptStage[] = createEmptyScriptStages()
    if (this.ref.kind === 'onEnter')
      return withScene(state, this.sceneId, { ...scene, onEnter: empty })
    if (this.ref.kind === 'onTeleport')
      return withScene(state, this.sceneId, { ...scene, onTeleport: empty })
    const entityId = this.ref.entityId
    const kind = this.ref.kind
    const pageIndex = this.ref.pageIndex ?? 0
    const entities = scene.entities.map((e) => {
      if (e.id !== entityId) return e
      if (!this.capturedEntityPages) {
        this.capturedEntityPages = true
        this.oldEntityPages = e.pages ? structuredClone(e.pages) : undefined
      }
      const pages = [...(e.pages ?? [])]
      while (pages.length <= pageIndex) pages.push({})
      const page = pages[pageIndex] ?? {}
      const newPage =
        kind === 'trigger'
          ? { ...page, trigger: { on: this.triggerOn, stages: empty } }
          : { ...page, auto: { stages: empty } }
      pages[pageIndex] = newPage
      return { ...e, pages }
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
    const entities = scene.entities.map((e) => {
      if (e.id !== entityId) return e
      const restored = { ...e }
      if (this.oldEntityPages) restored.pages = structuredClone(this.oldEntityPages)
      else delete (restored as { pages?: unknown }).pages
      return restored
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
 * 新建场景(完整复用当前地图引用;entry 给定落点;空实体/对话)。invert 删回。
 * id 由 UI 保证唯一(重复 = no-op 防御)。
 */
export class AddSceneCommand implements Command {
  readonly label = '新建场景'
  private readonly scene: SceneDef
  private added = false

  constructor(id: string, mapId: string, entry: SceneDef['entry']) {
    this.scene = {
      id,
      mapId,
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
      animation: {
        effectSprite: 0,
        placement: 'normal',
        xOffset: 0,
        yOffset: 0,
        speed: 0,
        fireDelay: 0,
        effectTimes: 0,
        shake: 0,
      },
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

/** 删除技能；任何作者态引用仍存在时 fail closed，invert 按原索引恢复。 */
export class DeleteSkillCommand implements Command {
  readonly label = '删除技能'
  private removed: { skill: SkillData; index: number } | undefined

  constructor(private readonly skillId: string) {}

  apply(state: EditorState): EditorState {
    const index = state.skills.findIndex((skill) => skill.id === this.skillId)
    if (index < 0) return state
    const references = blockingSkillReferences(state, this.skillId)
    if (references.length) throw new BattleDataInUseError('技能', this.skillId, references)
    if (!this.removed) this.removed = { skill: structuredClone(state.skills[index]!), index }
    return { ...state, skills: state.skills.filter((skill) => skill.id !== this.skillId) }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    if (state.skills.some((skill) => skill.id === this.skillId))
      throw new Error(`无法撤销删除：技能 id 已被占用 ${this.skillId}`)
    const skills = [...state.skills]
    skills.splice(this.removed.index, 0, structuredClone(this.removed.skill))
    return { ...state, skills }
  }
}

/**
 * 重命名项目(manifest.name 显示名;id/文件夹名不变 —— 稳定标识与显示名分离,
 * 改名不断存档/URL 引用)。manifest 整替换,序列化随 manifest.json 落盘。
 */
export class RenameProjectCommand implements Command {
  readonly label = '重命名项目'
  private readonly next: string
  private old = ''
  private captured = false

  constructor(next: string) {
    this.next = next
  }

  apply(s: EditorState): EditorState {
    if (!this.captured) {
      this.old = s.manifest.name
      this.captured = true
    }
    return { ...s, manifest: { ...s.manifest, name: this.next } }
  }

  invert(s: EditorState): EditorState {
    return { ...s, manifest: { ...s.manifest, name: this.old } }
  }
}

/** 更新 manifest.assets.roles 的一个或多个稳定 AssetId；undefined 表示清除角色绑定。 */
export class UpdateManifestAssetRolesCommand implements Command {
  readonly label = '改项目资源角色'
  private readonly patch: Partial<Record<AssetRole, AssetId | undefined>>
  private old: Partial<Record<AssetRole, AssetId | undefined>> | undefined

  constructor(patch: Partial<Record<AssetRole, AssetId | undefined>>) {
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    if (!this.old) {
      this.old = {}
      for (const role of Object.keys(this.patch) as AssetRole[])
        this.old[role] = state.manifest.assets.roles[role]
    }
    const roles = { ...state.manifest.assets.roles }
    for (const [role, assetId] of Object.entries(this.patch) as [
      AssetRole,
      AssetId | undefined,
    ][]) {
      if (assetId === undefined) delete roles[role]
      else roles[role] = assetId
    }
    const assets = { ...state.manifest.assets, roles }
    return { ...state, manifest: { ...state.manifest, assets } }
  }

  invert(state: EditorState): EditorState {
    if (!this.old) return state
    const roles = { ...state.manifest.assets.roles }
    for (const [role, assetId] of Object.entries(this.old) as [AssetRole, AssetId | undefined][]) {
      if (assetId === undefined) delete roles[role]
      else roles[role] = assetId
    }
    return {
      ...state,
      manifest: { ...state.manifest, assets: { ...state.manifest.assets, roles } },
    }
  }
}

export interface StartupEntryConfig {
  defaultEntryId: string
  entryPoints: EntryPoint[]
}

function cloneStartupEntryConfig(config: StartupEntryConfig): StartupEntryConfig {
  const defaultEntryId = config.defaultEntryId.trim()
  if (!defaultEntryId || defaultEntryId !== config.defaultEntryId)
    throw new Error('直接启动入口 id 必须是无首尾空格的非空字符串')
  if (config.entryPoints.length === 0) throw new Error('入口点列表不能为空，至少保留一个入口')
  const ids = new Set<string>()
  const entryPoints = config.entryPoints.map((entry, index) => {
    const id = entry.id.trim()
    if (!id) throw new Error('入口点 id 不能为空')
    if (id !== entry.id) throw new Error(`入口点 id "${entry.id}" 不得包含首尾空格`)
    if (ids.has(id)) throw new Error(`入口点 id "${id}" 重复`)
    ids.add(id)
    if (!entry.label.trim()) throw new Error(`入口点 "${id}" 的名称不能为空`)
    if (!entry.scene.trim()) throw new Error(`入口点 "${id}" 的场景不能为空`)
    const copy = structuredClone(entry)
    copy.startWorld = validateStartWorld(copy.startWorld, `entryPoints[${index}].startWorld`)
    if (copy.introVideo === undefined) delete copy.introVideo
    return copy
  })
  if (!ids.has(defaultEntryId)) throw new Error(`直接启动入口 "${defaultEntryId}" 不存在`)
  return { defaultEntryId, entryPoints }
}

function cloneNonEmptyEntryPoints(
  entries: readonly EntryPoint[],
): [EntryPoint, ...EntryPoint[]] {
  if (entries.length === 0) throw new Error('入口点列表不能为空，至少保留一个入口')
  return structuredClone(entries) as [EntryPoint, ...EntryPoint[]]
}

/**
 * 原子替换直接启动入口选择器与全部真实入口。apply/invert 的每个可见状态都保持
 * 非空、唯一 id、defaultEntryId 命中以及完整 StartWorld 不变式。
 */
export class SetStartupEntriesCommand implements Command {
  readonly label = '编辑启动入口'
  private readonly next: StartupEntryConfig
  private old: StartupEntryConfig | undefined
  private captured = false

  constructor(next: StartupEntryConfig) {
    this.next = cloneStartupEntryConfig(next)
  }

  apply(state: EditorState): EditorState {
    if (!this.captured) {
      this.old = cloneStartupEntryConfig({
        defaultEntryId: state.manifest.defaultEntryId,
        entryPoints: state.manifest.entryPoints,
      })
      this.captured = true
    }
    return {
      ...state,
      manifest: {
        ...state.manifest,
        defaultEntryId: this.next.defaultEntryId,
        entryPoints: cloneNonEmptyEntryPoints(this.next.entryPoints),
      },
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.old) return state
    return {
      ...state,
      manifest: {
        ...state.manifest,
        defaultEntryId: this.old.defaultEntryId,
        entryPoints: cloneNonEmptyEntryPoints(this.old.entryPoints),
      },
    }
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

// ── A7-3W 大世界精灵 catalog 生命周期 ──────────────────────────────

/** 上传精灵入库：SpriteDef + catalog record + gzip 字节一次可撤销提交。 */
export class AddSpriteCommand implements Command {
  readonly label = '上传精灵'
  private readonly def: SpriteDef
  private readonly record: AssetRecordV1
  private readonly blob: ArrayBuffer
  private createdAsset = false

  constructor(def: SpriteDef, record: AssetRecordV1, blob: ArrayBuffer) {
    this.def = structuredClone(def)
    this.record = structuredClone(record)
    this.blob = blob
  }

  apply(state: EditorState): EditorState {
    if (state.sprites.some((s) => s.id === this.def.id))
      throw new Error(`精灵定义 id 已存在: ${this.def.id}`)
    if (!this.def.asset) throw new Error('精灵定义缺 AssetId')
    assertSpriteRecord(this.record, this.blob)
    const existing = state.assetCatalog.assets[this.def.asset]
    if (existing && !sameAssetRecord(existing, this.record))
      throw new Error(`精灵 AssetId 已存在且记录不同: ${this.def.asset}`)
    const pathOwner = Object.entries(state.assetCatalog.assets).find(
      ([id, record]) => id !== this.def.asset && record.path === this.record.path,
    )
    if (pathOwner) throw new Error(`精灵资源路径已由 ${pathOwner[0]} 登记`)
    this.createdAsset = !existing
    return {
      ...state,
      sprites: [...state.sprites, structuredClone(this.def)],
      assetCatalog: existing
        ? state.assetCatalog
        : {
            ...state.assetCatalog,
            assets: { ...state.assetCatalog.assets, [this.def.asset]: this.record },
          },
      assetBlobs: existing
        ? state.assetBlobs
        : { ...state.assetBlobs, [this.record.path]: this.blob.slice(0) },
    }
  }

  invert(state: EditorState): EditorState {
    const assets = { ...state.assetCatalog.assets }
    if (this.createdAsset) delete assets[this.def.asset]
    const assetBlobs = { ...state.assetBlobs }
    if (
      this.createdAsset &&
      !Object.values(assets).some((record) => record.path === this.record.path)
    )
      delete assetBlobs[this.record.path]
    return {
      ...state,
      sprites: state.sprites.filter((s) => s.id !== this.def.id),
      assetCatalog: { ...state.assetCatalog, assets },
      assetBlobs,
    }
  }
}

export interface SpriteReplacementProof {
  asset: AssetId
  previousSha256: string
  previousFrameCount: number
  nextFrameCount: number
  consumerIds: string[]
  /** 缩帧时必须显式给出每个共享消费者的新布局/姿势；与资源替换同一撤销事务提交。 */
  repairs?: Record<string, Pick<SpriteDef, 'layout' | 'poses'>>
  /** 预览时的消费者元数据；缩帧 await 期间若变化，命令 fail-loud 而非覆盖新编辑。 */
  consumerSnapshots?: Record<string, Pick<SpriteDef, 'layout' | 'poses'>>
}

/**
 * 保持 AssetId，只替换该共享资源的 record 与 gzip 字节。
 *
 * `spriteId` 只用于在存在语义消费者时锁定一个已确认的入口；未配置资源没有
 * SpriteDef，允许显式传 `undefined`，但此时消费者必须仍为空，避免绕过共享影响确认。
 */
export class ReplaceSpriteAssetCommand implements Command {
  readonly label: string
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined
  private oldSprites: EditorState['sprites'] | undefined

  constructor(
    private readonly spriteId: string | undefined,
    private readonly asset: AssetId,
    private readonly record: AssetRecordV1,
    private readonly bytes: ArrayBuffer,
    private readonly previousBytes: ArrayBuffer,
    private readonly proof: SpriteReplacementProof,
    label = '替换精灵资源',
  ) {
    this.label = label
  }

  apply(state: EditorState): EditorState {
    const target = this.spriteId
      ? state.sprites.find((sprite) => sprite.id === this.spriteId)
      : undefined
    if (this.spriteId && (!target || target.asset !== this.asset))
      throw new Error('精灵定义与待替换 AssetId 不一致')
    const previous = state.assetCatalog.assets[this.asset]
    if (!previous || previous.kind !== 'sprite') throw new Error('待替换精灵资源不在 catalog')
    assertSpriteRecord(this.record, this.bytes)
    if (this.proof.asset !== this.asset || this.proof.previousSha256 !== previous.sha256)
      throw new Error('精灵替换证明已过期，请重新载入资源')
    if (
      !Number.isInteger(this.proof.previousFrameCount) ||
      this.proof.previousFrameCount <= 0 ||
      !Number.isInteger(this.proof.nextFrameCount) ||
      this.proof.nextFrameCount <= 0
    )
      throw new Error('精灵替换证明的帧数非法')
    const consumers = state.sprites
      .filter((sprite) => sprite.asset === this.asset)
      .map((sprite) => sprite.id)
      .sort()
    if (!this.spriteId && consumers.length)
      throw new Error('待替换精灵资源已有语义消费者，请重新确认影响范围')
    if (consumers.join('\0') !== [...this.proof.consumerIds].sort().join('\0'))
      throw new Error('共享精灵消费者已变化，请重新确认影响范围')
    let nextSprites = state.sprites
    if (this.proof.nextFrameCount < this.proof.previousFrameCount) {
      const repairs = this.proof.repairs
      const snapshots = this.proof.consumerSnapshots
      if (!repairs || !snapshots)
        throw new Error('精灵替换不得减少有效帧；缩帧需使用显式布局修复事务')
      const repairedIds = Object.keys(repairs).sort()
      const snapshotIds = Object.keys(snapshots).sort()
      if (
        repairedIds.join('\0') !== consumers.join('\0') ||
        snapshotIds.join('\0') !== consumers.join('\0')
      )
        throw new Error('缩帧事务必须显式修复全部共享精灵消费者')
      nextSprites = state.sprites.map((sprite) => {
        if (sprite.asset !== this.asset) return sprite
        const snapshot = snapshots[sprite.id]
        if (
          !snapshot ||
          JSON.stringify({ layout: sprite.layout, poses: sprite.poses }) !==
            JSON.stringify({ layout: snapshot.layout, poses: snapshot.poses })
        )
          throw new Error(`缩帧消费者 ${sprite.id} 的布局或姿势已变化，请重新确认`)
        const repair = repairs[sprite.id]
        if (!repair) throw new Error(`缩帧事务缺少消费者 ${sprite.id} 的布局修复`)
        const next = {
          ...sprite,
          layout: structuredClone(repair.layout),
          poses: repair.poses ? structuredClone(repair.poses) : undefined,
        }
        assertSpriteEditShape(next)
        if (spriteDefinitionFrameDemand(next) > this.proof.nextFrameCount)
          throw new Error(
            `缩帧后 ${sprite.id} 的布局/姿势仍需 ${spriteDefinitionFrameDemand(next)} 帧，资源只有 ${this.proof.nextFrameCount} 帧`,
          )
        return next
      })
    }
    const pathOwner = Object.entries(state.assetCatalog.assets).find(
      ([id, candidate]) => id !== this.asset && candidate.path === this.record.path,
    )
    if (pathOwner) throw new Error(`精灵替换路径已由 ${pathOwner[0]} 登记`)
    if (!this.oldCatalog) {
      this.oldCatalog = state.assetCatalog
      this.oldBlobs = state.assetBlobs
      this.oldSprites = state.sprites
    }
    const assetBlobs = { ...state.assetBlobs }
    if (
      previous.path !== this.record.path &&
      !Object.entries(state.assetCatalog.assets).some(
        ([id, candidate]) => id !== this.asset && candidate.path === previous.path,
      )
    )
      delete assetBlobs[previous.path]
    assetBlobs[this.record.path] = this.bytes.slice(0)
    return {
      ...state,
      sprites: nextSprites,
      assetCatalog: {
        ...state.assetCatalog,
        assets: { ...state.assetCatalog.assets, [this.asset]: structuredClone(this.record) },
      },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldCatalog || !this.oldBlobs) return state
    const oldRecord = this.oldCatalog.assets[this.asset]
    const assetBlobs = { ...this.oldBlobs }
    if (oldRecord) assetBlobs[oldRecord.path] = this.previousBytes.slice(0)
    return {
      ...state,
      sprites: this.oldSprites ?? state.sprites,
      assetCatalog: this.oldCatalog,
      assetBlobs,
    }
  }
}

/**
 * 给已经入库的帧资源增加一种语义用途。
 *
 * 与 AddSpriteCommand 不同，这里不创建或重写 catalog/blob；实际帧数证明把新用途
 * 约束在已经成功解码的资源事实内，避免给项目新增越界布局债。
 */
export class AddSpriteDefinitionCommand implements Command {
  readonly label = '新增精灵用途'
  private readonly definition: SpriteDef
  private added = false

  constructor(
    definition: SpriteDef,
    private readonly proof: SpriteLayoutEditProof,
  ) {
    this.definition = structuredClone(definition)
  }

  apply(state: EditorState): EditorState {
    if (state.sprites.some((sprite) => sprite.id === this.definition.id))
      throw new Error(`精灵定义 id 已存在: ${this.definition.id}`)
    const record = state.assetCatalog.assets[this.definition.asset]
    if (
      record?.kind !== 'sprite' ||
      this.proof.asset !== this.definition.asset ||
      this.proof.sha256 !== record.sha256
    )
      throw new Error('精灵布局证明缺失或已过期，请等待帧资源重新载入')
    if (!Number.isInteger(this.proof.actualFrameCount) || this.proof.actualFrameCount <= 0)
      throw new Error('精灵布局证明的实际帧数非法')
    validateSprites([this.definition], state.assetCatalog)
    const demand = spriteDefinitionFrameDemand(this.definition)
    if (demand > this.proof.actualFrameCount)
      throw new Error(
        `精灵用途 ${this.definition.id} 需要 ${demand} 帧，资源实际只有 ${this.proof.actualFrameCount} 帧`,
      )
    this.added = true
    return { ...state, sprites: [...state.sprites, structuredClone(this.definition)] }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    return {
      ...state,
      sprites: state.sprites.filter((sprite) => sprite.id !== this.definition.id),
    }
  }
}

/** 删除语义定义；资产是独立对象，绝不随定义静默级联。 */
export class RemoveSpriteDefinitionCommand implements Command {
  readonly label = '删除精灵定义'
  private removed: SpriteDef | undefined
  private removedIndex: number | undefined

  constructor(private readonly spriteId: string) {}

  apply(state: EditorState): EditorState {
    const index = state.sprites.findIndex((s) => s.id === this.spriteId)
    if (index < 0) return state
    const def = state.sprites[index]!
    const references = collectSpriteDefinitionReferences(state).filter(
      (reference) => reference.sprite === this.spriteId,
    )
    if (references.length)
      throw new Error(
        `精灵定义 ${this.spriteId} 仍被 ${references.length} 处引用：${references[0]!.where}`,
      )
    if (!this.removed) {
      this.removed = structuredClone(def)
      this.removedIndex = index
    }
    return {
      ...state,
      sprites: state.sprites.filter((s) => s.id !== this.spriteId),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed || this.removedIndex === undefined) return state
    const sprites = [...state.sprites]
    sprites.splice(this.removedIndex, 0, this.removed)
    return { ...state, sprites }
  }
}

/** 显式删除已无 SpriteDef 消费者的 sprite 资产；与定义删除是两个 UI 动作。 */
export class DeleteUnusedSpriteAssetCommand implements Command {
  readonly label = '删除未使用的精灵资产'
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined

  constructor(
    private readonly asset: AssetId,
    private readonly persistedBytes?: ArrayBuffer,
  ) {}

  apply(state: EditorState): EditorState {
    if (state.sprites.some((sprite) => sprite.asset === this.asset))
      throw new Error(`精灵资产 ${this.asset} 仍被定义引用`)
    const record = state.assetCatalog.assets[this.asset]
    if (!record) return state
    if (record.kind !== 'sprite') throw new Error(`AssetId ${this.asset} 不是 sprite`)
    this.oldCatalog ??= state.assetCatalog
    this.oldBlobs ??= state.assetBlobs
    const assets = { ...state.assetCatalog.assets }
    delete assets[this.asset]
    const assetBlobs = { ...state.assetBlobs }
    if (!Object.values(assets).some((candidate) => candidate.path === record.path))
      delete assetBlobs[record.path]
    return {
      ...state,
      assetCatalog: { ...state.assetCatalog, assets },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldCatalog || !this.oldBlobs) return state
    const assetBlobs = { ...this.oldBlobs }
    const record = this.oldCatalog.assets[this.asset]
    if (record && this.persistedBytes) assetBlobs[record.path] = this.persistedBytes.slice(0)
    return { ...state, assetCatalog: this.oldCatalog, assetBlobs }
  }
}

// ── 商店(货单编辑)────────────────────────────────────────────

/** 改店铺货单(整表替换;首次 apply 捕获旧值)。 */
export class UpdateShopCommand implements Command {
  readonly label = '修改店铺'
  private old: string[] | undefined
  private captured = false

  constructor(
    private readonly shopId: number,
    private readonly items: string[],
  ) {}

  apply(state: EditorState): EditorState {
    const shop = (state.shops ?? []).find((x) => x.id === this.shopId)
    if (!shop) return state
    if (!this.captured) {
      this.old = [...shop.items]
      this.captured = true
    }
    return {
      ...state,
      shops: (state.shops ?? []).map((x) =>
        x.id === this.shopId ? { ...x, items: [...this.items] } : x,
      ),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.old) return state
    const old = this.old
    return {
      ...state,
      shops: (state.shops ?? []).map((x) => (x.id === this.shopId ? { ...x, items: [...old] } : x)),
    }
  }
}

/** 新建店铺(空货单;id = max+1 由调用方定)。 */
export class AddShopCommand implements Command {
  readonly label = '新建店铺'
  private added = false

  constructor(private readonly shopId: number) {}

  apply(state: EditorState): EditorState {
    if ((state.shops ?? []).some((x) => x.id === this.shopId)) return state
    this.added = true
    return { ...state, shops: [...(state.shops ?? []), { id: this.shopId, items: [] }] }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    return { ...state, shops: (state.shops ?? []).filter((x) => x.id !== this.shopId) }
  }
}

// ── A7-3B 战斗精灵 catalog 生命周期 ──────────────────────────────

function assertBattleSpriteDefinition(
  definition: BattleSpriteDef,
  catalog: EditorState['assetCatalog'],
  actualFrameCount: number,
): void {
  validateBattleSprites([definition], catalog)
  if (!Number.isInteger(actualFrameCount) || actualFrameCount <= 0)
    throw new Error('战斗精灵实际帧数必须是正整数')
  const demand = battleSpriteDefinitionFrameDemand(definition, actualFrameCount)
  if (demand > actualFrameCount)
    throw new Error(
      `战斗精灵定义 ${definition.id} 需要 ${demand} 帧，资源实际只有 ${actualFrameCount} 帧`,
    )
}

/** 上传入库：BattleSpriteDef + catalog record + gzip 字节一次可撤销提交。 */
export class AddBattleSpriteCommand implements Command {
  readonly label = '上传战斗精灵'
  private createdAsset = false

  constructor(
    private readonly definition: BattleSpriteDef,
    private readonly record: AssetRecordV1,
    private readonly bytes: ArrayBuffer,
    private readonly actualFrameCount: number,
  ) {}

  apply(state: EditorState): EditorState {
    if (state.battleSprites.some((entry) => entry.id === this.definition.id))
      throw new Error(`战斗精灵定义 id 已存在: ${this.definition.id}`)
    assertBattleSpriteRecord(this.record, this.bytes)
    if (this.definition.asset.trim().length === 0) throw new Error('战斗精灵定义缺 AssetId')
    const existing = state.assetCatalog.assets[this.definition.asset]
    if (existing && !sameAssetRecord(existing, this.record))
      throw new Error(`战斗精灵 AssetId 已存在且记录不同: ${this.definition.asset}`)
    const pathOwner = Object.entries(state.assetCatalog.assets).find(
      ([id, record]) => id !== this.definition.asset && record.path === this.record.path,
    )
    if (pathOwner) throw new Error(`战斗精灵资源路径已由 ${pathOwner[0]} 登记`)
    const catalog = existing
      ? state.assetCatalog
      : {
          ...state.assetCatalog,
          assets: { ...state.assetCatalog.assets, [this.definition.asset]: this.record },
        }
    assertBattleSpriteDefinition(this.definition, catalog, this.actualFrameCount)
    this.createdAsset = !existing
    return {
      ...state,
      battleSprites: [...state.battleSprites, structuredClone(this.definition)],
      assetCatalog: catalog,
      assetBlobs: existing
        ? state.assetBlobs
        : { ...state.assetBlobs, [this.record.path]: this.bytes.slice(0) },
    }
  }

  invert(state: EditorState): EditorState {
    const assets = { ...state.assetCatalog.assets }
    if (this.createdAsset) delete assets[this.definition.asset]
    const assetBlobs = { ...state.assetBlobs }
    if (
      this.createdAsset &&
      !Object.values(assets).some((record) => record.path === this.record.path)
    )
      delete assetBlobs[this.record.path]
    return {
      ...state,
      battleSprites: state.battleSprites.filter((entry) => entry.id !== this.definition.id),
      assetCatalog: { ...state.assetCatalog, assets },
      assetBlobs,
    }
  }
}

export type BattleSpritePatch = Partial<Pick<BattleSpriteDef, 'label' | 'asset' | 'profile'>>

export interface BattleSpriteEditProof {
  asset: AssetId
  sha256: string
  actualFrameCount: number
}

/** 改定义标签/资源/profile；ABI 编辑必须绑定一次实际解码证明。 */
export class UpdateBattleSpriteDefinitionCommand implements Command {
  readonly label = '修改战斗精灵定义'
  private oldDefinition: BattleSpriteDef | undefined

  constructor(
    private readonly definitionId: string,
    private readonly patch: BattleSpritePatch,
    private readonly proof?: BattleSpriteEditProof,
  ) {}

  apply(state: EditorState): EditorState {
    const current = state.battleSprites.find((entry) => entry.id === this.definitionId)
    if (!current) return state
    const next = { ...current, ...structuredClone(this.patch) }
    const record = state.assetCatalog.assets[next.asset]
    if (!record || record.kind !== 'battle-sprite')
      throw new Error(`战斗精灵 AssetId ${next.asset} 不在 catalog`)
    if ('asset' in this.patch || 'profile' in this.patch) {
      if (!this.proof || this.proof.asset !== next.asset || this.proof.sha256 !== record.sha256)
        throw new Error('战斗精灵 ABI 证明缺失或已过期，请等待资源重新载入')
      assertBattleSpriteDefinition(next, state.assetCatalog, this.proof.actualFrameCount)
    } else validateBattleSprites([next], state.assetCatalog)
    const wrongReference = collectBattleSpriteDefinitionReferences(state).find(
      (reference) =>
        reference.battleSprite === this.definitionId &&
        reference.expectedProfile !== next.profile.kind,
    )
    if (wrongReference)
      throw new Error(
        `战斗精灵定义 ${this.definitionId} 的 profile 与引用 ${wrongReference.where} 不兼容`,
      )
    this.oldDefinition ??= structuredClone(current)
    return {
      ...state,
      battleSprites: state.battleSprites.map((entry) =>
        entry.id === this.definitionId ? next : entry,
      ),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldDefinition) return state
    return {
      ...state,
      battleSprites: state.battleSprites.map((entry) =>
        entry.id === this.definitionId ? this.oldDefinition! : entry,
      ),
    }
  }
}

export interface BattleSpriteReplacementProof {
  asset: AssetId
  previousSha256: string
  previousFrameCount: number
  nextFrameCount: number
  consumerIds: string[]
  repairs?: Record<string, Pick<BattleSpriteDef, 'profile'>>
  consumerSnapshots?: Record<string, Pick<BattleSpriteDef, 'profile'>>
}

/**
 * 保持 AssetId，只替换共享物理字节；缩帧必须显式修复全部消费者。
 * 未配置的原始帧源可以传 `undefined` definitionId，但命令会确保消费者仍为空。
 */
export class ReplaceBattleSpriteAssetCommand implements Command {
  readonly label = '替换战斗精灵资源'
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined
  private oldDefinitions: EditorState['battleSprites'] | undefined

  constructor(
    private readonly definitionId: string | undefined,
    private readonly asset: AssetId,
    private readonly record: AssetRecordV1,
    private readonly bytes: ArrayBuffer,
    private readonly previousBytes: ArrayBuffer,
    private readonly proof: BattleSpriteReplacementProof,
  ) {}

  apply(state: EditorState): EditorState {
    const target = this.definitionId
      ? state.battleSprites.find((entry) => entry.id === this.definitionId)
      : undefined
    if (this.definitionId && (!target || target.asset !== this.asset))
      throw new Error('战斗精灵定义与待替换 AssetId 不一致')
    const previous = state.assetCatalog.assets[this.asset]
    if (!previous || previous.kind !== 'battle-sprite')
      throw new Error('待替换战斗精灵资源不在 catalog')
    assertBattleSpriteRecord(this.record, this.bytes)
    if (this.proof.asset !== this.asset || this.proof.previousSha256 !== previous.sha256)
      throw new Error('战斗精灵替换证明已过期，请重新载入资源')
    if (
      !Number.isInteger(this.proof.previousFrameCount) ||
      this.proof.previousFrameCount <= 0 ||
      !Number.isInteger(this.proof.nextFrameCount) ||
      this.proof.nextFrameCount <= 0
    )
      throw new Error('战斗精灵替换证明的帧数非法')
    const consumers = state.battleSprites
      .filter((entry) => entry.asset === this.asset)
      .map((entry) => entry.id)
      .sort()
    if (!this.definitionId && consumers.length)
      throw new Error('待替换战斗精灵资源已有语义消费者，请重新确认影响范围')
    if (consumers.join('\0') !== [...this.proof.consumerIds].sort().join('\0'))
      throw new Error('共享战斗精灵消费者已变化，请重新确认影响范围')
    let definitions = state.battleSprites
    if (this.proof.nextFrameCount < this.proof.previousFrameCount) {
      const repairs = this.proof.repairs
      const snapshots = this.proof.consumerSnapshots
      if (!repairs || !snapshots)
        throw new Error('战斗精灵替换不得减少有效帧；缩帧需使用显式 ABI 修复事务')
      if (
        Object.keys(repairs).sort().join('\0') !== consumers.join('\0') ||
        Object.keys(snapshots).sort().join('\0') !== consumers.join('\0')
      )
        throw new Error('缩帧事务必须显式修复全部共享战斗精灵消费者')
      definitions = state.battleSprites.map((entry) => {
        if (entry.asset !== this.asset) return entry
        const snapshot = snapshots[entry.id]
        if (!snapshot || JSON.stringify(entry.profile) !== JSON.stringify(snapshot.profile))
          throw new Error(`缩帧消费者 ${entry.id} 的 profile 已变化，请重新确认`)
        const repair = repairs[entry.id]
        if (!repair) throw new Error(`缩帧事务缺少消费者 ${entry.id} 的 ABI 修复`)
        if (repair.profile.kind !== entry.profile.kind)
          throw new Error(`缩帧修复不得改变消费者 ${entry.id} 的 profile 类型`)
        const next = { ...entry, profile: structuredClone(repair.profile) }
        assertBattleSpriteDefinition(
          next,
          {
            ...state.assetCatalog,
            assets: { ...state.assetCatalog.assets, [this.asset]: this.record },
          },
          this.proof.nextFrameCount,
        )
        return next
      })
      const wrongReference = collectBattleSpriteDefinitionReferences(state).find((reference) => {
        const definition = definitions.find((candidate) => candidate.id === reference.battleSprite)
        return (
          definition?.asset === this.asset && reference.expectedProfile !== definition.profile.kind
        )
      })
      if (wrongReference)
        throw new Error(`缩帧修复与引用 ${wrongReference.where} 的 profile 不兼容`)
    } else {
      for (const entry of definitions.filter((candidate) => candidate.asset === this.asset))
        assertBattleSpriteDefinition(
          entry,
          {
            ...state.assetCatalog,
            assets: { ...state.assetCatalog.assets, [this.asset]: this.record },
          },
          this.proof.nextFrameCount,
        )
    }
    const pathOwner = Object.entries(state.assetCatalog.assets).find(
      ([id, candidate]) => id !== this.asset && candidate.path === this.record.path,
    )
    if (pathOwner) throw new Error(`战斗精灵替换路径已由 ${pathOwner[0]} 登记`)
    this.oldCatalog ??= state.assetCatalog
    this.oldBlobs ??= state.assetBlobs
    this.oldDefinitions ??= state.battleSprites
    const assetBlobs = { ...state.assetBlobs }
    if (
      previous.path !== this.record.path &&
      !Object.entries(state.assetCatalog.assets).some(
        ([id, candidate]) => id !== this.asset && candidate.path === previous.path,
      )
    )
      delete assetBlobs[previous.path]
    assetBlobs[this.record.path] = this.bytes.slice(0)
    return {
      ...state,
      battleSprites: definitions,
      assetCatalog: {
        ...state.assetCatalog,
        assets: { ...state.assetCatalog.assets, [this.asset]: structuredClone(this.record) },
      },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldCatalog || !this.oldBlobs) return state
    const oldRecord = this.oldCatalog.assets[this.asset]
    const assetBlobs = { ...this.oldBlobs }
    if (oldRecord) assetBlobs[oldRecord.path] = this.previousBytes.slice(0)
    return {
      ...state,
      battleSprites: this.oldDefinitions ?? state.battleSprites,
      assetCatalog: this.oldCatalog,
      assetBlobs,
    }
  }
}

/** 删除语义定义；仍有任意持久引用时 fail-loud，资产不静默级联。 */
export class RemoveBattleSpriteDefinitionCommand implements Command {
  readonly label = '删除战斗精灵定义'
  private removed: BattleSpriteDef | undefined
  private removedIndex: number | undefined

  constructor(private readonly definitionId: string) {}

  apply(state: EditorState): EditorState {
    const index = state.battleSprites.findIndex((entry) => entry.id === this.definitionId)
    if (index < 0) return state
    const references = collectBattleSpriteDefinitionReferences(state).filter(
      (reference) => reference.battleSprite === this.definitionId,
    )
    if (references.length)
      throw new Error(
        `战斗精灵定义 ${this.definitionId} 仍被 ${references.length} 处引用：${references[0]!.where}`,
      )
    this.removed ??= structuredClone(state.battleSprites[index]!)
    this.removedIndex ??= index
    return {
      ...state,
      battleSprites: state.battleSprites.filter((entry) => entry.id !== this.definitionId),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed || this.removedIndex === undefined) return state
    const definitions = [...state.battleSprites]
    definitions.splice(this.removedIndex, 0, this.removed)
    return { ...state, battleSprites: definitions }
  }
}

/** 显式删除已无 BattleSpriteDef 消费者的物理资产。 */
export class DeleteUnusedBattleSpriteAssetCommand implements Command {
  readonly label = '删除未使用的战斗精灵资产'
  private oldCatalog: EditorState['assetCatalog'] | undefined
  private oldBlobs: EditorState['assetBlobs'] | undefined

  constructor(
    private readonly asset: AssetId,
    private readonly persistedBytes?: ArrayBuffer,
  ) {}

  apply(state: EditorState): EditorState {
    if (state.battleSprites.some((entry) => entry.asset === this.asset))
      throw new Error(`战斗精灵资产 ${this.asset} 仍被定义引用`)
    const record = state.assetCatalog.assets[this.asset]
    if (!record) return state
    if (record.kind !== 'battle-sprite') throw new Error(`AssetId ${this.asset} 不是 battle-sprite`)
    this.oldCatalog ??= state.assetCatalog
    this.oldBlobs ??= state.assetBlobs
    const assets = { ...state.assetCatalog.assets }
    delete assets[this.asset]
    const assetBlobs = { ...state.assetBlobs }
    if (!Object.values(assets).some((candidate) => candidate.path === record.path))
      delete assetBlobs[record.path]
    return {
      ...state,
      assetCatalog: { ...state.assetCatalog, assets },
      assetBlobs,
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldCatalog || !this.oldBlobs) return state
    const assetBlobs = { ...this.oldBlobs }
    const record = this.oldCatalog.assets[this.asset]
    if (record && this.persistedBytes) assetBlobs[record.path] = this.persistedBytes.slice(0)
    return { ...state, assetCatalog: this.oldCatalog, assetBlobs }
  }
}

/** 只切换敌人语义定义；上传新资产时由 CompositeCommand 与 AddBattleSpriteCommand 原子组合。 */
export class SetEnemyBattleSpriteCommand implements Command {
  readonly label = '设置敌人战斗精灵'
  private previous: string | undefined

  constructor(
    private readonly enemyId: string,
    private readonly definitionId: string,
  ) {}

  apply(state: EditorState): EditorState {
    const enemy = (state.enemies ?? []).find((entry) => entry.id === this.enemyId)
    if (!enemy) return state
    const definition = state.battleSprites.find((entry) => entry.id === this.definitionId)
    if (!definition || definition.profile.kind !== 'enemy')
      throw new Error(`敌人只能引用 enemy profile：${this.definitionId}`)
    this.previous ??= enemy.battleSprite
    return withEnemy(state, this.enemyId, { ...enemy, battleSprite: this.definitionId })
  }

  invert(state: EditorState): EditorState {
    if (this.previous === undefined) return state
    const enemy = (state.enemies ?? []).find((entry) => entry.id === this.enemyId)
    return enemy ? withEnemy(state, this.enemyId, { ...enemy, battleSprite: this.previous }) : state
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

export class AmbienceInUseError extends Error {
  readonly ambienceId: string
  readonly references: readonly BlockingAmbienceReference[]

  constructor(ambienceId: string, references: readonly BlockingAmbienceReference[]) {
    super(`氛围 ${ambienceId} 仍被 ${references.length} 处引用，不能删除`)
    this.name = 'AmbienceInUseError'
    this.ambienceId = ambienceId
    this.references = references
  }
}

/** 删除未被脚本或运行态引用的氛围；invert 按原索引恢复。 */
export class DeleteAmbienceCommand implements Command {
  readonly label = '删除氛围'
  private removed: { ambience: AmbienceDef; index: number } | undefined

  constructor(
    private readonly ambienceId: string,
    private readonly canonicalState: (() => ScriptEditorState | undefined) | undefined = undefined,
  ) {}

  apply(state: EditorState): EditorState {
    const ambiences = state.ambiences ?? []
    const index = ambiences.findIndex((ambience) => ambience.id === this.ambienceId)
    if (index < 0) return state
    const canonicalState = this.canonicalState?.()
    if (this.canonicalState && !canonicalState)
      throw new Error('删除氛围前无法读取 canonical 脚本引用')
    const references = blockingAmbienceReferences(state, this.ambienceId, canonicalState)
    if (references.length) throw new AmbienceInUseError(this.ambienceId, references)
    if (!this.removed) this.removed = { ambience: structuredClone(ambiences[index]!), index }
    return {
      ...state,
      ambiences: ambiences.filter((_, candidateIndex) => candidateIndex !== index),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    if ((state.ambiences ?? []).some((ambience) => ambience.id === this.ambienceId))
      throw new Error(`无法撤销删除：氛围 id 已被占用 ${this.ambienceId}`)
    const ambiences = [...(state.ambiences ?? [])]
    ambiences.splice(this.removed.index, 0, structuredClone(this.removed.ambience))
    return { ...state, ambiences }
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

/** 删除毒定义；技能、物品与其他毒的关系边必须先解除。 */
export class DeletePoisonCommand implements Command {
  readonly label = '删除毒'
  private removed: { poison: PoisonDef; index: number } | undefined

  constructor(private readonly poisonId: number) {}

  apply(state: EditorState): EditorState {
    const list = state.poisons ?? []
    const index = list.findIndex((poison) => poison.id === this.poisonId)
    if (index < 0) return state
    const references = blockingPoisonReferences(state, this.poisonId)
    if (references.length) throw new BattleDataInUseError('毒', String(this.poisonId), references)
    if (!this.removed) this.removed = { poison: structuredClone(list[index]!), index }
    return { ...state, poisons: list.filter((poison) => poison.id !== this.poisonId) }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    if ((state.poisons ?? []).some((poison) => poison.id === this.poisonId))
      throw new Error(`无法撤销删除：毒 id 已被占用 ${this.poisonId}`)
    const poisons = [...(state.poisons ?? [])]
    poisons.splice(this.removed.index, 0, structuredClone(this.removed.poison))
    return { ...state, poisons }
  }
}
