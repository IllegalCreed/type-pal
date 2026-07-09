/**
 * cloneFromPal —— 从 pal 种子克隆自包含工程到本地夹(P4)。
 * 逐文件下载→写(流式,单文件在内存,207MB 不 OOM);素材经 src 绝对透传(种子 httpSource)读。
 * manifest 单独相对化写(assets 指向本地 assets/**),使克隆后经 fsaSource 离线渲染。
 */
import type { LoadedManifest } from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge'
import { writeFile } from './project-io.js'
import { enumerateSeedFiles, type FileList, relativizeManifest, scenesDir } from './seed.js'

export async function cloneFromPal(
  seed: FileSource,
  dir: FileSystemDirectoryHandle,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const manifest = await seed.readJson<LoadedManifest>('manifest.json')
  const sceneIds = await seed.readJson<string[]>(`${scenesDir(manifest)}index.json`)
  const assetManifest = await seed.readJson<FileList>('/extracted/asset-manifest.json')
  const bakedManifest = await seed.readJson<FileList>('/baked/baked-manifest.json')
  const files = enumerateSeedFiles(manifest, sceneIds, assetManifest, bakedManifest)
  const total = files.reduce((s, f) => s + f.size, 0)

  // 相对化 manifest 单独写(assets 指向本地 assets/**)
  await writeFile(dir, 'manifest.json', relativizeManifest(manifest))

  let done = 0
  for (const f of files) {
    const value = f.kind === 'json' ? await seed.readJson(f.src) : await seed.readBytes(f.src)
    await writeFile(dir, f.rel, value)
    done += f.size
    onProgress(done, total)
  }
}
