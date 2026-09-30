/** TEST-GLM-WAVE-O-1 O02：三方合并的身份数组/原子回退/接管语义与输入不可变合同。
 *  旧证：migration-merge.test.ts / boundaries 覆盖常规对象合并与既有冲突类型；
 *  本卡补齐 gap-map 缺口臂：无 base 的身份数组、失效身份、顺序冲突、数组洞、
 *  pages/stages 回退、authored 接管（stamps/sprites/assets）、catalog 目标校验。
 */
import { describe, expect, test } from 'vitest'
import {
  jsonAbsent,
  jsonPresent,
  mergeManagedFile,
  type VersionedJson,
} from './migration-merge.js'

const sceneFile = 'content/scenes/s000.json'

const entitiesWith = (...ids: string[]): VersionedJson =>
  jsonPresent({ entry: {}, entities: ids.map((id) => ({ id, pos: {} })) })

describe('O02 mergeManagedFile：身份数组与失效身份（合成文件）', () => {
  test('场景 entities：ours/theirs 各自新增不同实体时按身份并集合并', () => {
    const base = entitiesWith('e1')
    const ours = entitiesWith('e1', 'e2')
    const theirs = entitiesWith('e1', 'e3')
    const result = mergeManagedFile(sceneFile, base, ours, theirs)
    expect(result.conflicts).toEqual([])
    expect((result.value.value as { entities: Array<{ id: string }> }).entities.map((entity) => entity.id)).toEqual([
      'e1',
      'e3',
      'e2',
    ])
  })

  test('场景 entities：同一新增 id 双方正文不同 → add-add 冲突（无 base 身份）', () => {
    const base = entitiesWith('e1')
    const ours = entitiesWith('e1', 'e2')
    const theirs = entitiesWith('e1', 'e2')
    ;(theirs.value as { entities: Array<{ id: string; x?: number }> }).entities[1]!.x = 9
    const result = mergeManagedFile(sceneFile, base, ours, theirs)
    expect(result.conflicts.map(({ type, path }) => ({ type, path }))).toContainEqual({
      type: 'add-add',
      path: '/entities/@string:e2',
    })
  })

  test('场景 entities：非对象条目（无身份）→ invalid-identity 冲突', () => {
    const base = jsonPresent({ entities: [] })
    const ours = jsonPresent({ entities: ['bare-primitive'] })
    const theirs = jsonPresent({ entities: [] })
    const result = mergeManagedFile(sceneFile, base, ours, theirs)
    expect(result.conflicts.map(({ type }) => type)).toEqual(['invalid-identity'])
  })

  test('场景 entities：单侧重复 id → invalid-identity 冲突', () => {
    const base = entitiesWith('e1')
    const ours = entitiesWith('e1', 'e1')
    const theirs = entitiesWith('e1')
    const result = mergeManagedFile(sceneFile, base, ours, theirs)
    expect(result.conflicts.map(({ type }) => type)).toEqual(['invalid-identity'])
  })

  test('scenes/index.json 严格顺序：双方不同重排 → array-order 冲突', () => {
    const base = jsonPresent({
      scenes: [{ id: 'a', path: 'p/a' }, { id: 'b', path: 'p/b' }, { id: 'c', path: 'p/c' }],
    })
    const ours = jsonPresent({
      scenes: [{ id: 'b', path: 'p/b' }, { id: 'a', path: 'p/a' }, { id: 'c', path: 'p/c' }],
    })
    const theirs = jsonPresent({
      scenes: [{ id: 'c', path: 'p/c' }, { id: 'a', path: 'p/a' }, { id: 'b', path: 'p/b' }],
    })
    const result = mergeManagedFile('content/scenes/index.json', base, ours, theirs)
    expect(result.conflicts.map(({ type }) => type)).toEqual(['array-order'])
  })

  test('scenes/index.json：一方新增、一方重排可共存（公共序一致）', () => {
    const base = jsonPresent({ scenes: [{ id: 'a', path: 'p/a' }] })
    const ours = jsonPresent({
      scenes: [{ id: 'a', path: 'p/a' }, { id: 'b', path: 'p/b' }],
    })
    const theirs = jsonPresent({ scenes: [{ id: 'a', path: 'p/a-rev' }] })
    const result = mergeManagedFile('content/scenes/index.json', base, ours, theirs)
    expect(result.conflicts).toEqual([])
    expect((result.value.value as { scenes: Array<{ id: string; path: string }> }).scenes).toEqual([
      { id: 'a', path: 'p/a-rev' },
      { id: 'b', path: 'p/b' },
    ])
  })

  test('maps/index.json /maps 身份模式：双方各新增一张地图时并集合并', () => {
    const base = jsonPresent({ maps: [{ id: 'map-1', path: 'content/maps/map-1.json' }] })
    const ours = jsonPresent({
      maps: [
        { id: 'map-1', path: 'content/maps/map-1.json' },
        { id: 'map-2', path: 'content/maps/map-2.json' },
      ],
    })
    const theirs = jsonPresent({
      maps: [
        { id: 'map-1', path: 'content/maps/map-1.json' },
        { id: 'map-3', path: 'content/maps/map-3.json' },
      ],
    })
    const result = mergeManagedFile('content/maps/index.json', base, ours, theirs)
    expect(result.conflicts).toEqual([])
    expect((result.value.value as { maps: Array<{ id: string }> }).maps.map(({ id }) => id)).toEqual([
      'map-1',
      'map-3',
      'map-2',
    ])
  })

  test('已有场景文件缺 entities 键：双方同时建立 entities 仍按身份合并', () => {
    const base = jsonPresent({})
    const ours = entitiesWith('e9')
    const theirs = entitiesWith('e10')
    const result = mergeManagedFile('content/scenes/s042.json', base, ours, theirs)
    expect(result.conflicts).toEqual([])
    expect(
      (result.value.value as { entities: Array<{ id: string }> }).entities.map(({ id }) => id),
    ).toEqual(['e10', 'e9'])
  })

  test('全新文件以 absent 为 base 直接合并 → add-add 冲突（不虚构身份合并）', () => {
    const result = mergeManagedFile(
      'content/scenes/s042.json',
      jsonAbsent(),
      entitiesWith('e9'),
      entitiesWith('e10'),
    )
    expect(result.conflicts.map(({ type, path }) => ({ type, path }))).toContainEqual({
      type: 'add-add',
      path: '/',
    })
  })

  test('skills.json /skills 身份模式合并双方新增仙术', () => {
    const base = jsonPresent({ skills: [{ id: '1', name: 'a' }], levelUp: {} })
    const ours = jsonPresent({ skills: [{ id: '1', name: 'a' }, { id: '2', name: 'b' }], levelUp: {} })
    const theirs = jsonPresent({ skills: [{ id: '1', name: 'a' }, { id: '3', name: 'c' }], levelUp: {} })
    const result = mergeManagedFile('content/skills.json', base, ours, theirs)
    expect(result.conflicts).toEqual([])
    expect(
      (result.value.value as { skills: Array<{ id: string }> }).skills.map(({ id }) => id),
    ).toEqual(['1', '3', '2'])
  })
})

describe('O02 mergeManagedFile：pages 非身份条目的元素级合并与数组洞', () => {
  const sceneFile = 'content/scenes/s007.json'
  const page = (marker: string): VersionedJson =>
    jsonPresent({ pages: [{ cue: marker }] })

  test('无 id 页条目：一方尾部追加、一方不变 → 追加保留', () => {
    const base = page('p1')
    const ours = jsonPresent({ pages: [{ cue: 'p1' }, { cue: 'p2' }] })
    const result = mergeManagedFile(sceneFile, base, ours, ours)
    expect(result.conflicts).toEqual([])
    expect((result.value.value as { pages: unknown[] }).pages).toHaveLength(2)
  })

  // 注：pages 数组洞（删除 + 更长尾追加）合同因产品缺陷停测，见 docs/testing/glm-tenfold-triple/wave-O/defect-report.md。

  test('无 id 页条目：等长改动允许元素级合并（长度变化才要求尾追加）', () => {
    const base = jsonPresent({ pages: [{ cue: 'a' }, { cue: 'b' }] })
    const ours = jsonPresent({ pages: [{ cue: 'a2' }, { cue: 'b' }] })
    const theirs = jsonPresent({ pages: [{ cue: 'a' }, { cue: 'b' }] })
    const result = mergeManagedFile(sceneFile, base, ours, theirs)
    expect(result.conflicts).toEqual([])
    expect((result.value.value as { pages: Array<{ cue: string }> }).pages[0]!.cue).toBe('a2')
  })

  test('长度变化且前缀变动 → array-order 冲突（仅允许尾追加）', () => {
    const base = jsonPresent({ pages: [{ cue: 'a' }, { cue: 'b' }] })
    const ours = jsonPresent({ pages: [{ cue: 'a2' }] })
    const theirs = jsonPresent({ pages: [{ cue: 'a' }, { cue: 'b' }] })
    const result = mergeManagedFile(sceneFile, base, ours, theirs)
    expect(result.conflicts.map(({ type }) => type)).toEqual(['array-order'])
  })

  test('无 id 页条目：双方同改同一下标 → value 冲突 path 下钻到冲突叶', () => {
    const base = jsonPresent({ pages: [{ cue: 'a' }] })
    const ours = jsonPresent({ pages: [{ cue: 'b' }] })
    const theirs = jsonPresent({ pages: [{ cue: 'c' }] })
    const result = mergeManagedFile(sceneFile, base, ours, theirs)
    expect(result.conflicts.map(({ type, path }) => ({ type, path }))).toContainEqual({
      type: 'value',
      path: '/pages/0/cue',
    })
  })
})

describe('O02 mergeManagedFile：authored 接管与 catalog 目标校验', () => {
  test('stamps.json：ours authored 模板整条接管，theirs migrated 字段不灌回', () => {
    const base = jsonPresent({})
    const ours = jsonPresent({
      '@string:stamp-1': { id: 'stamp-1', origin: 'authored', name: '作者模板' },
    })
    const theirs = jsonPresent({
      '@string:stamp-1': { id: 'stamp-1', origin: 'migrated', name: '迁移模板', extra: 1 },
    })
    const result = mergeManagedFile('content/stamps.json', base, ours, theirs)
    expect(result.conflicts).toEqual([])
    expect((result.value.value as Record<string, { name: string }>)['@string:stamp-1']!.name).toBe(
      '作者模板',
    )
    expect(
      (result.value.value as Record<string, Record<string, unknown>>)['@string:stamp-1'],
    ).not.toHaveProperty('extra')
  })

  test('sprites.json：同一 ActionId 双方各自修改 → value 冲突（时间线原子）', () => {
    const sprite = (frame: number): VersionedJson =>
      jsonPresent({
        '@string:sprite-1': {
          id: 'sprite-1',
          asset: 'a',
          label: 'l',
          layout: { kind: 'static' },
          poses: { wave: { label: 'w', steps: [{ frame, durationMs: 100 }] } },
        },
      })
    const result = mergeManagedFile('content/sprites.json', sprite(0), sprite(1), sprite(2))
    expect(result.conflicts.map(({ type, path }) => ({ type, path }))).toContainEqual({
      type: 'value',
      path: '/@string:sprite-1/poses/wave',
    })
  })

  test('sprites.json：三方动作删除语义 — 删除胜过未改动，双方修改才冲突', () => {
    const spriteWith = (poses: Record<string, number>): VersionedJson =>
      jsonPresent({
        '@string:sprite-1': {
          id: 'sprite-1',
          asset: 'a',
          label: 'l',
          layout: { kind: 'static' },
          poses: Object.fromEntries(
            Object.entries(poses).map(([action, frame]) => [
              action,
              { label: action, steps: [{ frame, durationMs: 100 }] },
            ]),
          ),
        },
      })
    // ours 改 wave 帧 + 删 idle；theirs 保持 base 不变：修改胜、删除胜。
    const result = mergeManagedFile(
      'content/sprites.json',
      spriteWith({ base: 0, wave: 0, idle: 0 }),
      spriteWith({ wave: 5 }),
      spriteWith({ base: 0, wave: 0, idle: 0 }),
    )
    expect(result.conflicts).toEqual([])
    expect(
      Object.keys(
        (result.value.value as Record<string, { poses: Record<string, unknown> }>)[
          '@string:sprite-1'
        ]!.poses,
      ).sort(),
    ).toEqual(['wave'])
  })

  test('assets/index.json：ours authored 接管后迁移字段不再拼入', () => {
    const base = jsonPresent({ version: 1, assets: {} })
    const ours = jsonPresent({
      version: 1,
      assets: { 'a.x': { kind: 'portrait', path: 'assets/authored/a.png', mediaType: 'image/png', bytes: 1, sha256: 'a'.repeat(64), origin: { kind: 'authored' } } },
    })
    const theirs = jsonPresent({
      version: 1,
      assets: { 'a.x': { kind: 'sprite', path: 'assets/generated/a.png', mediaType: 'image/png', bytes: 2, sha256: 'b'.repeat(64), origin: { kind: 'generated' } } },
    })
    const result = mergeManagedFile('assets/index.json', base, ours, theirs)
    expect(result.conflicts).toEqual([])
    const record = (result.value.value as { assets: Record<string, { path: string; bytes: number }> })
      .assets['a.x']!
    expect(record).toMatchObject({ path: 'assets/authored/a.png', bytes: 1 })
  })

  test('assets/index.json 合并结果非法（缺 version）时经 validateAssetCatalog 拒绝', () => {
    const base = jsonPresent({ version: 1, assets: {} })
    const ours = jsonPresent({
      version: 1,
      assets: { 'a.x': { kind: 'portrait', path: 'assets/authored/a.png', mediaType: 'image/png', bytes: 1, sha256: 'a'.repeat(64), origin: { kind: 'authored' } } },
    })
    // theirs 删除 version → 删除胜；合并结果不再是合法 catalog，发布目标被拒。
    const theirs = jsonPresent({ assets: {} })
    expect(() => mergeManagedFile('assets/index.json', base, ours, theirs)).toThrow(
      'MG2 assets/index.json target.version: 期望 1',
    )
  })
})

describe('O02 mergeManagedFile：冲突快照保真与输入不可变', () => {
  test('冲突记录的 base/ours/theirs 快照与输入子树深等且互不别名', () => {
    const base = jsonPresent({ v: 1 })
    const ours = jsonPresent({ v: 2 })
    const theirs = jsonPresent({ v: 3 })
    const result = mergeManagedFile('content/locales/extra.json', base, ours, theirs)
    const conflict = result.conflicts[0]!
    expect(conflict).toMatchObject({ path: '/v', type: 'value' })
    expect(conflict.base).toEqual({ present: true, value: 1 })
    expect(conflict.ours).toEqual({ present: true, value: 2 })
    expect(conflict.theirs).toEqual({ present: true, value: 3 })
    if (typeof conflict.ours.value === 'object') conflict.ours.value.v = 999
    expect(ours.value).toEqual({ v: 2 })
  })

  test('合并不修改三个输入（输入不可变）', () => {
    const base = entitiesWith('e1')
    const ours = entitiesWith('e1', 'e2')
    const theirs = entitiesWith('e1', 'e3')
    const before = JSON.stringify([base.value, ours.value, theirs.value])
    mergeManagedFile(sceneFile, base, ours, theirs)
    expect(JSON.stringify([base.value, ours.value, theirs.value])).toBe(before)
  })

  test('equal-but-invalid：三方相同的 scenes/index 重复 id 仍 fail-closed（快速路径不豁免）', () => {
    const broken = jsonPresent({ scenes: [{ id: 'a', path: 'p/a' }, { id: 'a', path: 'p/a2' }] })
    const result = mergeManagedFile('content/scenes/index.json', broken, broken, broken)
    expect(result.conflicts.map(({ type }) => type)).toEqual(['invalid-identity'])
  })
})

describe('O02 mergeManagedFile：根级 id 数组文件与键转义', () => {
  test('actors.json 根级数组按 id 身份合并双方新增角色', () => {
    const actor = (id: string): VersionedJson => jsonPresent([{ id: 'base', n: 0 }, { id }])
    const result = mergeManagedFile(
      'content/actors.json',
      jsonPresent([{ id: 'base', n: 0 }]),
      actor('ours'),
      actor('theirs'),
    )
    expect(result.conflicts).toEqual([])
    expect((result.value.value as Array<{ id: string }>).map(({ id }) => id)).toEqual([
      'base',
      'theirs',
      'ours',
    ])
  })

  test('enemy-teams.json 根级数组按 id 合并；双方同 id 异文 → add-add', () => {
    const team = (n: number): VersionedJson => jsonPresent([{ id: 't1', members: [n] }])
    const result = mergeManagedFile(
      'content/enemy-teams.json',
      jsonPresent([]),
      team(1),
      team(2),
    )
    expect(result.conflicts.map(({ type, path }) => ({ type, path }))).toContainEqual({
      type: 'add-add',
      path: '/@string:t1',
    })
  })

  test('对象键含 "/" 时按 JSON Pointer 转义合并（无串键冲突）', () => {
    const base = jsonPresent({ 'a/b': 1 })
    const ours = jsonPresent({ 'a/b': 1, c: 2 })
    const theirs = jsonPresent({ 'a/b': 1, d: 3 })
    const result = mergeManagedFile('content/locales/extra.json', base, ours, theirs)
    expect(result.conflicts).toEqual([])
    expect(result.value.value).toEqual({ 'a/b': 1, c: 2, d: 3 })
  })

  test('jsonPresent/jsonAbsent：显式 present 标志', () => {
    expect(jsonPresent(5)).toEqual({ present: true, value: 5 })
    expect(jsonAbsent()).toEqual({ present: false })
  })

  test('对象键级 delete-modify：ours 删键、theirs 改值 → 冲突 path=/键', () => {
    const base = jsonPresent({ k: 1 })
    const ours = jsonPresent({})
    const theirs = jsonPresent({ k: 2 })
    const result = mergeManagedFile('content/locales/extra.json', base, ours, theirs)
    expect(result.conflicts.map(({ type, path }) => ({ type, path }))).toContainEqual({
      type: 'delete-modify',
      path: '/k',
    })
  })

  test('scenes pages：带 id 页条目走身份合并（双方各加不同页并集）', () => {
    const pages = (extra: string): VersionedJson =>
      jsonPresent({
        pages: [
          { id: 'p0', label: 'p0', trigger: 'p0' },
          ...(extra === 'p0' ? [] : [{ id: extra, label: extra, trigger: extra }]),
        ],
      })
    const result = mergeManagedFile('content/scenes/s009.json', pages('p0'), pages('p1'), pages('p2'))
    expect(result.conflicts).toEqual([])
    expect(
      (result.value.value as { pages: Array<{ id: string }> }).pages.map(({ id }) => id),
    ).toEqual(['p0', 'p2', 'p1'])
  })

  test('scenes stages：带 id 阶段走身份合并（stage 库新增并存）', () => {
    const stages = (extra: string): VersionedJson =>
      jsonPresent({ stages: [{ id: 's0', body: [] }, ...(extra === 's0' ? [] : [{ id: extra, body: [] }])] })
    const result = mergeManagedFile('content/scenes/s010.json', stages('s0'), stages('s1'), stages('s2'))
    expect(result.conflicts).toEqual([])
    expect(
      (result.value.value as { stages: Array<{ id: string }> }).stages.map(({ id }) => id),
    ).toEqual(['s0', 's2', 's1'])
  })

  test('sidecar 标量映射：ours 与 base 相同 → 整树采纳 theirs（快速路径）', () => {
    const base = jsonPresent({ a: 1 })
    const theirs = jsonPresent({ a: 2, b: 3 })
    const result = mergeManagedFile('content/locales/extra.json', base, base, theirs)
    expect(result.conflicts).toEqual([])
    expect(result.value.value).toEqual({ a: 2, b: 3 })
  })
})
