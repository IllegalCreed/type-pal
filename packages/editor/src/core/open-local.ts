/**
 * 打开本地工程夹。开发期编辑器只接受当前 canonical contentVersion 15；旧工程必须由
 * 对应生成/迁移工具重建，编辑器本身不再携带版本升级器或双读分支。
 */
import type { SceneDefV14, ScriptChunkV1, StampTemplateV1 } from '@type-pal/content'
import {
  fsaSource,
  loadAllAuthorScenesV15,
  loadProjectV15From,
  loadStampTemplatesV15,
} from '@type-pal/reforge'

export interface OpenedProjectV15 {
  kind: 'v15'
  project: Awaited<ReturnType<typeof loadProjectV15From>>
  scenes: SceneDefV14[]
  scriptChunks: Record<string, ScriptChunkV1>
  stamps: StampTemplateV1[]
}

export type OpenedProject = OpenedProjectV15

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
  if (version !== 15) {
    source.dispose?.()
    const found = version === undefined ? '未知' : String(version)
    throw new Error(
      `打开工程失败:「${dir.name}」是 contentVersion ${found}；开发期编辑器只接受当前 contentVersion 15，请用对应生成或迁移工具重新生成工程。`,
    )
  }

  try {
    const project = await loadProjectV15From(source)
    const [scenes, stamps] = await Promise.all([
      loadAllAuthorScenesV15(project),
      loadStampTemplatesV15(project),
    ])
    return { kind: 'v15', project, scenes, scriptChunks: {}, stamps }
  } catch (error) {
    source.dispose?.()
    throw new Error(
      `打开工程失败:「${dir.name}」的 canonical v15 内容无效(${error instanceof Error ? error.message : String(error)})`,
    )
  }
}
