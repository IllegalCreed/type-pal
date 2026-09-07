/** Read-only admission: serialize with author saves, never recover or register the source. */
import { parseSaveIdentity } from './author-save-plan.js'
import {
  findWorkspaceRecordByHandle,
  withWorkspaceDiscoveryLock,
  withWorkspaceRegistrationLock,
} from './handle-store.js'

export function withProjectDirectoryReadLock<T>(
  dir: FileSystemDirectoryHandle,
  read: () => Promise<T>,
): Promise<T> {
  return withWorkspaceDiscoveryLock(async () => {
    const binding = await findWorkspaceRecordByHandle(dir)
    // An unregistered directory has no W yet. Keep discovery held through the read so
    // a concurrent first save cannot mint a W and start writing behind this reader.
    if (!binding) return read()
    const identity = parseSaveIdentity({
      workspaceId: binding.workspaceId,
      projectId: binding.projectId,
      mode: binding.mode,
      source: binding.source,
    })
    const verifyBinding = async () => {
      const current = await findWorkspaceRecordByHandle(dir)
      if (
        !current ||
        current.workspaceId !== identity.workspaceId ||
        current.projectId !== identity.projectId ||
        current.mode !== identity.mode ||
        current.source !== identity.source
      )
        throw new Error('目录项目绑定在读取期间发生变化，请重新打开项目')
    }
    return withWorkspaceRegistrationLock(identity.workspaceId, async () => {
      await verifyBinding()
      const result = await read()
      await verifyBinding()
      return result
    })
  })
}
