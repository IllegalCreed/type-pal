/** Real gzip RLE and PCM16 resources registered under the preview's catalog and roles. */
import {
  type AssetCatalogV1,
  type AssetId,
  CONTENT_VERSION,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
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
import { sha256Hex } from '../core/binary-signature.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { encodeWavPcm16 } from './audio-fixtures.js'

interface FireEffectFixture {
  base: AssetBase
  reader: EditorAssetReader
  catalog: AssetCatalogV1
  chunk: number
  soundAsset?: AssetId
}

export async function createFireEffectFixture(input: {
  projectId: string
  chunk: number
  frames: readonly { paletteIndex: number; size?: number }[]
  soundSamples?: readonly number[]
  beforeRead?: (path: string) => Promise<void>
}): Promise<FireEffectFixture> {
  const { projectId, chunk } = input
  if (!input.frames.length) throw new Error('FIRE fixture needs at least one frame')
  const paletteAsset = 'color.preview-fire'
  const fireAsset = palMagicEffectSpriteAssetId(chunk)
  const firePath = `assets/authored/preview/fire-${chunk}.rle`
  const palettePath = 'assets/authored/preview/standard-palette.json'
  const palette: Palette = {
    colors: Array.from({ length: 256 }, (_, index) => {
      const hues: [number, number, number][] = [
        [240, 40, 40],
        [40, 200, 60],
        [40, 80, 220],
        [230, 200, 40],
        [180, 40, 200],
      ]
      const [r, g, b] = hues[index % hues.length]!
      return [r, g, b]
    }),
    cycles: [],
  }
  const frames = input.frames.map(({ paletteIndex, size = 16 }) => ({
    width: size,
    height: size,
    pixels: new Uint8Array(size * size).fill(paletteIndex),
    opaque: new Uint8Array(size * size).fill(1),
  }))
  const fireBytes = Uint8Array.from(await compressGzip(encodeSpriteChunk(frames))).buffer
  const paletteBytes = new TextEncoder().encode(JSON.stringify(palette)).buffer
  const catalog: AssetCatalogV1 = { version: 1, assets: {} }
  const files = new Map<string, ArrayBuffer>()
  const install = async (
    asset: AssetId,
    path: string,
    kind: 'effect-sprite' | 'color-table' | 'sound',
    mediaType: string,
    bytes: ArrayBuffer,
  ) => {
    catalog.assets[asset] = {
      kind,
      path,
      mediaType,
      bytes: bytes.byteLength,
      sha256: await sha256Hex(bytes),
      origin: { kind: 'authored' },
    }
    files.set(path, bytes)
  }
  await install(fireAsset, firePath, 'effect-sprite', 'application/vnd.type-pal.rle', fireBytes)
  await install(paletteAsset, palettePath, 'color-table', 'application/json', paletteBytes)
  const soundAsset = input.soundSamples ? 'sound.preview-fire' : undefined
  if (soundAsset && input.soundSamples)
    await install(
      soundAsset,
      'assets/authored/preview/fire.wav',
      'sound',
      'audio/wav',
      Uint8Array.from(encodeWavPcm16(input.soundSamples)).buffer,
    )
  validateAssetCatalog(catalog)
  const roles = { 'visual.standardColorTable': paletteAsset } as const
  const assets = { catalog: 'assets/index.json', roles }
  validateManifestAssetConfig(assets, catalog)
  files.set('assets/index.json', new TextEncoder().encode(JSON.stringify(catalog)).buffer)
  const readBytes = async (path: string) => {
    const bytes = files.get(path)?.slice(0)
    if (!bytes) throw new DOMException(path, 'NotFoundError')
    await input.beforeRead?.(path)
    return bytes
  }
  const source: FileSource = {
    readBytes,
    readText: async (path) => new TextDecoder().decode(await readBytes(path)),
    readJson: async <T>(path: string) =>
      JSON.parse(new TextDecoder().decode(await readBytes(path))) as T,
    async urlFor() {
      throw new Error('Fire preview fixture provides local bytes only')
    },
  }
  const manifest: CurrentManifest = {
    id: projectId,
    name: projectId,
    contentVersion: CONTENT_VERSION,
    minimumSaveVersion: CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
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
  return {
    base,
    reader,
    catalog,
    chunk,
    soundAsset,
  }
}
