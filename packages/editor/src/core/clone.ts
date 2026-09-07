/**
 * cloneFromPal —— 从 pal 种子克隆自包含项目到本地夹(P4)。
 * 逐文件下载→私有暂存→完整校验后提交，单文件流转，不把全部资源留在内存。
 * manifest 单独相对化写(assets 指向本地 assets/**),使克隆后经 fsaSource 离线渲染。
 */
import {
  type CurrentManifest,
  validateAssetCatalog,
  validateMapIndex,
  validateSceneIndex,
} from '@type-pal/content'
import { decodeBattleSpriteAssetBytes, type FileSource } from '@type-pal/reforge'
import { sha256Hex } from './binary-signature.js'
import { observeProjectCopySource } from './project-copy-source.js'
import { type ProjectWriteResult, writeProject } from './project-io.js'
import { enumerateSeedFiles, relativizeManifest, scenesDir } from './seed.js'
import {
  type AuthorizedWorkspaceInput,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

export type CloneProgress = (done: number, total: number, phase: 'preparing' | 'writing') => void

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
  onProgress: CloneProgress,
): Promise<ProjectWriteResult> {
  const observed = await observeProjectCopySource(seed)
  const source = observed.source
  const manifest = await source.readJson<CurrentManifest>('manifest.json')
  const sceneIndexPath = `${scenesDir(manifest)}index.json`
  const sceneIndex = validateSceneIndex(await source.readJson(sceneIndexPath), sceneIndexPath)
  const mapIndex = manifest.content.maps
    ? validateMapIndex(await source.readJson(manifest.content.maps))
    : undefined
  const catalog = validateAssetCatalog(await source.readJson(manifest.assets.catalog))
  const files = enumerateSeedFiles(manifest, sceneIndex, mapIndex, catalog)
  const total = files.reduce((s, f) => s + f.size, 0)
  onProgress(0, total, 'preparing')

  return withAuthorizedWorkspaceMutation(target, async (mutation) => {
    let done = 0
    const result = await writeProject(
      mutation,
      {
        'manifest.json': relativizeManifest(manifest),
        [manifest.assets.catalog]: catalog,
      },
      {
        copies: files.map((file) => ({
          path: file.rel,
          read: async () => {
            const bytes = await assetBytes(source, file)
            done += file.size
            if (done < total) onProgress(done, total, 'preparing')
            return new Blob([bytes])
          },
        })),
        verifySource: observed.verify,
        onProgress: ({ completed, total }) => onProgress(completed, total, 'writing'),
      },
    )
    return result
  })
}
