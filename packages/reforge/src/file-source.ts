/**
 * FileSource —— 工程「从哪读文件」的抽象(自包含工程地基,project-lifecycle-design §3)。
 * 内容 JSON 与素材二进制统一走它:httpSource(种子/dev)/ fsaSource(本地工程,P3 落)。
 * rel = 相对工程根(如 'manifest.json'、'content/actors.json');以 '/' 开头 = 应用绝对
 * 路径(原样,兼容当前 pal 的 /extracted;P2 自包含后此情形消失)。
 */
export interface FileSource {
  readText(rel: string): Promise<string>
  readJson<T>(rel: string): Promise<T>
  readBytes(rel: string): Promise<ArrayBuffer>
  /** 给 <img>/createImageBitmap 用的可加载 URL(http = 直接 URL;fsa = blob URL,P3)。 */
  urlFor(rel: string): Promise<string>
}

/** 拼接 base 与 rel;rel 以 '/' 开头 = 应用绝对路径,原样返回(忽略 base)。 */
function joinUrl(base: string, rel: string): string {
  if (rel.startsWith('/')) return rel
  return `${base.replace(/\/$/, '')}/${rel}`
}

/** HTTP 文件源(fetch);baseUrl 如 'projects/pal'。用于 dev 与种子下载。 */
export function httpSource(baseUrl: string): FileSource {
  const get = async (rel: string): Promise<Response> => {
    const url = joinUrl(baseUrl, rel)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`httpSource ${url} -> ${res.status}`)
    return res
  }
  return {
    async readText(rel) {
      return (await get(rel)).text()
    },
    async readJson<T>(rel: string) {
      return (await get(rel)).json() as Promise<T>
    },
    async readBytes(rel) {
      return (await get(rel)).arrayBuffer()
    },
    async urlFor(rel) {
      return joinUrl(baseUrl, rel)
    },
  }
}
