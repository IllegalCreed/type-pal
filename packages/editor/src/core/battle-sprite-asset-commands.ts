/** Authoring commands for physical battle frame sources and their undo state. */
import type { AssetId, AssetRecordV1, BattleSpriteDef } from '@type-pal/content'
import { assertBattleSpriteDefinition } from './battle-sprite-commands.js'
import {
  AssetInUseError,
  assertBattleSpriteRecord,
  sameAssetRecord,
} from './command-asset-record.js'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

/** 上传入库：BattleSpriteDef + catalog record + gzip 字节一次可撤销提交。 */
export class AddBattleSpriteCommand implements Command {
  readonly label = '上传战斗精灵'
  private readonly definition: BattleSpriteDef
  private readonly record: AssetRecordV1
  private readonly bytes: ArrayBuffer
  private createdAsset = false

  constructor(
    definition: BattleSpriteDef,
    record: AssetRecordV1,
    bytes: ArrayBuffer,
    private readonly actualFrameCount: number,
  ) {
    // Redo replays the original upload even if its caller has reused the import draft.
    this.definition = structuredClone(definition)
    this.record = structuredClone(record)
    this.bytes = bytes.slice(0)
  }

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

/** 显式删除已无 BattleSpriteDef 消费者的物理资产。 */
export class DeleteUnusedBattleSpriteAssetCommand implements Command {
  readonly label = '删除未使用的战斗精灵资产'
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
    if (state.battleSprites.some((entry) => entry.asset === this.asset))
      throw new Error(`战斗精灵资产 ${this.asset} 仍被定义引用`)
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'asset',
      id: this.asset,
    }).blockers
    if (references.length) throw new AssetInUseError(this.asset, references)
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
