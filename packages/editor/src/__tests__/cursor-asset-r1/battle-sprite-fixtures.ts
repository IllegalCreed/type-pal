/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 战斗精灵资产夹具：blank 项目内注入真实 gzip+RLE 战斗帧字节与用途定义，
 * 经正式 loader 自证可保存。只被本卡 *.cursor-r1.test.ts(x) 导入。
 */
import type {
  AssetId,
  AssetRecordV1,
  BattleSpriteDef,
  BattleSpriteProfile,
  PlayerFighterFrames,
} from '@type-pal/content'
import {
  type AssetBase,
  compressGzip,
  decodeBattleSpriteAssetBytes,
  encodeSpriteChunk,
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
  type Palette,
  quantizeToRleFrame,
  type RleFrame,
} from '@type-pal/reforge'
import { memoryAuthorDirectory } from '../../core/__tests__/author-save-fixture.js'
import { sha256Hex } from '../../core/binary-signature.js'
import {
  AddBattleSpriteCommand,
  type BattleSpriteReplacementProof,
  ReplaceBattleSpriteAssetCommand,
} from '../../core/commands.js'
import type { EditorState, EditSession } from '../../core/edit-session.js'
import type { EditorAssetReader } from '../../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../../core/project-diagnostics.js'
import { toEditorState } from '../../core/project-io.js'
import { buildBlankProject } from '../../core/seed.js'
import { buildSeedAssets } from '../../core/seed-assets.js'

const FRAME = 8

const COLORS: readonly [number, number, number][] = [
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

/** 以 `offset` 起循环取互异色；同一 offset 的字节稳定可复现。 */
export function battleColors(count: number, offset = 0): [number, number, number, number][] {
  if (count > COLORS.length) throw new Error(`battleColors 最多 ${COLORS.length} 帧`)
  return Array.from({ length: count }, (_, index) => {
    const [r, g, b] = COLORS[(index + offset) % COLORS.length]!
    return [r, g, b, 255] as [number, number, number, number]
  })
}

/**
 * 标准调色板量化后真正互异的 COLORS 下标（其余下标会撞色索引）：
 * 0→(200,84,68) 1→(104,158,74) 2→(74,108,176) 3→(232,194,154) 4→(140,142,150)
 * 9→(70,118,52) 12→(150,116,74) 15→(58,44,34)。C06 像素 oracle 需要换帧必可区分。
 */
export const DISTINCT_COLOR_PICKS: readonly number[] = [0, 1, 2, 3, 4, 9, 12, 15]

export function solidFrameRgba(
  color: readonly [number, number, number, number],
  width = FRAME,
  height = FRAME,
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

export interface EncodedBattleBytes {
  bytes: ArrayBuffer
  sha256: string
  frames: RleFrame[]
  frameCount: number
}

/** 真实量化 → RLE → gzip；生产同款字节格式。 */
export async function encodeBattleBytes(
  palette: Palette,
  frameCount: number,
  colorOffset = 0,
  /** 可选逐帧尺寸（缺省全部 8×8）；长度必须等于 frameCount。 */
  sizes?: readonly (readonly [number, number])[],
  /** 可选逐帧 COLORS 下标（缺省按 colorOffset 顺序取色）。 */
  picks?: readonly number[],
): Promise<EncodedBattleBytes> {
  if (picks && picks.length !== frameCount)
    throw new Error(`cursor-asset-r1 fixture: picks 长度 ${picks.length} 与帧数 ${frameCount} 不符`)
  if (sizes && sizes.length !== frameCount)
    throw new Error(`cursor-asset-r1 fixture: sizes 长度 ${sizes.length} 与帧数 ${frameCount} 不符`)
  const colors = picks
    ? picks.map((pick) => {
        const [r, g, b] = COLORS[pick]!
        return [r, g, b, 255] as [number, number, number, number]
      })
    : battleColors(frameCount, colorOffset)
  const frames = colors.map((color, index) => {
    const [width, height] = sizes?.[index] ?? [FRAME, FRAME]
    return quantizeToRleFrame(solidFrameRgba(color, width, height), width, height, palette)
  })
  const gzip = await compressGzip(encodeSpriteChunk(frames))
  const bytes = gzip.buffer.slice(gzip.byteOffset, gzip.byteOffset + gzip.byteLength) as ArrayBuffer
  return { bytes, sha256: await sha256Hex(bytes), frames, frameCount }
}

export function authoredBattleRecord(
  encoded: EncodedBattleBytes,
  label: string,
  previous?: AssetRecordV1,
): AssetRecordV1 {
  return {
    ...(previous ?? {}),
    kind: 'battle-sprite',
    path: `assets/authored/battle-sprites/${encoded.sha256}.rle`,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: encoded.bytes.byteLength,
    sha256: encoded.sha256,
    label,
    origin: { kind: 'authored' },
  }
}

export function playerProfile(overrides: Partial<PlayerFighterFrames> = {}): BattleSpriteProfile {
  return {
    kind: 'player-fighter',
    frames: {
      idle: 0,
      dying: 1,
      dead: 2,
      defend: 3,
      hurt: 4,
      preMagic: 5,
      magic: 6,
      attackWindup: 7,
      attackRush: 8,
      attackStrike: 9,
      ...overrides,
    },
    castEffectBase: 0,
    attackEffectBase: 0,
  }
}

export function enemyProfile(
  idle: number,
  magic: number,
  attack: number,
  ticks: { idle?: number; act?: number } = {},
): BattleSpriteProfile {
  return {
    kind: 'enemy',
    idle: { start: 0, count: idle },
    magic: { start: idle, count: magic },
    attack: { start: idle + magic, count: attack },
    idleTicksPerFrame: ticks.idle ?? 5,
    actTicksPerFrame: ticks.act ?? 1,
  }
}

export interface CursorBattleSpec {
  asset: AssetId
  label: string
  frameCount: number
  /** 色板起点，用来让不同资产字节（sha）互异。 */
  colorOffset?: number
  /** 逐帧 [宽, 高]；缺省全部 8×8。 */
  frameSizes?: readonly (readonly [number, number])[]
  /** 逐帧 COLORS 下标；用 DISTINCT_COLOR_PICKS 前缀保证换帧可由像素区分。 */
  colorPicks?: readonly number[]
  definitions: readonly Omit<BattleSpriteDef, 'asset'>[]
}

export interface CursorSeededBattle {
  asset: AssetId
  path: string
  sha256: string
  encoded: EncodedBattleBytes
}

export interface CursorBattleProject {
  source: FileSource
  state: EditorState
  assetBase: AssetBase
  palette: Palette
  disk: ReturnType<typeof memoryAuthorDirectory>
  seeded: ReadonlyMap<AssetId, CursorSeededBattle>
}

/** blank + 注入战斗帧资产/定义 → 正式 loader → toEditorState → assertProjectSaveValid。 */
export async function loadCursorBattleProject(
  name: string,
  specs: readonly CursorBattleSpec[],
): Promise<CursorBattleProject> {
  const { palette } = await buildSeedAssets()
  const files = await buildBlankProject(name)
  const defs = files['content/battle-sprites.json'] as BattleSpriteDef[]
  const catalog = (files['assets/index.json'] as { assets: Record<AssetId, AssetRecordV1> }).assets
  const seeded = new Map<AssetId, CursorSeededBattle>()
  for (const spec of specs) {
    if (catalog[spec.asset])
      throw new Error(`cursor-asset-r1 battle fixture: AssetId 与 blank 冲突 ${spec.asset}`)
    const encoded = await encodeBattleBytes(
      palette,
      spec.frameCount,
      spec.colorOffset ?? 0,
      spec.frameSizes,
      spec.colorPicks,
    )
    const record = authoredBattleRecord(encoded, spec.label)
    catalog[spec.asset] = record
    files[record.path] = encoded.bytes
    for (const definition of spec.definitions)
      defs.push({ ...structuredClone(definition), asset: spec.asset })
    seeded.set(spec.asset, {
      asset: spec.asset,
      path: record.path,
      sha256: encoded.sha256,
      encoded,
    })
  }
  const disk = memoryAuthorDirectory(files)
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadAllProjectMaps(project)
  const state = toEditorState(project, scenes, maps, {}, [])
  assertProjectSaveValid(state)
  return { source, state, assetBase: project.assetBase, palette, disk, seeded }
}

/** 用当前 catalog+blob+磁盘字节走真实 decode（含 sha/bytes/gzip 校验）。 */
export async function decodeBattleAsset(
  project: Pick<CursorBattleProject, 'source'>,
  state: EditorState,
  asset: AssetId,
) {
  const record = state.assetCatalog.assets[asset]
  if (!record) throw new Error(`catalog 缺 ${asset}`)
  const pending = state.assetBlobs[record.path]
  const bytes = pending ? pending.slice(0) : await project.source.readBytes(record.path)
  return decodeBattleSpriteAssetBytes(record, bytes, `C02 断言 ${asset}`)
}

/** 外部（非 UI）合法操作者：构造一次真实 ReplaceBattleSpriteAssetCommand，缩帧默认给全体消费者原样修复。 */
export async function buildExternalReplace(
  session: EditSession,
  reader: EditorAssetReader,
  palette: Palette,
  asset: AssetId,
  nextFrameCount: number,
  colorOffset: number,
  repairs: 'identity' | 'none' = 'identity',
): Promise<{ command: ReplaceBattleSpriteAssetCommand; encoded: EncodedBattleBytes }> {
  const state = session.getState()
  const record = state.assetCatalog.assets[asset]
  if (!record) throw new Error(`catalog 缺 ${asset}`)
  const consumers = state.battleSprites.filter((entry) => entry.asset === asset)
  const previousBytes = await reader.readBytes(asset, 'battle-sprite')
  const previous = await decodeBattleSpriteAssetBytes(
    record,
    previousBytes,
    `C02 外部替换 ${asset}`,
  )
  const encoded = await encodeBattleBytes(palette, nextFrameCount, colorOffset)
  const shrinking = nextFrameCount < previous.frames.length
  const proof: BattleSpriteReplacementProof = {
    asset,
    previousSha256: record.sha256,
    previousFrameCount: previous.frames.length,
    nextFrameCount,
    consumerIds: consumers.map((entry) => entry.id),
    ...(shrinking && repairs === 'identity'
      ? {
          repairs: Object.fromEntries(
            consumers.map((entry) => [entry.id, { profile: structuredClone(entry.profile) }]),
          ),
          consumerSnapshots: Object.fromEntries(
            consumers.map((entry) => [entry.id, { profile: structuredClone(entry.profile) }]),
          ),
        }
      : {}),
  }
  return {
    command: new ReplaceBattleSpriteAssetCommand(
      consumers[0]?.id,
      asset,
      authoredBattleRecord(encoded, record.label ?? asset, record),
      encoded.bytes,
      previousBytes,
      proof,
    ),
    encoded,
  }
}

/** 外部新增一个共享同帧源的召唤用途（真实 AddBattleSpriteCommand，复用既有 catalog 记录）。 */
export async function buildExternalSharedSummon(
  session: EditSession,
  reader: EditorAssetReader,
  asset: AssetId,
  id: string,
  label: string,
): Promise<AddBattleSpriteCommand> {
  const state = session.getState()
  const record = state.assetCatalog.assets[asset]
  if (!record) throw new Error(`catalog 缺 ${asset}`)
  const bytes = await reader.readBytes(asset, 'battle-sprite')
  const decoded = await decodeBattleSpriteAssetBytes(record, bytes, `C02 外部新增 ${asset}`)
  return new AddBattleSpriteCommand(
    { id, label, asset, profile: { kind: 'summon' } },
    record,
    bytes,
    decoded.frames.length,
  )
}
