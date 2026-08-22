import type { CurrentManifest, EntryPoint } from '@type-pal/content'

/** 直接启动入口是稳定 id 指针，不得退化为数组首项。 */
export function requireDefaultEntry(manifest: CurrentManifest): EntryPoint {
  const entry = manifest.entryPoints.find((candidate) => candidate.id === manifest.defaultEntryId)
  if (!entry)
    throw new Error(
      `工程 "${manifest.id}": defaultEntryId "${manifest.defaultEntryId}" 不在 entryPoints`,
    )
  return entry
}

export interface StartupEntryResolution {
  selectedEntry: EntryPoint
  /** true 仅表示 query 精确命中；用于决定显式直达是否跳过标题菜单。 */
  explicitMatch: boolean
  invalidRequestedId?: string
}

/** 无参数选择直接启动项；非法显式 id 保持既有行为：报告后回到直接启动项。 */
export function resolveStartupEntry(
  manifest: CurrentManifest,
  requestedId: string | null | undefined,
): StartupEntryResolution {
  const defaultEntry = requireDefaultEntry(manifest)
  if (!requestedId) return { selectedEntry: defaultEntry, explicitMatch: false }
  const requested = manifest.entryPoints.find((entry) => entry.id === requestedId)
  return requested
    ? { selectedEntry: requested, explicitMatch: true }
    : { selectedEntry: defaultEntry, explicitMatch: false, invalidRequestedId: requestedId }
}

/** `?scene` 只覆盖场景；所选入口的初始世界保持不变。 */
export function resolveInitialSceneId(
  requestedSceneId: string | null | undefined,
  sceneIds: readonly string[],
  selectedEntry: EntryPoint,
): string {
  return requestedSceneId && sceneIds.includes(requestedSceneId)
    ? requestedSceneId
    : selectedEntry.scene
}

export interface OpeningMenuRequest {
  menuRequested: boolean
  explicitEntryMatch: boolean
  requestedSceneId?: string | null
  sceneIds: readonly string[]
}

/** 显式有效的入口或场景都属于开发直达；非法 scene 不得意外绕过标题菜单。 */
export function shouldShowOpeningMenu(request: OpeningMenuRequest): boolean {
  const validSceneOverride =
    !!request.requestedSceneId && request.sceneIds.includes(request.requestedSceneId)
  return request.menuRequested && !request.explicitEntryMatch && !validSceneOverride
}

export type StartupLaunchRoute = 'direct' | 'menu-entry' | 'menu-load'

/** 入口 intro 只属于标题菜单中新开一局；直达和读档都不得播放。 */
export function shouldPlayEntryIntro(route: StartupLaunchRoute): boolean {
  return route === 'menu-entry'
}
