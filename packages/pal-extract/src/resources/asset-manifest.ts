import { createHash } from 'node:crypto'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export interface AssetEntry {
  /** 相对 extracted 根的 POSIX 路径(运行时拼成 /extracted/<path>)。 */
  path: string
  size: number
}

export interface AssetManifest {
  version: string
  totalBytes: number
  fileCount: number
  files: AssetEntry[]
}

const SELF = 'asset-manifest.json'

/** 非游戏资源、不该进清单的文件:清单自身(避免自指)+ 任意目录下的 macOS .DS_Store
 *  (deploy.sh rsync/tar 同样 --exclude,服务器上不存在;且其频繁改写不应污染 version)。 */
function isAsset(path: string): boolean {
  if (path === SELF) return false
  return path.slice(path.lastIndexOf('/') + 1) !== '.DS_Store'
}

/** 纯函数:把文件项聚合成清单。排除非资源文件;按 path 排序保证 version 稳定。 */
export function buildManifest(entries: AssetEntry[]): AssetManifest {
  const files = entries
    .filter((e) => isAsset(e.path))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const hash = createHash('sha256')
  let totalBytes = 0
  for (const f of files) {
    hash.update(`${f.path}:${f.size}\n`)
    totalBytes += f.size
  }
  return { version: hash.digest('hex').slice(0, 16), totalBytes, fileCount: files.length, files }
}

/** 递归遍历 extracted 根,收集所有文件(相对路径 + 字节)。 */
export function collectAssetEntries(rootDir: string): AssetEntry[] {
  const out: AssetEntry[] = []
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      const st = statSync(full)
      if (st.isDirectory()) walk(full)
      else out.push({ path: relative(rootDir, full).split('\\').join('/'), size: st.size })
    }
  }
  walk(rootDir)
  return out
}
