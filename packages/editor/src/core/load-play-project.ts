/**
 * 载入编辑器同源试玩项目。
 *
 * 开发期编辑器只接受当前 canonical contentVersion；旧项目必须先由生成/迁移工具
 * 重建。这里故意不做版本分发或旧 loader 回退，避免编辑页与试玩页的项目边界再次分叉。
 */
import { fsaSource, loadCurrentProject, loadCurrentProjectFrom } from '@type-pal/reforge'
import { withProjectDirectoryReadLock } from './project-read-lock.js'

export function loadPlayProject(
  projectId: string,
  dir?: FileSystemDirectoryHandle,
): ReturnType<typeof loadCurrentProjectFrom> {
  if (!dir) return loadCurrentProject(projectId)
  const source = fsaSource(dir)
  // Constructing a source does no IO. The current loader owns the save-state
  // sandwich inside the lock; successful loads retain their source for lazy reads.
  return withProjectDirectoryReadLock(dir, () => loadCurrentProjectFrom(source)).catch((error) => {
    source.dispose?.()
    throw error
  })
}
