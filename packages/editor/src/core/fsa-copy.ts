/**
 * FSA 目录整树递归拷贝(A5 债修:「另存为」曾只写 serialize 文件集 —— 克隆项目磁盘上的
 * 既有素材不在编辑器 state,另存即丢)。另存为 = 先整树拷贝源目录,再覆写内容文件。
 */

import { isWorkspaceIdentityPath } from './workspace-context.js'
/** src 全部文件/子目录递归拷进 dst(同名覆盖,他文件保留)。返回拷贝文件数。 */
import {
  type AuthorizedWorkspaceInput,
  type AuthorizedWorkspaceMutation,
  authorizedDirectory,
  beginAuthorizedWorkspaceMutation,
  recordAuthorizedWorkspaceWriteCompleted,
  WORKSPACE_IDENTITY_COPY_EXCLUDES,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

interface SourceCopySnapshot {
  directories: string[]
  files: Array<{ path: string; file: File }>
}

async function collectDirectoryContents(
  src: FileSystemDirectoryHandle,
  prefix: string,
  excludes: ReadonlySet<string>,
  snapshot: SourceCopySnapshot,
): Promise<void> {
  const iter = (
    src as unknown as {
      entries(): AsyncIterable<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>
    }
  ).entries()
  for await (const [name, handle] of iter) {
    const rel = prefix ? `${prefix}/${name}` : name
    if (isWorkspaceIdentityPath(rel) || excludes.has(rel)) continue
    if (handle.kind === 'file') {
      const file = await (handle as FileSystemFileHandle).getFile()
      snapshot.files.push({ path: rel, file })
    } else {
      snapshot.directories.push(rel)
      await collectDirectoryContents(handle as FileSystemDirectoryHandle, rel, excludes, snapshot)
    }
  }
}

async function ensureDirectory(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemDirectoryHandle> {
  let current = root
  for (const segment of path.split('/').filter(Boolean))
    current = await current.getDirectoryHandle(segment, { create: true })
  return current
}

async function writeSourceSnapshot(
  snapshot: SourceCopySnapshot,
  dstRoot: FileSystemDirectoryHandle,
  mutation: AuthorizedWorkspaceMutation,
): Promise<number> {
  if (snapshot.directories.length === 0 && snapshot.files.length === 0) return 0
  // Every source getFile() has completed. Revalidate only now, immediately before the first
  // destination create, so target drift during any slow source read still yields zero writes.
  await beginAuthorizedWorkspaceMutation(mutation)
  for (const path of snapshot.directories) await ensureDirectory(dstRoot, path)
  for (const { path, file } of snapshot.files) {
    const segments = path.split('/')
    const name = segments.pop()!
    const dst = await ensureDirectory(dstRoot, segments.join('/'))
    const writable = await (await dst.getFileHandle(name, { create: true })).createWritable()
    await writable.write(file)
    await writable.close()
    recordAuthorizedWorkspaceWriteCompleted(mutation, path, file)
  }
  return snapshot.files.length
}

export async function copyDirRecursive(
  src: FileSystemDirectoryHandle,
  target: AuthorizedWorkspaceInput,
  opts: { excludePaths?: readonly string[] } = {},
): Promise<number> {
  const excludes = new Set([...WORKSPACE_IDENTITY_COPY_EXCLUDES, ...(opts.excludePaths ?? [])])
  return withAuthorizedWorkspaceMutation(target, async (mutation) => {
    const snapshot: SourceCopySnapshot = { directories: [], files: [] }
    await collectDirectoryContents(src, '', excludes, snapshot)
    return writeSourceSnapshot(snapshot, authorizedDirectory(mutation), mutation)
  })
}
