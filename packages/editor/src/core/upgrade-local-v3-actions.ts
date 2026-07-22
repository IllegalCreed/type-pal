import type { LegacyManifestV3, SpriteDef } from '@type-pal/content'
import {
  LEGACY_LAYOUT_LOOP_ACTION_ID,
  upgradeManifestV3ToV4,
  upgradeSceneDefinitionsV3ToV4,
  upgradeSpriteDefinitionsV3ToV4,
  validateActors,
  validateAssetCatalog,
  validateProjectRelativePath,
  validateScenesForContentVersion,
  validateSprites,
} from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge'
import { writeProject } from './project-io.js'

function objectAt(value: unknown, where: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${where}: 期望对象`)
  return value as Record<string, unknown>
}

function contentPath(manifest: LegacyManifestV3, key: string): string {
  const path = manifest.content[key]
  if (typeof path !== 'string' || path.length === 0)
    throw new Error(`manifest.content.${key}: 期望非空工程相对路径`)
  return validateProjectRelativePath(path, `manifest.content.${key}`)
}

function sceneDirectory(manifest: LegacyManifestV3): string {
  const rawPath = manifest.content.scenes
  if (typeof rawPath !== 'string' || rawPath.length === 0)
    throw new Error('manifest.content.scenes: 期望非空工程相对路径')
  // v3 的 canonical manifest 把场景保存为目录，历史工程允许尾随 `/`。
  // 通用文件路径校验器有意拒绝空段，因此先只移除目录结尾，再恢复唯一的 `/`。
  const path = validateProjectRelativePath(rawPath.replace(/\/+$/, ''), 'manifest.content.scenes')
  return `${path}/`
}

function recoverCanonicalSprites(
  rawSprites: unknown,
  catalog: ReturnType<typeof validateAssetCatalog>,
):
  | {
      sprites: SpriteDef[]
      legacyLayoutActions: Readonly<Record<string, typeof LEGACY_LAYOUT_LOOP_ACTION_ID>>
    }
  | undefined {
  try {
    const sprites = validateSprites(rawSprites, catalog)
    const legacyLayoutActions: Record<string, typeof LEGACY_LAYOUT_LOOP_ACTION_ID> = {}
    for (const sprite of sprites)
      if (Object.hasOwn(sprite.poses ?? {}, LEGACY_LAYOUT_LOOP_ACTION_ID))
        legacyLayoutActions[sprite.id] = LEGACY_LAYOUT_LOOP_ACTION_ID
    return { sprites, legacyLayoutActions }
  } catch {
    return undefined
  }
}

/**
 * contentVersion 3 动作 schema 的本地唯一升级边界。
 *
 * sprites/scenes 全部预检后作为内容文件写出，manifest 最后发布 v4。若 manifest close 中断，下一次
 * 打开会识别已经前滚的 v4 sprites，并继续补齐尚未写完的 scene binding，最终幂等收敛。
 */
export async function upgradeLocalProjectV3Actions(
  dir: FileSystemDirectoryHandle,
  source: FileSource,
  rawManifest: unknown,
): Promise<boolean> {
  const record = objectAt(rawManifest, 'manifest')
  if (record.contentVersion !== 3) return false
  const manifest = record as unknown as LegacyManifestV3
  const spritesPath = contentPath(manifest, 'sprites')
  const actorsPath = contentPath(manifest, 'actors')
  const catalogPath = validateProjectRelativePath(
    manifest.assets.catalog,
    'manifest.assets.catalog',
  )
  const dirPath = sceneDirectory(manifest)

  const [rawSprites, rawActors, rawSceneIds, rawCatalog] = await Promise.all([
    source.readJson<unknown>(spritesPath),
    source.readJson<unknown>(actorsPath),
    source.readJson<unknown>(`${dirPath}index.json`),
    source.readJson<unknown>(catalogPath),
  ])
  if (!Array.isArray(rawSceneIds) || rawSceneIds.some((id) => typeof id !== 'string' || !id))
    throw new Error(`${dirPath}index.json: 期望非空 scene id 数组`)
  const sceneIds = rawSceneIds as string[]
  const [actors, catalog, rawScenes] = await Promise.all([
    Promise.resolve(validateActors(rawActors)),
    Promise.resolve(validateAssetCatalog(rawCatalog, catalogPath)),
    Promise.all(sceneIds.map((id) => source.readJson<unknown>(`${dirPath}${id}.json`))),
  ])

  const recovered = recoverCanonicalSprites(rawSprites, catalog)
  const spriteUpgrade = recovered ?? upgradeSpriteDefinitionsV3ToV4(rawSprites)
  const scenes = upgradeSceneDefinitionsV3ToV4({
    scenes: rawScenes,
    actors,
    legacyLayoutActions: spriteUpgrade.legacyLayoutActions,
  })
  const manifestV4 = upgradeManifestV3ToV4(manifest)

  validateSprites(spriteUpgrade.sprites, catalog)
  scenes.forEach((scene, index) => {
    const [validated] = validateScenesForContentVersion([scene], manifestV4.contentVersion)
    if (!validated || validated.id !== sceneIds[index])
      throw new Error(
        `${dirPath}${sceneIds[index]}.json: scene.id 期望 ${JSON.stringify(sceneIds[index])}`,
      )
  })

  const files: Record<string, unknown> = { [spritesPath]: spriteUpgrade.sprites }
  sceneIds.forEach((id, index) => {
    files[`${dirPath}${id}.json`] = scenes[index]
  })
  files['manifest.json'] = manifestV4
  await writeProject(dir, files)
  return true
}
