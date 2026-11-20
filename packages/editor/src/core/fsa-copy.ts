import type { FileSource } from '@type-pal/reforge'
import type { ProjectCopyInput } from './project-io.js'
import { isWorkspaceIdentityPath } from './workspace-context.js'

/** Enumerate paths without reading bytes. The save coordinator stages the lazy reads. */
export async function readDirectoryCopy(src: FileSystemDirectoryHandle, source: FileSource) {
  const inventory = async () => {
    const directories: string[] = []
    const files: string[] = []
    const visit = async (dir: FileSystemDirectoryHandle, prefix: string) => {
      // The editor DOM types do not include the browser async directory iterator.
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
          await visit(handle, `${path}/`)
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
