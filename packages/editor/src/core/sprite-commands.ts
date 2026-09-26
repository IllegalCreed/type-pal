/**
 * 精灵命令族：改布局/姿势、上传/替换资源、增删定义与清理未使用资产。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { AssetId, AssetRecordV1, SpriteDef } from '@type-pal/content'
import {
  spriteDefinitionFrameDemand,
  spriteDefinitionFrameIndices,
  validateSprites,
} from '@type-pal/content'
import { AssetInUseError, assertSpriteRecord, sameAssetRecord } from './command-asset-record.js'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'
import type { ProjectReferenceEdge } from './project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

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

export class SpriteInUseError extends Error {
  constructor(
    readonly targetLabel: string,
    readonly references: readonly ProjectReferenceEdge[],
  ) {
    super(
      `${targetLabel} 仍被 ${references.length} 处引用：\n${references
        .slice(0, 20)
        .map((reference) => `${reference.source.label} · ${reference.where}`)
        .join('\n')}`,
    )
    this.name = 'SpriteInUseError'
  }
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
    private readonly currentReferences?: CurrentProjectReferenceIndexProvider,
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
          if (!this.currentReferences)
            throw new Error('删除预制动作前无法读取 current-author 引用索引')
          const referenceIndex = this.currentReferences(state)
          const blocking = removedActionIds.flatMap(
            (actionId) =>
              referenceIndex.deletionImpact({
                kind: 'world-sprite-action',
                spriteId: sp.id,
                actionId,
              }).blockers,
          )
          if (blocking.length)
            throw new SpriteInUseError(
              `精灵 ${sp.id} 的动作 ${removedActionIds.join('、')}`,
              blocking,
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

  constructor(
    private readonly spriteId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const index = state.sprites.findIndex((s) => s.id === this.spriteId)
    if (index < 0) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'world-sprite',
      id: this.spriteId,
    }).blockers
    if (references.length) throw new SpriteInUseError(`精灵定义 ${this.spriteId}`, references)
    if (!this.removed) {
      this.removed = structuredClone(state.sprites[index]!)
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
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
    private readonly persistedBytes?: ArrayBuffer,
  ) {}

  apply(state: EditorState): EditorState {
    const record = state.assetCatalog.assets[this.asset]
    if (!record) return state
    if (state.sprites.some((sprite) => sprite.asset === this.asset))
      throw new Error(`精灵资产 ${this.asset} 仍被定义引用`)
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'asset',
      id: this.asset,
    }).blockers
    if (references.length) throw new AssetInUseError(this.asset, references)
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
