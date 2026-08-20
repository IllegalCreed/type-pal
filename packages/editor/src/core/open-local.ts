/**
 * 打开本地工程夹。开发期编辑器只接受当前 canonical contentVersion 16；旧工程必须由
 * 对应生成/迁移工具重建，编辑器本身不再携带版本升级器或双读分支。
 */
import type { AuthorSceneDef, ScriptChunkV1, StampTemplate } from '@type-pal/content'
import {
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadStampTemplates,
} from '@type-pal/reforge'

export interface OpenedCurrentProject {
  kind: 'current'
  project: Awaited<ReturnType<typeof loadCurrentProjectFrom>>
  scenes: AuthorSceneDef[]
  scriptChunks: Record<string, ScriptChunkV1>
  stamps: StampTemplate[]
}

export type OpenedProject = OpenedCurrentProject

function manifestContentVersion(value: unknown): number | undefined {
  if (!value || typeof value !== 'object' || !('contentVersion' in value)) return undefined
  const version = value.contentVersion
  return typeof version === 'number' ? version : undefined
}

export async function openLocalProject(dir: FileSystemDirectoryHandle): Promise<OpenedProject> {
  const source = fsaSource(dir)
  let rawManifest: unknown
  try {
    rawManifest = await source.readJson<unknown>('manifest.json')
  } catch (error) {
    source.dispose?.()
    throw new Error(
      `打开工程失败:「${dir.name}」里没有有效的 manifest.json(${error instanceof Error ? error.message : String(error)})`,
    )
  }

  const version = manifestContentVersion(rawManifest)
  if (version !== 16) {
    source.dispose?.()
    const found = version === undefined ? '未知' : String(version)
    throw new Error(
      `打开工程失败:「${dir.name}」是 contentVersion ${found}；开发期编辑器只接受当前 contentVersion 16，请用对应生成或迁移工具重新生成工程。`,
    )
  }

  try {
    const project = await loadCurrentProjectFrom(source)
    const [scenes, stamps] = await Promise.all([
      loadAllAuthorScenes(project),
      loadStampTemplates(project),
    ])
    return { kind: 'current', project, scenes, scriptChunks: {}, stamps }
  } catch (error) {
    source.dispose?.()
    throw new Error(
      `打开工程失败:「${dir.name}」的 canonical v16 内容无效(${error instanceof Error ? error.message : String(error)})`,
    )
  }
}
