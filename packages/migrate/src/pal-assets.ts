import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { deflateSync, gunzipSync } from 'node:zlib'
import {
  type AssetCatalogV1,
  type AssetRecordV1,
  encodeFrameSequenceSync,
  FRAME_SEQUENCE_MEDIA_TYPE,
  type ManifestAssetConfig,
  PAL_PHYSICAL_EFFECT_ASSET_ID,
  palBattleBackgroundAssetId,
  palBattleSpriteAssetId,
  palFaceAssetId,
  palFrameAnimationAssetId,
  palItemIconAssetId,
  palMagicEffectSpriteAssetId,
  palMusicAssetId,
  palPortraitAssetId,
  palSoundAssetId,
  palSpriteAssetId,
  palTilesetAssetId,
  palVideoAssetId,
  validateAssetCatalog,
} from '@type-pal/content'
import {
  decodeRngFrames,
  type Palette,
  parseIndexedRleChunk,
  parseSpriteChunkStrict,
  parseWorldSpriteChunk,
  RNG_HEIGHT,
  RNG_WIDTH,
} from '@type-pal/shared'
import { PNG } from 'pngjs'
import { bakeIndexedRgba } from './bake-indexed-rgba.js'
import { sha256 } from './migration-baseline.js'
import { PAL_PLAYER_FACE_FRAME_BY_ROLE_ID, ROLE_SLUGS } from './source-facts.js'

interface PalBinaryAssetBase {
  id: string
  record: AssetRecordV1
}

export type PalBinaryAssetSource = PalBinaryAssetBase &
  (
    | {
        /** 仅读取提取/运行时来源；不属于工程路径或 MG2 baseline。 */
        sourcePath: string
        bytes?: never
      }
    | {
        /** 由迁移器确定性生成的单文件资源。 */
        bytes: Uint8Array
        sourcePath?: never
      }
  )

export interface PalAssetMigrationReport {
  videos: number
  frameAnimations: number
  frames: number
  sounds: number
  emptySounds: number
  soundBytes: number
  portraits: number
  portraitBytes: number
  faces: number
  faceBytes: number
  itemIcons: number
  itemIconBytes: number
  battleBackgrounds: number
  battleBackgroundBytes: number
  effectSprites: number
  effectSpriteBytes: number
  effectSpriteFrames: number
  tilesets: number
  tilesetBytes: number
  tilesetFrames: number
  sprites: number
  spriteBytes: number
  spriteFrames: number
  spriteMalformedTailSlots: number
  spriteTupleDigest: string
  spriteLegacyTailAnomalies: PalWorldSpriteLegacyTailAnomaly[]
  battleSprites: number
  battleSpriteBytes: number
  battleSpriteRawBytes: number
  battleSpriteFrames: number
  battleSpriteMalformedTailSlots: number
  battleSpritePlayerTupleDigest: string
  battleSpriteEnemyTupleDigest: string
  battleSpriteTupleDigest: string
  battleSpritePlayerFrameCounts: number[]
  battleSpriteEnemyFrameCounts: number[]
  battleSpriteLegacyTailAnomalies: PalBattleSpriteLegacyTailAnomaly[]
  /** 迁移边界审计字段；项目内容、运行时和编辑器不得消费这些旧编号。 */
  legacyPaletteByFrameAnimation: Record<string, number>
}

export interface PalWorldSpriteLegacyTailAnomaly {
  sprite: number
  frames: number
  malformedTailSlots: number
  trailingSentinel: boolean
}

export interface PalBattleSpriteLegacyTailAnomaly {
  channel: 'player' | 'enemy'
  sprite: number
  frames: number
  declaredSlots: number
  malformedTailSlots: number
  trailingSentinel: boolean
}

/**
 * PAL 源数据的历史坏尾事实只冻结在迁移门禁；运行时不得按这些资源 id 特判。
 * 571 的正常零 sentinel 不计入 malformedTailSlots。
 */
export const PAL_WORLD_SPRITE_LEGACY_TAIL_ANOMALIES = [
  { sprite: 23, frames: 12, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 35, frames: 5, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 79, frames: 16, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 110, frames: 12, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 112, frames: 12, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 114, frames: 12, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 116, frames: 12, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 133, frames: 4, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 139, frames: 12, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 141, frames: 12, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 143, frames: 12, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 241, frames: 7, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 360, frames: 12, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 384, frames: 24, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 414, frames: 12, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 418, frames: 1, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 419, frames: 1, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 422, frames: 1, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 442, frames: 4, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 450, frames: 23, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 483, frames: 2, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 509, frames: 4, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 510, frames: 4, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 538, frames: 12, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 552, frames: 12, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 571, frames: 1, malformedTailSlots: 1, trailingSentinel: true },
  { sprite: 575, frames: 12, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 579, frames: 6, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 609, frames: 12, malformedTailSlots: 1, trailingSentinel: false },
  { sprite: 631, frames: 7, malformedTailSlots: 1, trailingSentinel: false },
] as const satisfies readonly PalWorldSpriteLegacyTailAnomaly[]

export const PAL_WORLD_SPRITE_TUPLE_DIGEST =
  'c92c14b5dac5abc39006d94fdefaa699eb0bffddb925447ceb4070c32bb45d03'

export const PAL_BATTLE_SPRITE_PLAYER_TUPLE_DIGEST =
  '163f7282309fce5699c1c9a15e4142c219f692de97ac0d2e6d20e941c8dcd7b5'
export const PAL_BATTLE_SPRITE_ENEMY_TUPLE_DIGEST =
  'dd3b00f6f925c78ff5a3aa60cc7909fbee3924375c07a2c661bcb0bcf75f4302'
export const PAL_BATTLE_SPRITE_TUPLE_DIGEST =
  'ecbec106c6540de74adeec799bad19a22e7198272245c98b130522b0ac37a685'

export const PAL_BATTLE_SPRITE_LEGACY_TAIL_ANOMALIES = [
  {
    channel: 'enemy',
    sprite: 24,
    frames: 4,
    declaredSlots: 5,
    malformedTailSlots: 1,
    trailingSentinel: false,
  },
  {
    channel: 'enemy',
    sprite: 25,
    frames: 5,
    declaredSlots: 6,
    malformedTailSlots: 1,
    trailingSentinel: false,
  },
  {
    channel: 'enemy',
    sprite: 30,
    frames: 3,
    declaredSlots: 4,
    malformedTailSlots: 1,
    trailingSentinel: false,
  },
  {
    channel: 'enemy',
    sprite: 59,
    frames: 4,
    declaredSlots: 5,
    malformedTailSlots: 1,
    trailingSentinel: false,
  },
  {
    channel: 'enemy',
    sprite: 71,
    frames: 2,
    declaredSlots: 3,
    malformedTailSlots: 1,
    trailingSentinel: false,
  },
  {
    channel: 'enemy',
    sprite: 86,
    frames: 5,
    declaredSlots: 6,
    malformedTailSlots: 1,
    trailingSentinel: false,
  },
] as const satisfies readonly PalBattleSpriteLegacyTailAnomaly[]

export function formatPalWorldSpriteReport(
  report: Pick<
    PalAssetMigrationReport,
    'sprites' | 'spriteBytes' | 'spriteFrames' | 'spriteMalformedTailSlots' | 'spriteTupleDigest'
  >,
): string {
  return (
    `[大世界精灵资源] sprites=${report.sprites} bytes=${report.spriteBytes} ` +
    `frames=${report.spriteFrames} malformed-tail-slots=${report.spriteMalformedTailSlots} ` +
    `tuple-digest=${report.spriteTupleDigest}`
  )
}

export function formatPalBattleSpriteReport(
  report: Pick<
    PalAssetMigrationReport,
    | 'battleSprites'
    | 'battleSpriteBytes'
    | 'battleSpriteRawBytes'
    | 'battleSpriteFrames'
    | 'battleSpriteMalformedTailSlots'
    | 'battleSpritePlayerTupleDigest'
    | 'battleSpriteEnemyTupleDigest'
    | 'battleSpriteTupleDigest'
  >,
): string {
  return (
    `[战斗精灵资源] sprites=${report.battleSprites} bytes=${report.battleSpriteBytes} ` +
    `raw-bytes=${report.battleSpriteRawBytes} frames=${report.battleSpriteFrames} ` +
    `malformed-tail-slots=${report.battleSpriteMalformedTailSlots} ` +
    `player-digest=${report.battleSpritePlayerTupleDigest} ` +
    `enemy-digest=${report.battleSpriteEnemyTupleDigest} ` +
    `tuple-digest=${report.battleSpriteTupleDigest}`
  )
}

export const PAL_AUDIO_ROLES = {
  'audio.midiSoundfont': 'soundfont.default',
  'audio.defaultBattleMusic': palMusicAssetId(37),
  // SDL PAL_BattleWon 在不可逃战胜利结算时选择 002；升级屏随后沿用当前播放曲，
  // 没有独立的 levelUp 音乐 role，故保留现有稳定 role 名。
  'audio.bossVictoryMusic': palMusicAssetId(2),
  'audio.normalVictoryMusic': palMusicAssetId(3),
  'audio.openingMenuMusic': palMusicAssetId(4),
} as const satisfies ManifestAssetConfig['roles']

export const PAL_SOUND_ROLES = {
  'audio.battleItemUseSound': palSoundAssetId(28),
  'audio.battleCoopCastSound': palSoundAssetId(29),
  'audio.battleEscapeSound': palSoundAssetId(45),
  'audio.battleEnemyTransformSound': palSoundAssetId(47),
} as const satisfies ManifestAssetConfig['roles']

export const PAL_ASSET_ROLES = {
  ...PAL_AUDIO_ROLES,
  ...PAL_SOUND_ROLES,
  'video.startupTrademark': palVideoAssetId(1),
  'video.startupSplash': palVideoAssetId(2),
  'visual.standardColorTable': 'color.project-standard',
} as const satisfies ManifestAssetConfig['roles']

export const PAL_RNG_LEGACY_PALETTE: Readonly<Record<number, number>> = { 3: 2, 6: 3, 7: 6 }

function fileSource(
  id: string,
  sourcePath: string,
  record: Omit<AssetRecordV1, 'bytes' | 'sha256'>,
): PalBinaryAssetSource {
  const bytes = readFileSync(sourcePath)
  return {
    id,
    sourcePath,
    record: { ...record, bytes: bytes.byteLength, sha256: sha256(bytes) },
  }
}

function generatedSource(
  id: string,
  bytes: Uint8Array,
  record: Omit<AssetRecordV1, 'bytes' | 'sha256'>,
): PalBinaryAssetSource {
  return {
    id,
    bytes,
    record: { ...record, bytes: bytes.byteLength, sha256: sha256(bytes) },
  }
}

function sourceBytes(source: PalBinaryAssetSource): Uint8Array {
  return source.sourcePath === undefined ? source.bytes : readFileSync(source.sourcePath)
}

function readPalette(path: string): Palette {
  const value = JSON.parse(readFileSync(path, 'utf8')) as Partial<Palette>
  if (!Array.isArray(value.colors) || value.colors.length !== 256)
    throw new Error(`PAL 颜色表必须含 256 色: ${path}`)
  for (const [index, color] of value.colors.entries()) {
    if (
      !Array.isArray(color) ||
      color.length !== 3 ||
      color.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)
    )
      throw new Error(`PAL 颜色表 ${path} 第 ${index} 色非法`)
  }
  return value as Palette
}

function bakeIndexedPng(sourcePath: string, palette: Palette, label: string): Uint8Array {
  const source = PNG.sync.read(readFileSync(sourcePath))
  if (source.data.byteLength !== source.width * source.height * 4)
    throw new Error(`${label}: PNG 像素长度非法`)
  const output = new PNG({ width: source.width, height: source.height })
  output.data = Buffer.from(bakeIndexedRgba(source.data, palette.colors))
  return PNG.sync.write(output)
}

function assertIndexedBattleBackground(bytes: Uint8Array, label: string): void {
  const png = PNG.sync.read(Buffer.from(bytes))
  if (png.width !== 320 || png.height !== 200)
    throw new Error(`${label}: 战场背景期望 320×200，实际 ${png.width}×${png.height}`)
  for (let offset = 0; offset < png.data.byteLength; offset += 4) {
    const red = png.data[offset]
    if (
      red !== png.data[offset + 1] ||
      red !== png.data[offset + 2] ||
      png.data[offset + 3] !== 255
    )
      throw new Error(`${label}: 像素 ${offset / 4} 不满足 R=G=B=index 且 alpha=255`)
  }
}

export function loadPalStaticImages(repo: string): {
  binaries: PalBinaryAssetSource[]
  report: Pick<
    PalAssetMigrationReport,
    | 'portraits'
    | 'portraitBytes'
    | 'faces'
    | 'faceBytes'
    | 'itemIcons'
    | 'itemIconBytes'
    | 'battleBackgrounds'
    | 'battleBackgroundBytes'
  >
} {
  const palette = readPalette(resolve(repo, 'data/extracted/data/palette/0.json'))
  const binaries: PalBinaryAssetSource[] = []

  const portraitManifest = JSON.parse(
    readFileSync(resolve(repo, 'data/extracted/data/portraits.json'), 'utf8'),
  ) as { count?: unknown }
  if (!Number.isInteger(portraitManifest.count) || (portraitManifest.count as number) <= 0)
    throw new Error('PAL portraits manifest 期望正整数 count')
  let portraitBytes = 0
  for (let chunk = 1; chunk <= (portraitManifest.count as number); chunk++) {
    const sourcePath = resolve(
      repo,
      `data/extracted/images/portraits/${String(chunk).padStart(2, '0')}.png`,
    )
    if (!existsSync(sourcePath)) continue
    const padded = String(chunk).padStart(3, '0')
    const bytes = bakeIndexedPng(sourcePath, palette, `PAL 立绘 ${padded}`)
    portraitBytes += bytes.byteLength
    binaries.push(
      generatedSource(palPortraitAssetId(chunk), bytes, {
        kind: 'portrait',
        path: `assets/migrated/portraits/${padded}.png`,
        mediaType: 'image/png',
        label: `PAL 立绘 ${padded}`,
        origin: {
          kind: 'legacy-migrated',
          ref: `images/portraits/${String(chunk).padStart(2, '0')}.png`,
        },
      }),
    )
  }
  const portraits = binaries.length
  if (portraits !== 88) throw new Error(`PAL 立绘期望 88 张，收到 ${portraits}`)

  let faceBytes = 0
  for (const [roleId, frame] of PAL_PLAYER_FACE_FRAME_BY_ROLE_ID.entries()) {
    const actorId = ROLE_SLUGS[roleId]
    if (!actorId) throw new Error(`PAL player face 存在未知 roleId ${roleId}`)
    const sourceRef = `images/ui/frame-${String(frame).padStart(2, '0')}.png`
    const bytes = bakeIndexedPng(
      resolve(repo, `data/extracted/${sourceRef}`),
      palette,
      `PAL ${actorId} 小头像`,
    )
    faceBytes += bytes.byteLength
    binaries.push(
      generatedSource(palFaceAssetId(actorId), bytes, {
        kind: 'face',
        path: `assets/migrated/faces/${actorId}.png`,
        mediaType: 'image/png',
        label: `PAL ${actorId} 战斗头像`,
        origin: { kind: 'legacy-migrated', ref: sourceRef },
      }),
    )
  }

  const items = JSON.parse(
    readFileSync(resolve(repo, 'data/extracted/data/items.json'), 'utf8'),
  ) as Array<{ id?: unknown; bitmap?: unknown }>
  const zeroIcons = items.filter((item) => item.bitmap === 0).map((item) => item.id)
  if (items.length !== 234 || zeroIcons.length !== 1 || zeroIcons[0] !== 277)
    throw new Error(`PAL 物品图标 0 哨兵漂移: items=${items.length} zero=${zeroIcons.join(',')}`)
  const itemChunks = [
    ...new Set(
      items
        .map((item) => item.bitmap)
        .filter((bitmap): bitmap is number => Number.isInteger(bitmap) && (bitmap as number) > 0),
    ),
  ].sort((left, right) => left - right)
  if (itemChunks.length !== 233)
    throw new Error(`PAL 非零物品图标期望 233 个，收到 ${itemChunks.length}`)
  let itemIconBytes = 0
  for (const chunk of itemChunks) {
    const padded = String(chunk).padStart(3, '0')
    const sourceRef = `images/items/${padded}.png`
    const sourcePath = resolve(repo, `data/extracted/${sourceRef}`)
    if (!existsSync(sourcePath)) throw new Error(`PAL 物品图标源缺失: ${sourceRef}`)
    const bytes = bakeIndexedPng(sourcePath, palette, `PAL 物品图标 ${padded}`)
    itemIconBytes += bytes.byteLength
    binaries.push(
      generatedSource(palItemIconAssetId(chunk), bytes, {
        kind: 'item-icon',
        path: `assets/migrated/item-icons/${padded}.png`,
        mediaType: 'image/png',
        label: `PAL 物品图标 ${padded}`,
        origin: { kind: 'legacy-migrated', ref: sourceRef },
      }),
    )
  }

  let battleBackgroundBytes = 0
  for (let chunk = 6; chunk <= 57; chunk++) {
    const padded = String(chunk).padStart(3, '0')
    const sourceRef = `images/battle/bg/${padded}.png`
    const sourcePath = resolve(repo, `data/extracted/${sourceRef}`)
    const bytes = readFileSync(sourcePath)
    assertIndexedBattleBackground(bytes, `PAL 战场背景 ${padded}`)
    battleBackgroundBytes += bytes.byteLength
    binaries.push(
      fileSource(palBattleBackgroundAssetId(chunk), sourcePath, {
        kind: 'battle-background',
        path: `assets/migrated/battle-backgrounds/${padded}.png`,
        mediaType: 'image/png',
        label: `PAL 战场背景 ${padded}`,
        origin: { kind: 'legacy-migrated', ref: sourceRef },
      }),
    )
  }

  return {
    binaries,
    report: {
      portraits,
      portraitBytes,
      faces: PAL_PLAYER_FACE_FRAME_BY_ROLE_ID.length,
      faceBytes,
      itemIcons: itemChunks.length,
      itemIconBytes,
      battleBackgrounds: 52,
      battleBackgroundBytes,
    },
  }
}

function loadPalEffectSprites(repo: string): {
  binaries: PalBinaryAssetSource[]
  report: Pick<
    PalAssetMigrationReport,
    'effectSprites' | 'effectSpriteBytes' | 'effectSpriteFrames'
  >
} {
  const specs = [
    {
      id: PAL_PHYSICAL_EFFECT_ASSET_ID,
      file: 'effect.rle',
      label: 'PAL 物理命中特效',
      output: 'physical-hit.rle',
    },
    ...Array.from({ length: 55 }, (_, chunk) => {
      const source = String(chunk).padStart(2, '0')
      const output = String(chunk).padStart(3, '0')
      return {
        id: palMagicEffectSpriteAssetId(chunk),
        file: `fire-${source}.rle`,
        label: `PAL 法术特效 ${output}`,
        output: `magic-${output}.rle`,
      }
    }),
  ]
  const binaries: PalBinaryAssetSource[] = []
  let effectSpriteBytes = 0
  let effectSpriteFrames = 0
  for (const spec of specs) {
    const sourcePath = resolve(repo, `data/extracted/data/magic/${spec.file}`)
    const compressed = readFileSync(sourcePath)
    if (compressed[0] !== 0x1f || compressed[1] !== 0x8b)
      throw new Error(`${spec.label}: 期望 gzip RLE`)
    const frames = parseSpriteChunkStrict(gunzipSync(compressed))
    if (frames.length === 0) throw new Error(`${spec.label}: 不含帧`)
    effectSpriteBytes += compressed.byteLength
    effectSpriteFrames += frames.length
    binaries.push(
      fileSource(spec.id, sourcePath, {
        kind: 'effect-sprite',
        path: `assets/migrated/effect-sprites/${spec.output}`,
        mediaType: 'application/vnd.type-pal.rle',
        label: spec.label,
        origin: { kind: 'legacy-migrated', ref: `data/magic/${spec.file}` },
      }),
    )
  }
  if (binaries.length !== 56 || effectSpriteBytes !== 652_870 || effectSpriteFrames !== 922)
    throw new Error(
      `PAL 特效精灵基线漂移: assets=${binaries.length} bytes=${effectSpriteBytes} frames=${effectSpriteFrames}`,
    )
  return {
    binaries,
    report: { effectSprites: binaries.length, effectSpriteBytes, effectSpriteFrames },
  }
}

function bakeRgbaFrames(bytes: Uint8Array, palette: Palette, label: string): Uint8Array[] {
  const decoded = decodeRngFrames(bytes)
  return decoded.map((frame, frameIndex) => {
    if (frame.index !== frameIndex)
      throw new Error(`${label}: RNG 帧索引不连续，期望 ${frameIndex}，实际 ${frame.index}`)
    const rgba = new Uint8Array(RNG_WIDTH * RNG_HEIGHT * 4)
    for (let pixel = 0; pixel < frame.pixels.length; pixel++) {
      const color = palette.colors[frame.pixels[pixel] ?? 0]
      if (!color) throw new Error(`${label}: 帧 ${frameIndex} 引用了非法颜色`)
      const offset = pixel * 4
      rgba[offset] = color[0]
      rgba[offset + 1] = color[1]
      rgba[offset + 2] = color[2]
      rgba[offset + 3] = 255
    }
    return rgba
  })
}

interface ExtractedRngManifest {
  chunks: Array<{ chunkIndex: number; frameCount: number; frames: Array<{ index: number }> }>
}

interface ExtractedSoundChunk {
  index: number
  size: number
  isEmpty: boolean
}

interface ExtractedSoundsMetadata {
  chunkCount: number
  chunks: ExtractedSoundChunk[]
}

interface ExtractedAssetManifest {
  files: Array<{ path: string; size: number }>
}

function assertWave(bytes: Uint8Array, label: string): void {
  const tag = (offset: number): string => String.fromCharCode(...bytes.subarray(offset, offset + 4))
  if (bytes.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE')
    throw new Error(`${label}: 不是 RIFF/WAVE 文件`)
}

/** PAL SOUNDS.MKF 提取物的三向闭包：metadata、asset-manifest 与实际 WAV 必须完全一致。 */
export function loadPalSoundAssets(repo: string): {
  binaries: PalBinaryAssetSource[]
  report: Pick<PalAssetMigrationReport, 'sounds' | 'emptySounds' | 'soundBytes'>
} {
  const metadata = JSON.parse(
    readFileSync(resolve(repo, 'data/extracted/data/sounds-metadata.json'), 'utf8'),
  ) as Partial<ExtractedSoundsMetadata>
  if (!Number.isInteger(metadata.chunkCount) || !Array.isArray(metadata.chunks))
    throw new Error('PAL sounds metadata 期望 {chunkCount,chunks} 对象')
  if (metadata.chunkCount !== metadata.chunks.length)
    throw new Error(
      `PAL sounds metadata chunkCount=${String(metadata.chunkCount)}，chunks=${metadata.chunks.length}`,
    )
  if (metadata.chunkCount !== 505)
    throw new Error(`PAL sounds metadata 期望 505 段，收到 ${String(metadata.chunkCount)}`)

  const nonempty: ExtractedSoundChunk[] = []
  let emptySounds = 0
  for (const [index, raw] of metadata.chunks.entries()) {
    const chunk = raw as Partial<ExtractedSoundChunk>
    if (chunk.index !== index)
      throw new Error(`PAL sound 段号不连续，期望 ${index}，实际 ${chunk.index}`)
    if (!Number.isInteger(chunk.size) || (chunk.size ?? -1) < 0)
      throw new Error(`PAL sound ${index}: size 非法`)
    if (typeof chunk.isEmpty !== 'boolean' || chunk.isEmpty !== (chunk.size === 0))
      throw new Error(`PAL sound ${index}: isEmpty 与 size 不一致`)
    if (chunk.isEmpty) emptySounds++
    else nonempty.push(chunk as ExtractedSoundChunk)
  }

  const extractedManifest = JSON.parse(
    readFileSync(resolve(repo, 'data/extracted/asset-manifest.json'), 'utf8'),
  ) as Partial<ExtractedAssetManifest>
  if (!Array.isArray(extractedManifest.files)) throw new Error('PAL asset-manifest.files 期望数组')
  const manifestSounds = new Map<number, number>()
  for (const file of extractedManifest.files) {
    const match = /^sounds\/(\d+)\.wav$/.exec(file.path)
    if (!match) continue
    const index = Number(match[1])
    if (manifestSounds.has(index)) throw new Error(`PAL asset-manifest 重复 sound ${index}`)
    manifestSounds.set(index, file.size)
  }
  const actualSounds = new Set<number>()
  for (const file of readdirSync(resolve(repo, 'data/extracted/sounds'))) {
    const match = /^(\d+)\.wav$/.exec(file)
    if (!match) throw new Error(`PAL sounds 目录出现非规范文件 ${file}`)
    const index = Number(match[1])
    if (actualSounds.has(index)) throw new Error(`PAL sounds 目录重复 sound ${index}`)
    actualSounds.add(index)
  }
  const expected = new Set(nonempty.map((chunk) => chunk.index))
  const exactSet = (label: string, actual: ReadonlySet<number>): void => {
    const missing = [...expected].filter((index) => !actual.has(index))
    const extra = [...actual].filter((index) => !expected.has(index))
    if (missing.length || extra.length)
      throw new Error(
        `${label} 与 metadata 不闭包：missing=${missing.join(',')} extra=${extra.join(',')}`,
      )
  }
  exactSet('PAL asset-manifest sounds', new Set(manifestSounds.keys()))
  exactSet('PAL sounds 目录', actualSounds)

  let soundBytes = 0
  const binaries = nonempty.map((chunk) => {
    const sourcePath = resolve(repo, `data/extracted/sounds/${chunk.index}.wav`)
    const bytes = readFileSync(sourcePath)
    if (bytes.byteLength !== chunk.size || manifestSounds.get(chunk.index) !== chunk.size)
      throw new Error(`PAL sound ${chunk.index}: metadata/manifest/文件 size 不一致`)
    assertWave(bytes, `PAL sound ${chunk.index}`)
    soundBytes += bytes.byteLength
    const padded = String(chunk.index).padStart(3, '0')
    return fileSource(palSoundAssetId(chunk.index), sourcePath, {
      kind: 'sound',
      path: `assets/migrated/sounds/${padded}.wav`,
      mediaType: 'audio/wav',
      label: `PAL 音效 ${padded}`,
      origin: { kind: 'legacy-migrated', ref: `sounds/${chunk.index}.wav` },
    })
  })
  return { binaries, report: { sounds: binaries.length, emptySounds, soundBytes } }
}

function loadPalFrameAnimations(repo: string): {
  binaries: PalBinaryAssetSource[]
  report: Pick<
    PalAssetMigrationReport,
    'videos' | 'frameAnimations' | 'frames' | 'legacyPaletteByFrameAnimation'
  >
} {
  const manifestPath = resolve(repo, 'data/extracted/data/rng-frames.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ExtractedRngManifest
  if (manifest.chunks.length !== 12)
    throw new Error(`PAL RNG manifest 期望 12 段，收到 ${manifest.chunks.length}`)
  const paletteCache = new Map<number, Palette>()
  const legacyPaletteByFrameAnimation: Record<string, number> = {}
  let totalFrames = 0
  const binaries = manifest.chunks.map((chunk, index) => {
    if (chunk.chunkIndex !== index)
      throw new Error(`PAL RNG manifest 段号不连续，期望 ${index}，实际 ${chunk.chunkIndex}`)
    if (
      chunk.frames.length !== chunk.frameCount ||
      chunk.frames.some((frame, frameIndex) => frame.index !== frameIndex)
    )
      throw new Error(`PAL RNG ${index}: manifest 帧清单不连续`)
    const legacyPalette = PAL_RNG_LEGACY_PALETTE[index] ?? 0
    let palette = paletteCache.get(legacyPalette)
    if (!palette) {
      palette = readPalette(resolve(repo, `data/extracted/data/palette/${legacyPalette}.json`))
      paletteCache.set(legacyPalette, palette)
    }
    const padded = String(index).padStart(3, '0')
    const compressedSource = readFileSync(
      resolve(repo, `data/extracted/data/animation/rng-${String(index).padStart(2, '0')}.rle`),
    )
    const rgbaFrames = bakeRgbaFrames(gunzipSync(compressedSource), palette, `PAL RNG ${padded}`)
    if (rgbaFrames.length !== chunk.frameCount)
      throw new Error(
        `PAL RNG ${padded}: 解码 ${rgbaFrames.length} 帧，manifest 登记 ${chunk.frameCount}`,
      )
    totalFrames += rgbaFrames.length
    const asset = palFrameAnimationAssetId(index)
    legacyPaletteByFrameAnimation[asset] = legacyPalette
    const tpfs = encodeFrameSequenceSync(
      {
        width: RNG_WIDTH,
        height: RNG_HEIGHT,
        defaultFrameMs: 40,
        colorTreatment: 'preserve',
        frames: rgbaFrames.map((rgba) => ({ rgba })),
      },
      (raw) => deflateSync(raw, { level: 9 }),
    )
    return generatedSource(asset, tpfs, {
      kind: 'frame-animation',
      path: `assets/migrated/frame-animations/${padded}.tpfs`,
      mediaType: FRAME_SEQUENCE_MEDIA_TYPE,
      label: `PAL 帧动画 ${padded}`,
      origin: {
        kind: 'legacy-migrated',
        ref: `animation/rng-${String(index).padStart(2, '0')}.rle`,
      },
    })
  })
  return {
    binaries,
    report: {
      videos: 6,
      frameAnimations: binaries.length,
      frames: totalFrames,
      legacyPaletteByFrameAnimation,
    },
  }
}

export function loadPalWorldSprites(repo: string): {
  binaries: PalBinaryAssetSource[]
  /** 1-based spriteNum 对应下标 spriteNum-1；复用本次严格解码结果，禁止按容量猜布局。 */
  frameCounts: number[]
  report: Pick<
    PalAssetMigrationReport,
    | 'sprites'
    | 'spriteBytes'
    | 'spriteFrames'
    | 'spriteMalformedTailSlots'
    | 'spriteTupleDigest'
    | 'spriteLegacyTailAnomalies'
  >
} {
  const root = resolve(repo, 'data/extracted/data/sprite')
  const expectedFiles = Array.from({ length: 636 }, (_, index) => `${index + 1}.rle`)
  const actualFiles = readdirSync(root)
    .filter((file) => file.endsWith('.rle'))
    .sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10))
  if (
    actualFiles.length !== expectedFiles.length ||
    actualFiles.some((file, index) => file !== expectedFiles[index])
  )
    throw new Error('PAL 大世界精灵源集合期望完整 1..636')

  const binaries: PalBinaryAssetSource[] = []
  const spriteLegacyTailAnomalies: PalWorldSpriteLegacyTailAnomaly[] = []
  const frameCounts: number[] = []
  let spriteBytes = 0
  let spriteFrames = 0
  let spriteMalformedTailSlots = 0
  const spriteTuples: string[] = []
  for (let sprite = 1; sprite <= 636; sprite++) {
    const sourcePath = resolve(root, `${sprite}.rle`)
    const compressed = readFileSync(sourcePath)
    if (compressed[0] !== 0x1f || compressed[1] !== 0x8b)
      throw new Error(`PAL 大世界精灵 ${sprite} 必须是 gzip RLE`)
    const parsed = parseWorldSpriteChunk(gunzipSync(compressed), 'legacy-migrated')
    if (parsed.frames.length === 0) throw new Error(`PAL 大世界精灵 ${sprite} 不含有效帧`)
    frameCounts.push(parsed.frames.length)
    spriteBytes += compressed.byteLength
    spriteFrames += parsed.frames.length
    spriteMalformedTailSlots += parsed.skippedLegacyTailSlots
    spriteTuples.push(`${sprite}\0${compressed.byteLength}\0${sha256(compressed)}`)
    if (parsed.skippedLegacyTailSlots > 0)
      spriteLegacyTailAnomalies.push({
        sprite,
        frames: parsed.frames.length,
        malformedTailSlots: parsed.skippedLegacyTailSlots,
        trailingSentinel: parsed.trailingSentinel,
      })

    const padded = String(sprite).padStart(3, '0')
    binaries.push(
      fileSource(palSpriteAssetId(sprite), sourcePath, {
        kind: 'sprite',
        path: `assets/migrated/sprites/${padded}.rle`,
        mediaType: 'application/vnd.type-pal.rle',
        label: `PAL 大世界精灵 ${padded}`,
        origin: { kind: 'legacy-migrated', ref: `sprite/${sprite}.rle` },
      }),
    )
  }

  if (spriteBytes !== 1_332_725)
    throw new Error(`PAL 大世界精灵字节期望 1332725，收到 ${spriteBytes}`)
  if (spriteFrames !== 4_133) throw new Error(`PAL 大世界精灵帧数期望 4133，收到 ${spriteFrames}`)
  if (spriteMalformedTailSlots !== 30)
    throw new Error(`PAL 大世界精灵坏尾槽期望 30，收到 ${spriteMalformedTailSlots}`)
  const spriteTupleDigest = sha256(spriteTuples.join('\n'))
  if (spriteTupleDigest !== PAL_WORLD_SPRITE_TUPLE_DIGEST)
    throw new Error(
      `PAL 大世界精灵 tuple digest 漂移，期望 ${PAL_WORLD_SPRITE_TUPLE_DIGEST}，收到 ${spriteTupleDigest}`,
    )
  if (
    JSON.stringify(spriteLegacyTailAnomalies) !==
    JSON.stringify(PAL_WORLD_SPRITE_LEGACY_TAIL_ANOMALIES)
  )
    throw new Error('PAL 大世界精灵 legacy 坏尾集合或结构发生漂移')

  return {
    binaries,
    frameCounts,
    report: {
      sprites: binaries.length,
      spriteBytes,
      spriteFrames,
      spriteMalformedTailSlots,
      spriteTupleDigest,
      spriteLegacyTailAnomalies,
    },
  }
}

/**
 * F.MKF/ABC.MKF 提取后的战斗精灵逐字节登记。player 0 是合法资源，player/enemy
 * 同号必须保留 channel；只有 legacy-migrated 允许连续有效前缀后的历史坏尾。
 */
export function loadPalBattleSprites(repo: string): {
  binaries: PalBinaryAssetSource[]
  report: Pick<
    PalAssetMigrationReport,
    | 'battleSprites'
    | 'battleSpriteBytes'
    | 'battleSpriteRawBytes'
    | 'battleSpriteFrames'
    | 'battleSpriteMalformedTailSlots'
    | 'battleSpritePlayerTupleDigest'
    | 'battleSpriteEnemyTupleDigest'
    | 'battleSpriteTupleDigest'
    | 'battleSpritePlayerFrameCounts'
    | 'battleSpriteEnemyFrameCounts'
    | 'battleSpriteLegacyTailAnomalies'
  >
} {
  const manifest = JSON.parse(
    readFileSync(resolve(repo, 'data/extracted/data/battle-sprites.json'), 'utf8'),
  ) as { sprites?: Array<{ kind?: unknown; id?: unknown }> }
  if (!Array.isArray(manifest.sprites)) throw new Error('PAL battle-sprites.json 期望 sprites 数组')
  const expected = [
    ...Array.from({ length: 19 }, (_, id) => ({ kind: 'player' as const, id })),
    ...Array.from({ length: 153 }, (_, index) => ({ kind: 'enemy' as const, id: index + 1 })),
  ]
  if (
    manifest.sprites.length !== expected.length ||
    manifest.sprites.some(
      (entry, index) => entry.kind !== expected[index]?.kind || entry.id !== expected[index]?.id,
    )
  )
    throw new Error('PAL battle-sprites 源集合期望 player 0..18 后接 enemy 1..153')

  for (const [kind, ids] of [
    ['player', Array.from({ length: 19 }, (_, id) => id)],
    ['enemy', Array.from({ length: 153 }, (_, index) => index + 1)],
  ] as const) {
    const actualFiles = readdirSync(
      resolve(repo, `data/extracted/data/battle-sprite/${kind}`),
    ).sort((left, right) => left.localeCompare(right, 'en', { numeric: true }))
    const expectedFiles = ids.map((id) => `${id}.rle`)
    if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles))
      throw new Error(`PAL battle-sprite/${kind} 目录集合发生漂移`)
  }

  const binaries: PalBinaryAssetSource[] = []
  const anomalies: PalBattleSpriteLegacyTailAnomaly[] = []
  const tuples: Record<'player' | 'enemy', string[]> = { player: [], enemy: [] }
  const frameCounts: Record<'player' | 'enemy', number[]> = { player: [], enemy: [] }
  let battleSpriteBytes = 0
  let battleSpriteRawBytes = 0
  let battleSpriteFrames = 0
  let battleSpriteMalformedTailSlots = 0
  for (const { kind, id } of expected) {
    const sourceRef = `battle-sprite/${kind}/${id}.rle`
    const sourcePath = resolve(repo, `data/extracted/data/${sourceRef}`)
    const compressed = readFileSync(sourcePath)
    if (compressed[0] !== 0x1f || compressed[1] !== 0x8b)
      throw new Error(`PAL ${kind} 战斗精灵 ${id} 必须是 gzip RLE`)
    const raw = gunzipSync(compressed)
    const parsed = parseIndexedRleChunk(raw, kind === 'player' ? 'canonical' : 'legacy-migrated')
    battleSpriteBytes += compressed.byteLength
    battleSpriteRawBytes += raw.byteLength
    battleSpriteFrames += parsed.frames.length
    frameCounts[kind].push(parsed.frames.length)
    battleSpriteMalformedTailSlots += parsed.skippedLegacyTailSlots
    tuples[kind].push(`${kind}\0${id}\0${compressed.byteLength}\0${sha256(compressed)}`)
    if (parsed.skippedLegacyTailSlots > 0)
      anomalies.push({
        channel: kind,
        sprite: id,
        frames: parsed.frames.length,
        declaredSlots: parsed.declaredSlots,
        malformedTailSlots: parsed.skippedLegacyTailSlots,
        trailingSentinel: parsed.trailingSentinel,
      })
    const padded = String(id).padStart(3, '0')
    binaries.push(
      fileSource(palBattleSpriteAssetId(kind, id), sourcePath, {
        kind: 'battle-sprite',
        path: `assets/migrated/battle-sprites/${kind}/${padded}.rle`,
        mediaType: 'application/vnd.type-pal.rle',
        label: `PAL ${kind === 'player' ? '我方' : '敌方'}战斗精灵 ${padded}`,
        origin: { kind: 'legacy-migrated', ref: sourceRef },
      }),
    )
  }
  if (
    battleSpriteBytes !== 900_973 ||
    battleSpriteRawBytes !== 2_313_598 ||
    battleSpriteFrames !== 775 ||
    battleSpriteMalformedTailSlots !== 6
  )
    throw new Error(
      `PAL 战斗精灵基线漂移: bytes=${battleSpriteBytes} raw=${battleSpriteRawBytes} frames=${battleSpriteFrames} bad-tail=${battleSpriteMalformedTailSlots}`,
    )
  if (JSON.stringify(anomalies) !== JSON.stringify(PAL_BATTLE_SPRITE_LEGACY_TAIL_ANOMALIES))
    throw new Error('PAL 战斗精灵 legacy 坏尾集合或结构发生漂移')
  const battleSpritePlayerTupleDigest = sha256(tuples.player.join('\n'))
  const battleSpriteEnemyTupleDigest = sha256(tuples.enemy.join('\n'))
  const battleSpriteTupleDigest = sha256([...tuples.player, ...tuples.enemy].join('\n'))
  if (
    battleSpritePlayerTupleDigest !== PAL_BATTLE_SPRITE_PLAYER_TUPLE_DIGEST ||
    battleSpriteEnemyTupleDigest !== PAL_BATTLE_SPRITE_ENEMY_TUPLE_DIGEST ||
    battleSpriteTupleDigest !== PAL_BATTLE_SPRITE_TUPLE_DIGEST
  )
    throw new Error('PAL 战斗精灵 tuple digest 漂移')
  return {
    binaries,
    report: {
      battleSprites: binaries.length,
      battleSpriteBytes,
      battleSpriteRawBytes,
      battleSpriteFrames,
      battleSpriteMalformedTailSlots,
      battleSpritePlayerTupleDigest,
      battleSpriteEnemyTupleDigest,
      battleSpriteTupleDigest,
      battleSpritePlayerFrameCounts: frameCounts.player,
      battleSpriteEnemyFrameCounts: frameCounts.enemy,
      battleSpriteLegacyTailAnomalies: anomalies,
    },
  }
}

/** PAL 工程一等资源的唯一生成入口；所有 hash 均取自提取源或确定性 TPFS 输出。 */
export function loadPalAssets(
  repo: string,
  midiIds: readonly number[],
  mapNums: readonly number[],
): {
  catalog: AssetCatalogV1
  binaries: PalBinaryAssetSource[]
  worldSpriteFrameCounts: number[]
  roles: ManifestAssetConfig['roles']
  report: PalAssetMigrationReport
} {
  const binaries = [...midiIds]
    .sort((left, right) => left - right)
    .map((track) => {
      const padded = String(track).padStart(3, '0')
      return fileSource(
        palMusicAssetId(track),
        resolve(repo, `data/extracted/music/${padded}.mid`),
        {
          kind: 'music',
          path: `assets/migrated/music/${padded}.mid`,
          mediaType: 'audio/midi',
          label: `PAL 音乐 ${padded}`,
          origin: { kind: 'legacy-migrated', ref: `music/${padded}.mid` },
        },
      )
    })
  binaries.push(
    fileSource('soundfont.default', resolve(repo, 'packages/reforge/public/soundfont.sf3'), {
      kind: 'soundfont',
      path: 'assets/runtime/soundfont.sf3',
      mediaType: 'audio/sf3',
      label: 'TimGM6mb',
      origin: { kind: 'licensed', ref: 'packages/reforge/public/soundfont.sf3' },
    }),
    fileSource('color.project-standard', resolve(repo, 'data/extracted/data/palette/0.json'), {
      kind: 'color-table',
      path: 'assets/migrated/colors/project-standard.json',
      mediaType: 'application/json',
      label: '工程标准色彩',
      origin: { kind: 'legacy-migrated', ref: 'palette/0.json' },
    }),
  )
  for (let video = 1; video <= 6; video++) {
    const padded = String(video).padStart(3, '0')
    binaries.push(
      fileSource(palVideoAssetId(video), resolve(repo, `data/extracted/videos/${video}.mp4`), {
        kind: 'video',
        path: `assets/migrated/videos/${padded}.mp4`,
        mediaType: 'video/mp4',
        label: `PAL 视频 ${padded}`,
        origin: { kind: 'legacy-migrated', ref: `videos/${video}.mp4` },
      }),
    )
  }
  const frameAnimations = loadPalFrameAnimations(repo)
  binaries.push(...frameAnimations.binaries)
  const sounds = loadPalSoundAssets(repo)
  binaries.push(...sounds.binaries)
  const staticImages = loadPalStaticImages(repo)
  binaries.push(...staticImages.binaries)
  const effectSprites = loadPalEffectSprites(repo)
  binaries.push(...effectSprites.binaries)
  const worldSprites = loadPalWorldSprites(repo)
  binaries.push(...worldSprites.binaries)
  const battleSprites = loadPalBattleSprites(repo)
  binaries.push(...battleSprites.binaries)

  let tilesetBytes = 0
  let tilesetFrames = 0
  const uniqueMapNums = [...new Set(mapNums)].sort((left, right) => left - right)
  if (uniqueMapNums.length !== mapNums.length) throw new Error('PAL tileset 迁移收到重复 mapNum')
  for (const mapNum of uniqueMapNums) {
    if (!Number.isInteger(mapNum) || mapNum <= 0)
      throw new Error(`PAL tileset mapNum 非法: ${mapNum}`)
    const sourcePath = resolve(repo, `data/extracted/data/tileset/${mapNum}.rle`)
    const compressed = readFileSync(sourcePath)
    if (compressed[0] !== 0x1f || compressed[1] !== 0x8b)
      throw new Error(`PAL tileset ${mapNum} 必须是 gzip RLE`)
    const frames = parseSpriteChunkStrict(gunzipSync(compressed))
    if (frames.length === 0) throw new Error(`PAL tileset ${mapNum} 不含帧`)
    tilesetBytes += compressed.byteLength
    tilesetFrames += frames.length
    const padded = String(mapNum).padStart(3, '0')
    binaries.push(
      fileSource(palTilesetAssetId(mapNum), sourcePath, {
        kind: 'tileset',
        path: `assets/migrated/tilesets/${padded}.rle`,
        mediaType: 'application/vnd.type-pal.rle',
        label: `PAL 瓦片集 ${padded}`,
        origin: { kind: 'legacy-migrated', ref: `tileset/${mapNum}.rle` },
      }),
    )
  }
  const expectedMapNums = Array.from({ length: 225 }, (_, index) => index + 1).filter(
    (mapNum) => mapNum !== 168 && mapNum !== 171,
  )
  if (
    uniqueMapNums.length !== expectedMapNums.length ||
    uniqueMapNums.some((mapNum, index) => mapNum !== expectedMapNums[index])
  )
    throw new Error('PAL tileset mapNum 集合期望 1..225 且仅缺 168/171')
  if (tilesetBytes !== 6_501_041)
    throw new Error(`PAL tileset 字节期望 6501041，收到 ${tilesetBytes}`)
  if (tilesetFrames !== 67_715) throw new Error(`PAL tileset 帧数期望 67715，收到 ${tilesetFrames}`)

  const ids = new Set<string>()
  for (const source of binaries) {
    if (ids.has(source.id)) throw new Error(`PAL 资源 AssetId 重复: ${source.id}`)
    ids.add(source.id)
  }
  const catalog: AssetCatalogV1 = {
    version: 1,
    assets: Object.fromEntries(binaries.map((asset) => [asset.id, asset.record])),
  }
  validateAssetCatalog(catalog)
  const catalogBytes = Object.values(catalog.assets).reduce((sum, record) => sum + record.bytes, 0)
  if (Object.keys(catalog.assets).length !== 1_934 || catalogBytes !== 69_092_169)
    throw new Error(
      `PAL 物理 catalog 基线漂移: records=${Object.keys(catalog.assets).length} bytes=${catalogBytes}`,
    )
  for (const [role, id] of Object.entries(PAL_ASSET_ROLES)) {
    if (!catalog.assets[id]) throw new Error(`PAL 资源角色 ${role} 引用缺失: ${id}`)
  }
  return {
    catalog,
    binaries,
    worldSpriteFrameCounts: worldSprites.frameCounts,
    roles: { ...PAL_ASSET_ROLES },
    report: {
      ...frameAnimations.report,
      ...sounds.report,
      ...staticImages.report,
      ...effectSprites.report,
      ...worldSprites.report,
      ...battleSprites.report,
      tilesets: uniqueMapNums.length,
      tilesetBytes,
      tilesetFrames,
    },
  }
}

export interface PalAssetMaterializationReport {
  written: number
  unchanged: number
  authored: number
  files: number
  bytes: number
}

function assertBytes(path: string, record: AssetRecordV1): Buffer {
  if (!existsSync(path)) throw new Error(`资源文件不存在: ${path}`)
  const bytes = readFileSync(path)
  if (bytes.byteLength !== record.bytes)
    throw new Error(`资源 bytes 不符: ${path}，登记 ${record.bytes}，实际 ${bytes.byteLength}`)
  const actual = sha256(bytes)
  if (actual !== record.sha256)
    throw new Error(`资源 sha256 不符: ${path}，登记 ${record.sha256}，实际 ${actual}`)
  return bytes
}

export interface PalAssetRetirement {
  id: string
  path: string
  expectedSha256: string
}

function assertRetirableMigratedPath(path: string): void {
  if (
    isAbsolute(path) ||
    path.includes('\\') ||
    path.split('/').some((part) => part === '' || part === '.' || part === '..') ||
    !path.startsWith('assets/migrated/')
  )
    throw new Error(`退役迁移资源路径越界: ${path}`)
}

/**
 * 只从旧 catalog 的生成器所有权推导退役文件；不扫描目录，也不触碰 authored/unmanaged 文件。
 * 文件已被修改时 fail loud，实际删除交给可恢复 migration transaction。
 */
export function planPalAssetRetirements(args: {
  repo: string
  previousCatalog: AssetCatalogV1
  targetCatalog: AssetCatalogV1
}): PalAssetRetirement[] {
  const previous = validateAssetCatalog(args.previousCatalog)
  const target = validateAssetCatalog(args.targetCatalog)
  const targetPaths = new Set(Object.values(target.assets).map((record) => record.path))
  const retirements: PalAssetRetirement[] = []
  for (const [id, record] of Object.entries(previous.assets)) {
    if (record.origin.kind !== 'legacy-migrated' || targetPaths.has(record.path)) continue
    assertRetirableMigratedPath(record.path)
    const full = resolve(args.repo, 'projects/pal', record.path)
    if (!existsSync(full)) continue
    assertBytes(full, record)
    retirements.push({ id, path: record.path, expectedSha256: record.sha256 })
  }
  return retirements.sort((a, b) => a.path.localeCompare(b.path) || a.id.localeCompare(b.id))
}

function assertSourceBytes(source: PalBinaryAssetSource): Uint8Array {
  const bytes = sourceBytes(source)
  if (bytes.byteLength !== source.record.bytes || sha256(bytes) !== source.record.sha256)
    throw new Error(`迁移源 ${source.id} 的 bytes/hash 与 catalog 记录不符`)
  return bytes
}

function syncPath(path: string): void {
  const fd = openSync(path, 'r')
  try {
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
}

/**
 * 二进制不进入 MG2 JSON 事务。此函数按 catalog 所有权确定性物化，并在返回前逐文件重读闭包。
 * 作者接管同 AssetId 后只验证 authored 文件，绝不再复制 migrated 来源。
 */
export function materializePalAssets(args: {
  repo: string
  catalog: AssetCatalogV1
  binaries: readonly PalBinaryAssetSource[]
}): PalAssetMaterializationReport {
  const { repo, binaries } = args
  const catalog = validateAssetCatalog(args.catalog)
  const sourceById = new Map(binaries.map((asset) => [asset.id, asset]))
  if (sourceById.size !== binaries.length) throw new Error('PAL 二进制迁移源存在重复 AssetId')
  const ownerByPath = new Map<string, string>()
  for (const [id, record] of Object.entries(catalog.assets)) {
    const owner = ownerByPath.get(record.path)
    if (owner) throw new Error(`PAL catalog 资源路径冲突: ${owner} / ${id} -> ${record.path}`)
    ownerByPath.set(record.path, id)
  }
  // 全量预检必须先于第一个写入，避免后续坏源留下半批目标。
  for (const source of binaries) {
    const target = catalog.assets[source.id]
    if (!target) throw new Error(`PAL catalog 缺迁移资源 ${source.id}`)
    if (target.origin.kind === 'authored') {
      assertBytes(resolve(repo, 'projects/pal', target.path), target)
      continue
    }
    const sourceControlled = ['kind', 'path', 'mediaType', 'bytes', 'sha256'] as const
    for (const key of sourceControlled) {
      if (target[key] !== source.record[key])
        throw new Error(`迁移资源 ${source.id}.${key} 被非 authored 记录改写`)
    }
    if (JSON.stringify(target.origin) !== JSON.stringify(source.record.origin))
      throw new Error(`迁移资源 ${source.id}.origin 被非 authored 记录改写`)
    assertSourceBytes(source)
  }
  for (const [id, record] of Object.entries(catalog.assets)) {
    if (sourceById.has(id)) continue
    if (record.origin.kind !== 'authored' && record.origin.kind !== 'generated')
      throw new Error(`未知迁移所有权资源 ${id}`)
    assertBytes(resolve(repo, 'projects/pal', record.path), record)
  }

  let written = 0
  let unchanged = 0
  let authored = 0
  for (const source of binaries) {
    const target = catalog.assets[source.id]
    if (!target) throw new Error(`PAL catalog 缺迁移资源 ${source.id}`)
    if (target.origin.kind === 'authored') {
      authored++
      continue
    }
    const bytes = assertSourceBytes(source)
    const destination = resolve(repo, 'projects/pal', target.path)
    if (existsSync(destination)) {
      const current = readFileSync(destination)
      if (current.byteLength === target.bytes && sha256(current) === target.sha256) {
        unchanged++
        continue
      }
    }
    mkdirSync(dirname(destination), { recursive: true })
    const temporary = `${destination}.tmp-${process.pid}`
    rmSync(temporary, { force: true })
    writeFileSync(temporary, bytes)
    syncPath(temporary)
    renameSync(temporary, destination)
    syncPath(destination)
    syncPath(dirname(destination))
    written++
  }

  let bytes = 0
  for (const record of Object.values(catalog.assets)) {
    const file = assertBytes(resolve(repo, 'projects/pal', record.path), record)
    bytes += file.byteLength
  }
  return {
    written,
    unchanged,
    authored,
    files: Object.keys(catalog.assets).length,
    bytes,
  }
}
