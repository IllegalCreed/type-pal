import type { CurrentManifest, EntryPoint } from '@type-pal/content'

/** Resolve the configured direct-start entry without introducing an array-order fallback. */
export function findDefaultEntry(manifest: CurrentManifest): EntryPoint | undefined {
  return manifest.entryPoints.find((entry) => entry.id === manifest.defaultEntryId)
}

export function requireDefaultEntry(manifest: CurrentManifest): EntryPoint {
  const entry = findDefaultEntry(manifest)
  if (!entry)
    throw new Error(`直接启动入口 "${manifest.defaultEntryId}" 不存在，请先修复项目入口配置`)
  return entry
}
