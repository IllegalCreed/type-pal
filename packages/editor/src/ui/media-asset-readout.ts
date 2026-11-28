import type { AssetRecordV1 } from '@type-pal/content'

export const MEDIA_ASSET_ORIGIN_LABELS: Readonly<Record<AssetRecordV1['origin']['kind'], string>> =
  {
    'legacy-migrated': '原版迁移',
    authored: '项目创作',
    generated: '生成资源',
    licensed: '授权资源',
  }

/** Compact file-size readout shared by the media workbenches. */
export function formatMediaAssetBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
