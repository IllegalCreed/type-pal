/** TEST-GLM-NEW-J-1 J01：pal-migration 纯声音身份解析。
 * 旧证：pal-assets 系列与 pal-assets.test.ts 只盖资源物化/退役/真源加载；
 * `palSoundAssetForSources` 在任何旧测试中零直接断言，且它有生产调用者
 * （buildPalMigration pal-migration.ts:392 唯一解析口径）。
 * `migrationScenes` 经 Codex r1 审核判 unreachable/未证（仓内无本新测之外的调用者，
 * 且正文缺失臂只是 `as unknown as SceneDef` 的现状而非合同），按停止线移除，不钉现状。
 * 本文件只测纯函数（synthetic catalog），不执行真实迁移。
 */

import type { AssetCatalogV1, AssetRecordV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { palSoundAssetForSources } from './pal-migration.js'

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
