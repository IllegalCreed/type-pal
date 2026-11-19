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
 * AssetResolver 完成。位图由缓存持有至 dispose，晚于释放完成的解码不再发布。
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
      .then((bitmap) => {
        if (this.pending.get(asset) !== promise) {
          bitmap.close()
          throw new DOMException('project image request disposed', 'AbortError')
        }
        this.decoded.set(asset, bitmap)
        return bitmap
      })
      .finally(() => {
        if (this.pending.get(asset) === promise) this.pending.delete(asset)
      })
    this.pending.set(asset, promise)
    return promise
  }

  dispose(): void {
    this.pending.clear()
    for (const bitmap of this.decoded.values()) bitmap.close()
    this.decoded.clear()
  }

  private async decode(
    asset: AssetId,
    expectedKind: AssetKind,
    record: AssetRecordV1,
  ): Promise<ImageBitmap> {
    const bytes = await this.resolver.readBytes(asset, expectedKind)
    try {
      return await createImageBitmap(new Blob([bytes], { type: record.mediaType }))
    } catch (error) {
      throw new Error(
        `工程 "${this.resolver.projectId}" 解码 AssetId "${asset}" 失败:` +
          `${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}
