/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C05 专属夹具：合法 blank 项目内注入真实 gzip+RLE 精灵、
 * 真实 reader 解码出的 proof 与真实 bakeFrame 帧画布。只被本卡 *.cursor-r1.test.ts(x) 导入。
 */
import type {
  AssetId,
  AssetRecordV1,
  SpriteActionDef,
  SpriteDef,
  SpriteLayout,
} from '@type-pal/content'
import {
  bakeFrame,
  compressGzip,
  encodeSpriteChunk,
  loadStandardPalette,
  quantizeToRleFrame,
} from '@type-pal/reforge'
import { sha256Hex } from '../../core/binary-signature.js'
import type { SpriteLayoutEditProof } from '../../core/commands.js'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import { buildSeedAssets } from '../../core/seed-assets.js'
import { loadEditorSprite } from '../../core/sprite-assets.js'
import type { SpriteFrameView } from '../../ui/SpriteFrameWorkbench.js'
import { type CursorSpriteProject, loadCursorSpriteProject } from './sprite-fixtures.js'

export const C05_ASSET: AssetId = 'sprite.authored.c05hero'
export const C05_SPRITE = 'c05-hero'

const FRAME = 8

const COLORS: ReadonlyArray<readonly [number, number, number]> = [
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
]

function solid(
  width: number,
  height: number,
  color: readonly [number, number, number],
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4)
  for (let at = 0; at < rgba.byteLength; at += 4) {
    rgba[at] = color[0]
    rgba[at + 1] = color[1]
    rgba[at + 2] = color[2]
    rgba[at + 3] = 255
  }
  return rgba
}

export interface C05SpriteResource {
  asset: AssetId
  record: AssetRecordV1
  bytes: ArrayBuffer
  frameCount: number
}

/** 真实 gzip+RLE 精灵资源；shift 轮转色板使同帧数资源仍有不同 sha256。 */
export async function buildC05SpriteResource(
  asset: AssetId,
  frameCount: number,
  shift = 0,
  label = 'C05 资源',
): Promise<C05SpriteResource> {
  const { palette } = await buildSeedAssets()
  const frames = Array.from({ length: frameCount }, (_, index) =>
    quantizeToRleFrame(
      solid(FRAME, FRAME, COLORS[(index + shift) % COLORS.length]!),
      FRAME,
      FRAME,
      palette,
    ),
  )
  const gzip = await compressGzip(encodeSpriteChunk(frames))
  const bytes = gzip.buffer.slice(gzip.byteOffset, gzip.byteOffset + gzip.byteLength) as ArrayBuffer
  const sha256 = await sha256Hex(bytes)
  return {
    asset,
    bytes,
    frameCount,
    record: {
      kind: 'sprite',
      path: `assets/authored/sprites/${sha256}.rle`,
      mediaType: 'application/vnd.type-pal.rle',
      bytes: bytes.byteLength,
      sha256,
      label,
      origin: { kind: 'authored' },
    },
  }
}

export interface C05Open {
  project: CursorSpriteProject
  session: EditSession
  reader: EditorAssetReader
  proof: SpriteLayoutEditProof
  frames: SpriteFrameView[]
  frameCount: number
}

export interface C05OpenOptions {
  frameCount?: number
  poses?: Record<string, SpriteActionDef>
  layout?: SpriteLayout
  /** 同资产的第二个用途定义（共享资源场景）。 */
  secondDefinition?: { id: string; label: string; layout: SpriteLayout }
}

export interface C05CoreOpen {
  project: CursorSpriteProject
  session: EditSession
  reader: EditorAssetReader
  proof: SpriteLayoutEditProof
  frameCount: number
}

/** 无 DOM 版本：node 环境的命令层测试使用，proof 仍来自真实 reader 解码。 */
export async function openC05Core(
  name: string,
  options: C05OpenOptions = {},
): Promise<C05CoreOpen> {
  const frameCount = options.frameCount ?? 6
  const definitions: Array<{
    id: string
    label: string
    layout: SpriteLayout
    poses?: SpriteDef['poses']
  }> = [
    {
      id: C05_SPRITE,
      label: 'C05 英雄',
      layout: options.layout ?? { kind: 'static' },
      ...(options.poses ? { poses: options.poses } : {}),
    },
  ]
  if (options.secondDefinition) definitions.push(options.secondDefinition)
  const project = await loadCursorSpriteProject(name, [
    { asset: C05_ASSET, label: 'C05 资源', frameCount, definitions },
  ])
  const session = new EditSession(project.state)
  const reader = createEditorAssetReader(project.source, () => session.getState())
  const record = reader.record(C05_ASSET, 'sprite')
  const decoded = await loadEditorSprite(reader, C05_ASSET)
  return {
    project,
    session,
    reader,
    frameCount,
    proof: { asset: C05_ASSET, sha256: record.sha256, actualFrameCount: decoded.frames.length },
  }
}

export async function decodeProofAndFrames(
  project: CursorSpriteProject,
  reader: EditorAssetReader,
  asset: AssetId,
): Promise<{ proof: SpriteLayoutEditProof; frames: SpriteFrameView[] }> {
  const record = reader.record(asset, 'sprite')
  const decoded = await loadEditorSprite(reader, asset)
  const palette = await loadStandardPalette(project.assetBase)
  return {
    proof: { asset, sha256: record.sha256, actualFrameCount: decoded.frames.length },
    frames: decoded.frames.map((frame) => ({
      canvas: bakeFrame(frame, palette),
      width: frame.width,
      height: frame.height,
    })),
  }
}

/** blank 合法项目 + 单资产精灵 + 真实 EditSession/reader/proof/帧画布。 */
export async function openC05(name: string, options: C05OpenOptions = {}): Promise<C05Open> {
  const core = await openC05Core(name, options)
  const decoded = await decodeProofAndFrames(core.project, core.reader, C05_ASSET)
  return { ...core, ...decoded }
}

export function heroOf(session: EditSession): SpriteDef {
  const hero = session.getState().sprites.find((sprite) => sprite.id === C05_SPRITE)
  if (!hero) throw new Error('C05 夹具缺少 hero 定义')
  return hero
}

/** 逐帧标注动作：frames 序列 → 每步 250ms。 */
export function actionOf(
  label: string,
  frames: readonly number[],
  extra: Partial<Pick<SpriteActionDef, 'order' | 'loopFrom'>> = {},
): SpriteActionDef {
  return {
    label,
    ...extra,
    steps: frames.map((frame) => ({ frame, durationMs: 250 })),
  }
}
