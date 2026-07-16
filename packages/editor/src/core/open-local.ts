/**
 * openLocalProject —— 打开本地工程夹(P4)。fsaSource → loadProjectFrom → 全量场景与脚本。
 * 无有效 manifest.json → 友好报错(不进编辑器)。素材经 fsaSource 从本地读 → 离线渲染。
 */
import type { SceneDef, ScriptChunkV1 } from '@type-pal/content'
import {
  fsaSource,
  type LoadedProject,
  loadAllScenes,
  loadAllScriptChunks,
  loadProjectFrom,
} from '@type-pal/reforge'
import {
  completeLocalProjectV3AudioRoles,
  type UpgradeLocalV2Options,
  upgradeLocalProjectV2,
} from './upgrade-local-v2.js'

export interface OpenedProject {
  project: LoadedProject
  scenes: SceneDef[]
  scriptChunks: Record<string, ScriptChunkV1>
}

export async function openLocalProject(
  dir: FileSystemDirectoryHandle,
  options: UpgradeLocalV2Options = {},
): Promise<OpenedProject> {
  let source = fsaSource(dir)
  let project: LoadedProject
  try {
    let rawManifest = await source.readJson<unknown>('manifest.json')
    if (await upgradeLocalProjectV2(dir, source, rawManifest, options)) {
      source.dispose?.()
      source = fsaSource(dir)
      rawManifest = await source.readJson<unknown>('manifest.json')
    }
    if (await completeLocalProjectV3AudioRoles(dir, source, rawManifest)) {
      source.dispose?.()
      source = fsaSource(dir)
    }
    project = await loadProjectFrom(source)
  } catch (e) {
    throw new Error(
      `打开工程失败:「${dir.name}」里没有有效的 manifest.json(${e instanceof Error ? e.message : String(e)})`,
    )
  }
  const scenes = await loadAllScenes(project)
  const scriptChunks = await loadAllScriptChunks(project)
  return { project, scenes, scriptChunks }
}
