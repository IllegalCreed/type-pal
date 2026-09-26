/**
 * 瓦片集命令族：上传/移除/改元数据/替换图像。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { AssetId, AssetRecordV1 } from '@type-pal/content'
import type { TilesetDef } from '@type-pal/reforge'
import { assertTilesetRecord, sameAssetRecord } from './command-asset-record.js'
import type { Command } from './command-contract.js'
import type { CurrentMapReferenceBatchProvider, EditorState } from './edit-session.js'
import {
  assertTilesetRemovalAllowed,
  assertTilesetReplacementAllowed,
  type TilesetRemovalProof,
  type TilesetReplacementProof,
} from './tileset-references.js'

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
    private readonly proof: TilesetRemovalProof,
    private readonly currentBatch: CurrentMapReferenceBatchProvider,
    private readonly persistedBytes?: ArrayBuffer,
  ) {}

  apply(state: EditorState): EditorState {
    const list = state.tilesets ?? []
    const index = list.findIndex((t) => t.id === this.tilesetId)
    if (index < 0) return state
    assertTilesetRemovalAllowed(
      state,
      this.tilesetId,
      this.proof,
      this.currentBatch,
      this.persistedBytes,
    )
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
    private readonly previousBytes: ArrayBuffer | undefined,
    private readonly proof: TilesetReplacementProof,
    private readonly currentBatch: CurrentMapReferenceBatchProvider,
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
    assertTilesetReplacementAllowed(
      state,
      this.tilesetId,
      this.asset,
      this.proof,
      this.currentBatch,
    )
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
