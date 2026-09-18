import {
  type AssetCatalogV1,
  type AssetId,
  type CurrentManifest,
  palMagicEffectSpriteAssetId,
  validateAssetCatalog,
  validateManifestAssetConfig,
} from '@type-pal/content'
import {
  type AssetBase,
  AssetResolver,
  compressGzip,
  encodeSpriteChunk,
  type FileSource,
  type Palette,
} from '@type-pal/reforge'
import { sha256Hex } from '../../core/binary-signature.js'
import { createEditorAssetReader } from '../../core/editor-asset-reader.js'

export function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

/** Reader-level fixture: validated catalog/roles and real gzip RLE bytes, never a fake decoder. */
export async function previewCacheFixture(
  projectId: string,
  chunk: number,
  color: [number, number, number],
) {
  const spriteAsset = 'sprite.preview'
  const fireAsset = palMagicEffectSpriteAssetId(chunk)
  const paletteAsset = 'color.preview'
  const spritePath = 'assets/generated/sprite.rle'
  const firePath = 'assets/generated/fire.rle'
  const palettePath = 'assets/generated/standard.json'
  const palette: Palette = { colors: Array.from({ length: 256 }, () => [...color]), cycles: [] }
  palette.colors[20] = [20, 200, 40]
  const files = new Map<string, ArrayBuffer>()
  const reads = new Map<string, number>()
  const faults = new Set<string>()
  const gates = new Map<
    string,
    { entered: ReturnType<typeof deferred<void>>; release: ReturnType<typeof deferred<void>> }
  >()
  let injected = 0
  const catalog: AssetCatalogV1 = { version: 1, assets: {} }
  const roles = { 'visual.standardColorTable': paletteAsset } as const
  const install = async (
    asset: AssetId,
    path: string,
    kind: 'sprite' | 'effect-sprite' | 'color-table',
    bytes: ArrayBuffer,
  ) => {
    files.set(path, bytes)
    catalog.assets[asset] = {
      kind,
      path,
      mediaType: kind === 'color-table' ? 'application/json' : 'application/vnd.type-pal.rle',
      bytes: bytes.byteLength,
      sha256: await sha256Hex(bytes),
      origin: { kind: 'generated' },
    }
    validateAssetCatalog(catalog)
  }
  const frameBytes = async (pixel: number) => {
    const packed = encodeSpriteChunk([
      {
        width: 16,
        height: 16,
        pixels: new Uint8Array(256).fill(pixel),
        opaque: new Uint8Array(256).fill(1),
      },
    ])
    return Uint8Array.from(await compressGzip(packed)).buffer
  }
  await install(spriteAsset, spritePath, 'sprite', await frameBytes(10))
  await install(fireAsset, firePath, 'effect-sprite', await frameBytes(10))
  await install(
    paletteAsset,
    palettePath,
    'color-table',
    new TextEncoder().encode(JSON.stringify(palette)).buffer,
  )
  const assets = { catalog: 'assets/index.json', roles }
  validateManifestAssetConfig(assets, catalog)
  const readBytes = async (path: string) => {
    reads.set(path, (reads.get(path) ?? 0) + 1)
    if (faults.delete(path)) {
      injected++
      throw new Error(`temporary read failure: ${path}`)
    }
    const bytes = files.get(path)?.slice(0)
    if (!bytes) throw new DOMException(path, 'NotFoundError')
    const gate = gates.get(path)
    if (gate) {
      gate.entered.resolve()
      await gate.release.promise
    }
    return bytes
  }
  const source: FileSource = {
    readBytes,
    readText: async (path) => new TextDecoder().decode(await readBytes(path)),
    readJson: async <T>(path: string) =>
      JSON.parse(new TextDecoder().decode(await readBytes(path))) as T,
    async urlFor() {
      throw new Error('preview fixture forbids URL/network access')
    },
  }
  const manifest: CurrentManifest = {
    id: projectId,
    name: projectId,
    contentVersion: 20,
    minimumSaveVersion: 8,
    defaultEntryId: 'start',
    entryPoints: [
      {
        id: 'start',
        label: 'Start',
        scene: 'start',
        startWorld: { party: [], money: 0, inventory: [] },
      },
    ],
    content: {
      scenes: 'content/scenes/',
      maps: 'content/maps/index.json',
      sharedScripts: 'content/shared-scripts.json',
      worldVariables: 'content/world-variables.json',
    },
    assets,
  }
  const reader = createEditorAssetReader(source, {
    manifest,
    assetCatalog: catalog,
    assetBlobs: {},
  })
  const base: AssetBase = {
    source,
    assetResolver: new AssetResolver(projectId, catalog, roles, source),
  }
  const replacePalette = async (next: [number, number, number]) => {
    palette.colors = Array.from({ length: 256 }, () => [...next])
    await install(
      paletteAsset,
      palettePath,
      'color-table',
      new TextEncoder().encode(JSON.stringify(palette)).buffer,
    )
  }
  return {
    base,
    reader,
    catalog,
    reads,
    faults,
    gates,
    chunk,
    spriteAsset,
    fireAsset,
    spritePath,
    firePath,
    palettePath,
    injected: () => injected,
    revision: () => reader.record(spriteAsset, 'sprite').sha256,
    replacePalette,
    async replaceFire(pixel: number) {
      await install(fireAsset, firePath, 'effect-sprite', await frameBytes(pixel))
    },
  }
}
