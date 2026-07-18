import type { AssetId, AssetKind, AssetRecordV1 } from '@type-pal/content'
import type { AssetResolver } from './asset-resolver.js'

const PROJECT_IMAGE_KINDS = new Set<AssetKind>([
  'portrait',
  'face',
  'item-icon',
  'battle-background',
])

/**
 * 工程级静态图像缓存。键只使用稳定 AssetId；kind/path 校验和字节读取都由
 * AssetResolver 完成，调用方不得再按编号、角色 id 或目录猜文件名。
 */
export class ProjectImageCache {
  private readonly pending = new Map<AssetId, Promise<ImageBitmap>>()
  private readonly decoded = new Map<AssetId, ImageBitmap>()

  constructor(private readonly resolver: AssetResolver) {}

  load(asset: AssetId, expectedKind: AssetKind): Promise<ImageBitmap> {
    if (!PROJECT_IMAGE_KINDS.has(expectedKind))
      throw new Error(`ProjectImageCache 不支持 kind=${expectedKind}`)
    // 缓存键只用稳定 AssetId，但每次调用仍先校验 expected kind；否则 pending/decoded hit
    // 会让同一 id 以错误语义类型复用已解码图。
    const record = this.resolver.record(asset, expectedKind)
    const hit = this.decoded.get(asset)
    if (hit) return Promise.resolve(hit)
    const inflight = this.pending.get(asset)
    if (inflight) return inflight

    const promise = this.decode(asset, expectedKind, record)
    this.pending.set(asset, promise)
    void promise.then(
      () => this.pending.delete(asset),
      () => this.pending.delete(asset),
    )
    return promise
  }

  dispose(): void {
    for (const bitmap of this.decoded.values()) bitmap.close()
    this.decoded.clear()
    this.pending.clear()
  }

  private async decode(
    asset: AssetId,
    expectedKind: AssetKind,
    record: AssetRecordV1,
  ): Promise<ImageBitmap> {
    const bytes = await this.resolver.readBytes(asset, expectedKind)
    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(new Blob([bytes], { type: record.mediaType }))
    } catch (error) {
      throw new Error(
        `工程 "${this.resolver.projectId}" 解码 AssetId "${asset}" 失败:` +
          `${error instanceof Error ? error.message : String(error)}`,
      )
    }
    this.decoded.set(asset, bitmap)
    return bitmap
  }
}
