import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from './migration-baseline.js'
import { createInitialMigrationPlan, createMigrationPlan, snapshotOf } from './migration-plan.js'
import type { MigrationFileSet, MigrationJson } from './pal-migration.js'

const snapshot = (files: Record<string, MigrationJson>): MigrationSnapshot => ({
  files: new Map(Object.entries(files)),
  managedFiles: new Set(Object.keys(files)),
})
const generated = (
  files: Record<string, MigrationJson>,
): Pick<MigrationFileSet, 'files' | 'managedFiles'> => ({
  files: new Map(Object.entries(files)),
  managedFiles: new Set(Object.keys(files)),
})

const projectMap = (tile: number): MigrationJson => ({
  version: 4,
  width: 1,
  height: 1,
  tilesetRefs: ['tileset-001'],
  layers: [
    {
      id: 'floor',
      name: '地板',
      tiles: [[tile], [tile]],
      sources: [[0], [0]],
      heights: [[0], [0]],
    },
  ],
  collision: [[0], [0]],
})

describe('createMigrationPlan', () => {
  test('独立吸收上游和人工字段并只计划真实变化', () => {
    const base = snapshot({ 'content/locale.json': { a: 1, b: 1 } })
    const ours = snapshot({ 'content/locale.json': { a: 2, b: 1 } })
    const plan = createMigrationPlan(
      base,
      ours,
      generated({ 'content/locale.json': { a: 1, b: 3 } }),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get('content/locale.json')).toEqual({ a: 2, b: 3 })
    expect(plan.summary).toMatchObject({ writes: 1, conflicts: 0 })
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
    const nextGenerated = generated({ [path]: migratedCatalog('b') })

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

  test('冲突时严格零写盘计划', () => {
    const base = snapshot({ 'content/locale.json': { a: 1 } })
    const ours = snapshot({ 'content/locale.json': { a: 2 } })
    const plan = createMigrationPlan(base, ours, generated({ 'content/locale.json': { a: 3 } }))
    expect(plan.conflicts).toHaveLength(1)
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])
  })

  test('生成文件退役只删托管文件', () => {
    const base = snapshot({ 'content/old.json': { a: 1 } })
    const ours = snapshot({ 'content/old.json': { a: 1 } })
    const plan = createMigrationPlan(base, ours, generated({}))
    expect(plan.deletes).toEqual(['content/old.json'])
  })

  test('精灵双定义合并时保留 base 作者字段，并接受上游布局修正与未改变变体删除', () => {
    const path = 'content/sprites.json'
    const legacyBase: MigrationJson = [
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
    ;(ours[0] as { label: string }).label = '作者命名：乘船李逍遥'
    const theirs: MigrationJson = [
      {
        id: 'sprite-541',
        asset: 'sprite.pal.541',
        label: '原精灵 541(0x65 换装)',
        layout: { kind: 'static' },
      },
    ]
    const plan = createMigrationPlan(
      snapshot({ [path]: legacyBase }),
      snapshot({ [path]: ours }),
      generated({ [path]: theirs }),
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
    const legacyBase: MigrationJson = [
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
    ;(ours[1] as { label: string }).label = '作者仍在使用的变体'
    const plan = createMigrationPlan(
      snapshot({ [path]: legacyBase }),
      snapshot({ [path]: ours }),
      generated({
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

  test('动作迁移可与作者新增动作、场景 trigger 修改独立合并', () => {
    const spritesPath = 'content/sprites.json'
    const scenePath = 'content/scenes/s001.json'
    const baseSprite: MigrationJson = [
      { id: 'sprite-1', asset: 'sprite.pal.001', label: '精灵', layout: { kind: 'static' } },
    ]
    const baseScene: MigrationJson = {
      id: 's001',
      entities: [
        {
          id: 'e1',
          sprite: 'sprite-1',
          pages: [
            {
              auto: { stages: [{ body: [{ kind: 'wait', ms: 100 }] }] },
              trigger: { on: 'interact', stages: [{ body: [{ kind: 'wait', ms: 1 }] }] },
            },
          ],
        },
      ],
    }
    const oursSprite = structuredClone(baseSprite)
    ;(oursSprite[0] as Record<string, MigrationJson>).poses = {
      authored: { label: '作者动作', steps: [{ frame: 2, durationMs: 90 }] },
    }
    const oursScene = structuredClone(baseScene)
    ;(
      (oursScene as { entities: Array<{ pages: Array<{ trigger: unknown }> }> }).entities[0]!
        .pages[0]!.trigger as { stages: Array<{ body: MigrationJson[] }> }
    ).stages[0]!.body = [{ kind: 'wait', ms: 2 }]
    const theirsSprite = structuredClone(baseSprite)
    ;(theirsSprite[0] as Record<string, MigrationJson>).poses = {
      'pal-auto-v1-generated': {
        label: 'PAL 自动循环',
        steps: [{ frame: 0, durationMs: 100 }],
        loopFrom: 0,
      },
    }
    const theirsScene = structuredClone(baseScene) as {
      id: string
      entities: Array<{ pages: Array<Record<string, MigrationJson>> }>
    }
    delete theirsScene.entities[0]!.pages[0]!.auto
    theirsScene.entities[0]!.pages[0]!.animation = {
      sprite: 'sprite-1',
      action: 'pal-auto-v1-generated',
      loop: true,
    }

    const plan = createMigrationPlan(
      snapshot({ [spritesPath]: baseSprite, [scenePath]: baseScene }),
      snapshot({ [spritesPath]: oursSprite, [scenePath]: oursScene }),
      generated({ [spritesPath]: theirsSprite, [scenePath]: theirsScene as MigrationJson }),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get(spritesPath)).toMatchObject([
      {
        poses: {
          'pal-auto-v1-generated': expect.any(Object),
          authored: expect.any(Object),
        },
      },
    ])
    expect(plan.target.get(scenePath)).toMatchObject({
      entities: [
        {
          pages: [
            {
              animation: { action: 'pal-auto-v1-generated' },
              trigger: { stages: [{ body: [{ kind: 'wait', ms: 2 }] }] },
            },
          ],
        },
      ],
    })
  })

  test('作者修改待动作化 auto 时必须 delete-modify 冲突且整批零写盘', () => {
    const path = 'content/scenes/s001.json'
    const scene = (ms: number, animation = false): MigrationJson => ({
      id: 's001',
      entities: [
        {
          id: 'e1',
          pages: [
            animation
              ? {
                  animation: {
                    sprite: 'sprite-1',
                    action: 'pal-auto-v1-generated',
                    loop: true,
                  },
                }
              : { auto: { stages: [{ body: [{ kind: 'wait', ms }] }] } },
          ],
        },
      ],
    })
    const plan = createMigrationPlan(
      snapshot({ [path]: scene(100) }),
      snapshot({ [path]: scene(200) }),
      generated({ [path]: scene(0, true) }),
    )
    expect(plan.conflicts).toMatchObject([
      { file: path, path: expect.stringContaining('/pages/0/auto'), type: 'delete-modify' },
    ])
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])
  })

  test('当前 index 引用的 ours-only 文件会保留', () => {
    const base = snapshot({})
    const ours = snapshot({ 'content/scripts/chunks/manual.json': { id: 'manual' } })
    const plan = createMigrationPlan(base, ours, generated({}))
    expect(plan.target.get('content/scripts/chunks/manual.json')).toEqual({ id: 'manual' })
    expect(plan.deletes).toEqual([])
  })

  test('脚本按稳定 id 合并并忽略双方 bytes/hash/imports 派生差异', () => {
    const index = (bytes: number, hash: string): MigrationJson => ({
      version: 1,
      shards: { shared: 1, global: {} },
      chunks: {
        'shared/c00': {
          path: 'chunks/shared/c00.json',
          bytes,
          hash,
          imports: [`derived-${hash}`],
        },
      },
    })
    const chunk = (left: number, right: number, imports: string[]): MigrationJson => ({
      version: 1,
      id: 'shared/c00',
      imports,
      scripts: {
        'shared/L_1/default': [{ kind: 'wait', ms: left }],
        'shared/L_2/default': [{ kind: 'wait', ms: right }],
      },
    })
    const path = 'content/scripts/chunks/shared/c00.json'
    const base = snapshot({
      'content/scripts/index.json': index(1, 'base'),
      [path]: chunk(1, 1, ['base']),
    })
    const ours = snapshot({
      'content/scripts/index.json': index(2, 'ours'),
      [path]: chunk(2, 1, ['ours']),
    })
    const plan = createMigrationPlan(
      base,
      ours,
      generated({
        'content/scripts/index.json': index(3, 'theirs'),
        [path]: chunk(1, 3, ['theirs']),
      }),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get(path)).toMatchObject({
      scripts: {
        'shared/L_1/default': [{ kind: 'wait', ms: 2 }],
        'shared/L_2/default': [{ kind: 'wait', ms: 3 }],
      },
    })
  })

  test('脚本跨 chunk 重分桶时保留人工 body 并重写所有 ref.chunk', () => {
    const shards = { shared: 1, global: {} }
    const rootId = 'scene/s001/root/a'
    const targetId = 'scene/s001/target'
    const chunk = (id: string, refChunk: string, wait: number): MigrationJson => ({
      version: 1,
      id,
      scripts: {
        [rootId]: [
          { kind: 'callScript', ref: { chunk: refChunk, id: targetId } },
          { kind: 'wait', ms: wait },
        ],
        [targetId]: [{ kind: 'stopScript' }],
      },
    })
    const index = (id: string): MigrationJson => ({
      version: 1,
      shards,
      chunks: { [id]: { path: `chunks/${id}.json`, bytes: 1, hash: id } },
    })
    const legacyPath = 'content/scripts/chunks/legacy.json'
    const targetPath = 'content/scripts/chunks/scene/s001.json'
    const base = snapshot({
      'content/scripts/index.json': index('legacy'),
      [legacyPath]: chunk('legacy', 'legacy', 1),
    })
    const ours = snapshot({
      'content/scripts/index.json': index('legacy'),
      [legacyPath]: chunk('legacy', 'legacy', 2),
    })
    const plan = createMigrationPlan(
      base,
      ours,
      generated({
        'content/scripts/index.json': index('scene/s001'),
        [targetPath]: chunk('scene/s001', 'scene/s001', 1),
      }),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.deletes).toContain(legacyPath)
    expect(plan.target.get(targetPath)).toMatchObject({
      id: 'scene/s001',
      scripts: {
        [rootId]: [
          { kind: 'callScript', ref: { chunk: 'scene/s001', id: targetId } },
          { kind: 'wait', ms: 2 },
        ],
      },
    })
  })

  test('ours-only 作者目录与作者 body 可和 theirs 同 shard 内部脚本无冲突合并', () => {
    const authoredId = 'shared/user/demo-a1b2c3d4'
    const internalId = 'shared/L_1/default'
    const chunkId = 'shared/c00'
    const path = 'content/scripts/chunks/shared/c00.json'
    const makeIndex = (library?: MigrationJson): MigrationJson => ({
      version: 1,
      shards: { shared: 1, global: {} },
      chunks: { [chunkId]: { path: 'chunks/shared/c00.json', bytes: 1 } },
      ...(library ? { library } : {}),
    })
    const makeChunk = (internalWait: number, authoredWait?: number): MigrationJson => ({
      version: 1,
      id: chunkId,
      scripts: {
        [internalId]: [{ kind: 'wait', ms: internalWait }],
        ...(authoredWait === undefined
          ? {}
          : { [authoredId]: [{ kind: 'wait', ms: authoredWait }] }),
      },
    })
    const authorLibrary: MigrationJson = {
      [authoredId]: { name: '演示', self: 'none' },
    }
    const plan = createMigrationPlan(
      snapshot({ 'content/scripts/index.json': makeIndex(), [path]: makeChunk(1) }),
      snapshot({
        'content/scripts/index.json': makeIndex(authorLibrary),
        [path]: makeChunk(1, 9),
      }),
      generated({ 'content/scripts/index.json': makeIndex(), [path]: makeChunk(2) }),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get('content/scripts/index.json')).toMatchObject({ library: authorLibrary })
    expect(plan.target.get(path)).toMatchObject({
      scripts: {
        [internalId]: [{ kind: 'wait', ms: 2 }],
        [authoredId]: [{ kind: 'wait', ms: 9 }],
      },
    })
  })

  test('双方修改同一作者 body 时显式冲突且零写盘', () => {
    const authoredId = 'shared/user/demo-a1b2c3d4'
    const chunkId = 'shared/c00'
    const path = 'content/scripts/chunks/shared/c00.json'
    const index: MigrationJson = {
      version: 1,
      shards: { shared: 1, global: {} },
      chunks: { [chunkId]: { path: 'chunks/shared/c00.json', bytes: 1 } },
      library: { [authoredId]: { name: '演示', self: 'none' } },
    }
    const chunk = (ms: number): MigrationJson => ({
      version: 1,
      id: chunkId,
      scripts: { [authoredId]: [{ kind: 'wait', ms }] },
    })
    const plan = createMigrationPlan(
      snapshot({ 'content/scripts/index.json': index, [path]: chunk(1) }),
      snapshot({ 'content/scripts/index.json': index, [path]: chunk(2) }),
      generated({ 'content/scripts/index.json': index, [path]: chunk(3) }),
    )
    expect(plan.conflicts.length).toBeGreaterThan(0)
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])
  })

  test('原子地图 baseline 仅有 hash 时仍按三方规则保作者修改', () => {
    const path = 'content/maps/map-001.json'
    const fullBase = snapshotOf(generated({ [path]: projectMap(1) }))
    const hashOnlyBase: MigrationSnapshot = {
      files: new Map(),
      managedFiles: new Set([path]),
      hashes: fullBase.hashes,
    }
    const plan = createMigrationPlan(
      hashOnlyBase,
      snapshot({ [path]: projectMap(2) }),
      generated({ [path]: projectMap(1) }),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get(path)).toEqual(projectMap(2))
    expect(plan.writes.size).toBe(0)
  })

  test('原子地图 ours=base 时接收新迁移，双方变化时报 hash 冲突', () => {
    const path = 'content/maps/map-001.json'
    const fullBase = snapshotOf(generated({ [path]: projectMap(1) }))
    const hashOnlyBase: MigrationSnapshot = {
      files: new Map(),
      managedFiles: new Set([path]),
      hashes: fullBase.hashes,
    }
    const update = createMigrationPlan(
      hashOnlyBase,
      snapshot({ [path]: projectMap(1) }),
      generated({ [path]: projectMap(2) }),
    )
    expect(update.conflicts).toEqual([])
    expect(update.writes.get(path)).toEqual(projectMap(2))

    const conflict = createMigrationPlan(
      hashOnlyBase,
      snapshot({ [path]: projectMap(2) }),
      generated({ [path]: projectMap(3) }),
    )
    expect(conflict.conflicts).toHaveLength(1)
    expect(conflict.conflicts[0]?.base.value).toHaveProperty('sha256')
    expect(conflict.writes.size).toBe(0)
  })

  test('首次 bootstrap 只写语义变化并删除 target 明确退役项', () => {
    const ours = snapshot({ 'content/a.json': { x: 1 }, 'content/old.json': { x: 1 } })
    const target = snapshot({ 'content/a.json': { x: 1 }, 'content/new.json': { x: 2 } })
    const plan = createInitialMigrationPlan(ours, target)
    expect([...plan.writes]).toEqual([['content/new.json', { x: 2 }]])
    expect(plan.deletes).toEqual(['content/old.json'])
  })
})
