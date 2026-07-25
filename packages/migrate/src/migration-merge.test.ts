import { describe, expect, test } from 'vitest'
import { jsonAbsent, jsonPresent, mergeManagedFile } from './migration-merge.js'
import type { MigrationJson } from './pal-migration.js'

describe('mergeManagedFile', () => {
  test('执行 primitive 与对象递归三方真值表', () => {
    expect(
      mergeManagedFile(
        'content/locale.json',
        jsonPresent({ a: 1, b: 2 }),
        jsonPresent({ a: 3, b: 2 }),
        jsonPresent({ a: 1, b: 4 }),
      ),
    ).toEqual({ value: jsonPresent({ a: 3, b: 4 }), conflicts: [] })
  })

  test('同一路径双改产生精确冲突', () => {
    const result = mergeManagedFile(
      'content/locale.json',
      jsonPresent({ a: 1 }),
      jsonPresent({ a: 2 }),
      jsonPresent({ a: 3 }),
    )
    expect(result.conflicts).toMatchObject([{ path: '/a', type: 'value' }])
  })

  test('同一路径双方新增不同对象不得自动拼接', () => {
    const result = mergeManagedFile(
      'content/locale.json',
      jsonPresent({}),
      jsonPresent({ newValue: { ours: true } }),
      jsonPresent({ newValue: { theirs: true } }),
    )
    expect(result.conflicts).toMatchObject([{ path: '/newValue', type: 'add-add' }])
  })

  test('文件新增、删除与删除对侧修改', () => {
    expect(
      mergeManagedFile('content/new.json', jsonAbsent(), jsonAbsent(), jsonPresent({ a: 1 })),
    ).toEqual({ value: jsonPresent({ a: 1 }), conflicts: [] })
    expect(
      mergeManagedFile(
        'content/old.json',
        jsonPresent({ a: 1 }),
        jsonPresent({ a: 1 }),
        jsonAbsent(),
      ),
    ).toEqual({ value: jsonAbsent(), conflicts: [] })
    expect(
      mergeManagedFile(
        'content/old.json',
        jsonPresent({ a: 1 }),
        jsonPresent({ a: 2 }),
        jsonAbsent(),
      ).conflicts,
    ).toMatchObject([{ path: '/', type: 'delete-modify' }])
  })

  test('稳定 id 数组按字段合并并固定 ours-only 顺序', () => {
    const result = mergeManagedFile(
      'content/items.json',
      jsonPresent([
        { id: 'a', x: 1 },
        { id: 'b', x: 1 },
      ]),
      jsonPresent([
        { id: 'a', x: 2 },
        { id: 'local', x: 1 },
        { id: 'b', x: 1 },
      ]),
      jsonPresent([
        { id: 'b', x: 3 },
        { id: 'a', x: 1 },
      ]),
    )
    expect(result.conflicts).toEqual([])
    expect(result.value.value).toEqual([
      { id: 'b', x: 3 },
      { id: 'a', x: 2 },
      { id: 'local', x: 1 },
    ])
    expect(
      mergeManagedFile(
        'content/items.json',
        jsonPresent([
          { id: 'a', x: 1 },
          { id: 'b', x: 1 },
        ]),
        jsonPresent([
          { id: 'a', x: 2 },
          { id: 'local', x: 1 },
          { id: 'b', x: 1 },
        ]),
        jsonPresent([
          { id: 'b', x: 3 },
          { id: 'a', x: 1 },
        ]),
      ).value.value,
    ).toEqual(result.value.value)
  })

  test('稳定 id 数组双方新增同 id 不同值时冲突', () => {
    const result = mergeManagedFile(
      'content/items.json',
      jsonPresent([]),
      jsonPresent([{ id: 'new', ours: true }]),
      jsonPresent([{ id: 'new', theirs: true }]),
    )
    expect(result.conflicts).toMatchObject([
      { path: expect.stringContaining('@string:new'), type: 'add-add' },
    ])
  })

  test('battle-sprites 按稳定定义 id 三方合并，不退回整数组原子冲突', () => {
    const result = mergeManagedFile(
      'content/battle-sprites.json',
      jsonPresent([
        { id: 'fighter', label: '旧', asset: 'battle.old', profile: { kind: 'player-fighter' } },
      ]),
      jsonPresent([
        {
          id: 'fighter',
          label: '作者名',
          asset: 'battle.old',
          profile: { kind: 'player-fighter' },
        },
        { id: 'local', label: '本地', asset: 'battle.local', profile: { kind: 'summon' } },
      ]),
      jsonPresent([
        { id: 'fighter', label: '旧', asset: 'battle.new', profile: { kind: 'player-fighter' } },
      ]),
    )
    expect(result.conflicts).toEqual([])
    expect(result.value.value).toEqual([
      { id: 'fighter', label: '作者名', asset: 'battle.new', profile: { kind: 'player-fighter' } },
      { id: 'local', label: '本地', asset: 'battle.local', profile: { kind: 'summon' } },
    ])
  })

  test('SpriteDef poses 按 ActionId 合并，但单条动作记录保持原子', () => {
    const sprite = (poses?: Record<string, MigrationJson>): MigrationJson => [
      {
        id: 'sprite-1',
        asset: 'sprite.pal.001',
        label: '精灵',
        layout: { kind: 'static' },
        ...(poses ? { poses } : {}),
      },
    ]
    const authored = {
      label: '作者动作',
      steps: [{ frame: 2, durationMs: 90 }],
    }
    const generated = {
      label: 'PAL 自动循环',
      steps: [{ frame: 0, durationMs: 100 }],
      loopFrom: 0,
    }
    const first = mergeManagedFile(
      'content/sprites.json',
      jsonPresent(sprite()),
      jsonPresent(sprite({ authored })),
      jsonPresent(sprite({ 'pal-auto-v1-generated': generated })),
    )
    expect(first.conflicts).toEqual([])
    expect(first.value.value).toEqual(sprite({ 'pal-auto-v1-generated': generated, authored }))

    const base = sprite({ action: generated })
    const collision = mergeManagedFile(
      'content/sprites.json',
      jsonPresent(base),
      jsonPresent(sprite({ action: { ...generated, steps: [{ frame: 1, durationMs: 100 }] } })),
      jsonPresent(sprite({ action: { ...generated, label: '迁移新名' } })),
    )
    expect(collision.conflicts).toMatchObject([
      { path: expect.stringContaining('/poses/action'), type: 'value' },
    ])
    // 冲突粒度必须停在整条 action，不能继续落到 /steps 或 /label。
    expect(collision.conflicts).toHaveLength(1)
  })

  test('双方首跑新增同一 ActionId 的不同定义产生 add-add，不静默重定向', () => {
    const base = [
      { id: 'sprite-1', asset: 'sprite.pal.001', label: '精灵', layout: { kind: 'static' } },
    ]
    const withAction = (label: string) => [
      {
        ...base[0],
        poses: {
          collision: { label, steps: [{ frame: 0, durationMs: 100 }] },
        },
      },
    ]
    const result = mergeManagedFile(
      'content/sprites.json',
      jsonPresent(base),
      jsonPresent(withAction('作者')),
      jsonPresent(withAction('迁移')),
    )
    expect(result.conflicts).toMatchObject([
      { path: expect.stringContaining('/poses/collision'), type: 'add-add' },
    ])
  })

  test('G2：stamps 按稳定 id 合并，authored 接管后整项归作者', () => {
    const base = [{ id: 'tree', origin: 'migrated', name: '旧树', tilesetId: 'tiles', visual: [1] }]
    const ours = [
      { id: 'tree', origin: 'authored', name: '我的树', tilesetId: 'tiles', visual: [9] },
      { id: 'local', origin: 'authored', name: '本地章', tilesetId: 'tiles', visual: [2] },
    ]
    const theirs = [
      { id: 'tree', origin: 'migrated', name: '新树', tilesetId: 'tiles', visual: [3] },
      { id: 'upstream', origin: 'migrated', name: '上游章', tilesetId: 'tiles', visual: [4] },
    ]
    const result = mergeManagedFile(
      'content/stamps.json',
      jsonPresent(base),
      jsonPresent(ours),
      jsonPresent(theirs),
    )
    expect(result.conflicts).toEqual([])
    expect(result.value.value).toEqual([ours[0], theirs[1], ours[1]])
  })

  test('G2：上游删除 migrated 模板时保留已 authored 接管项', () => {
    const base = [
      { id: 'tree', origin: 'migrated', name: '旧树', tilesetId: 'tiles', visual: [1] },
      { id: 'rock', origin: 'migrated', name: '旧石', tilesetId: 'tiles', visual: [2] },
    ]
    const ours = [
      { id: 'tree', origin: 'authored', name: '我的树', tilesetId: 'tiles', visual: [9] },
      base[1]!,
    ]
    const result = mergeManagedFile(
      'content/stamps.json',
      jsonPresent(base),
      jsonPresent(ours),
      jsonPresent([]),
    )
    expect(result.conflicts).toEqual([])
    expect(result.value.value).toEqual([ours[0]])
  })

  test('map index 的 /maps 按稳定 id 合并，不退回整数组原子冲突', () => {
    const result = mergeManagedFile(
      'content/maps/index.json',
      jsonPresent({ version: 1, maps: [] }),
      jsonPresent({
        version: 1,
        maps: [{ id: 'ours', name: '作者图', path: 'content/maps/ours.json' }],
      }),
      jsonPresent({
        version: 1,
        maps: [{ id: 'theirs', name: '迁移图', path: 'content/maps/theirs.json' }],
      }),
    )
    expect(result.conflicts).toEqual([])
    expect(result.value.value).toEqual({
      version: 1,
      maps: [
        { id: 'theirs', name: '迁移图', path: 'content/maps/theirs.json' },
        { id: 'ours', name: '作者图', path: 'content/maps/ours.json' },
      ],
    })

    const collision = mergeManagedFile(
      'content/maps/index.json',
      jsonPresent({ version: 1, maps: [] }),
      jsonPresent({
        version: 1,
        maps: [{ id: 'same', name: '作者图', path: 'content/maps/ours.json' }],
      }),
      jsonPresent({
        version: 1,
        maps: [{ id: 'same', name: '迁移图', path: 'content/maps/theirs.json' }],
      }),
    )
    expect(collision.conflicts).toMatchObject([
      { path: expect.stringContaining('/maps/@string:same'), type: 'add-add' },
    ])
  })

  test('scene index 双边不同重排冲突', () => {
    const result = mergeManagedFile(
      'content/scenes/index.json',
      jsonPresent(['s1', 's2', 's3']),
      jsonPresent(['s2', 's1', 's3']),
      jsonPresent(['s1', 's3', 's2']),
    )
    expect(result.conflicts).toMatchObject([{ path: '/', type: 'array-order' }])
  })

  test('pages 槽位支持尾部新增与独立字段修改', () => {
    const base = { id: 's001', entities: [{ id: 'e1', pages: [{ state: 1 }] }] }
    const ours = { id: 's001', entities: [{ id: 'e1', pages: [{ state: 2 }] }] }
    const theirs = {
      id: 's001',
      entities: [{ id: 'e1', pages: [{ state: 1 }, { state: 3 }] }],
    }
    const result = mergeManagedFile(
      'content/scenes/s001.json',
      jsonPresent(base),
      jsonPresent(ours),
      jsonPresent(theirs),
    )
    expect(result.conflicts).toEqual([])
    expect(result.value.value).toEqual({
      id: 's001',
      entities: [{ id: 'e1', pages: [{ state: 2 }, { state: 3 }] }],
    })
  })

  test('pages 删页对侧修改与双方不同加页均冲突', () => {
    const tailDeleted = mergeManagedFile(
      'content/scenes/s001.json',
      jsonPresent({ id: 's001', entities: [{ id: 'e1', pages: [{ x: 1 }, { x: 2 }] }] }),
      jsonPresent({ id: 's001', entities: [{ id: 'e1', pages: [{ x: 1 }] }] }),
      jsonPresent({ id: 's001', entities: [{ id: 'e1', pages: [{ x: 1 }, { x: 2 }] }] }),
    )
    expect(tailDeleted.conflicts).toEqual([])
    expect(tailDeleted.value.value).toEqual({
      id: 's001',
      entities: [{ id: 'e1', pages: [{ x: 1 }] }],
    })

    const deleted = mergeManagedFile(
      'content/scenes/s001.json',
      jsonPresent({ id: 's001', entities: [{ id: 'e1', pages: [{ x: 1 }, { x: 2 }] }] }),
      jsonPresent({ id: 's001', entities: [{ id: 'e1', pages: [{ x: 1 }] }] }),
      jsonPresent({ id: 's001', entities: [{ id: 'e1', pages: [{ x: 1 }, { x: 3 }] }] }),
    )
    expect(deleted.conflicts).toMatchObject([{ type: 'delete-modify' }])

    const added = mergeManagedFile(
      'content/scenes/s001.json',
      jsonPresent({ id: 's001', entities: [{ id: 'e1', pages: [] }] }),
      jsonPresent({ id: 's001', entities: [{ id: 'e1', pages: [{ x: 1 }] }] }),
      jsonPresent({ id: 's001', entities: [{ id: 'e1', pages: [{ x: 2 }] }] }),
    )
    expect(added.conflicts).toMatchObject([{ path: expect.stringContaining('/pages/0') }])

    const disjointAdded = mergeManagedFile(
      'content/scenes/s001.json',
      jsonPresent({ id: 's001', entities: [{ id: 'e1', pages: [] }] }),
      jsonPresent({ id: 's001', entities: [{ id: 'e1', pages: [{ ours: true }] }] }),
      jsonPresent({ id: 's001', entities: [{ id: 'e1', pages: [{ theirs: true }] }] }),
    )
    expect(disjointAdded.conflicts).toMatchObject([
      { path: expect.stringContaining('/pages/0'), type: 'add-add' },
    ])
  })

  test('pages 非尾部插入或删除不得平移槽位身份', () => {
    const base = {
      id: 's001',
      entities: [{ id: 'e1', pages: [{ state: 'a' }, { state: 'b' }, { state: 'c' }] }],
    }
    const inserted = mergeManagedFile(
      'content/scenes/s001.json',
      jsonPresent(base),
      jsonPresent({
        id: 's001',
        entities: [
          { id: 'e1', pages: [{ state: 'a' }, { state: 'new' }, { state: 'b' }, { state: 'c' }] },
        ],
      }),
      jsonPresent(base),
    )
    expect(inserted.conflicts).toMatchObject([
      { path: expect.stringContaining('/pages'), type: 'array-order' },
    ])

    const deleted = mergeManagedFile(
      'content/scenes/s001.json',
      jsonPresent(base),
      jsonPresent({
        id: 's001',
        entities: [{ id: 'e1', pages: [{ state: 'a' }, { state: 'c' }] }],
      }),
      jsonPresent(base),
    )
    expect(deleted.conflicts).toMatchObject([
      { path: expect.stringContaining('/pages'), type: 'array-order' },
    ])
  })

  test('canonical v5 pages 与 stages 按稳定 id 合并作者和上游独立修改', () => {
    const base = {
      id: 's001',
      entities: [
        {
          id: 'e1',
          initialPage: 'default',
          pages: [{ id: 'default', label: '默认' }],
          behaviors: {
            trigger: {
              talk: {
                label: '对话',
                order: 0,
                flow: {
                  kind: 'stages',
                  initial: 'start',
                  stages: [
                    { id: 'start', body: [{ kind: 'say', text: '旧' }], next: 'done' },
                    { id: 'done', body: [] },
                  ],
                },
              },
            },
          },
        },
      ],
    }
    const ours = structuredClone(base)
    ours.entities[0]!.pages[0]!.label = '作者页名'
    ours.entities[0]!.pages.push({ id: 'local', label: '本地页' })
    const oursStages = ours.entities[0]!.behaviors.trigger.talk.flow.stages
    oursStages[0]!.body = [{ kind: 'say', text: '作者正文' }]
    const theirs = structuredClone(base)
    theirs.entities[0]!.pages[0] = {
      ...theirs.entities[0]!.pages[0]!,
      animation: { sprite: 'sprite-1' },
    } as (typeof theirs.entities)[number]['pages'][number]
    const theirsStages = theirs.entities[0]!.behaviors.trigger.talk.flow.stages
    theirsStages[1] = { ...theirsStages[1]!, next: 'start' } as (typeof theirsStages)[number]

    const result = mergeManagedFile(
      'content/scenes/s001.json',
      jsonPresent(base as unknown as MigrationJson),
      jsonPresent(ours as unknown as MigrationJson),
      jsonPresent(theirs as unknown as MigrationJson),
    )
    expect(result.conflicts).toEqual([])
    expect(result.value.value).toMatchObject({
      entities: [
        {
          pages: [
            {
              id: 'default',
              label: '作者页名',
              animation: { sprite: 'sprite-1' },
            },
            { id: 'local', label: '本地页' },
          ],
          behaviors: {
            trigger: {
              talk: {
                flow: {
                  stages: [
                    { id: 'start', body: [{ kind: 'say', text: '作者正文' }] },
                    { id: 'done', next: 'start' },
                  ],
                },
              },
            },
          },
        },
      ],
    })
  })

  test('canonical v5 同一 StageId 双改在作者身份路径冲突', () => {
    const scene = (text: string) => ({
      id: 's001',
      entities: [
        {
          id: 'e1',
          behaviors: {
            trigger: {
              talk: {
                flow: {
                  kind: 'stages',
                  initial: 'start',
                  stages: [{ id: 'start', body: [{ kind: 'say', text }] }],
                },
              },
            },
          },
        },
      ],
    })
    const result = mergeManagedFile(
      'content/scenes/s001.json',
      jsonPresent(scene('旧')),
      jsonPresent(scene('作者')),
      jsonPresent(scene('上游')),
    )
    expect(result.conflicts).toMatchObject([
      {
        path: expect.stringContaining('/stages/@string:start/body'),
        type: 'value',
      },
    ])
  })

  test('未登记有序数组整体原子冲突', () => {
    const result = mergeManagedFile(
      'content/items.json',
      jsonPresent([{ id: 'a', desc: ['x'] }]),
      jsonPresent([{ id: 'a', desc: ['ours'] }]),
      jsonPresent([{ id: 'a', desc: ['theirs'] }]),
    )
    expect(result.conflicts).toMatchObject([
      { path: expect.stringContaining('/desc'), type: 'value' },
    ])
  })

  test('catalog 按 AssetId 合并，并把 authored 接管记录视为整条作者所有', () => {
    const migrated = (path: string, hash: string) => ({
      kind: 'music',
      path,
      mediaType: 'audio/midi',
      bytes: 1,
      sha256: hash.repeat(64),
      label: path,
      origin: { kind: 'legacy-migrated' },
    })
    const base = {
      version: 1,
      assets: {
        a: migrated('assets/migrated/music/a.mid', 'a'),
        b: migrated('assets/migrated/music/b.mid', 'b'),
      },
    }
    const ours = {
      version: 1,
      assets: {
        a: {
          kind: 'music',
          path: 'assets/authored/replacement.mid',
          mediaType: 'audio/midi',
          bytes: 2,
          sha256: 'c'.repeat(64),
          label: '作者替换曲',
          origin: { kind: 'authored' },
        },
        b: base.assets.b,
      },
    }
    const theirs = {
      version: 1,
      assets: {
        a: migrated('assets/migrated/music/a-v2.mid', 'd'),
        b: { ...migrated('assets/migrated/music/b.mid', 'e'), label: '迁移更新' },
        c: migrated('assets/migrated/music/c.mid', 'f'),
      },
    }
    const result = mergeManagedFile(
      'assets/index.json',
      jsonPresent(base),
      jsonPresent(ours),
      jsonPresent(theirs),
    )
    expect(result.conflicts).toEqual([])
    expect(result.value.value).toEqual({
      version: 1,
      assets: {
        a: ours.assets.a,
        b: theirs.assets.b,
        c: theirs.assets.c,
      },
    })
  })
})
