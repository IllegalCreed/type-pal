import type {
  AssetRecordV1,
  BattleSpriteDef,
  BattleSpriteProfile,
  BattleSpriteProfileKind,
} from '@type-pal/content'
import { type BattleSpriteAssetReader, decodeBattleSpriteAssetBytes } from '@type-pal/reforge'
import { sha256Hex } from './binary-signature.js'
import type { EditorState } from './edit-session.js'

function idStem(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'authored'
  )
}

function uniqueDefinitionId(state: EditorState, base: string): string {
  if (!state.battleSprites.some((entry) => entry.id === base)) return base
  for (let suffix = 2; ; suffix++) {
    const candidate = `${base}-${suffix}`
    if (!state.battleSprites.some((entry) => entry.id === candidate)) return candidate
  }
}

export function defaultBattleSpriteProfile(
  kind: BattleSpriteProfileKind,
  frameCount: number,
): BattleSpriteProfile {
  if (!Number.isInteger(frameCount) || frameCount <= 0)
    throw new Error('上传的战斗精灵至少需要 1 帧')
  if (kind === 'summon') return { kind }
  if (kind === 'player-fighter') {
    if (frameCount < 10)
      throw new Error('玩家战斗精灵至少需要 10 帧（待机、濒死、死亡、防御、受伤、施法与三段攻击）')
    return {
      kind,
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
      },
      castEffectBase: 0,
      attackEffectBase: 0,
    }
  }
  const idleCount = Math.min(2, frameCount)
  return {
    kind,
    idle: { start: 0, count: idleCount },
    magic: { start: idleCount, count: 0 },
    attack: { start: idleCount, count: frameCount - idleCount },
    idleTicksPerFrame: 5,
    actTicksPerFrame: 1,
  }
}

export interface PreparedBattleSpriteImport {
  definition: BattleSpriteDef
  record: AssetRecordV1
  bytes: ArrayBuffer
  frameCount: number
}

/**
 * 作者上传统一命名/去重核。物理身份按完整 SHA；语义定义保持独立 id，允许一份资产多定义。
 */
export async function prepareBattleSpriteImport(
  state: EditorState,
  input: {
    hint: string
    label: string
    kind: BattleSpriteProfileKind
    bytes: ArrayBuffer
    frameCount: number
    reader: BattleSpriteAssetReader
  },
): Promise<PreparedBattleSpriteImport> {
  const sha256 = await sha256Hex(input.bytes)
  const asset = `battle-sprite.authored.${sha256}`
  const path = `assets/authored/battle-sprites/${sha256}.rle`
  const existing = state.assetCatalog.assets[asset]
  if (existing && existing.kind !== 'battle-sprite')
    throw new Error(`内容哈希 AssetId ${asset} 已被 ${existing.kind} 占用`)
  if (existing) {
    if (
      existing.sha256 !== sha256 ||
      existing.bytes !== input.bytes.byteLength ||
      existing.mediaType !== 'application/vnd.type-pal.rle' ||
      existing.path !== path ||
      existing.origin.kind !== 'authored'
    )
      throw new Error(`内容哈希 AssetId ${asset} 的 catalog 记录与上传字节冲突`)
    await decodeBattleSpriteAssetBytes(
      existing,
      await input.reader.readBytes(asset, 'battle-sprite'),
      `复用战斗精灵 AssetId "${asset}"`,
    )
  }
  const record: AssetRecordV1 = existing ?? {
    kind: 'battle-sprite',
    path,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: input.bytes.byteLength,
    sha256,
    label: input.label,
    origin: { kind: 'authored' },
  }
  const stem = idStem(input.hint)
  return {
    definition: {
      id: uniqueDefinitionId(state, `${stem}-${input.kind}`),
      label: input.label.trim() || stem,
      asset,
      profile: defaultBattleSpriteProfile(input.kind, input.frameCount),
    },
    record,
    bytes: input.bytes.slice(0),
    frameCount: input.frameCount,
  }
}
