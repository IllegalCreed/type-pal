import type { AssetRecordV1, BattleSpriteDef } from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import { gzipChunk, gzipFrames, rleRecord } from './__tests__/asset-rle-fixtures.js'
import {
  BattleSpriteAssetCache,
  decodeBattleSpriteAssetBytes,
  loadBattleSpriteDefinition,
} from './assets.js'
import { sha256Bytes } from './hash.js'

const first = [17, 31, 47, 63] as const
const second = [2, 3, 5, 7] as const
const timings = { idleTicksPerFrame: 1, actTicksPerFrame: 0 }

const definition = {
  id: 'fighter',
  label: '战士',
  asset: 'battle.shared',
  profile: {
    kind: 'player-fighter',
    frames: {
      idle: 0,
      dying: 0,
      dead: 0,
      defend: 0,
      hurt: 0,
      preMagic: 0,
      magic: 0,
      attackWindup: 0,
      attackRush: 0,
      attackStrike: 0,
    },
    castEffectBase: 0,
    attackEffectBase: 0,
  },
} satisfies BattleSpriteDef

test('战斗精灵依次拒收错误 kind、媒体类型、登记长度和 SHA', async () => {
  const bytes = await gzipFrames(first)
  const good = await rleRecord('battle-sprite', 'fighter', bytes)
  await expect(decodeBattleSpriteAssetBytes({ ...good, kind: 'sprite' }, bytes)).rejects.toThrow(
    '期望 kind=battle-sprite，实际 sprite',
  )
  await expect(
    decodeBattleSpriteAssetBytes({ ...good, mediaType: 'image/png' }, bytes),
  ).rejects.toThrow('mediaType 非法 image/png')
  await expect(
    decodeBattleSpriteAssetBytes({ ...good, bytes: good.bytes + 1 }, bytes),
  ).rejects.toThrow(`bytes 登记 ${good.bytes + 1}，实际 ${bytes.byteLength}`)
  await expect(
    decodeBattleSpriteAssetBytes({ ...good, sha256: '0'.repeat(64) }, bytes),
  ).rejects.toThrow('sha256 不符')
})

test('战斗精灵解出 canonical 像素和首帧锚点，SHA 正确的裸 RLE 仍拒收', async () => {
  const raw = Uint8Array.of(1, 0, 1, 0, 1, 0, 1, 7)
  const record = await rleRecord('battle-sprite', 'fighter', raw.buffer)
  await expect(decodeBattleSpriteAssetBytes(record, raw.buffer)).rejects.toThrow(
    '.rle 必须带 gzip 头',
  )

  const bytes = await gzipFrames(first, second, [11, 13, 19, 23])
  const loaded = await decodeBattleSpriteAssetBytes(
    { ...record, bytes: bytes.byteLength, sha256: await sha256Bytes(new Uint8Array(bytes)) },
    bytes,
  )
  expect(loaded).toMatchObject({ profile: 'canonical', anchorX: 1, anchorY: 2 })
  expect(loaded.frames.map((frame) => Array.from(frame.pixels))).toEqual([
    [...first],
    [...second],
    [11, 13, 19, 23],
  ])
})

test('只有 legacy-migrated 来源可跳过真实坏尾，合法首帧和报表仍完整', async () => {
  const raw = Uint8Array.of(
    3,
    0,
    6,
    0,
    0,
    0, // 两个数据槽与末尾 sentinel，第 2 帧偏移 6 words。
    1,
    0,
    1,
    0,
    1,
    7, // 合法 1×1 首帧，索引 7。
    255,
    15,
    255,
    15,
    1,
    0, // 尾帧 4095×4095，超出格式的帧限制。
  )
  const bytes = await gzipChunk(raw)
  const canonical = await rleRecord('battle-sprite', 'legacy-tail', bytes)
  const rejected = await decodeBattleSpriteAssetBytes(canonical, bytes).then(
    () => undefined,
    (failure: unknown) => failure,
  )
  expect(rejected).toEqual(new Error('sprite chunk frame 1 尺寸非法'))

  const legacy: AssetRecordV1 = {
    ...canonical,
    path: 'assets/migrated/legacy-tail.rle',
    origin: { kind: 'legacy-migrated' },
  }
  const decoded = await decodeBattleSpriteAssetBytes(legacy, bytes)
  expect(decoded).toMatchObject({
    profile: 'legacy-migrated',
    frames: [{ width: 1, height: 1, pixels: Uint8Array.of(7), opaque: Uint8Array.of(1) }],
    decode: { declaredSlots: 3, trailingSentinel: true, skippedLegacyTailSlots: 1 },
  })
})

test('战斗精灵并发共享一次解码，登记图像变化和失败后重试返回实际像素', async () => {
  let bytes = await gzipFrames(first)
  let record = await rleRecord('battle-sprite', 'fighter', bytes)
  const readBytes = vi.fn(async () => bytes)
  const reader = { record: () => record, readBytes }
  const cache = new BattleSpriteAssetCache()
  const id = 'battle.fighter'
  const [left, right] = await Promise.all([cache.load(reader, id), cache.load(reader, id)])
  expect(left).toBe(right)
  expect(left.frames[0]?.pixels).toEqual(Uint8Array.from(first))
  expect(readBytes).toHaveBeenCalledTimes(1)

  bytes = await gzipFrames(second)
  record = await rleRecord('battle-sprite', 'fighter-v2', bytes)
  expect((await cache.load(reader, id)).frames[0]?.pixels).toEqual(Uint8Array.from(second))
  expect(readBytes).toHaveBeenCalledTimes(2)

  await expect(
    cache.load({ ...reader, readBytes: async () => new ArrayBuffer(1) }, 'battle.retry'),
  ).rejects.toThrow(`battle-sprite AssetId "battle.retry": bytes 登记 ${record.bytes}，实际 1`)
  expect((await cache.load(reader, 'battle.retry')).frames[0]?.pixels).toEqual(
    Uint8Array.from(second),
  )
})

test('单独改变战斗精灵的 label 或 origin.ref 都会使旧记录失效', async () => {
  const bytes = await gzipFrames(first)
  let record = { ...(await rleRecord('battle-sprite', 'fighter', bytes)), label: 'first' }
  const reader = { record: () => record, readBytes: vi.fn(async () => bytes) }
  const cache = new BattleSpriteAssetCache()
  const id = 'battle.fighter'
  const firstLoad = await cache.load(reader, id)
  expect(cache.get(reader, id)).toBe(firstLoad)

  record = { ...record, label: 'renamed' }
  expect(cache.get(reader, id)).toBeUndefined()
  const renamed = await cache.load(reader, id)
  expect(renamed).not.toBe(firstLoad)
  expect(renamed.frames[0]?.pixels).toEqual(Uint8Array.from(first))

  record = { ...record, origin: { ...record.origin, ref: 'art:battle-27' } }
  expect(cache.get(reader, id)).toBeUndefined()
  const repointed = await cache.load(reader, id)
  expect(repointed).not.toBe(renamed)
  expect(repointed.frames[0]?.pixels).toEqual(Uint8Array.from(first))
  expect(reader.readBytes).toHaveBeenCalledTimes(3)
})

test('裁剪战斗精灵缓存时保留受保护项并逐出其余项', async () => {
  const bytes = await gzipFrames(first)
  const record = await rleRecord('battle-sprite', 'fighter', bytes)
  const reader = { record: () => record, readBytes: async () => bytes.slice(0) }
  const cache = new BattleSpriteAssetCache(1)
  await cache.load(reader, 'oldest')
  await cache.load(reader, 'old')
  const keep = await cache.load(reader, 'keep')
  cache.prune(new Set(['keep']))
  expect(cache.get(reader, 'oldest')).toBeUndefined()
  expect(cache.get(reader, 'old')).toBeUndefined()
  expect(cache.get(reader, 'keep')).toBe(keep)
})

test('战斗精灵 readiness 接受匹配定义并拒绝错误 profile 与首个缺失帧', async () => {
  const bytes = await gzipFrames(first)
  const record = await rleRecord('battle-sprite', 'fighter', bytes)
  const reader = { record: () => record, readBytes: async () => bytes }
  const cache = new BattleSpriteAssetCache()
  await expect(
    loadBattleSpriteDefinition(cache, reader, definition, 'player-fighter'),
  ).resolves.toMatchObject({
    definition: { id: 'fighter' },
    sprite: { frames: [{ pixels: Uint8Array.from(first) }] },
  })
  await expect(loadBattleSpriteDefinition(cache, reader, definition, 'enemy')).rejects.toThrow(
    'profile 期望 enemy，实际 player-fighter',
  )

  const player: BattleSpriteDef = {
    ...definition,
    profile: { ...definition.profile, frames: { ...definition.profile.frames, attackStrike: 1 } },
  }
  await expect(loadBattleSpriteDefinition(cache, reader, player, 'player-fighter')).rejects.toThrow(
    'BattleSpriteDef "fighter" 引用帧 1，AssetId "battle.shared" 只有 1 帧',
  )

  const count = 160_000
  const enemy: BattleSpriteDef = {
    ...definition,
    id: 'wide-enemy',
    profile: {
      kind: 'enemy',
      idle: { start: 0, count },
      magic: { start: count, count: 0 },
      attack: { start: count, count: 0 },
      ...timings,
    },
  }
  await expect(loadBattleSpriteDefinition(cache, reader, enemy, 'enemy')).rejects.toThrow(
    'BattleSpriteDef "wide-enemy" 引用帧 1，AssetId "battle.shared" 只有 1 帧',
  )
})
