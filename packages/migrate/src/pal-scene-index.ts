import type { MapIndexV1, SceneDef, SceneIndexV1 } from '@type-pal/content'
import { validateSceneIndex } from '@type-pal/content'

/**
 * PAL raw scenes 的 content20 初始目录。名称只在首次生成时由地图可读名播种；publication 之后
 * baseline-first 保留作者修改的 name/path，不会每次重迁覆盖。
 */
export function buildPalSceneIndex(
  scenes: readonly Pick<SceneDef, 'id' | 'mapId'>[],
  mapIndex: MapIndexV1,
): SceneIndexV1 {
  const mapNames = new Map(mapIndex.maps.map((entry) => [entry.id, entry.name] as const))
  const uses = new Map<string, number>()
  return validateSceneIndex({
    version: 1,
    scenes: scenes.map((scene) => {
      const base = mapNames.get(scene.mapId) ?? `场景 ${scene.id}`
      const ordinal = (uses.get(base) ?? 0) + 1
      uses.set(base, ordinal)
      return {
        id: scene.id,
        name: ordinal === 1 ? base : `${base}（${ordinal}）`,
        path: `content/scenes/${scene.id}.json`,
      }
    }),
  })
}

/** raw-owned SceneId 必须完整保留；作者可以另增场景、修改 name/path。 */
export function assertPalSceneIndexOwnership(args: {
  current: SceneIndexV1
  generated: SceneIndexV1
}): void {
  const currentIds = new Set(args.current.scenes.map((entry) => entry.id))
  const missing = args.generated.scenes
    .map((entry) => entry.id)
    .filter((sceneId) => !currentIds.has(sceneId))
  if (missing.length)
    throw new Error(`PAL SceneIndex 缺 raw-owned 场景: ${missing.slice(0, 20).join(', ')}`)
}
