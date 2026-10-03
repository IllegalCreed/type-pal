/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C08：瓦片集/组合模板合法夹具（仅 *.cursor-r1.test 导入）。
 */
import type { AssetId, AssetRecordV1, StampTemplate, TilesetDef } from '@type-pal/content'
import {
  compressGzip,
  encodeSpriteChunk,
  quantizeToRleFrame,
  type RleFrame,
} from '@type-pal/reforge'
import { sha256Hex } from '../../core/binary-signature.js'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader } from '../../core/editor-asset-reader.js'
import { buildSeedAssets } from '../../core/seed-assets.js'
import { AddStampTemplateCommand } from '../../core/stamp-commands.js'
import { AddTilesetCommand } from '../../core/tileset-commands.js'
import type { LegalProject } from './kit.js'
import { loadLegalProject } from './kit.js'

export const C08_TILESET = 'starter'
export const C08_TILESET_ASSET = 'tileset.generated.starter'

export function solidFrame(
  w: number,
  h: number,
  _rgba: [number, number, number, number],
): RleFrame {
  const pixels = new Uint8Array(w * h)
  const opaque = new Uint8Array(w * h)
  pixels.fill(1)
  opaque.fill(255)
  return { width: w, height: h, pixels, opaque }
}

export function solidRgba(
  w: number,
  h: number,
  rgba: [number, number, number, number],
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4)
  for (let index = 0; index < w * h; index++) {
    out[index * 4] = rgba[0]
    out[index * 4 + 1] = rgba[1]
    out[index * 4 + 2] = rgba[2]
    out[index * 4 + 3] = rgba[3]
  }
  return out
}

export async function tilesetRecordFromFrames(
  path: string,
  frames: readonly RleFrame[],
): Promise<{ record: AssetRecordV1; bytes: ArrayBuffer; sha256: string }> {
  const gz = await compressGzip(encodeSpriteChunk(frames))
  const bytes = gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength) as ArrayBuffer
  const sha256 = await sha256Hex(bytes)
  return {
    bytes,
    sha256,
    record: {
      kind: 'tileset',
      path,
      mediaType: 'application/vnd.type-pal.rle',
      bytes: bytes.byteLength,
      sha256,
      origin: { kind: 'authored' },
    },
  }
}

export async function openC08Legal(name: string): Promise<LegalProject> {
  return loadLegalProject(name)
}

export async function openC08Session(name: string): Promise<{
  legal: LegalProject
  session: EditSession
  reader: ReturnType<typeof createEditorAssetReader>
}> {
  const legal = await openC08Legal(name)
  const session = new EditSession(legal.state)
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  return { legal, session, reader }
}

export function c08StampTemplate(
  id: string,
  tilesetId: string,
  tileId = 0,
  overrides: Partial<StampTemplate> = {},
): StampTemplate {
  const width = overrides.width ?? 2
  const height = overrides.height ?? 1
  const rows = height * 2
  const tiles = Array.from({ length: rows }, () =>
    Array.from({ length: width }, () => null as number | null),
  )
  const sources = tiles.map((row) => row.map(() => null as number | null))
  tiles[0]![0] = tileId
  sources[0]![0] = 0
  return {
    id,
    name: overrides.name ?? id,
    origin: overrides.origin ?? 'authored',
    anchor: overrides.anchor ?? { row: 0, col: 0 },
    width,
    height,
    category: overrides.category,
    tilesetRefs: [tilesetId],
    layers: [{ id: 'floor', name: '地面', tiles, sources }],
    collision: Array.from({ length: rows }, () => Array.from({ length: width }, () => null)),
    ...overrides,
  }
}

export function seedStamps(session: EditSession, tilesetId: string, ids: string[]): void {
  for (const id of ids)
    session.dispatch(new AddStampTemplateCommand(c08StampTemplate(id, tilesetId)))
}

export async function appendAuthoredTileset(
  session: EditSession,
  def: TilesetDef,
  frameCount = 4,
): Promise<{ asset: AssetId; path: string; bytes: ArrayBuffer }> {
  const seedAssets = await buildSeedAssets()
  const frames = Array.from({ length: frameCount }, (_, index) =>
    quantizeToRleFrame(
      solidRgba(32, 16, [40 + index * 10, 80, 120, 255]),
      32,
      16,
      seedAssets.palette,
    ),
  )
  const path = `assets/generated/tilesets/${def.id}.rle`
  const packed = await tilesetRecordFromFrames(path, frames)
  session.dispatch(new AddTilesetCommand(def, packed.record, packed.bytes))
  return { asset: def.asset, path, bytes: packed.bytes }
}
