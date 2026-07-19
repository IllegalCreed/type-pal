/**
 * cloneFromPal —— 从 pal 种子克隆自包含工程到本地夹(P4)。
 * 逐文件下载→写(流式,单文件在内存,207MB 不 OOM);素材经 src 绝对透传(种子 httpSource)读。
 * manifest 单独相对化写(assets 指向本地 assets/**),使克隆后经 fsaSource 离线渲染。
 */
import {
  type LoadedManifest,
  type ScriptIndexV1,
  validateAssetCatalog,
  validateMapIndex,
} from '@type-pal/content'
import { decompressGzip, type FileSource } from '@type-pal/reforge'
import { sha256Hex } from './binary-signature.js'
import { writeFile } from './project-io.js'
import {
  enumerateSeedFiles,
  type FileList,
  relativizeManifest,
  scenesDir,
  scriptsDir,
} from './seed.js'

/**
 * catalog 资源必须逐字节复制，record.bytes/sha256 描述的就是落盘字节。
 * 仅历史 `/extracted/**.rle` 属于未闭环 legacy family，保留既有裸字节 workaround；
 * catalog tileset 已退出该路径，绝不能因扩展名被传输层改码。
 */
async function assetBytes(
  seed: FileSource,
  file: import('./seed.js').SeedFile,
): Promise<ArrayBuffer> {
  const reader = file.sourceLane === 'legacy' ? (seed.legacy ?? seed) : seed
  const bytes = await reader.readBytes(file.src)
  if (file.catalogAsset) {
    const meta = file.catalogAsset
    if (bytes.byteLength !== meta.bytes || (await sha256Hex(bytes)) !== meta.sha256)
      throw new Error(`克隆资源 ${meta.id} 的 bytes/sha256 与 catalog 不符`)
    if (meta.kind === 'tileset') {
      const view = new Uint8Array(bytes)
      if (view[0] !== 0x1f || view[1] !== 0x8b)
        throw new Error(`克隆 tileset ${meta.id} 不是 canonical gzip`)
    }
    return bytes
  }
  if (file.sourceLane === 'legacy' && file.rel.endsWith('.rle')) {
    const raw = await decompressGzip(new Blob([bytes]))
    return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer
  }
  return bytes
}

export async function cloneFromPal(
  seed: FileSource,
  dir: FileSystemDirectoryHandle,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const manifest = await seed.readJson<LoadedManifest>('manifest.json')
  const sceneIds = await seed.readJson<string[]>(`${scenesDir(manifest)}index.json`)
  if (!seed.legacy) throw new Error('PAL clone 缺 LegacyAssetAdapter，无法读取 extracted 清单')
  const assetManifest = await seed.legacy.readJson<FileList>('/extracted/asset-manifest.json')
  const scriptDir = scriptsDir(manifest)
  const scriptIndex = scriptDir
    ? await seed.readJson<ScriptIndexV1>(`${scriptDir}index.json`)
    : undefined
  const mapIndex = manifest.content.maps
    ? validateMapIndex(await seed.readJson(manifest.content.maps))
    : undefined
  const catalog = validateAssetCatalog(await seed.readJson(manifest.assets.catalog))
  const files = enumerateSeedFiles(
    manifest,
    sceneIds,
    assetManifest,
    scriptIndex,
    mapIndex,
    catalog,
  )
  const total = files.reduce((s, f) => s + f.size, 0)

  let done = 0
  for (const f of [...files].sort((left, right) => {
    const order = { binary: 0, content: 1, catalog: 2 } as const
    return order[left.commitPhase] - order[right.commitPhase]
  })) {
    const value =
      f.kind === 'json'
        ? await (f.sourceLane === 'legacy' ? seed.legacy! : seed).readJson(f.src)
        : await assetBytes(seed, f)
    await writeFile(dir, f.rel, value)
    done += f.size
    onProgress(done, total)
  }
  // 工程提交点最后写；此前任一素材失败都不会发布指向半批文件的新 manifest。
  await writeFile(dir, 'manifest.json', relativizeManifest(manifest))
}
