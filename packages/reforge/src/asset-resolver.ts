import type {
  AssetCatalogV1,
  AssetId,
  AssetKind,
  AssetRecordV1,
  AssetRole,
  ManifestAssetConfigV3,
} from '@type-pal/content'
import { ASSET_ROLE_KINDS } from '@type-pal/content'
import type { FileSource } from './file-source.js'

export class AssetResolver {
  constructor(
    readonly projectId: string,
    readonly catalog: AssetCatalogV1,
    readonly roles: ManifestAssetConfigV3['roles'],
    private readonly source: FileSource,
  ) {}

  record(asset: AssetId, expectedKind?: AssetKind): AssetRecordV1 {
    const record = this.catalog.assets[asset]
    if (!record)
      throw new Error(
        `工程 "${this.projectId}" 解析 AssetId "${asset}" 失败:catalog 无此记录` +
          (expectedKind ? `，期望 kind=${expectedKind}` : ''),
      )
    if (expectedKind && record.kind !== expectedKind)
      throw new Error(
        `工程 "${this.projectId}" 解析 AssetId "${asset}" 失败:期望 kind=${expectedKind}，` +
          `实际 kind=${record.kind}，path=${record.path}`,
      )
    return record
  }

  assetForRole(role: AssetRole): AssetId {
    const asset = this.roles[role]
    if (!asset) throw new Error(`工程 "${this.projectId}" 缺资源角色 "${role}"`)
    return asset
  }

  async readBytes(asset: AssetId, expectedKind?: AssetKind): Promise<ArrayBuffer> {
    const record = this.record(asset, expectedKind)
    try {
      return await this.source.readBytes(record.path)
    } catch (error) {
      throw this.readError(asset, expectedKind, record, error)
    }
  }

  async readText(asset: AssetId, expectedKind?: AssetKind): Promise<string> {
    const record = this.record(asset, expectedKind)
    try {
      return await this.source.readText(record.path)
    } catch (error) {
      throw this.readError(asset, expectedKind, record, error)
    }
  }

  async urlFor(asset: AssetId, expectedKind?: AssetKind): Promise<string> {
    const record = this.record(asset, expectedKind)
    try {
      return await this.source.urlFor(record.path)
    } catch (error) {
      throw this.readError(asset, expectedKind, record, error)
    }
  }

  async readRoleBytes(role: AssetRole): Promise<ArrayBuffer> {
    const asset = this.assetForRole(role)
    return this.readBytes(asset, ASSET_ROLE_KINDS[role])
  }

  async readRoleText(role: AssetRole): Promise<string> {
    const asset = this.assetForRole(role)
    return this.readText(asset, ASSET_ROLE_KINDS[role])
  }

  async urlForRole(role: AssetRole): Promise<string> {
    const asset = this.assetForRole(role)
    return this.urlFor(asset, ASSET_ROLE_KINDS[role])
  }

  dispose(): void {
    this.source.dispose?.()
  }

  private readError(
    asset: AssetId,
    expectedKind: AssetKind | undefined,
    record: AssetRecordV1,
    error: unknown,
  ): Error {
    return new Error(
      `工程 "${this.projectId}" 读取 AssetId "${asset}" 失败:` +
        `期望 kind=${expectedKind ?? record.kind}，登记 path=${record.path}；` +
        (error instanceof Error ? error.message : String(error)),
    )
  }
}
