/**
 * FileSource —— 工程「从哪读文件」的抽象(自包含工程地基,project-lifecycle-design §3)。
 * 内容 JSON 与素材二进制统一走它:httpSource(种子/dev)/ fsaSource(本地工程,P3 落)。
 * rel = 当前工程根下的规范相对路径。绝对路径只允许走隔离的 LegacyAssetAdapter。
 */
import { validateProjectRelativePath } from '@type-pal/content'

export interface LegacyAssetAdapter {
  readText(path: string, signal?: AbortSignal): Promise<string>
  readJson<T>(path: string, signal?: AbortSignal): Promise<T>
  readBytes(path: string, signal?: AbortSignal): Promise<ArrayBuffer>
  urlFor(path: string): Promise<string>
}

export interface FileSource {
  readText(rel: string, signal?: AbortSignal): Promise<string>
  readJson<T>(rel: string, signal?: AbortSignal): Promise<T>
  readBytes(rel: string, signal?: AbortSignal): Promise<ArrayBuffer>
  /** 给 <img>/createImageBitmap 用的可加载 URL(http = 直接 URL;fsa = blob URL,P3)。 */
  urlFor(rel: string): Promise<string>
  /** contentVersion 3 的旧资源债务区专用；普通内容和 AssetResolver 不得调用。 */
  legacy?: LegacyAssetAdapter
  /** 释放本 source 创建的 object URL。HTTP source 为 no-op。 */
  dispose?(): void
}

/** 测试/内存 source 的默认 legacy 适配器；仅能读工程相对路径。 */
export function projectRelativeLegacyAdapter(source: FileSource): LegacyAssetAdapter {
  return {
    readText: (path, signal) => source.readText(path, signal),
    readJson: <T>(path: string, signal?: AbortSignal) => source.readJson<T>(path, signal),
    readBytes: (path, signal) => source.readBytes(path, signal),
    urlFor: (path) => source.urlFor(path),
  }
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
  const external = async (path: string, signal?: AbortSignal): Promise<Response> => {
    const res = signal ? await fetch(path, { signal }) : await fetch(path)
    if (!res.ok) throw new Error(`LegacyAssetAdapter ${path} -> ${res.status}`)
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
    legacy: {
      async readText(path, signal) {
        return path.startsWith('/')
          ? (await external(path, signal)).text()
          : source.readText(path, signal)
      },
      async readJson<T>(path: string, signal?: AbortSignal) {
        return path.startsWith('/')
          ? ((await external(path, signal)).json() as Promise<T>)
          : source.readJson<T>(path, signal)
      },
      async readBytes(path, signal) {
        return path.startsWith('/')
          ? (await external(path, signal)).arrayBuffer()
          : source.readBytes(path, signal)
      },
      async urlFor(path) {
        return path.startsWith('/') ? path : source.urlFor(path)
      },
    },
  }
  return source
}
