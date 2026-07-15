/**
 * fsaSource —— FileSource 经 File System Access 目录句柄读(本地工程,离线自包含)。
 * rel 恒为工程内相对(无 /extracted 绝对);逐段 getDirectoryHandle → getFileHandle → getFile。
 * urlFor 产 blob URL —— 一次性解码类调用方须在解码后 revokeObjectURL(design §3;缓存层管理)。
 */
import { validateProjectRelativePath } from '@type-pal/content'
import { type FileSource, projectRelativeLegacyAdapter } from './file-source.js'

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('file read aborted', 'AbortError')
}

async function fileOf(
  dir: FileSystemDirectoryHandle,
  rel: string,
  signal?: AbortSignal,
): Promise<File> {
  throwIfAborted(signal)
  validateProjectRelativePath(rel, 'fsaSource 路径')
  const parts = rel.split('/')
  const name = parts.pop()
  if (!name) throw new Error(`fsaSource: 空路径 "${rel}"`)
  let d = dir
  for (const p of parts) {
    d = await d.getDirectoryHandle(p)
    throwIfAborted(signal)
  }
  const handle = await d.getFileHandle(name)
  throwIfAborted(signal)
  const file = await handle.getFile()
  throwIfAborted(signal)
  return file
}

export function fsaSource(dir: FileSystemDirectoryHandle): FileSource {
  const urls = new Map<string, string>()
  const source: FileSource = {
    async readText(rel, signal) {
      const text = await (await fileOf(dir, rel, signal)).text()
      throwIfAborted(signal)
      return text
    },
    async readJson<T>(rel: string, signal?: AbortSignal) {
      const text = await (await fileOf(dir, rel, signal)).text()
      throwIfAborted(signal)
      return JSON.parse(text) as T
    },
    async readBytes(rel, signal) {
      const bytes = await (await fileOf(dir, rel, signal)).arrayBuffer()
      throwIfAborted(signal)
      return bytes
    },
    async urlFor(rel) {
      const existing = urls.get(rel)
      if (existing) return existing
      const url = URL.createObjectURL(await fileOf(dir, rel))
      urls.set(rel, url)
      return url
    },
    dispose() {
      for (const url of urls.values()) URL.revokeObjectURL(url)
      urls.clear()
    },
  }
  source.legacy = projectRelativeLegacyAdapter(source)
  return source
}
