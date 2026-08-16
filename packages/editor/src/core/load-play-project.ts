/**
 * 载入编辑器同源试玩工程。
 *
 * 开发期编辑器只接受当前 canonical contentVersion 14；旧工程必须先由生成/迁移工具
 * 重建。这里故意不做版本分发或旧 loader 回退，避免编辑页与试玩页的工程边界再次分叉。
 */
import { fsaSource, loadProjectV14, loadProjectV14From } from '@type-pal/reforge'

export function loadPlayProject(
  projectId: string,
  dir?: FileSystemDirectoryHandle,
): ReturnType<typeof loadProjectV14From> {
  return dir ? loadProjectV14From(fsaSource(dir)) : loadProjectV14(projectId)
}
