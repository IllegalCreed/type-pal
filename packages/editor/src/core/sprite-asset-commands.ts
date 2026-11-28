/** Register, revise, and remove a sprite's physical resource and its undo snapshot. */
import type { AssetId, AssetRecordV1, SpriteDef } from '@type-pal/content'
import { spriteDefinitionFrameDemand } from '@type-pal/content'
import { AssetInUseError, assertSpriteRecord, sameAssetRecord } from './command-asset-record.js'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'
import { assertSpriteEditShape } from './sprite-commands.js'

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
