/** Catalog contracts shared by commands for tilesets and both sprite families. */
import {
  type AssetCatalogV1,
  type AssetId,
  type AssetRecordV1,
  findAssetRecord,
  validateProjectRelativePath,
} from '@type-pal/content'
import type { ProjectReferenceEdge } from './project-reference.js'

export class AssetInUseError extends Error {
  constructor(
    readonly assetId: AssetId,
    readonly references: readonly ProjectReferenceEdge[],
  ) {
    super(`资源 ${assetId} 仍被 ${references.length} 处引用，不能删除`)
    this.name = 'AssetInUseError'
  }
}

export function sameAssetRecord(left: AssetRecordV1, right: AssetRecordV1): boolean {
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

/** Bind a confirmed removal to the bytes read for its undo history. */
export function assertAssetDeletionRevision(
  catalog: AssetCatalogV1,
  asset: AssetId,
  confirmed: AssetRecordV1,
): void {
  const current = findAssetRecord(catalog, asset)
  if (
    !current ||
    current.kind !== confirmed.kind ||
    current.path !== confirmed.path ||
    current.bytes !== confirmed.bytes ||
    current.sha256 !== confirmed.sha256
  )
    throw new Error(`资源 ${asset} 已变化，请重新确认删除。`)
}

type RleAssetKind = 'tileset' | 'sprite' | 'battle-sprite'

/** Check metadata and the gzip envelope. Catalog digest verification belongs to saving. */
function assertRleRecord(
  record: AssetRecordV1,
  bytes: ArrayBuffer,
  kind: RleAssetKind,
  title: string,
): void {
  if (record.kind !== kind) throw new Error(`${title} kind 必须是 ${kind}`)
  if (record.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error(`${title} mediaType 必须是 application/vnd.type-pal.rle`)
  validateProjectRelativePath(record.path, `${title}路径`)
  if (record.bytes !== bytes.byteLength) throw new Error(`${title} bytes 与二进制长度不一致`)
  if (!/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error(`${title} sha256 非法`)
  const view = new Uint8Array(bytes)
  if (view[0] !== 0x1f || view[1] !== 0x8b) throw new Error(`${title}必须是 canonical gzip`)
}

export function assertTilesetRecord(record: AssetRecordV1, bytes: ArrayBuffer): void {
  assertRleRecord(record, bytes, 'tileset', '瓦片集资源')
}

export function assertSpriteRecord(record: AssetRecordV1, bytes: ArrayBuffer): void {
  assertRleRecord(record, bytes, 'sprite', '大世界精灵资源')
}

export function assertBattleSpriteRecord(record: AssetRecordV1, bytes: ArrayBuffer): void {
  assertRleRecord(record, bytes, 'battle-sprite', '战斗精灵资源')
}
