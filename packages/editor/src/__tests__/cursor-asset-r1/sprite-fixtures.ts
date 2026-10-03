/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 精灵资产夹具：blank 项目内注入真实 gzip+RLE 精灵字节与用途定义，
 * 经正式 loader 自证可保存。只被本卡 *.cursor-r1.test.ts(x) 导入。
 */
import type { AssetId, AssetRecordV1, SpriteDef, SpriteLayout } from '@type-pal/content'
import {
  type AssetBase,
  compressGzip,
  encodeSpriteChunk,
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
  quantizeToRleFrame,
  type RleFrame,
} from '@type-pal/reforge'
import { memoryAuthorDirectory } from '../../core/__tests__/author-save-fixture.js'
import { sha256Hex } from '../../core/binary-signature.js'
import type { EditorState } from '../../core/edit-session.js'
import { assertProjectSaveValid } from '../../core/project-diagnostics.js'
import { toEditorState } from '../../core/project-io.js'
import { buildBlankProject } from '../../core/seed.js'
import { buildSeedAssets } from '../../core/seed-assets.js'

export interface CursorSpriteSpec {
  asset: AssetId
  label: string
  frameCount: number
  /** 写入 catalog 合法但 gzip/RLE 不可解码的字节（测真实失败链）。 */
  corruptBytes?: boolean
  definitions: readonly {
    id: string
    label: string
    layout: SpriteLayout
    poses?: SpriteDef['poses']
  }[]
}

export interface CursorSeededSprite {
  asset: AssetId
  path: string
  sha256: string
  bytes: ArrayBuffer
  frames: RleFrame[]
}

export interface CursorSpriteProject {
  source: FileSource
  state: EditorState
  assetBase: AssetBase
  disk: ReturnType<typeof memoryAuthorDirectory>
  seeded: ReadonlyMap<AssetId, CursorSeededSprite>
}

const FRAME = 8

/** 互异不透明色板，量化后仍可区分。 */
function atlasColors(count: number): [number, number, number, number][] {
  const base: [number, number, number][] = [
    [216, 32, 32],
    [32, 200, 64],
    [32, 64, 216],
    [224, 208, 32],
    [192, 32, 192],
    [32, 200, 200],
    [128, 128, 128],
    [255, 128, 0],
    [96, 48, 160],
    [0, 96, 48],
    [240, 144, 160],
    [48, 144, 240],
    [160, 160, 96],
    [96, 240, 144],
    [144, 96, 240],
    [64, 64, 64],
  ]
  if (count > base.length) throw new Error(`atlasColors 最多 ${base.length} 色`)
  return base.slice(0, count).map(([r, g, b]) => [r, g, b, 255])
}

function solidRgba(
  width: number,
  height: number,
  color: readonly [number, number, number, number],
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4)
  for (let at = 0; at < rgba.byteLength; at += 4) {
    rgba[at] = color[0]
    rgba[at + 1] = color[1]
    rgba[at + 2] = color[2]
    rgba[at + 3] = color[3]
  }
  return rgba
}

export async function loadCursorSpriteProject(
  name: string,
  specs: readonly CursorSpriteSpec[],
): Promise<CursorSpriteProject> {
  const { palette } = await buildSeedAssets()
  const files = await buildBlankProject(name)
  const spritesJson = files['content/sprites.json'] as SpriteDef[]
  const catalog = (files['assets/index.json'] as { assets: Record<AssetId, AssetRecordV1> }).assets
  const seeded = new Map<AssetId, CursorSeededSprite>()
  for (const spec of specs) {
    if (catalog[spec.asset])
      throw new Error(`cursor-asset-r1 fixture: AssetId 与 blank 项目冲突 ${spec.asset}`)
    const frames = atlasColors(spec.frameCount).map((color) =>
      quantizeToRleFrame(solidRgba(FRAME, FRAME, color), FRAME, FRAME, palette),
    )
    const gzip = await compressGzip(encodeSpriteChunk(frames))
    const bytes = spec.corruptBytes
      ? new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]).buffer
      : (gzip.buffer.slice(gzip.byteOffset, gzip.byteOffset + gzip.byteLength) as ArrayBuffer)
    const sha256 = await sha256Hex(bytes)
    const path = `assets/authored/sprites/${sha256}.rle`
    const record: AssetRecordV1 = {
      kind: 'sprite',
      path,
      mediaType: 'application/vnd.type-pal.rle',
      bytes: bytes.byteLength,
      sha256,
      label: spec.label,
      origin: { kind: 'authored' },
    }
    catalog[spec.asset] = record
    files[path] = bytes
    for (const definition of spec.definitions)
      spritesJson.push({
        id: definition.id,
        asset: spec.asset,
        label: definition.label,
        layout: definition.layout,
        ...(definition.poses ? { poses: definition.poses } : {}),
      })
    seeded.set(spec.asset, { asset: spec.asset, path, sha256, bytes, frames })
  }
  const disk = memoryAuthorDirectory(files)
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadAllProjectMaps(project)
  const state = toEditorState(project, scenes, maps, {}, [])
  assertProjectSaveValid(state)
  return { source, state, assetBase: project.assetBase, disk, seeded }
}
