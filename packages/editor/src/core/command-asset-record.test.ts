import { type AssetRecordV1, validateAssetCatalog } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  assertBattleSpriteRecord,
  assertSpriteRecord,
  assertTilesetRecord,
  sameAssetRecord,
} from './command-asset-record.js'
import { buildBlankProject } from './seed.js'

async function seedAsset(id: string) {
  const files = await buildBlankProject('Asset record commands')
  const catalog = validateAssetCatalog(files['assets/index.json'])
  const record = catalog.assets[id]
  if (!record) throw new Error(`Missing seed asset ${id}`)
  const bytes = files[record.path]
  if (!(bytes instanceof ArrayBuffer)) throw new Error(`Missing seed bytes at ${record.path}`)
  return { record, bytes }
}

test('sharing an existing asset requires equal catalog fields', async () => {
  const { record } = await seedAsset('sprite.generated.starter')
  const initial: AssetRecordV1 = {
    ...record,
    label: '主角',
    origin: { kind: 'generated', ref: 'a' },
  }
  expect(sameAssetRecord(initial, structuredClone(initial))).toBe(true)
  const replacements: [string, Partial<AssetRecordV1>][] = [
    ['label', { label: '新主角' }],
    ['path', { path: 'assets/generated/sprites/other.rle' }],
    ['sha256', { sha256: 'b'.repeat(64) }],
    ['bytes', { bytes: record.bytes + 1 }],
    ['origin kind', { origin: { kind: 'legacy-migrated', ref: 'a' } }],
    ['origin reference', { origin: { kind: 'generated', ref: 'b' } }],
    ['media type', { mediaType: 'image/png' }],
    ['kind', { kind: 'battle-sprite' }],
  ]
  for (const [name, replacement] of replacements)
    expect(sameAssetRecord(initial, { ...initial, ...replacement }), name).toBe(false)
})

test('tileset commands reject invalid record metadata before using the bytes', async () => {
  const { record, bytes } = await seedAsset('tileset.generated.starter')
  expect(() => assertTilesetRecord(record, bytes)).not.toThrow()
  const faults: [Partial<AssetRecordV1>, string][] = [
    [{ kind: 'sprite' }, '瓦片集资源 kind 必须是 tileset'],
    [{ mediaType: 'image/png' }, '瓦片集资源 mediaType 必须是 application/vnd.type-pal.rle'],
    [{ path: '../escape.rle' }, '瓦片集资源路径'],
    [{ bytes: record.bytes + 1 }, '瓦片集资源 bytes 与二进制长度不一致'],
    [{ sha256: 'invalid' }, '瓦片集资源 sha256 非法'],
  ]
  for (const [fault, message] of faults)
    expect(() => assertTilesetRecord({ ...record, ...fault }, bytes)).toThrow(message)
  expect(() => assertTilesetRecord(record, new ArrayBuffer(bytes.byteLength))).toThrow(
    '瓦片集资源必须是 canonical gzip',
  )
})

test.each([
  ['大世界精灵资源', 'sprite.generated.starter', 'sprite', 'battle-sprite', assertSpriteRecord],
  [
    '战斗精灵资源',
    'battle-sprite.generated.starter',
    'battle-sprite',
    'sprite',
    assertBattleSpriteRecord,
  ],
] as const)('%s uses the caller’s own expected kind and gzip envelope', async (title, id, kind, otherKind, check) => {
  const { record, bytes } = await seedAsset(id)
  expect(() => check(record, bytes)).not.toThrow()
  expect(() => check({ ...record, kind: otherKind }, bytes)).toThrow(`${title} kind 必须是 ${kind}`)
  expect(() => check(record, new ArrayBuffer(bytes.byteLength))).toThrow(
    `${title}必须是 canonical gzip`,
  )
})
