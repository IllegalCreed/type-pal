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
import { writeFile } from './project-io.js'
import {
  enumerateSeedFiles,
  type FileList,
  relativizeManifest,
  scenesDir,
  scriptsDir,
} from './seed.js'

/**
 * 素材字节:.rle 是 gzip 压缩(1f8b)—— Chrome(尤其增强保护)会把 gzip 当压缩包**深扫下载**
 * 并批量拦截("Blocked by Safe Browsing")。下载后**解压写原始字节**去掉 gzip 头,Chrome 不再当
 * 压缩包扫;加载器 decompressGzip 对"无 gzip 头"直接透传,零副作用。其余(png/mid/wav/mp4/json)
 * 是 Chrome 认得的良性类型、不深扫,原样写。
 */
async function assetBytes(seed: FileSource, src: string, rel: string): Promise<ArrayBuffer> {
  const buf = await seed.readBytes(src)
  if (!rel.endsWith('.rle')) return buf
  const u8 = await decompressGzip(new Blob([buf]))
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
}

export async function cloneFromPal(
  seed: FileSource,
  dir: FileSystemDirectoryHandle,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const manifest = await seed.readJson<LoadedManifest>('manifest.json')
  const sceneIds = await seed.readJson<string[]>(`${scenesDir(manifest)}index.json`)
  const assetManifest = await seed.readJson<FileList>('/extracted/asset-manifest.json')
  const bakedManifest = await seed.readJson<FileList>('/baked/baked-manifest.json')
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
    bakedManifest,
    scriptIndex,
    mapIndex,
    catalog,
  )
  const total = files.reduce((s, f) => s + f.size, 0)

  // 相对化 manifest 单独写(assets 指向本地 assets/**)
  await writeFile(dir, 'manifest.json', relativizeManifest(manifest))

  let done = 0
  for (const f of files) {
    const value =
      f.kind === 'json' ? await seed.readJson(f.src) : await assetBytes(seed, f.src, f.rel)
    await writeFile(dir, f.rel, value)
    done += f.size
    onProgress(done, total)
  }
}
