/**
 * openLocalProject —— 打开本地工程夹(P4)。fsaSource → loadProjectFrom → 全量场景 + 音乐。
 * 无有效 manifest.json → 友好报错(不进编辑器)。素材经 fsaSource 从本地读 → 离线渲染。
 */
import type { MusicDef, SceneDef, ScriptChunkV1 } from '@type-pal/content'
import type { OwnMap } from '@type-pal/reforge'
import {
  fsaSource,
  type LoadedProject,
  loadAllOwnMaps,
  loadAllScenes,
  loadAllScriptChunks,
  loadProjectFrom,
} from '@type-pal/reforge'

export interface OpenedProject {
  project: LoadedProject
  scenes: SceneDef[]
  music: MusicDef[]
  /** W7:own 场景引用的自有地图(content/maps/<id>.json);无 own 场景 → {}。 */
  ownMaps: Record<string, OwnMap>
  scriptChunks: Record<string, ScriptChunkV1>
}

export async function openLocalProject(dir: FileSystemDirectoryHandle): Promise<OpenedProject> {
  const source = fsaSource(dir)
  let project: LoadedProject
  try {
    project = await loadProjectFrom(source)
  } catch (e) {
    throw new Error(
      `打开工程失败:「${dir.name}」里没有有效的 manifest.json(${e instanceof Error ? e.message : String(e)})`,
    )
  }
  const scenes = await loadAllScenes(project)
  const ownMaps = await loadAllOwnMaps(project, scenes)
  const scriptChunks = await loadAllScriptChunks(project)
  const musicRel = project.manifest.content.music
  const music: MusicDef[] = musicRel
    ? await source.readJson<MusicDef[]>(musicRel).catch(() => [])
    : []
  return { project, scenes, music, ownMaps, scriptChunks }
}
