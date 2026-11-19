import {
  type SpriteDef,
  validateAuthorScenes,
  validateAuthorSharedScripts,
  validateMapIndex,
  validateSprites,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from './migration-baseline.js'
import type { MigrationJson } from './migration-files.js'
import { createMigrationPlan, snapshotOf } from './migration-plan.js'

const snapshot = (files: Record<string, MigrationJson>): MigrationSnapshot => ({
  files: new Map(Object.entries(files)),
  managedFiles: new Set(Object.keys(files)),
})
describe('authors and sources in the migration plan', () => {
  test('base 等于 theirs 时保留 ours，推进 baseline 后重放仍严格零计划', () => {
    const path = 'content/locale.json'
    const base = snapshot({ [path]: { 'dlg.opening': '原文' } })
    const ours = snapshot({ [path]: { 'dlg.opening': '作者改文' } })
    const theirs = snapshot({ [path]: { 'dlg.opening': '原文' } })

    const first = createMigrationPlan(base, ours, theirs)
    expect(first.target.get(path)).toEqual({ 'dlg.opening': '作者改文' })
    expect(first.conflicts).toEqual([])
    expect(first.writes.size).toBe(0)
    expect(first.deletes).toEqual([])
    expect(first.summary).toMatchObject({ kept: 1, writes: 0, deletes: 0, conflicts: 0 })

    const replay = createMigrationPlan(
      snapshotOf(theirs),
      snapshotOf(snapshot({ [path]: first.target.get(path)! })),
      theirs,
    )
    expect(replay.target.get(path)).toEqual({ 'dlg.opening': '作者改文' })
    expect(replay.conflicts).toEqual([])
    expect(replay.writes.size).toBe(0)
    expect(replay.deletes).toEqual([])
    expect(replay.summary).toMatchObject({ kept: 1, writes: 0, deletes: 0, conflicts: 0 })
  })

  test('四类静态图 AssetId 被 authored 整条接管，迁移更新不抢回且二次严格零计划', () => {
    const families = [
      ['portrait.pal.001', 'portrait'],
      ['face.pal.li-xiaoyao', 'face'],
      ['item-icon.pal.001', 'item-icon'],
      ['battle-background.pal.006', 'battle-background'],
    ] as const
    const migratedCatalog = (revision: 'a' | 'b'): MigrationJson => ({
      version: 1,
      assets: Object.fromEntries(
        families.map(([id, kind], index) => [
          id,
          {
            kind,
            path: `assets/migrated/${kind}/${revision}-${index}.png`,
            mediaType: 'image/png',
            bytes: revision === 'a' ? index + 1 : index + 11,
            sha256: (revision === 'a' ? 'a' : 'b').repeat(64),
            origin: { kind: 'legacy-migrated' },
          },
        ]),
      ),
    })
    const authoredCatalog: MigrationJson = {
      version: 1,
      assets: Object.fromEntries(
        families.map(([id, kind], index) => [
          id,
          {
            kind,
            path: `assets/authored/static-${index}.png`,
            mediaType: 'image/png',
            bytes: 101 + index,
            sha256: String(index + 1).repeat(64),
            label: `作者替换 ${kind}`,
            origin: { kind: 'authored' },
          },
        ]),
      ),
    }
    const path = 'assets/index.json'
    const base = snapshot({ [path]: migratedCatalog('a') })
    const ours = snapshot({ [path]: authoredCatalog })
    const nextGenerated = snapshot({ [path]: migratedCatalog('b') })

    const first = createMigrationPlan(base, ours, nextGenerated)
    expect(first.conflicts).toEqual([])
    expect(first.target.get(path)).toEqual(authoredCatalog)
    expect(first.writes.size).toBe(0)

    const nextBaseline = snapshot({ [path]: migratedCatalog('b') })
    const second = createMigrationPlan(nextBaseline, ours, nextGenerated)
    expect(second.conflicts).toEqual([])
    expect(second.target.get(path)).toEqual(authoredCatalog)
    expect(second.writes.size).toBe(0)
    expect(second.deletes).toEqual([])
  })

  test('地图名称双方同改时冲突并保持零写盘计划', () => {
    const path = 'content/maps/index.json'
    const index = (name: string): MigrationJson => {
      const value = {
        version: 1,
        maps: [{ id: 'map-001', name, path: 'content/maps/map-001.json' }],
      }
      validateMapIndex(value)
      return value
    }
    const plan = createMigrationPlan(
      snapshot({ [path]: index('PAL 地图 1') }),
      snapshot({ [path]: index('作者命名') }),
      snapshot({ [path]: index('盛渔村') }),
    )
    expect(plan.conflicts).toMatchObject([
      { file: path, path: expect.stringContaining('/maps/@string:map-001/name') },
    ])
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])
  })

  test('精灵双定义合并时保留 base 作者字段，并接受上游布局修正与未改变变体删除', () => {
    const path = 'content/sprites.json'
    const legacyBase: Pick<SpriteDef, 'id' | 'asset' | 'label' | 'layout'>[] = [
      {
        id: 'sprite-541',
        asset: 'sprite.pal.541',
        label: '原精灵 541(0x65 换装)',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
      {
        id: 'sprite-541-f0',
        asset: 'sprite.pal.541',
        label: '原精灵 541',
        layout: { kind: 'static' },
      },
    ]
    const ours = structuredClone(legacyBase)
    ours[0]!.label = '作者命名：乘船李逍遥'
    const theirs: MigrationJson = [
      {
        id: 'sprite-541',
        asset: 'sprite.pal.541',
        label: '原精灵 541(0x65 换装)',
        layout: { kind: 'static' },
      },
    ]
    validateSprites(legacyBase)
    validateSprites(ours)
    const plan = createMigrationPlan(
      snapshot({ [path]: legacyBase }),
      snapshot({ [path]: ours }),
      snapshot({ [path]: theirs }),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get(path)).toEqual([
      {
        id: 'sprite-541',
        asset: 'sprite.pal.541',
        label: '作者命名：乘船李逍遥',
        layout: { kind: 'static' },
      },
    ])
  })

  test('作者修改待删除的错误精灵变体时必须 delete-modify 冲突且零写盘', () => {
    const path = 'content/sprites.json'
    const legacyBase: Pick<SpriteDef, 'id' | 'asset' | 'label' | 'layout'>[] = [
      {
        id: 'sprite-541',
        asset: 'sprite.pal.541',
        label: '原精灵 541(0x65 换装)',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
      {
        id: 'sprite-541-f0',
        asset: 'sprite.pal.541',
        label: '原精灵 541',
        layout: { kind: 'static' },
      },
    ]
    const ours = structuredClone(legacyBase)
    ours[1]!.label = '作者仍在使用的变体'
    validateSprites(legacyBase)
    validateSprites(ours)
    const plan = createMigrationPlan(
      snapshot({ [path]: legacyBase }),
      snapshot({ [path]: ours }),
      snapshot({
        [path]: [
          {
            id: 'sprite-541',
            asset: 'sprite.pal.541',
            label: '原精灵 541',
            layout: { kind: 'static' },
          },
        ],
      }),
    )
    expect(plan.conflicts).toEqual([
      expect.objectContaining({
        file: path,
        path: '/@string:sprite-541-f0',
        type: 'delete-modify',
      }),
    ])
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])
  })

  test('merges an authored pose and trigger change with a new source animation', () => {
    const sprites = 'content/sprites.json'
    const scene = 'content/scenes/s001.json'
    const baseDef = {
      id: 'sprite-1',
      asset: 'sprite.pal.001',
      label: '精灵',
      layout: { kind: 'static' },
    }
    const authoredPose = { label: '作者动作', steps: [{ frame: 2, durationMs: 90 }] }
    const sourcePose = {
      label: 'PAL 自动循环',
      steps: [{ frame: 0, durationMs: 100 }],
      loopFrom: 0,
    }
    const ourSprite = [{ ...baseDef, poses: { authored: authoredPose } }]
    const newSprite = [{ ...baseDef, poses: { idle: sourcePose } }]
    const mergedSprite = [{ ...baseDef, poses: { authored: authoredPose, idle: sourcePose } }]
    const page = { id: 'default', label: '默认', trigger: 'talk' }
    const initial = legalScene(page, 100)
    const ours = legalScene(page, 200)
    const animation = { sprite: 'sprite-1', action: 'idle', loop: true }
    const incoming = legalScene({ ...page, animation }, 100)
    for (const value of [[baseDef], ourSprite, newSprite, mergedSprite]) validateSprites(value)
    const plan = createMigrationPlan(
      snapshot({ [sprites]: [baseDef], [scene]: initial }),
      snapshot({ [sprites]: ourSprite, [scene]: ours }),
      snapshot({ [sprites]: newSprite, [scene]: incoming }),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.writes).toEqual(
      new Map([
        [scene, legalScene({ ...page, animation }, 200)],
        [sprites, mergedSprite],
      ]),
    )
  })

  test('detects a source deletion of the automatic behavior changed by the author', () => {
    const path = 'content/scenes/s001.json'
    const page = { id: 'default', label: '默认', auto: 'patrol' }
    const plan = createMigrationPlan(
      snapshot({ [path]: legalScene(page, 100) }),
      snapshot({ [path]: legalScene({ ...page, auto: 'patrol-slow' }, 100) }),
      snapshot({ [path]: legalScene({ id: 'default', label: '默认' }, 100) }),
    )
    expect(plan.conflicts).toEqual([
      expect.objectContaining({
        file: path,
        path: '/entities/@string:e1/pages/@string:default/auto',
        type: 'delete-modify',
      }),
    ])
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])
  })

  test('merges independent authored and source shared-script records in the current library', () => {
    const path = 'content/shared-scripts.json'
    const script = (ms: number) => ({ name: '节拍', self: 'none', body: [{ kind: 'wait', ms }] })
    const base = { intro: script(100) }
    const ours = { intro: script(100), authored: script(90) }
    const theirs = { intro: script(200) }
    for (const value of [base, ours, theirs]) validateAuthorSharedScripts(value)
    const plan = createMigrationPlan(
      snapshot({ [path]: base }),
      snapshot({ [path]: ours }),
      snapshot({ [path]: theirs }),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.writes.get(path)).toEqual({ intro: script(200), authored: script(90) })
  })

  test('divergent edits of the same current shared script step block the entire write plan', () => {
    const path = 'content/shared-scripts.json'
    const version = (ms: number) => {
      const library = { intro: { name: '节拍', self: 'none', body: [{ kind: 'wait', ms }] } }
      validateAuthorSharedScripts(library)
      return snapshot({ [path]: library })
    }
    const plan = createMigrationPlan(version(100), version(150), version(200))
    expect(plan.conflicts).toEqual([
      expect.objectContaining({
        file: path,
        path: expect.stringContaining('/intro/body'),
        type: 'value',
      }),
    ])
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])
  })
})

function legalScene(page: MigrationJson, waitMs: number): MigrationJson {
  const behavior = (ms: number) => ({
    label: '脚步',
    order: 0,
    flow: {
      kind: 'stages',
      initial: 'initial',
      stages: [{ id: 'initial', body: [{ kind: 'wait', ms }] }],
    },
  })
  const scene = {
    id: 's001',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e1',
        sprite: 'sprite-1',
        pos: { col: 0, row: 0, height: 0 },
        initialPage: 'default',
        pages: [page],
        behaviors: {
          trigger: { talk: behavior(waitMs) },
          auto: { patrol: behavior(100), 'patrol-slow': { ...behavior(200), order: 1 } },
        },
      },
    ],
  }
  validateAuthorScenes([scene])
  return scene
}
