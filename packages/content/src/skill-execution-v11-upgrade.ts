import type { LegacyManifestV10, LegacyManifestV11 } from './character.js'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** R13-6B：技能执行分支、前震屏和表现事务均为可选字段，v10 内容逐字保留。 */
export function upgradeManifestV10ToV11(value: unknown): LegacyManifestV11 {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('manifest: 期望对象')
  const manifest = value as Record<string, unknown>
  if (manifest.contentVersion !== 10) throw new Error('manifest: 期望 contentVersion 10')
  if (manifest.minimumSaveVersion !== 8)
    throw new Error(
      `manifest.minimumSaveVersion: contentVersion 10 期望 8，收到 ${String(manifest.minimumSaveVersion)}`,
    )
  return {
    ...(clone(manifest) as unknown as LegacyManifestV10),
    contentVersion: 11,
    minimumSaveVersion: 8,
  }
}
