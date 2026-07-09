/**
 * fsaSource —— FileSource 经 File System Access 目录句柄读(本地工程,离线自包含)。
 * rel 恒为工程内相对(无 /extracted 绝对);逐段 getDirectoryHandle → getFileHandle → getFile。
 * urlFor 产 blob URL —— 一次性解码类调用方须在解码后 revokeObjectURL(design §3;缓存层管理)。
 */
import type { FileSource } from './file-source.js'

async function fileOf(dir: FileSystemDirectoryHandle, rel: string): Promise<File> {
  const parts = rel.split('/').filter(Boolean)
  const name = parts.pop()
  if (!name) throw new Error(`fsaSource: 空路径 "${rel}"`)
  let d = dir
  for (const p of parts) d = await d.getDirectoryHandle(p)
  return (await d.getFileHandle(name)).getFile()
}

export function fsaSource(dir: FileSystemDirectoryHandle): FileSource {
  return {
    async readText(rel) {
      return (await fileOf(dir, rel)).text()
    },
    async readJson<T>(rel: string) {
      return JSON.parse(await (await fileOf(dir, rel)).text()) as T
    },
    async readBytes(rel) {
      return (await fileOf(dir, rel)).arrayBuffer()
    },
    async urlFor(rel) {
      return URL.createObjectURL(await fileOf(dir, rel))
    },
  }
}
