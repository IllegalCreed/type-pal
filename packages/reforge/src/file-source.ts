/**
 * FileSource —— 工程「从哪读文件」的抽象(自包含工程地基,project-lifecycle-design §3)。
 * 内容 JSON 与素材二进制统一走它:httpSource(种子/dev)/ fsaSource(本地工程,P3 落)。
 * rel = 当前工程根下的规范相对路径；所有内容和资源都必须位于工程闭包内。
 */
import { validateProjectRelativePath } from '@type-pal/content'

export interface FileSource {
  readText(rel: string, signal?: AbortSignal): Promise<string>
  readJson<T>(rel: string, signal?: AbortSignal): Promise<T>
  readBytes(rel: string, signal?: AbortSignal): Promise<ArrayBuffer>
  /** 给 <img>/createImageBitmap 用的可加载 URL(http = 直接 URL;fsa = blob URL,P3)。 */
  urlFor(rel: string): Promise<string>
  /** 释放本 source 创建的 object URL。HTTP source 为 no-op。 */
  dispose?(): void
}

function joinUrl(base: string, rel: string): string {
  validateProjectRelativePath(rel, 'FileSource 路径')
  return `${base.replace(/\/$/, '')}/${rel}`
}

/** HTTP 文件源(fetch);baseUrl 如 'projects/pal'。用于 dev 与种子下载。 */
export function httpSource(baseUrl: string): FileSource {
  const get = async (rel: string, signal?: AbortSignal): Promise<Response> => {
    const url = joinUrl(baseUrl, rel)
    const res = signal ? await fetch(url, { signal }) : await fetch(url)
    if (!res.ok) throw new Error(`httpSource ${url} -> ${res.status}`)
    return res
  }
  const source: FileSource = {
    async readText(rel, signal) {
      return (await get(rel, signal)).text()
    },
    async readJson<T>(rel: string, signal?: AbortSignal) {
      return (await get(rel, signal)).json() as Promise<T>
    },
    async readBytes(rel, signal) {
      return (await get(rel, signal)).arrayBuffer()
    },
    async urlFor(rel) {
      return joinUrl(baseUrl, rel)
    },
  }
  return source
}
