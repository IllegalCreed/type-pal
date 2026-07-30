/**
 * openLocalProject —— 打开本地工程夹(P4)。fsaSource → loadProjectFrom → 全量场景与脚本。
 * 无有效 manifest.json → 友好报错(不进编辑器)。素材经 fsaSource 从本地读 → 离线渲染。
 */
import type { SceneDef, SceneDefV5, ScriptChunkV1, StampTemplateV1 } from '@type-pal/content'
import {
  CONTENT_VERSION,
  emptyWorldScriptStateV5,
  ProjectScriptV4V5UpgradeError,
} from '@type-pal/content'
import {
  fsaSource,
  type LoadedProject,
  type LoadedProjectV5,
  legacyProjectShellFromV5,
  legacySceneFromV5,
  loadAllScenes,
  loadAllScenesV5,
  loadAllScriptChunks,
  loadProjectFrom,
  loadProjectV5From,
  loadStampTemplates,
  loadStampTemplatesV5,
} from '@type-pal/reforge'
import {
  completeLocalProjectV3AudioRoles,
  type UpgradeLocalV2Options,
  upgradeLocalProjectV2,
} from './upgrade-local-v2.js'
import { upgradeLocalProjectV3Actions } from './upgrade-local-v3-actions.js'
import { upgradeLocalProjectV3BattleSprites } from './upgrade-local-v3-battle-sprites.js'
import { upgradeLocalProjectV3StaticImages } from './upgrade-local-v3-images.js'
import { upgradeLocalProjectV3Sounds } from './upgrade-local-v3-sounds.js'
import { upgradeLocalProjectV3Sprites } from './upgrade-local-v3-sprites.js'
import { upgradeLocalProjectV3Tilesets } from './upgrade-local-v3-tilesets.js'
import {
  LocalProjectV4V5PreviewRequiredError,
  recoverLocalProjectV4V5Migration,
  type UpgradeLocalProjectV4ScriptV5Options,
  upgradeLocalProjectV4ScriptV5,
} from './upgrade-local-v4-script-v5.js'
import {
  upgradeLocalProjectV5V6EpochV7,
  upgradeLocalProjectV7ThrowV8,
  upgradeLocalProjectV8EquipBattleSpriteV9,
} from './upgrade-local-v5-v6-epoch-v7.js'

export interface OpenedProjectV4 {
  kind: 'v4'
  project: LoadedProject
  scenes: SceneDef[]
  scriptChunks: Record<string, ScriptChunkV1>
  stamps: StampTemplateV1[]
}

export interface OpenedProjectV5 {
  kind: 'v5'
  project: LoadedProject
  scenes: SceneDef[]
  scriptChunks: Record<string, ScriptChunkV1>
  stamps: StampTemplateV1[]
  canonicalV5: {
    project: LoadedProjectV5
    scenes: SceneDefV5[]
  }
}

export type OpenedProject = OpenedProjectV4 | OpenedProjectV5

export interface OpenLocalProjectOptions
  extends UpgradeLocalV2Options,
    UpgradeLocalProjectV4ScriptV5Options {}

export async function openLocalProject(
  dir: FileSystemDirectoryHandle,
  options: OpenLocalProjectOptions = {},
): Promise<OpenedProject> {
  await recoverLocalProjectV4V5Migration(dir)
  let source = fsaSource(dir)
  let rawManifest: unknown
  try {
    rawManifest = await source.readJson<unknown>('manifest.json')
    if (await upgradeLocalProjectV2(dir, source, rawManifest, options)) {
      source.dispose?.()
      source = fsaSource(dir)
      rawManifest = await source.readJson<unknown>('manifest.json')
    }
    if (await upgradeLocalProjectV3Sounds(dir, source, rawManifest, options)) {
      source.dispose?.()
      source = fsaSource(dir)
      rawManifest = await source.readJson<unknown>('manifest.json')
    }
    if (await upgradeLocalProjectV3StaticImages(dir, source, rawManifest, options)) {
      source.dispose?.()
      source = fsaSource(dir)
      rawManifest = await source.readJson<unknown>('manifest.json')
    }
    if (await upgradeLocalProjectV3Tilesets(dir, source, rawManifest)) {
      source.dispose?.()
      source = fsaSource(dir)
      rawManifest = await source.readJson<unknown>('manifest.json')
    }
    if (await upgradeLocalProjectV3Sprites(dir, source, rawManifest)) {
      source.dispose?.()
      source = fsaSource(dir)
      rawManifest = await source.readJson<unknown>('manifest.json')
    }
    if (await upgradeLocalProjectV3BattleSprites(dir, source, rawManifest)) {
      source.dispose?.()
      source = fsaSource(dir)
      rawManifest = await source.readJson<unknown>('manifest.json')
    }
    if (await completeLocalProjectV3AudioRoles(dir, source, rawManifest)) {
      source.dispose?.()
      source = fsaSource(dir)
      rawManifest = await source.readJson<unknown>('manifest.json')
    }
    if (await upgradeLocalProjectV3Actions(dir, source, rawManifest)) {
      source.dispose?.()
      source = fsaSource(dir)
      rawManifest = await source.readJson<unknown>('manifest.json')
    }
    if (await upgradeLocalProjectV4ScriptV5(dir, source, rawManifest, options)) {
      source.dispose?.()
      source = fsaSource(dir)
      rawManifest = await source.readJson<unknown>('manifest.json')
    }
    if (await upgradeLocalProjectV5V6EpochV7(dir, source, rawManifest)) {
      source.dispose?.()
      source = fsaSource(dir)
      rawManifest = await source.readJson<unknown>('manifest.json')
    }
    if (await upgradeLocalProjectV7ThrowV8(dir, source, rawManifest)) {
      source.dispose?.()
      source = fsaSource(dir)
      rawManifest = await source.readJson<unknown>('manifest.json')
    }
    if (await upgradeLocalProjectV8EquipBattleSpriteV9(dir, source, rawManifest)) {
      source.dispose?.()
      source = fsaSource(dir)
      rawManifest = await source.readJson<unknown>('manifest.json')
    }
  } catch (e) {
    if (
      e instanceof ProjectScriptV4V5UpgradeError ||
      e instanceof LocalProjectV4V5PreviewRequiredError
    )
      throw e
    throw new Error(
      `打开工程失败:「${dir.name}」里没有有效的 manifest.json(${e instanceof Error ? e.message : String(e)})`,
    )
  }
  if (
    rawManifest &&
    typeof rawManifest === 'object' &&
    'contentVersion' in rawManifest &&
    rawManifest.contentVersion === CONTENT_VERSION
  ) {
    let project: LoadedProjectV5
    try {
      project = await loadProjectV5From(source)
    } catch (e) {
      throw new Error(
        `打开工程失败:「${dir.name}」的 canonical 内容无效(${e instanceof Error ? e.message : String(e)})`,
      )
    }
    const [scenes, stamps] = await Promise.all([
      loadAllScenesV5(project),
      loadStampTemplatesV5(project),
    ])
    const world = emptyWorldScriptStateV5()
    return {
      kind: 'v5',
      project: legacyProjectShellFromV5(project, world),
      scenes: scenes.map((scene) => legacySceneFromV5(scene, world)),
      scriptChunks: {},
      stamps,
      canonicalV5: { project, scenes },
    }
  }
  let project: LoadedProject
  try {
    project = await loadProjectFrom(source)
  } catch (e) {
    throw new Error(
      `打开工程失败:「${dir.name}」的 legacy 内容无效(${e instanceof Error ? e.message : String(e)})`,
    )
  }
  const [scenes, scriptChunks, stamps] = await Promise.all([
    loadAllScenes(project),
    loadAllScriptChunks(project),
    loadStampTemplates(project),
  ])
  return { kind: 'v4', project, scenes, scriptChunks, stamps }
}
