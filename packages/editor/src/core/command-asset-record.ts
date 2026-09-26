/**
 * 资源 catalog record 比较与校验。tileset / sprite / battle-sprite 命令共用。
 */
import type { AssetRecordV1 } from '@type-pal/content'
import { validateProjectRelativePath } from '@type-pal/content'

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

export function assertTilesetRecord(record: AssetRecordV1, bytes: ArrayBuffer): void {
  if (record.kind !== 'tileset') throw new Error('瓦片集资源 kind 必须是 tileset')
  if (record.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error('瓦片集资源 mediaType 必须是 application/vnd.type-pal.rle')
  validateProjectRelativePath(record.path, '瓦片集资源路径')
  if (record.bytes !== bytes.byteLength) throw new Error('瓦片集资源 bytes 与二进制长度不一致')
  if (!/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error('瓦片集资源 sha256 非法')
  const view = new Uint8Array(bytes)
  if (view[0] !== 0x1f || view[1] !== 0x8b) throw new Error('瓦片集资源必须是 canonical gzip')
}

export function assertSpriteRecord(record: AssetRecordV1, bytes: ArrayBuffer): void {
  if (record.kind !== 'sprite') throw new Error('大世界精灵资源 kind 必须是 sprite')
  if (record.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error('大世界精灵资源 mediaType 必须是 application/vnd.type-pal.rle')
  validateProjectRelativePath(record.path, '大世界精灵资源路径')
  if (record.bytes !== bytes.byteLength) throw new Error('大世界精灵资源 bytes 与二进制长度不一致')
  if (!/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error('大世界精灵资源 sha256 非法')
  const view = new Uint8Array(bytes)
  if (view[0] !== 0x1f || view[1] !== 0x8b) throw new Error('大世界精灵资源必须是 canonical gzip')
}

export function assertBattleSpriteRecord(record: AssetRecordV1, bytes: ArrayBuffer): void {
  if (record.kind !== 'battle-sprite') throw new Error('战斗精灵资源 kind 必须是 battle-sprite')
  if (record.mediaType !== 'application/vnd.type-pal.rle')
    throw new Error('战斗精灵资源 mediaType 必须是 application/vnd.type-pal.rle')
  validateProjectRelativePath(record.path, '战斗精灵资源路径')
  if (record.bytes !== bytes.byteLength) throw new Error('战斗精灵资源 bytes 与二进制长度不一致')
  if (!/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error('战斗精灵资源 sha256 非法')
  const view = new Uint8Array(bytes)
  if (view[0] !== 0x1f || view[1] !== 0x8b) throw new Error('战斗精灵资源必须是 canonical gzip')
}
