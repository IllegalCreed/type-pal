/**
 * 打开本地工程夹。开发期编辑器只接受当前 canonical contentVersion 16；旧工程必须由
 * 对应生成/迁移工具重建，编辑器本身不再携带版本升级器或双读分支。
 */
import type { SceneDefV14, ScriptChunkV1, StampTemplate } from '@type-pal/content'
import {
  fsaSource,
  loadAllAuthorScenesV16,
  loadProjectV16From,
  loadStampTemplatesV16,
} from '@type-pal/reforge'

export interface OpenedProjectV16 {
  kind: 'v16'
  project: Awaited<ReturnType<typeof loadProjectV16From>>
  scenes: SceneDefV14[]
  scriptChunks: Record<string, ScriptChunkV1>
  stamps: StampTemplate[]
}

export type OpenedProject = OpenedProjectV16

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
    const project = await loadProjectV16From(source)
    const [scenes, stamps] = await Promise.all([
      loadAllAuthorScenesV16(project),
      loadStampTemplatesV16(project),
    ])
    return { kind: 'v16', project, scenes, scriptChunks: {}, stamps }
  } catch (error) {
    source.dispose?.()
    throw new Error(
      `打开工程失败:「${dir.name}」的 canonical v16 内容无效(${error instanceof Error ? error.message : String(error)})`,
    )
  }
}
