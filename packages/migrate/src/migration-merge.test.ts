import { validateAssetCatalog } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { MigrationJson } from './migration-files.js'
import {
  type FileMergeResult,
  jsonAbsent,
  jsonPresent,
  mergeManagedFile,
} from './migration-merge.js'
import { createMigrationPlan } from './migration-plan.js'

// These are low-level JSON merge fixtures, not complete current-project documents. Identity,
// ordering and ownership policies are selected by the real managed path; catalog output is
// additionally schema-checked by mergeManagedFile itself.
const scenePages = (pages: MigrationJson[]): MigrationJson => ({
  id: 's001',
  entities: [{ id: 'e1', pages }],
})

const mapIndex = (name: string) => ({
  version: 1,
  maps: [{ id: 'map-001', name, path: 'content/maps/map-001.json' }],
})

const sceneFlow = (text: string): MigrationJson => ({
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
                { id: 'start', body: [{ kind: 'say', text }], next: 'done' },
                { id: 'done', body: [] },
              ],
            },
          },
        },
      },
    },
  ],
})

const sprite = (poses?: Record<string, MigrationJson>): MigrationJson => [
  {
    id: 'sprite-1',
    asset: 'sprite.pal.001',
    label: '精灵',
    layout: { kind: 'static' },
    ...(poses ? { poses } : {}),
  },
]
const generatedAction = {
  label: 'PAL 自动循环',
  steps: [{ frame: 0, durationMs: 100 }],
  loopFrom: 0,
}

// Keep this DTO structurally JSON-compatible; no cast to a runtime/content object is needed.
const musicAsset = (path: string, hash: string) => ({
  kind: 'music',
  path,
  mediaType: 'audio/midi',
  bytes: 1,
  sha256: hash.repeat(64),
  label: path,
  origin: { kind: 'legacy-migrated' },
})

describe('mergeManagedFile', () => {
  test('对象独立字段修改合并到同一结果', () => {
    expect(
      mergeManagedFile(
        'content/locale.json',
        jsonPresent({ a: 1, b: 2 }),
        jsonPresent({ a: 3, b: 2 }),
        jsonPresent({ a: 1, b: 4 }),
      ),
    ).toEqual({ value: { present: true, value: { a: 3, b: 4 } }, conflicts: [] })
  })

  test('同一路径双改保留作者值和精确三侧冲突快照', () => {
    expect(
      mergeManagedFile(
        'content/locale.json',
        jsonPresent({ a: 1 }),
        jsonPresent({ a: 2 }),
        jsonPresent({ a: 3 }),
      ),
    ).toEqual({
      value: { present: true, value: { a: 2 } },
      conflicts: [
        {
          file: 'content/locale.json',
          path: '/a',
          type: 'value',
          base: { present: true, value: 1 },
          ours: { present: true, value: 2 },
          theirs: { present: true, value: 3 },
        },
      ],
    })
  })

  test('同路径双方新增不同对象保持整项 add-add，不能杂交字段', () => {
    expect(
      mergeManagedFile(
        'content/locale.json',
        jsonPresent({}),
        jsonPresent({ newValue: { ours: true } }),
        jsonPresent({ newValue: { theirs: true } }),
      ),
    ).toEqual({
      value: { present: true, value: { newValue: { ours: true } } },
      conflicts: [
        {
          file: 'content/locale.json',
          path: '/newValue',
          type: 'add-add',
          base: { present: false },
          ours: { present: true, value: { ours: true } },
          theirs: { present: true, value: { theirs: true } },
        },
      ],
    })
  })

  test('只在迁移侧新增的文件进入结果', () => {
    expect(
      mergeManagedFile('content/new.json', jsonAbsent(), jsonAbsent(), jsonPresent({ a: 1 })),
    ).toEqual({ value: { present: true, value: { a: 1 } }, conflicts: [] })
  })

  test('作者未改时接受迁移侧删除文件', () => {
    expect(
      mergeManagedFile(
        'content/old.json',
        jsonPresent({ a: 1 }),
        jsonPresent({ a: 1 }),
        jsonAbsent(),
      ),
    ).toEqual({ value: { present: false }, conflicts: [] })
  })

  test('迁移删除作者已改文件时保留作者并记录根冲突', () => {
    expect(
      mergeManagedFile(
        'content/old.json',
        jsonPresent({ a: 1 }),
        jsonPresent({ a: 2 }),
        jsonAbsent(),
      ),
    ).toEqual({
      value: { present: true, value: { a: 2 } },
      conflicts: [
        {
          file: 'content/old.json',
          path: '/',
          type: 'delete-modify',
          base: { present: true, value: { a: 1 } },
          ours: { present: true, value: { a: 2 } },
          theirs: { present: false },
        },
      ],
    })
  })

  test('稳定 id 数组按字段合并并固定 ours-only 顺序', () => {
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
      ),
    ).toEqual({
      value: {
        present: true,
        value: [
          { id: 'b', x: 3 },
          { id: 'a', x: 2 },
          { id: 'local', x: 1 },
        ],
      },
      conflicts: [],
    })
  })

  test('稳定 id 数组双方新增同 id 不同值时整项冲突', () => {
    expect(
      mergeManagedFile(
        'content/items.json',
        jsonPresent([]),
        jsonPresent([{ id: 'new', ours: true }]),
        jsonPresent([{ id: 'new', theirs: true }]),
      ),
    ).toEqual({
      value: { present: true, value: [{ id: 'new', ours: true }] },
      conflicts: [
        {
          file: 'content/items.json',
          path: '/@string:new',
          type: 'add-add',
          base: { present: false },
          ours: { present: true, value: { id: 'new', ours: true } },
          theirs: { present: true, value: { id: 'new', theirs: true } },
        },
      ],
    })
  })

  test('battle-sprites 按定义 id 合并，不退回整数组冲突', () => {
    const fighter = {
      id: 'fighter',
      label: '旧',
      asset: 'battle.old',
      profile: { kind: 'player-fighter' },
    }
    const local = { id: 'local', label: '本地', asset: 'battle.local', profile: { kind: 'summon' } }
    expect(
      mergeManagedFile(
        'content/battle-sprites.json',
        jsonPresent([fighter]),
        jsonPresent([{ ...fighter, label: '作者名' }, local]),
        jsonPresent([{ ...fighter, asset: 'battle.new' }]),
      ),
    ).toEqual({
      value: {
        present: true,
        value: [
          {
            id: 'fighter',
            label: '作者名',
            asset: 'battle.new',
            profile: { kind: 'player-fighter' },
          },
          local,
        ],
      },
      conflicts: [],
    })
  })

  test('SpriteDef 初次 poses 容器按不同 ActionId 合并', () => {
    const authored = { label: '作者动作', steps: [{ frame: 2, durationMs: 90 }] }
    expect(
      mergeManagedFile(
        'content/sprites.json',
        jsonPresent(sprite()),
        jsonPresent(sprite({ authored })),
        jsonPresent(sprite({ 'pal-auto-v1-generated': generatedAction })),
      ),
    ).toEqual({
      value: {
        present: true,
        value: sprite({ 'pal-auto-v1-generated': generatedAction, authored }),
      },
      conflicts: [],
    })
  })

  test('同一 ActionId 的独立字段修改仍保持整条动作原子冲突', () => {
    const ours = { ...generatedAction, steps: [{ frame: 1, durationMs: 100 }] }
    const theirs = { ...generatedAction, label: '迁移新名' }
    expect(
      mergeManagedFile(
        'content/sprites.json',
        jsonPresent(sprite({ action: generatedAction })),
        jsonPresent(sprite({ action: ours })),
        jsonPresent(sprite({ action: theirs })),
      ),
    ).toEqual({
      value: { present: true, value: sprite({ action: ours }) },
      conflicts: [
        {
          file: 'content/sprites.json',
          path: '/@string:sprite-1/poses/action',
          type: 'value',
          base: { present: true, value: generatedAction },
          ours: { present: true, value: ours },
          theirs: { present: true, value: theirs },
        },
      ],
    })
  })

  test('首跑双方新增同一 ActionId 的不同定义产生 add-add', () => {
    const ours = { label: '作者', steps: [{ frame: 0, durationMs: 100 }] }
    const theirs = { label: '迁移', steps: [{ frame: 0, durationMs: 100 }] }
    expect(
      mergeManagedFile(
        'content/sprites.json',
        jsonPresent(sprite()),
        jsonPresent(sprite({ collision: ours })),
        jsonPresent(sprite({ collision: theirs })),
      ),
    ).toEqual({
      value: { present: true, value: sprite({ collision: ours }) },
      conflicts: [
        {
          file: 'content/sprites.json',
          path: '/@string:sprite-1/poses/collision',
          type: 'add-add',
          base: { present: false },
          ours: { present: true, value: ours },
          theirs: { present: true, value: theirs },
        },
      ],
    })
  })

  test('stamps 按 id 合并，authored 接管整项且保留双方独立新增', () => {
    const base = { id: 'tree', origin: 'migrated', name: '旧树', tilesetId: 'tiles', visual: [1] }
    const authored = {
      id: 'tree',
      origin: 'authored',
      name: '我的树',
      tilesetId: 'tiles',
      visual: [9],
    }
    const local = {
      id: 'local',
      origin: 'authored',
      name: '本地章',
      tilesetId: 'tiles',
      visual: [2],
    }
    const upstream = {
      id: 'upstream',
      origin: 'migrated',
      name: '上游章',
      tilesetId: 'tiles',
      visual: [4],
    }
    expect(
      mergeManagedFile(
        'content/stamps.json',
        jsonPresent([base]),
        jsonPresent([authored, local]),
        jsonPresent([{ ...base, name: '新树', visual: [3] }, upstream]),
      ),
    ).toEqual({ value: { present: true, value: [authored, upstream, local] }, conflicts: [] })
  })

  test('上游删除模板仍保留 authored 接管项，未接管项按普通删除', () => {
    const tree = { id: 'tree', origin: 'migrated', name: '旧树', tilesetId: 'tiles', visual: [1] }
    const rock = { id: 'rock', origin: 'migrated', name: '旧石', tilesetId: 'tiles', visual: [2] }
    const authored = { ...tree, origin: 'authored', name: '我的树', visual: [9] }
    expect(
      mergeManagedFile(
        'content/stamps.json',
        jsonPresent([tree, rock]),
        jsonPresent([authored, rock]),
        jsonPresent([]),
      ),
    ).toEqual({ value: { present: true, value: [authored] }, conflicts: [] })
  })

  test('map index 的 /maps 按不同稳定 id 合并双方新增', () => {
    const ours = { id: 'ours', name: '作者图', path: 'content/maps/ours.json' }
    const theirs = { id: 'theirs', name: '迁移图', path: 'content/maps/theirs.json' }
    expect(
      mergeManagedFile(
        'content/maps/index.json',
        jsonPresent({ version: 1, maps: [] }),
        jsonPresent({ version: 1, maps: [ours] }),
        jsonPresent({ version: 1, maps: [theirs] }),
      ),
    ).toEqual({
      value: { present: true, value: { version: 1, maps: [theirs, ours] } },
      conflicts: [],
    })
  })

  test('map index 双方新增同 id 时保留作者整项并记录冲突', () => {
    const ours = { id: 'same', name: '作者图', path: 'content/maps/ours.json' }
    const theirs = { id: 'same', name: '迁移图', path: 'content/maps/theirs.json' }
    expect(
      mergeManagedFile(
        'content/maps/index.json',
        jsonPresent({ version: 1, maps: [] }),
        jsonPresent({ version: 1, maps: [ours] }),
        jsonPresent({ version: 1, maps: [theirs] }),
      ),
    ).toEqual({
      value: { present: true, value: { version: 1, maps: [ours] } },
      conflicts: [
        {
          file: 'content/maps/index.json',
          path: '/maps/@string:same',
          type: 'add-add',
          base: { present: false },
          ours: { present: true, value: ours },
          theirs: { present: true, value: theirs },
        },
      ],
    })
  })

  test.each([
    ['上游单改', 'PAL 地图 1', 'PAL 地图 1', '盛渔村', '盛渔村'],
    ['作者单改', '盛渔村', '作者命名', '盛渔村', '作者命名'],
  ])('map index 名称%s', (_title, base, ours, theirs, expected) => {
    expect(
      mergeManagedFile(
        'content/maps/index.json',
        jsonPresent(mapIndex(base)),
        jsonPresent(mapIndex(ours)),
        jsonPresent(mapIndex(theirs)),
      ),
    ).toEqual({ value: { present: true, value: mapIndex(expected) }, conflicts: [] })
  })

  test('map index 名称双改冲突定位到该 id 的 name 字段', () => {
    expect(
      mergeManagedFile(
        'content/maps/index.json',
        jsonPresent(mapIndex('PAL 地图 1')),
        jsonPresent(mapIndex('作者命名')),
        jsonPresent(mapIndex('盛渔村')),
      ),
    ).toEqual({
      value: { present: true, value: mapIndex('作者命名') },
      conflicts: [
        {
          file: 'content/maps/index.json',
          path: '/maps/@string:map-001/name',
          type: 'value',
          base: { present: true, value: 'PAL 地图 1' },
          ours: { present: true, value: '作者命名' },
          theirs: { present: true, value: '盛渔村' },
        },
      ],
    })
  })

  test('scene index 双边不同重排冲突保持作者顺序', () => {
    const index = (ids: string[]) => ({
      version: 1,
      scenes: ids.map((id) => ({ id, name: id, path: `content/scenes/${id}.json` })),
    })
    const base = index(['s1', 's2', 's3'])
    const ours = index(['s2', 's1', 's3'])
    const theirs = index(['s1', 's3', 's2'])
    expect(
      mergeManagedFile(
        'content/scenes/index.json',
        jsonPresent(base),
        jsonPresent(ours),
        jsonPresent(theirs),
      ),
    ).toEqual({
      value: { present: true, value: ours },
      conflicts: [
        {
          file: 'content/scenes/index.json',
          path: '/scenes',
          type: 'array-order',
          base: { present: true, value: base.scenes },
          ours: { present: true, value: ours.scenes },
          theirs: { present: true, value: theirs.scenes },
        },
      ],
    })
  })

  test('SceneIndex name/path 按稳定 SceneId 合并独立修改', () => {
    const entry = { id: 's1', name: '旧名', path: 'content/scenes/s1.json' }
    expect(
      mergeManagedFile(
        'content/scenes/index.json',
        jsonPresent({ version: 1, scenes: [entry] }),
        jsonPresent({ version: 1, scenes: [{ ...entry, name: '作者名' }] }),
        jsonPresent({ version: 1, scenes: [{ ...entry, path: 'content/authored/s1.json' }] }),
      ),
    ).toEqual({
      value: {
        present: true,
        value: {
          version: 1,
          scenes: [{ id: 's1', name: '作者名', path: 'content/authored/s1.json' }],
        },
      },
      conflicts: [],
    })
  })

  test('无 id pages 的尾增不平移已有页的独立修改', () => {
    expect(
      mergeManagedFile(
        'content/scenes/s001.json',
        jsonPresent(scenePages([{ state: 1 }])),
        jsonPresent(scenePages([{ state: 2 }])),
        jsonPresent(scenePages([{ state: 1 }, { state: 3 }])),
      ),
    ).toEqual({
      value: { present: true, value: scenePages([{ state: 2 }, { state: 3 }]) },
      conflicts: [],
    })
  })

  test('无 id pages 未改尾页可被作者删除', () => {
    expect(
      mergeManagedFile(
        'content/scenes/s001.json',
        jsonPresent(scenePages([{ x: 1 }, { x: 2 }])),
        jsonPresent(scenePages([{ x: 1 }])),
        jsonPresent(scenePages([{ x: 1 }, { x: 2 }])),
      ),
    ).toEqual({ value: { present: true, value: scenePages([{ x: 1 }]) }, conflicts: [] })
  })

  test('无 id pages 作者删尾页、上游修改该页产生 delete-modify', () => {
    expect(
      mergeManagedFile(
        'content/scenes/s001.json',
        jsonPresent(scenePages([{ x: 1 }, { x: 2 }])),
        jsonPresent(scenePages([{ x: 1 }])),
        jsonPresent(scenePages([{ x: 1 }, { x: 3 }])),
      ),
    ).toEqual({
      value: { present: true, value: scenePages([{ x: 1 }]) },
      conflicts: [
        {
          file: 'content/scenes/s001.json',
          path: '/entities/@string:e1/pages/1',
          type: 'delete-modify',
          base: { present: true, value: { x: 2 } },
          ours: { present: false },
          theirs: { present: true, value: { x: 3 } },
        },
      ],
    })
  })

  test('无 id pages 同位置双加不同对象不拼接字段', () => {
    expect(
      mergeManagedFile(
        'content/scenes/s001.json',
        jsonPresent(scenePages([])),
        jsonPresent(scenePages([{ ours: true }])),
        jsonPresent(scenePages([{ theirs: true }])),
      ),
    ).toEqual({
      value: { present: true, value: scenePages([{ ours: true }]) },
      conflicts: [
        {
          file: 'content/scenes/s001.json',
          path: '/entities/@string:e1/pages/0',
          type: 'add-add',
          base: { present: false },
          ours: { present: true, value: { ours: true } },
          theirs: { present: true, value: { theirs: true } },
        },
      ],
    })
  })

  test.each([
    ['中间插页', [{ state: 'a' }, { state: 'new' }, { state: 'b' }, { state: 'c' }]],
    ['中间删页', [{ state: 'a' }, { state: 'c' }]],
  ] satisfies [string, MigrationJson[]][])('无 id pages %s不得平移槽位身份', (_title, ours) => {
    const base = [{ state: 'a' }, { state: 'b' }, { state: 'c' }]
    expect(
      mergeManagedFile(
        'content/scenes/s001.json',
        jsonPresent(scenePages(base)),
        jsonPresent(scenePages(ours)),
        jsonPresent(scenePages(base)),
      ),
    ).toEqual({
      value: { present: true, value: scenePages(ours) },
      conflicts: [
        {
          file: 'content/scenes/s001.json',
          path: '/entities/@string:e1/pages',
          type: 'array-order',
          base: { present: true, value: base },
          ours: { present: true, value: ours },
          theirs: { present: true, value: base },
        },
      ],
    })
  })

  test('有身份 pages/stages 合并作者与上游独立修改，不丢未改字段', () => {
    const base = sceneFlow('旧')
    const theirs: MigrationJson = {
      id: 's001',
      entities: [
        {
          id: 'e1',
          initialPage: 'default',
          pages: [{ id: 'default', label: '默认', animation: { sprite: 'sprite-1' } }],
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
                    { id: 'done', body: [], next: 'start' },
                  ],
                },
              },
            },
          },
        },
      ],
    }
    // The extra local PageId and the two edited StageIds are independent JSON identities.
    const oursWithLocal: MigrationJson = {
      id: 's001',
      entities: [
        {
          id: 'e1',
          initialPage: 'default',
          pages: [
            { id: 'default', label: '作者页名' },
            { id: 'local', label: '本地页' },
          ],
          behaviors: {
            trigger: {
              talk: {
                label: '对话',
                order: 0,
                flow: {
                  kind: 'stages',
                  initial: 'start',
                  stages: [
                    { id: 'start', body: [{ kind: 'say', text: '作者正文' }], next: 'done' },
                    { id: 'done', body: [] },
                  ],
                },
              },
            },
          },
        },
      ],
    }
    expect(
      mergeManagedFile(
        'content/scenes/s001.json',
        jsonPresent(base),
        jsonPresent(oursWithLocal),
        jsonPresent(theirs),
      ),
    ).toEqual({
      value: {
        present: true,
        value: {
          id: 's001',
          entities: [
            {
              id: 'e1',
              initialPage: 'default',
              pages: [
                { id: 'default', label: '作者页名', animation: { sprite: 'sprite-1' } },
                { id: 'local', label: '本地页' },
              ],
              behaviors: {
                trigger: {
                  talk: {
                    label: '对话',
                    order: 0,
                    flow: {
                      kind: 'stages',
                      initial: 'start',
                      stages: [
                        { id: 'start', body: [{ kind: 'say', text: '作者正文' }], next: 'done' },
                        { id: 'done', body: [], next: 'start' },
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
      },
      conflicts: [],
    })
  })

  test('同一 StageId 正文双改在稳定身份路径产生原子冲突', () => {
    expect(
      mergeManagedFile(
        'content/scenes/s001.json',
        jsonPresent(sceneFlow('旧')),
        jsonPresent(sceneFlow('作者')),
        jsonPresent(sceneFlow('上游')),
      ),
    ).toEqual({
      value: { present: true, value: sceneFlow('作者') },
      conflicts: [
        {
          file: 'content/scenes/s001.json',
          path: '/entities/@string:e1/behaviors/trigger/talk/flow/stages/@string:start/body',
          type: 'value',
          base: { present: true, value: [{ kind: 'say', text: '旧' }] },
          ours: { present: true, value: [{ kind: 'say', text: '作者' }] },
          theirs: { present: true, value: [{ kind: 'say', text: '上游' }] },
        },
      ],
    })
  })

  test('未登记有序数组整体冲突，不按数组下标合并', () => {
    expect(
      mergeManagedFile(
        'content/items.json',
        jsonPresent([{ id: 'a', desc: ['x'] }]),
        jsonPresent([{ id: 'a', desc: ['ours'] }]),
        jsonPresent([{ id: 'a', desc: ['theirs'] }]),
      ),
    ).toEqual({
      value: { present: true, value: [{ id: 'a', desc: ['ours'] }] },
      conflicts: [
        {
          file: 'content/items.json',
          path: '/@string:a/desc',
          type: 'value',
          base: { present: true, value: ['x'] },
          ours: { present: true, value: ['ours'] },
          theirs: { present: true, value: ['theirs'] },
        },
      ],
    })
  })

  test('catalog 按 AssetId 合并，首次 authored 接管后整条归作者', () => {
    const a = musicAsset('assets/migrated/music/a.mid', 'a')
    const b = musicAsset('assets/migrated/music/b.mid', 'b')
    const authored = {
      kind: 'music',
      path: 'assets/authored/replacement.mid',
      mediaType: 'audio/midi',
      bytes: 2,
      sha256: 'c'.repeat(64),
      label: '作者替换曲',
      origin: { kind: 'authored' },
    }
    const nextB = { ...musicAsset('assets/migrated/music/b.mid', 'e'), label: '迁移更新' }
    const c = musicAsset('assets/migrated/music/c.mid', 'f')
    expect(
      mergeManagedFile(
        'assets/index.json',
        jsonPresent({ version: 1, assets: { a, b } }),
        jsonPresent({ version: 1, assets: { a: authored, b } }),
        jsonPresent({
          version: 1,
          assets: { a: musicAsset('assets/migrated/music/a-v2.mid', 'd'), b: nextB, c },
        }),
      ),
    ).toEqual({
      value: { present: true, value: { version: 1, assets: { a: authored, b: nextB, c } } },
      conflicts: [],
    })
  })
})

describe('获批三方合并边界', () => {
  test('JSON 字段：双方新增 constructor 保留作者值与真实缺席基线', () => {
    let result: FileMergeResult | undefined
    expect(() => {
      result = mergeManagedFile(
        'content/locale.json',
        jsonPresent({}),
        jsonPresent({ constructor: 'author' }),
        jsonPresent({ constructor: 'upstream' }),
      )
    }).not.toThrow()
    expect(result).toEqual({
      value: { present: true, value: { constructor: 'author' } },
      conflicts: [
        {
          file: 'content/locale.json',
          path: '/constructor',
          type: 'add-add',
          base: { present: false },
          ours: { present: true, value: 'author' },
          theirs: { present: true, value: 'upstream' },
        },
      ],
    })
  })

  test('JSON 字段：作者单侧新增 constructor 不被另一侧继承属性遮住', () => {
    expect(
      mergeManagedFile(
        'content/locale.json',
        jsonPresent({}),
        jsonPresent({ constructor: 'author' }),
        jsonPresent({ other: 1 }),
      ),
    ).toEqual({
      value: { present: true, value: { other: 1, constructor: 'author' } },
      conflicts: [],
    })
  })

  test('JSON 字段：__proto__ 是可枚举自有数据，结果仍有普通对象原型', () => {
    // Computed syntax creates an own JSON field rather than invoking object-literal prototype syntax.
    const base = { ['__proto__']: { safe: 0 }, other: 0 }
    const ours = { ['__proto__']: { safe: 0 }, other: 1 }
    const theirs = { ['__proto__']: { safe: 1 }, other: 0 }
    const result = mergeManagedFile(
      'content/locale.json',
      jsonPresent(base),
      jsonPresent(ours),
      jsonPresent(theirs),
    )
    expect(result).toEqual({
      value: { present: true, value: { ['__proto__']: { safe: 1 }, other: 1 } },
      conflicts: [],
    })
    expect(Object.getOwnPropertyDescriptor(result.value.value, '__proto__')).toEqual({
      value: { safe: 1 },
      enumerable: true,
      configurable: true,
      writable: true,
    })
    expect(Object.getPrototypeOf(result.value.value)).toBe(Object.prototype)
  })

  test('JSON 字段：constructor 删除对修改的冲突保留作者缺席而非继承函数', () => {
    let result: FileMergeResult | undefined
    expect(() => {
      result = mergeManagedFile(
        'content/locale.json',
        jsonPresent({ constructor: 'base', other: 0 }),
        jsonPresent({ other: 1 }),
        jsonPresent({ constructor: 'upstream', other: 0 }),
      )
    }).not.toThrow()
    expect(result).toEqual({
      value: { present: true, value: { other: 1 } },
      conflicts: [
        {
          file: 'content/locale.json',
          path: '/constructor',
          type: 'delete-modify',
          base: { present: true, value: 'base' },
          ours: { present: false },
          theirs: { present: true, value: 'upstream' },
        },
      ],
    })
  })

  test('JSON 字段：真实计划的 target 与 writes 保留作者 __proto__ 字段', () => {
    const file = 'content/locale.json'
    const snapshot = (value: MigrationJson) => ({
      files: new Map([[file, value]]),
      managedFiles: new Set([file]),
    })
    const plan = createMigrationPlan(
      snapshot({}),
      snapshot({ ['__proto__']: { safe: true } }),
      snapshot({ other: 1 }),
    )
    const expected = { other: 1, ['__proto__']: { safe: true } }
    expect(plan).toEqual({
      target: new Map([[file, expected]]),
      writes: new Map([[file, expected]]),
      deletes: [],
      conflicts: [],
      summary: {
        managed: 1,
        generated: 0,
        kept: 0,
        merged: 1,
        writes: 1,
        deletes: 0,
        conflicts: 0,
      },
    })
  })

  test('已接管 catalog：基线已有作者项时继续保留，普通迁移项仍可更新', () => {
    const authored = {
      ...musicAsset('assets/authored/music.mid', 'a'),
      origin: { kind: 'authored' },
    }
    const generated = musicAsset('assets/migrated/generated.mid', 'b')
    const base = { version: 1, assets: { music: authored, generated } }
    const ours = structuredClone(base)
    const updated = musicAsset('assets/migrated/generated-v2.mid', 'c')
    const theirs = {
      version: 1,
      assets: { music: musicAsset('assets/migrated/music.mid', 'd'), generated: updated },
    }
    // Both sides are valid catalogs; the failure must come from ownership selection, not validation.
    validateAssetCatalog(base)
    validateAssetCatalog(ours)
    validateAssetCatalog(theirs)
    expect(
      mergeManagedFile(
        'assets/index.json',
        jsonPresent(base),
        jsonPresent(ours),
        jsonPresent(theirs),
      ),
    ).toEqual({
      value: {
        present: true,
        value: { version: 1, assets: { music: authored, generated: updated } },
      },
      conflicts: [],
    })
  })
})
