/**
 * cloneFromPal —— 从 pal 种子克隆自包含工程到本地夹(P4)。
 * 逐文件下载→写(流式,单文件在内存,207MB 不 OOM);素材经 src 绝对透传(种子 httpSource)读。
 * manifest 单独相对化写(assets 指向本地 assets/**),使克隆后经 fsaSource 离线渲染。
 */
import { type CurrentManifest, validateAssetCatalog, validateMapIndex } from '@type-pal/content'
import { decodeBattleSpriteAssetBytes, type FileSource } from '@type-pal/reforge'
import { sha256Hex } from './binary-signature.js'
import { writeFile } from './project-io.js'
import { enumerateSeedFiles, relativizeManifest, scenesDir } from './seed.js'
import {
  type AuthorizedWorkspaceInput,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

/**
 * catalog 资源必须逐字节复制，record.bytes/sha256 描述的就是落盘字节。
 * 所有二进制都由 catalog 闭包精确复制，不能因扩展名被传输层改码。
 */
async function assetBytes(
  seed: FileSource,
  file: import('./seed.js').SeedFile,
): Promise<ArrayBuffer> {
  const bytes = await seed.readBytes(file.src)
  if (file.catalogAsset) {
    const meta = file.catalogAsset
    if (bytes.byteLength !== meta.bytes || (await sha256Hex(bytes)) !== meta.sha256)
      throw new Error(`克隆资源 ${meta.id} 的 bytes/sha256 与 catalog 不符`)
    if (meta.kind === 'tileset' || meta.kind === 'battle-sprite') {
      const view = new Uint8Array(bytes)
      if (view[0] !== 0x1f || view[1] !== 0x8b)
        throw new Error(`克隆 ${meta.kind} ${meta.id} 不是 canonical gzip`)
    }
    if (meta.kind === 'battle-sprite')
      await decodeBattleSpriteAssetBytes(meta.record, bytes, `克隆 battle-sprite ${meta.id}`)
    return bytes
  }
  return bytes
}

export async function cloneFromPal(
  seed: FileSource,
  target: AuthorizedWorkspaceInput,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const manifest = await seed.readJson<CurrentManifest>('manifest.json')
  const sceneIds = await seed.readJson<string[]>(`${scenesDir(manifest)}index.json`)
  const mapIndex = manifest.content.maps
    ? validateMapIndex(await seed.readJson(manifest.content.maps))
    : undefined
  const catalog = validateAssetCatalog(await seed.readJson(manifest.assets.catalog))
  const files = enumerateSeedFiles(manifest, sceneIds, mapIndex, catalog)
  const total = files.reduce((s, f) => s + f.size, 0)

  await withAuthorizedWorkspaceMutation(target, async (mutation) => {
    let done = 0
    for (const f of [...files].sort((left, right) => {
      const order = { binary: 0, content: 1, catalog: 2 } as const
      return order[left.commitPhase] - order[right.commitPhase]
    })) {
      const value = f.kind === 'json' ? await seed.readJson(f.src) : await assetBytes(seed, f)
      await writeFile(mutation, f.rel, value)
      done += f.size
      onProgress(done, total)
    }
    // 工程提交点最后写；此前任一素材失败都不会发布指向半批文件的新 manifest。
    await writeFile(mutation, 'manifest.json', relativizeManifest(manifest))
  })
}
