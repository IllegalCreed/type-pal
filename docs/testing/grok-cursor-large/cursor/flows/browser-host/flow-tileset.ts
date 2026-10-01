/** 浏览器宿主瓦片集注入（无 vitest / kit 依赖）。 */
import type { AssetId, AssetRecordV1, TilesetDef } from '@type-pal/content'
import {
  compressGzip,
  encodeSpriteChunk,
  quantizeToRleFrame,
  type RleFrame,
} from '@type-pal/reforge'
import { sha256Hex } from '../../../../../../packages/editor/src/core/binary-signature.js'
import type { EditSession } from '../../../../../../packages/editor/src/core/edit-session.js'
import { buildSeedAssets } from '../../../../../../packages/editor/src/core/seed-assets.js'
import { AddTilesetCommand } from '../../../../../../packages/editor/src/core/tileset-commands.js'

function solidRgba(
  w: number,
  h: number,
  rgba: [number, number, number, number],
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4)
  for (let index = 0; index < w * h; index += 1) {
    out[index * 4] = rgba[0]
    out[index * 4 + 1] = rgba[1]
    out[index * 4 + 2] = rgba[2]
    out[index * 4 + 3] = rgba[3]
  }
  return out
}

async function tilesetRecordFromFrames(path: string, frames: readonly RleFrame[]) {
  const gz = await compressGzip(encodeSpriteChunk(frames))
  const bytes = gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength) as ArrayBuffer
  const sha256 = await sha256Hex(bytes)
  const record: AssetRecordV1 = {
    kind: 'tileset',
    path,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: bytes.byteLength,
    sha256,
    origin: { kind: 'authored' },
  }
  return { record, bytes, sha256 }
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
