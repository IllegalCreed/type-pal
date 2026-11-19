/** Clone the current PAL seed through an authorized workspace save. */
import {
  type CurrentManifest,
  validateAssetCatalog,
  validateMapIndex,
  validateSceneIndex,
} from '@type-pal/content'
import { decodeBattleSpriteAssetBytes, type FileSource } from '@type-pal/reforge'
import {
  assertBattleSimulatorPathAvailable,
  BATTLE_SIMULATOR_PATH,
  loadBattleSimulatorDocument,
} from './battle-simulator-library.js'
import { sha256Hex } from './binary-signature.js'
import { observeProjectCopySource } from './project-copy-source.js'
import { type ProjectCopyInput, type ProjectWriteResult, writeProject } from './project-io.js'
import {
  assertScriptPreviewPathAvailable,
  loadScriptPreviewDocument,
  SCRIPT_PREVIEW_PATH,
} from './script-preview-library.js'
import { enumerateSeedFiles, relativizeManifest, type SeedFile, scenesDir } from './seed.js'
import {
  type AuthorizedWorkspaceInput,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

export type CloneProgress = (done: number, total: number, phase: 'preparing' | 'writing') => void

/** A catalog signature describes the exact bytes published by the copy. */
async function readSeedBytes(seed: FileSource, file: SeedFile): Promise<ArrayBuffer> {
  const bytes = await seed.readBytes(file.src)
  const meta = file.catalogAsset
  if (!meta) return bytes
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
  if (!mapIndex) throw new Error('克隆项目缺少当前地图索引')
  assertBattleSimulatorPathAvailable({ manifest, mapIndex, sceneIndex, assetCatalog: catalog })
  assertScriptPreviewPathAvailable({ manifest, mapIndex, sceneIndex, assetCatalog: catalog })
  const simulator = await loadBattleSimulatorDocument(source)
  const preview = await loadScriptPreviewDocument(source)
  const files = enumerateSeedFiles(manifest, sceneIndex, mapIndex, catalog)
  const total =
    files.reduce((s, f) => s + f.size, 0) +
    (simulator?.bytes.byteLength ?? 0) +
    (preview?.bytes.byteLength ?? 0)
  onProgress(0, total, 'preparing')

  return withAuthorizedWorkspaceMutation(target, async (mutation) => {
    let done = 0
    const reportPrepared = (size: number) => {
      done += size
      // The writer reports completion only after the target is committed.
      if (done < total) onProgress(done, total, 'preparing')
    }
    const preparedDocument = (path: string, bytes: ArrayBuffer): ProjectCopyInput => ({
      path,
      read: async () => {
        reportPrepared(bytes.byteLength)
        return new Blob([bytes])
      },
    })
    return await writeProject(
      mutation,
      {
        'manifest.json': relativizeManifest(manifest),
        [manifest.assets.catalog]: catalog,
      },
      {
        copies: [
          ...(preview ? [preparedDocument(SCRIPT_PREVIEW_PATH, preview.bytes)] : []),
          ...files.map((file) => ({
            path: file.rel,
            read: async () => {
              const bytes = await readSeedBytes(source, file)
              reportPrepared(file.size)
              return new Blob([bytes])
            },
          })),
          ...(simulator ? [preparedDocument(BATTLE_SIMULATOR_PATH, simulator.bytes)] : []),
        ],
        verifySource: observed.verify,
        onProgress: ({ completed, total }) => onProgress(completed, total, 'writing'),
      },
    )
  })
}
