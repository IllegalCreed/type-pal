/**
 * 工程导出 zip(A5)。工程自包含铁律 → 导出 = 把工程文件夹**原样**打包(递归全收,
 * 不挑不滤 —— 文件夹就是全部世界),分享/备份即这一个 zip。读磁盘:未保存改动不入包。
 */

import { validateAssetCatalog } from '@type-pal/content'
import { sha256Hex } from './binary-signature.js'
import { buildZip, type ZipEntry } from './zip.js'

export async function validateProjectZipEntries(entries: readonly ZipEntry[]): Promise<void> {
  const byPath = new Map(entries.map((entry) => [entry.path, entry.data]))
  const manifestBytes = byPath.get('manifest.json')
  if (!manifestBytes) throw new Error('工程缺 manifest.json')
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as {
    assets?: { catalog?: string; legacy?: { families?: unknown } }
  }
  const catalogPath = manifest.assets?.catalog
  if (!catalogPath) throw new Error('工程 manifest 缺 assets.catalog')
  const catalogBytes = byPath.get(catalogPath)
  if (!catalogBytes) throw new Error(`工程缺 ${catalogPath}`)
  const catalog = validateAssetCatalog(JSON.parse(new TextDecoder().decode(catalogBytes)))
  for (const [id, record] of Object.entries(catalog.assets)) {
    const bytes = byPath.get(record.path)
    if (!bytes) throw new Error(`ZIP 资源缺失: ${id} -> ${record.path}`)
    if (bytes.byteLength !== record.bytes || (await sha256Hex(bytes)) !== record.sha256)
      throw new Error(`ZIP 资源 bytes/sha256 不符: ${id}`)
    if (record.kind === 'tileset') {
      if (
        record.mediaType !== 'application/vnd.type-pal.rle' ||
        bytes[0] !== 0x1f ||
        bytes[1] !== 0x8b
      )
        throw new Error(`ZIP tileset 非 canonical gzip: ${id}`)
    }
  }
  const legacyFamilies = manifest.assets?.legacy?.families
  if (
    (!Array.isArray(legacyFamilies) || !legacyFamilies.includes('tileset')) &&
    entries.some((entry) => entry.path.startsWith('assets/extracted/data/tileset/'))
  )
    throw new Error('ZIP 含已退役的 extracted tileset 副本')
}

/** 递归收集 FSA 目录全部文件(路径正斜杠,相对工程根)。 */
export async function collectProjectZipEntries(
  dir: FileSystemDirectoryHandle,
  prefix = '',
): Promise<ZipEntry[]> {
  const out: ZipEntry[] = []
  // entries() 是 FSA 标准异步迭代器(TS lib 未收录 → 局部窄化)
  const iter = (
    dir as unknown as {
      entries(): AsyncIterable<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>
    }
  ).entries()
  for await (const [name, handle] of iter) {
    if (handle.kind === 'file') {
      const file = await (handle as FileSystemFileHandle).getFile()
      out.push({ path: `${prefix}${name}`, data: new Uint8Array(await file.arrayBuffer()) })
    } else {
      out.push(
        ...(await collectProjectZipEntries(
          handle as FileSystemDirectoryHandle,
          `${prefix}${name}/`,
        )),
      )
    }
  }
  return out
}

/** 打包工程目录 → 触发浏览器下载 <projectId>.zip。返回条目数(UI 提示用)。 */
export async function exportProjectZip(
  dir: FileSystemDirectoryHandle,
  projectId: string,
): Promise<number> {
  const entries = await collectProjectZipEntries(dir)
  if (entries.length === 0) throw new Error('工程文件夹是空的')
  await validateProjectZipEntries(entries)
  const zip = await buildZip(entries)
  const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectId}.zip`
  a.click()
  URL.revokeObjectURL(url)
  return entries.length
}
