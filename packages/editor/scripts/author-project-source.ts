/** Node read-only FileSource: canonical project paths and realpath containment on every read. */
import { lstat, readFile, realpath, stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { validateProjectRelativePath } from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge/author-io'

export async function authorProjectSource(directory: string): Promise<FileSource> {
  const root = await realpath(directory)
  if (!(await stat(root)).isDirectory()) throw new Error(`工程根不是目录：${directory}`)
  const containedPath = async (rel: string): Promise<string> => {
    validateProjectRelativePath(rel, '作者工程读取路径')
    let path = root
    for (const segment of rel.split('/')) {
      const candidate = resolve(path, segment)
      const entry = await lstat(candidate)
      try {
        path = await realpath(candidate)
      } catch (cause) {
        // A dangling symlink is an existing, unverifiable entry, not optional missing metadata.
        if (entry.isSymbolicLink()) throw new Error(`作者工程符号链接无法验证：${rel}`, { cause })
        throw cause
      }
      const inside = relative(root, path)
      if (inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside))
        throw new Error(`作者工程路径逃逸：${rel}`)
    }
    return path
  }
  const missingOnly = async <T>(rel: string, read: () => Promise<T>): Promise<T> => {
    try {
      return await read()
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        throw new DOMException(`作者工程文件缺失：${rel}`, 'NotFoundError')
      throw error
    }
  }
  const source: FileSource = {
    async readText(rel, signal) {
      return missingOnly(rel, async () =>
        readFile(await containedPath(rel), { encoding: 'utf8', signal }),
      )
    },
    async readJson<T>(rel: string, signal?: AbortSignal): Promise<T> {
      return JSON.parse(await source.readText(rel, signal)) as T
    },
    async readBytes(rel, signal) {
      return missingOnly(
        rel,
        async () => Uint8Array.from(await readFile(await containedPath(rel), { signal })).buffer,
      )
    },
    async urlFor(rel) {
      return missingOnly(rel, async () => pathToFileURL(await containedPath(rel)).href)
    },
  }
  return source
}
