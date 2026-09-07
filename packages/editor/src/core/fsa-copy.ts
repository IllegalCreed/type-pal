/**
 * FSA 目录整树递归拷贝(A5 债修:「另存为」曾只写 serialize 文件集 —— 克隆项目磁盘上的
 * 既有素材不在编辑器 state,另存即丢)。另存为 = 先整树拷贝源目录,再覆写内容文件。
 */

import type { FileSource } from '@type-pal/reforge'
import type { ProjectCopyInput } from './project-io.js'
import { isWorkspaceIdentityPath } from './workspace-context.js'
/** src 全部文件/子目录递归拷进 dst(同名覆盖,他文件保留)。返回拷贝文件数。 */
import {
  type AuthorizedWorkspaceInput,
  type AuthorizedWorkspaceMutation,
  authorizedDirectory,
  beginAuthorizedWorkspaceMutation,
  planAuthorizedWorkspacePaths,
  recordAuthorizedWorkspaceWriteCompleted,
  WORKSPACE_IDENTITY_COPY_EXCLUDES,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

interface SourceCopySnapshot {
  directories: string[]
  files: Array<{ path: string; file: File }>
}

/** Read-only copy inventory. The save coordinator stages each read before publishing any file. */
export async function readDirectoryCopy(src: FileSystemDirectoryHandle, source: FileSource) {
  const inventory = async () => {
    const directories: string[] = [],
      files: string[] = []
    const visit = async (dir: FileSystemDirectoryHandle, prefix: string) => {
      const iterator = (
        dir as unknown as {
          entries(): AsyncIterable<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>
        }
      ).entries()
      for await (const [name, handle] of iterator) {
        const path = `${prefix}${name}`
        if (isWorkspaceIdentityPath(path)) continue
        if (handle.kind === 'file') files.push(path)
        else {
          directories.push(path)
          await visit(handle as FileSystemDirectoryHandle, `${path}/`)
        }
      }
    }
    await visit(src, '')
    return { directories: directories.sort(), files: files.sort() }
  }
  const before = await inventory()
  return {
    directories: before.directories,
    copies: before.files.map(
      (path): ProjectCopyInput => ({
        path,
        read: async () => new Blob([await source.readBytes(path)]),
      }),
    ),
    async verify() {
      if (JSON.stringify(await inventory()) !== JSON.stringify(before))
        throw new Error('源项目文件清单在复制期间变化，请重新打开后再复制')
    },
  }
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
  await planAuthorizedWorkspacePaths(
    mutation,
    snapshot.files.map((file) => file.path),
  )
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
    await recordAuthorizedWorkspaceWriteCompleted(mutation, path, file)
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
