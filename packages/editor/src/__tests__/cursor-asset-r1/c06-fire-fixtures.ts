/**
 * C06 FireEffectPreview 合法 reader/catalog 夹具：真实 gzip RLE 字节，不 mock 解码器。
 */
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
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'

export interface C06FireFixture {
  base: AssetBase
  reader: EditorAssetReader
  chunk: number
  fireAsset: AssetId
  firePath: string
  frameCount: number
  /** 每帧 palette 索引（整帧填充）。 */
  framePixels: readonly number[]
}

export async function loadC06FireFixture(input: {
  projectId: string
  chunk: number
  framePixels: readonly number[]
}): Promise<C06FireFixture> {
  const { projectId, chunk, framePixels } = input
  if (!framePixels.length) throw new Error('framePixels 不能为空')
  const paletteAsset = 'color.c06-fire'
  const fireAsset = palMagicEffectSpriteAssetId(chunk)
  const firePath = `assets/authored/c06/fire-${chunk}.rle`
  const palettePath = 'assets/authored/c06/standard-palette.json'
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
  const frames = framePixels.map((pixel) => ({
    width: 16,
    height: 16,
    pixels: new Uint8Array(256).fill(pixel),
    opaque: new Uint8Array(256).fill(1),
  }))
  const fireBytes = Uint8Array.from(await compressGzip(encodeSpriteChunk(frames))).buffer
  const paletteBytes = new TextEncoder().encode(JSON.stringify(palette)).buffer
  const catalog: AssetCatalogV1 = { version: 1, assets: {} }
  const install = async (
    asset: AssetId,
    path: string,
    kind: 'effect-sprite' | 'color-table',
    bytes: ArrayBuffer,
  ) => {
    catalog.assets[asset] = {
      kind,
      path,
      mediaType: kind === 'color-table' ? 'application/json' : 'application/vnd.type-pal.rle',
      bytes: bytes.byteLength,
      sha256: await sha256Hex(bytes),
      origin: { kind: 'authored' },
    }
    validateAssetCatalog(catalog)
  }
  await install(fireAsset, firePath, 'effect-sprite', fireBytes)
  await install(paletteAsset, palettePath, 'color-table', paletteBytes)
  const roles = { 'visual.standardColorTable': paletteAsset } as const
  const assets = { catalog: 'assets/index.json', roles }
  validateManifestAssetConfig(assets, catalog)
  const files = new Map<string, ArrayBuffer>([
    ['assets/index.json', new TextEncoder().encode(JSON.stringify(catalog)).buffer],
    [firePath, fireBytes],
    [palettePath, paletteBytes],
  ])
  const readBytes = async (path: string) => {
    const bytes = files.get(path)?.slice(0)
    if (!bytes) throw new DOMException(path, 'NotFoundError')
    return bytes
  }
  const source: FileSource = {
    readBytes,
    readText: async (path) => new TextDecoder().decode(await readBytes(path)),
    readJson: async <T>(path: string) =>
      JSON.parse(new TextDecoder().decode(await readBytes(path))) as T,
    async urlFor() {
      throw new Error('c06 fire fixture forbids URL/network access')
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
  return {
    base,
    reader,
    chunk,
    fireAsset,
    firePath,
    frameCount: framePixels.length,
    framePixels,
  }
}

/** 期望 FIRE 帧在预览画布中心附近的不透明 RGB（经标准调色板着色）。 */
export function expectedFireRgb(
  fixture: C06FireFixture,
  frameIndex: number,
): [number, number, number] {
  const pixel = fixture.framePixels[frameIndex]
  if (pixel === undefined) throw new Error(`无第 ${frameIndex} 帧`)
  const palette = [
    [240, 40, 40],
    [40, 200, 60],
    [40, 80, 220],
    [230, 200, 40],
    [180, 40, 200],
  ] as const
  const [r, g, b] = palette[pixel % palette.length]!
  return [r, g, b]
}
