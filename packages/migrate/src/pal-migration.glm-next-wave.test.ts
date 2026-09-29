/** TEST-GLM-NEW-J-1 J01：pal-migration 纯声音身份解析 + 纯文件集场景抽取。
 * 旧证：pal-assets 系列与 pal-assets.test.ts 只盖资源物化/退役/真源加载；
 * `palSoundAssetForSources` 与 `migrationScenes` 在任何旧测试中零直接断言。
 * 本文件只测纯函数（synthetic catalog / 内存 file set），不执行真实迁移。
 */

import type { AssetCatalogV1, AssetRecordV1, SceneDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { MigrationFileSet, MigrationJson } from './pal-migration.js'
import { migrationScenes, palSoundAssetForSources } from './pal-migration.js'

const HEX_64 = `${'a'.repeat(63)}b`

function catalogWith(
  entries: Record<string, { kind: AssetRecordV1['kind']; path: string; mediaType: string }>,
): AssetCatalogV1 {
  return {
    version: 1,
    assets: Object.fromEntries(
      Object.entries(entries).map(([id, record]) => [
        id,
        {
          ...record,
          bytes: 1,
          sha256: HEX_64,
          origin: { kind: 'legacy-migrated', ref: record.path },
        },
      ]),
    ),
  }
}

describe('palSoundAssetForSources：显式 catalog 的音效身份与缺失反馈', () => {
  test('catalog 内 kind=sound 的源号映射到同一 AssetId；缺失/非 sound/非法号一律 undefined', () => {
    const catalog = catalogWith({
      'sound.pal.001': {
        kind: 'sound',
        path: 'assets/migrated/sounds/001.wav',
        mediaType: 'audio/wav',
      },
      'sound.pal.045': {
        kind: 'sound',
        path: 'assets/migrated/sounds/045.wav',
        mediaType: 'audio/wav',
      },
      'sound.pal.003': {
        kind: 'video',
        path: 'assets/migrated/videos/003.mp4',
        mediaType: 'video/mp4',
      },
    })
    const input = structuredClone(catalog)
    const resolve = palSoundAssetForSources({ assetCatalog: catalog })
    expect(resolve(1)).toBe('sound.pal.001')
    expect(resolve(45)).toBe('sound.pal.045')
    expect(resolve(2)).toBeUndefined()
    expect(resolve(3)).toBeUndefined()
    expect(resolve(0)).toBeUndefined()
    expect(resolve(-3)).toBeUndefined()
    expect(resolve(1.5)).toBeUndefined()
    expect(catalog).toEqual(input)
  })

  test('同一 resolver 重复调用输出稳定（幂等身份解析）', () => {
    const resolve = palSoundAssetForSources({ assetCatalog: catalogWith({}) })
    expect(resolve(7)).toBeUndefined()
    expect(resolve(7)).toBeUndefined()
  })
})

const sceneBody = (id: string): SceneDef => ({
  id,
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
})

function fileSetWith(index: unknown, bodies: Record<string, unknown>): MigrationFileSet {
  const files = new Map<string, MigrationJson>()
  files.set('content/scenes/index.json', JSON.parse(JSON.stringify(index)) as MigrationJson)
  for (const [path, value] of Object.entries(bodies))
    files.set(path, JSON.parse(JSON.stringify(value)) as MigrationJson)
  return {
    files,
    managedFiles: new Set(files.keys()),
    report: {} as MigrationFileSet['report'],
  }
}

describe('migrationScenes：纯文件集场景抽取，不经 projects/pal 回读', () => {
  test('按 index 顺序抽取正文；输入 file set 深保真；空 index 抽出空表', () => {
    const fileSet = fileSetWith(
      {
        version: 1,
        scenes: [
          { id: 's001', name: '客栈', path: 'content/scenes/s001.json' },
          { id: 's002', name: '市集', path: 'content/scenes/s002.json' },
        ],
      },
      {
        'content/scenes/s001.json': sceneBody('s001'),
        'content/scenes/s002.json': sceneBody('s002'),
      },
    )
    const before = structuredClone(fileSet)
    const scenes = migrationScenes(fileSet)
    expect(scenes.map((scene) => scene?.id)).toEqual(['s001', 's002'])
    expect(scenes[0]).toEqual(sceneBody('s001'))
    expect(fileSet).toEqual(before)
  })

  test('index 正文缺失时暴露 undefined 元素（缺失反馈），不静默造场景也不抛', () => {
    const fileSet = fileSetWith(
      { version: 1, scenes: [{ id: 's001', name: '客栈', path: 'content/scenes/s001.json' }] },
      {},
    )
    expect(migrationScenes(fileSet)).toEqual([undefined])
  })

  test('非法 index 走 validateSceneIndex fail-loud', () => {
    const fileSet = fileSetWith({ version: 2, scenes: [] }, {})
    expect(() => migrationScenes(fileSet)).toThrow(/仅支持 1/)
  })
})
