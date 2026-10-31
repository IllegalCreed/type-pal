/** Authorship and validation for schema-checked sprite, stamp and asset records. */
import { validateAssetCatalog, validateSprites, validateStampTemplates } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { MigrationJson } from './migration-files.js'
import { jsonPresent, mergeManagedFile } from './migration-merge.js'

describe('mergeManagedFile · 内容记录所有权', () => {
  test('双方首次增加同 id 模板时，作者接管优先于 add-add', () => {
    const stamp = (origin: 'authored' | 'migrated', name: string, tile: number) => ({
      id: 'stamp-1',
      name,
      origin,
      anchor: { row: 0, col: 0 },
      width: 1,
      height: 1,
      tilesetRefs: ['tileset-001'],
      layers: [{ id: 'ground', name: '地面', tiles: [[tile], [null]], sources: [[0], [null]] }],
      collision: [[0], [null]],
    })
    const ours = [stamp('authored', '作者模板', 1)]
    const theirs = [stamp('migrated', '迁移模板', 2)]
    validateStampTemplates(ours)
    validateStampTemplates(theirs)
    expect(
      mergeManagedFile(
        'content/stamps.json',
        jsonPresent([]),
        jsonPresent(ours),
        jsonPresent(theirs),
      ),
    ).toEqual({ value: { present: true, value: ours }, conflicts: [] })
  })

  test('真实精灵根数组中删动作并修改另一动作，保留完整剩余时间线', () => {
    const sprite = (poses: Record<string, MigrationJson>) => [
      {
        id: 'sprite-1',
        asset: 'sprite.pal.001',
        label: '精灵',
        layout: { kind: 'static' },
        poses,
      },
    ]
    const idle = { label: 'idle', steps: [{ frame: 0, durationMs: 100 }] }
    const wave = { label: 'wave', steps: [{ frame: 5, durationMs: 100 }] }
    const base = sprite({
      base: { ...idle, label: 'base' },
      wave: { ...idle, label: 'wave' },
      idle,
    })
    const ours = sprite({ wave })
    const theirs = structuredClone(base)
    validateSprites(base)
    validateSprites(ours)
    validateSprites(theirs)
    expect(
      mergeManagedFile(
        'content/sprites.json',
        jsonPresent(base),
        jsonPresent(ours),
        jsonPresent(theirs),
      ),
    ).toEqual({
      value: {
        present: true,
        value: [
          {
            id: 'sprite-1',
            asset: 'sprite.pal.001',
            label: '精灵',
            layout: { kind: 'static' },
            poses: { wave: { label: 'wave', steps: [{ frame: 5, durationMs: 100 }] } },
          },
        ],
      },
      conflicts: [],
    })
  })

  test('双方首次增加同 AssetId 时，authored 整条优先于 generated', () => {
    const ours = {
      version: 1,
      assets: {
        'a.x': {
          kind: 'portrait',
          path: 'assets/authored/a.png',
          mediaType: 'image/png',
          bytes: 1,
          sha256: 'a'.repeat(64),
          origin: { kind: 'authored' },
        },
      },
    }
    const theirs = {
      version: 1,
      assets: {
        'a.x': {
          kind: 'sprite',
          path: 'assets/generated/a.png',
          mediaType: 'image/png',
          bytes: 2,
          sha256: 'b'.repeat(64),
          origin: { kind: 'generated' },
        },
      },
    }
    validateAssetCatalog(ours)
    validateAssetCatalog(theirs)
    expect(
      mergeManagedFile(
        'assets/index.json',
        jsonPresent({ version: 1, assets: {} }),
        jsonPresent(ours),
        jsonPresent(theirs),
      ),
    ).toEqual({ value: { present: true, value: ours }, conflicts: [] })
  })

  test('catalog 删除版本字段后必须由真实目标校验器拒绝', () => {
    const empty = { version: 1, assets: {} }
    const ours = {
      version: 1,
      assets: {
        'a.x': {
          kind: 'portrait',
          path: 'assets/authored/a.png',
          mediaType: 'image/png',
          bytes: 1,
          sha256: 'a'.repeat(64),
          origin: { kind: 'authored' },
        },
      },
    }
    validateAssetCatalog(ours)
    expect(() =>
      mergeManagedFile(
        'assets/index.json',
        jsonPresent(empty),
        jsonPresent(ours),
        jsonPresent({ assets: {} }),
      ),
    ).toThrow(new Error('MG2 assets/index.json target.version: 期望 1'))
  })
})
