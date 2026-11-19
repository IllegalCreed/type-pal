/**
 * HTTP 与本地目录共用只读入口。rel 是相对当前工程根的规范路径；
 * 是否有权引用该文件，由上层资产目录和工程闭包校验决定。
 */
import { validateProjectRelativePath } from '@type-pal/content'
import { PROJECT_SAVE_STATE_PATH } from './project-save-state.js'

export interface FileSource {
  /** A genuinely absent file throws DOMException(name='NotFoundError'); other IO errors propagate. */
  readText(rel: string, signal?: AbortSignal): Promise<string>
  readJson<T>(rel: string, signal?: AbortSignal): Promise<T>
  readBytes(rel: string, signal?: AbortSignal): Promise<ArrayBuffer>
  /** 供资源宿主加载的 URL。HTTP 只拼路径，不确认文件存在；本地源打开文件后生成 blob URL。 */
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
    const res =
      rel === PROJECT_SAVE_STATE_PATH
        ? await fetch(url, { cache: 'no-store', ...(signal ? { signal } : {}) })
        : signal
          ? await fetch(url, { signal })
          : await fetch(url)
    if (res.status === 404) throw new DOMException(`httpSource ${url} -> 404`, 'NotFoundError')
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
