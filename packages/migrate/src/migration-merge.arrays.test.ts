/** Identity arrays, ordering and missing collections; no-id groups are low-level observations. */
import { checkBaseEntityPages } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { MigrationJson } from './migration-files.js'
import { jsonAbsent, jsonPresent, mergeManagedFile } from './migration-merge.js'

const sceneFile = 'content/scenes/s000.json'

const entities = (values: MigrationJson[]) => ({ entities: values })

const sceneIndex = (values: MigrationJson[]) => ({ version: 1, scenes: values })

const stagesInScene = (stages: MigrationJson[]) => ({
  entities: [
    {
      id: 'e1',
      behaviors: {
        trigger: {
          talk: {
            label: '对话',
            order: 0,
            flow: { kind: 'stages', initial: 'start', stages },
          },
        },
      },
    },
  ],
})

const item = (id: string, v: number) => ({ id, v })

const positionalPages = (length: number) => Array.from({ length }, (_, i) => ({ text: `p${i}` }))

// Keep the actual entity/page path and a stable initial page while testing partial scene JSON.
const pageScene = (pages: MigrationJson[]) => ({
  entities: [{ id: 'e1', initialPage: 'p0', pages }],
})

describe('mergeManagedFile · poisons 路径的身份分派', () => {
  const file = 'content/poisons.json'
  test('根缺席仍按 id 合并共同新增与双方独有项', () => {
    expect(
      mergeManagedFile(
        file,
        jsonAbsent(),
        jsonPresent([{ id: 'a' }, { id: 'b' }]),
        jsonPresent([{ id: 'a' }, { id: 'c' }]),
      ),
    ).toEqual({
      value: { present: true, value: [{ id: 'a' }, { id: 'c' }, { id: 'b' }] },
      conflicts: [],
    })
  })

  test('同 id 双改只冲突该字段，未改项完整保留', () => {
    expect(
      mergeManagedFile(
        file,
        jsonPresent([{ id: 'a', v: 1 }, { id: 'b' }]),
        jsonPresent([{ id: 'a', v: 2 }, { id: 'b' }]),
        jsonPresent([{ id: 'a', v: 3 }, { id: 'b' }]),
      ),
    ).toEqual({
      value: { present: true, value: [{ id: 'a', v: 2 }, { id: 'b' }] },
      conflicts: [
        {
          file,
          path: '/@string:a/v',
          type: 'value',
          base: { present: true, value: 1 },
          ours: { present: true, value: 2 },
          theirs: { present: true, value: 3 },
        },
      ],
    })
  })

  test('根缺席仍拒绝重复 id，并保留作者输入与三侧诊断', () => {
    expect(
      mergeManagedFile(
        file,
        jsonAbsent(),
        jsonPresent([{ id: 'a' }, { id: 'a' }]),
        jsonPresent([{ id: 'a' }]),
      ),
    ).toEqual({
      value: { present: true, value: [{ id: 'a' }, { id: 'a' }] },
      conflicts: [
        {
          file,
          path: '/',
          type: 'invalid-identity',
          // Missing identity arrays use a logical empty base here, not a physical file snapshot.
          base: { present: true, value: [] },
          ours: { present: true, value: [{ id: 'a' }, { id: 'a' }] },
          theirs: { present: true, value: [{ id: 'a' }] },
        },
      ],
    })
  })
})

describe('mergeManagedFile · 场景及 skills 身份分派', () => {
  test('entities 双方独有项合并，完整正文与三个输入都保持正确', () => {
    const base = entities([{ id: 'e1' }])
    const ours = entities([{ id: 'e1' }, { id: 'e2' }])
    const theirs = entities([{ id: 'e1' }, { id: 'e3' }])
    expect(
      mergeManagedFile(sceneFile, jsonPresent(base), jsonPresent(ours), jsonPresent(theirs)),
    ).toEqual({
      value: { present: true, value: { entities: [{ id: 'e1' }, { id: 'e3' }, { id: 'e2' }] } },
      conflicts: [],
    })
    expect([base, ours, theirs]).toEqual([
      { entities: [{ id: 'e1' }] },
      { entities: [{ id: 'e1' }, { id: 'e2' }] },
      { entities: [{ id: 'e1' }, { id: 'e3' }] },
    ])
  })

  test('entities 同 id 双方新增不同正文时保留作者并给出完整 add-add', () => {
    expect(
      mergeManagedFile(
        sceneFile,
        jsonPresent(entities([{ id: 'e1' }])),
        jsonPresent(entities([{ id: 'e1' }, { id: 'e2', label: '作者' }])),
        jsonPresent(entities([{ id: 'e1' }, { id: 'e2', label: '迁移' }])),
      ),
    ).toEqual({
      value: { present: true, value: { entities: [{ id: 'e1' }, { id: 'e2', label: '作者' }] } },
      conflicts: [
        {
          file: sceneFile,
          path: '/entities/@string:e2',
          type: 'add-add',
          base: { present: false },
          ours: { present: true, value: { id: 'e2', label: '作者' } },
          theirs: { present: true, value: { id: 'e2', label: '迁移' } },
        },
      ],
    })
  })

  test('entities 拒绝非对象身份，诊断和 fallback 不丢输入', () => {
    expect(
      mergeManagedFile(
        sceneFile,
        jsonPresent({ entities: [] }),
        jsonPresent({ entities: ['bare-primitive'] }),
        jsonPresent({ entities: [] }),
      ),
    ).toEqual({
      value: { present: true, value: { entities: ['bare-primitive'] } },
      conflicts: [
        {
          file: sceneFile,
          path: '/entities',
          type: 'invalid-identity',
          base: { present: true, value: [] },
          ours: { present: true, value: ['bare-primitive'] },
          theirs: { present: true, value: [] },
        },
      ],
    })
  })

  test('entities 单侧重复 id 不被未改上游豁免', () => {
    expect(
      mergeManagedFile(
        sceneFile,
        jsonPresent(entities([{ id: 'e1' }])),
        jsonPresent(entities([{ id: 'e1' }, { id: 'e1' }])),
        jsonPresent(entities([{ id: 'e1' }])),
      ),
    ).toEqual({
      value: { present: true, value: { entities: [{ id: 'e1' }, { id: 'e1' }] } },
      conflicts: [
        {
          file: sceneFile,
          path: '/entities',
          type: 'invalid-identity',
          base: { present: true, value: [{ id: 'e1' }] },
          ours: { present: true, value: [{ id: 'e1' }, { id: 'e1' }] },
          theirs: { present: true, value: [{ id: 'e1' }] },
        },
      ],
    })
  })

  test('scene index 单侧尾增与对侧修改原记录可以共存', () => {
    const entry = { id: 's1', name: '场景一', path: 'content/scenes/s1.json' }
    const added = { id: 's2', name: '场景二', path: 'content/scenes/s2.json' }
    expect(
      mergeManagedFile(
        'content/scenes/index.json',
        jsonPresent(sceneIndex([entry])),
        jsonPresent(sceneIndex([entry, added])),
        jsonPresent(sceneIndex([{ ...entry, name: '迁移新名' }])),
      ),
    ).toEqual({
      value: {
        present: true,
        value: {
          version: 1,
          scenes: [{ id: 's1', name: '迁移新名', path: 'content/scenes/s1.json' }, added],
        },
      },
      conflicts: [],
    })
  })

  test('已有场景根缺 entities 键时仍按条目身份合并双方新增', () => {
    expect(
      mergeManagedFile(
        'content/scenes/s042.json',
        jsonPresent({}),
        jsonPresent(entities([{ id: 'e9' }])),
        jsonPresent(entities([{ id: 'e10' }])),
      ),
    ).toEqual({
      value: { present: true, value: { entities: [{ id: 'e10' }, { id: 'e9' }] } },
      conflicts: [],
    })
  })

  test('整个场景文件缺席时双方不同新增产生根 add-add，不能只拼 entities', () => {
    expect(
      mergeManagedFile(
        'content/scenes/s042.json',
        jsonAbsent(),
        jsonPresent(entities([{ id: 'e9' }])),
        jsonPresent(entities([{ id: 'e10' }])),
      ),
    ).toEqual({
      value: { present: true, value: { entities: [{ id: 'e9' }] } },
      conflicts: [
        {
          file: 'content/scenes/s042.json',
          path: '/',
          type: 'add-add',
          base: { present: false },
          ours: { present: true, value: { entities: [{ id: 'e9' }] } },
          theirs: { present: true, value: { entities: [{ id: 'e10' }] } },
        },
      ],
    })
  })

  test('skills 集合合并双方新增，同时保留集合外的 levelUp', () => {
    expect(
      mergeManagedFile(
        'content/skills.json',
        jsonPresent({ skills: [{ id: '1', name: '旧' }], levelUp: {} }),
        jsonPresent({
          skills: [
            { id: '1', name: '旧' },
            { id: '2', name: '作者' },
          ],
          levelUp: {},
        }),
        jsonPresent({
          skills: [
            { id: '1', name: '旧' },
            { id: '3', name: '迁移' },
          ],
          levelUp: {},
        }),
      ),
    ).toEqual({
      value: {
        present: true,
        value: {
          skills: [
            { id: '1', name: '旧' },
            { id: '3', name: '迁移' },
            { id: '2', name: '作者' },
          ],
          levelUp: {},
        },
      },
      conflicts: [],
    })
  })
})

describe('mergeManagedFile · 无 id 页的位置路径（低层 characterization）', () => {
  const file = 'content/scenes/s007.json'
  test('两侧相同尾增保留完整页，而非只检查长度', () => {
    expect(
      mergeManagedFile(
        file,
        jsonPresent({ pages: [{ cue: 'p1' }] }),
        jsonPresent({ pages: [{ cue: 'p1' }, { cue: 'p2' }] }),
        jsonPresent({ pages: [{ cue: 'p1' }, { cue: 'p2' }] }),
      ),
    ).toEqual({
      value: { present: true, value: { pages: [{ cue: 'p1' }, { cue: 'p2' }] } },
      conflicts: [],
    })
  })

  test('等长页内独立修改保持其它页', () => {
    expect(
      mergeManagedFile(
        file,
        jsonPresent({ pages: [{ cue: 'a' }, { cue: 'b' }] }),
        jsonPresent({ pages: [{ cue: 'a2' }, { cue: 'b' }] }),
        jsonPresent({ pages: [{ cue: 'a' }, { cue: 'b' }] }),
      ),
    ).toEqual({
      value: { present: true, value: { pages: [{ cue: 'a2' }, { cue: 'b' }] } },
      conflicts: [],
    })
  })

  test('同页同叶双改定位到该槽位字段，保留作者值', () => {
    expect(
      mergeManagedFile(
        file,
        jsonPresent({ pages: [{ cue: 'a' }] }),
        jsonPresent({ pages: [{ cue: 'b' }] }),
        jsonPresent({ pages: [{ cue: 'c' }] }),
      ),
    ).toEqual({
      value: { present: true, value: { pages: [{ cue: 'b' }] } },
      conflicts: [
        {
          file,
          path: '/pages/0/cue',
          type: 'value',
          base: { present: true, value: 'a' },
          ours: { present: true, value: 'b' },
          theirs: { present: true, value: 'c' },
        },
      ],
    })
  })
})

describe('mergeManagedFile · 相等子树的身份校验', () => {
  test('三方相同的重复 SceneId 仍拒绝，不能因整树相等跳过身份校验', () => {
    const values = [
      { id: 's1', name: '一', path: 'content/scenes/s1.json' },
      { id: 's1', name: '二', path: 'content/scenes/s2.json' },
    ]
    const broken = sceneIndex(values)
    expect(
      mergeManagedFile(
        'content/scenes/index.json',
        jsonPresent(broken),
        jsonPresent(broken),
        jsonPresent(broken),
      ),
    ).toEqual({
      value: { present: true, value: broken },
      conflicts: [
        {
          file: 'content/scenes/index.json',
          path: '/scenes',
          type: 'invalid-identity',
          base: { present: true, value: values },
          ours: { present: true, value: values },
          theirs: { present: true, value: values },
        },
      ],
    })
  })
})

describe('mergeManagedFile · 身份集合路径', () => {
  test('actors 根集合按 id 合并，不退回整数组', () => {
    expect(
      mergeManagedFile(
        'content/actors.json',
        jsonPresent([{ id: 'base', n: 0 }]),
        jsonPresent([{ id: 'base', n: 0 }, { id: 'ours' }]),
        jsonPresent([{ id: 'base', n: 0 }, { id: 'theirs' }]),
      ),
    ).toEqual({
      value: { present: true, value: [{ id: 'base', n: 0 }, { id: 'theirs' }, { id: 'ours' }] },
      conflicts: [],
    })
  })

  test('enemy-teams 同 id 双新增时保留作者整项并报告三侧', () => {
    expect(
      mergeManagedFile(
        'content/enemy-teams.json',
        jsonPresent([]),
        jsonPresent([{ id: 't1', label: '作者' }]),
        jsonPresent([{ id: 't1', label: '迁移' }]),
      ),
    ).toEqual({
      value: { present: true, value: [{ id: 't1', label: '作者' }] },
      conflicts: [
        {
          file: 'content/enemy-teams.json',
          path: '/@string:t1',
          type: 'add-add',
          base: { present: false },
          ours: { present: true, value: { id: 't1', label: '作者' } },
          theirs: { present: true, value: { id: 't1', label: '迁移' } },
        },
      ],
    })
  })

  test('嵌套 pages 按稳定身份合并双方新增，并保留 initialPage', () => {
    const scene = (pages: MigrationJson[]) => ({
      entities: [{ id: 'e1', initialPage: 'p0', pages }],
    })
    expect(
      mergeManagedFile(
        'content/scenes/s009.json',
        jsonPresent(scene([{ id: 'p0', label: '默认' }])),
        jsonPresent(
          scene([
            { id: 'p0', label: '默认' },
            { id: 'p1', label: '作者' },
          ]),
        ),
        jsonPresent(
          scene([
            { id: 'p0', label: '默认' },
            { id: 'p2', label: '迁移' },
          ]),
        ),
      ),
    ).toEqual({
      value: {
        present: true,
        value: {
          entities: [
            {
              id: 'e1',
              initialPage: 'p0',
              pages: [
                { id: 'p0', label: '默认' },
                { id: 'p2', label: '迁移' },
                { id: 'p1', label: '作者' },
              ],
            },
          ],
        },
      },
      conflicts: [],
    })
  })

  test('嵌套行为 flow 的 stages 按稳定身份合并双方新增', () => {
    expect(
      mergeManagedFile(
        'content/scenes/s010.json',
        jsonPresent(stagesInScene([{ id: 'start', body: [] }])),
        jsonPresent(
          stagesInScene([
            { id: 'start', body: [] },
            { id: 'local', body: [] },
          ]),
        ),
        jsonPresent(
          stagesInScene([
            { id: 'start', body: [] },
            { id: 'upstream', body: [] },
          ]),
        ),
      ),
    ).toEqual({
      value: {
        present: true,
        value: stagesInScene([
          { id: 'start', body: [] },
          { id: 'upstream', body: [] },
          { id: 'local', body: [] },
        ]),
      },
      conflicts: [],
    })
  })
})

describe('mergeManagedFile · 删除与稳定身份顺序', () => {
  test('迁移删除连续中段时，保留作者修改并依原位置插回', () => {
    const base = ['a', 'x', 'y', 'z', 'w', 'b'].map((id) => item(id, 0))
    const ours = ['a', 'x', 'y', 'z', 'w', 'b'].map((id) =>
      item(id, id === 'a' || id === 'b' ? 0 : 1),
    )
    const theirs = ['a', 'b'].map((id) => item(id, 0))
    expect(
      mergeManagedFile(
        'content/items.json',
        jsonPresent(base),
        jsonPresent(ours),
        jsonPresent(theirs),
      ),
    ).toEqual({
      value: {
        present: true,
        value: [
          { id: 'a', v: 0 },
          { id: 'x', v: 1 },
          { id: 'y', v: 1 },
          { id: 'z', v: 1 },
          { id: 'w', v: 1 },
          { id: 'b', v: 0 },
        ],
      },
      conflicts: [
        {
          file: 'content/items.json',
          path: '/@string:x',
          type: 'delete-modify',
          base: { present: true, value: { id: 'x', v: 0 } },
          ours: { present: true, value: { id: 'x', v: 1 } },
          theirs: { present: false },
        },
        {
          file: 'content/items.json',
          path: '/@string:y',
          type: 'delete-modify',
          base: { present: true, value: { id: 'y', v: 0 } },
          ours: { present: true, value: { id: 'y', v: 1 } },
          theirs: { present: false },
        },
        {
          file: 'content/items.json',
          path: '/@string:z',
          type: 'delete-modify',
          base: { present: true, value: { id: 'z', v: 0 } },
          ours: { present: true, value: { id: 'z', v: 1 } },
          theirs: { present: false },
        },
        {
          file: 'content/items.json',
          path: '/@string:w',
          type: 'delete-modify',
          base: { present: true, value: { id: 'w', v: 0 } },
          ours: { present: true, value: { id: 'w', v: 1 } },
          theirs: { present: false },
        },
      ],
    })
  })

  test('两个修改项被迁移删除后，仍保留作者交换后的相对顺序', () => {
    const base = ['a', 'x', 'y', 'b'].map((id) => item(id, 0))
    const ours = ['a', 'y', 'x', 'b'].map((id) => item(id, id === 'a' || id === 'b' ? 0 : 1))
    const theirs = ['a', 'b'].map((id) => item(id, 0))
    expect(
      mergeManagedFile(
        'content/items.json',
        jsonPresent(base),
        jsonPresent(ours),
        jsonPresent(theirs),
      ),
    ).toEqual({
      value: {
        present: true,
        value: [
          { id: 'a', v: 0 },
          { id: 'y', v: 1 },
          { id: 'x', v: 1 },
          { id: 'b', v: 0 },
        ],
      },
      conflicts: [
        {
          file: 'content/items.json',
          path: '/@string:x',
          type: 'delete-modify',
          base: { present: true, value: { id: 'x', v: 0 } },
          ours: { present: true, value: { id: 'x', v: 1 } },
          theirs: { present: false },
        },
        {
          file: 'content/items.json',
          path: '/@string:y',
          type: 'delete-modify',
          base: { present: true, value: { id: 'y', v: 0 } },
          ours: { present: true, value: { id: 'y', v: 1 } },
          theirs: { present: false },
        },
      ],
    })
  })

  test('双方同删的记录不再进入身份数组结果', () => {
    expect(
      mergeManagedFile(
        'content/items.json',
        jsonPresent([item('a', 0), item('x', 0)]),
        jsonPresent([item('a', 0)]),
        jsonPresent([item('a', 0)]),
      ),
    ).toEqual({ value: { present: true, value: [{ id: 'a', v: 0 }] }, conflicts: [] })
  })

  test('合法 PageId 页的交错删除保留作者修改，输出没有空位', () => {
    const basePages = [
      { id: 'p0', label: '页0' },
      { id: 'p1', label: '页1' },
      { id: 'p2', label: '页2' },
      { id: 'p3', label: '页3' },
    ]
    const oursPages = [...basePages.slice(0, 3), { id: 'p3', label: '作者页3' }]
    const theirsPages = basePages.slice(0, 2)
    checkBaseEntityPages(basePages, undefined, 'p0', 'base.entity')
    checkBaseEntityPages(oursPages, undefined, 'p0', 'ours.entity')
    checkBaseEntityPages(theirsPages, undefined, 'p0', 'theirs.entity')
    expect(
      mergeManagedFile(
        'content/scenes/s1.json',
        jsonPresent(pageScene(basePages)),
        jsonPresent(pageScene(oursPages)),
        jsonPresent(pageScene(theirsPages)),
      ),
    ).toStrictEqual({
      value: {
        present: true,
        value: {
          entities: [
            {
              id: 'e1',
              initialPage: 'p0',
              pages: [
                { id: 'p0', label: '页0' },
                { id: 'p1', label: '页1' },
                { id: 'p3', label: '作者页3' },
              ],
            },
          ],
        },
      },
      conflicts: [
        {
          file: 'content/scenes/s1.json',
          path: '/entities/@string:e1/pages/@string:p3',
          type: 'delete-modify',
          base: { present: true, value: { id: 'p3', label: '页3' } },
          ours: { present: true, value: { id: 'p3', label: '作者页3' } },
          theirs: { present: false },
        },
      ],
    })
  })
})

describe('mergeManagedFile · 缺集合键的分派', () => {
  test('场景索引缺集合键时仍按身份合并新增，迁移侧顺序在前', () => {
    expect(
      mergeManagedFile(
        'content/scenes/index.json',
        jsonPresent({ version: 1 }),
        jsonPresent({
          version: 1,
          scenes: [{ id: 's2', name: '乙', path: 'content/scenes/s2.json' }],
        }),
        jsonPresent({
          version: 1,
          scenes: [{ id: 's1', name: '甲', path: 'content/scenes/s1.json' }],
        }),
      ),
    ).toEqual({
      value: {
        present: true,
        value: {
          version: 1,
          scenes: [
            { id: 's1', name: '甲', path: 'content/scenes/s1.json' },
            { id: 's2', name: '乙', path: 'content/scenes/s2.json' },
          ],
        },
      },
      conflicts: [],
    })
  })

  test('实体缺 pages 键时，双方有 PageId 的新增页按身份并存', () => {
    expect(
      mergeManagedFile(
        'content/scenes/s1.json',
        jsonPresent({ entities: [{ id: 'e1' }] }),
        jsonPresent({ entities: [{ id: 'e1', pages: [{ id: 'p2', label: '作者' }] }] }),
        jsonPresent({ entities: [{ id: 'e1', pages: [{ id: 'p1', label: '迁移' }] }] }),
      ),
    ).toEqual({
      value: {
        present: true,
        value: {
          entities: [
            {
              id: 'e1',
              pages: [
                { id: 'p1', label: '迁移' },
                { id: 'p2', label: '作者' },
              ],
            },
          ],
        },
      },
      conflicts: [],
    })
  })
})

describe('mergeManagedFile · 无 id 位置路径（非 current 场景）', () => {
  test('两侧不同长度的尾删只保留共同前缀', () => {
    expect(
      mergeManagedFile(
        'content/scenes/s1.json',
        jsonPresent({ pages: positionalPages(3) }),
        jsonPresent({ pages: positionalPages(2) }),
        jsonPresent({ pages: positionalPages(1) }),
      ),
    ).toEqual({ value: { present: true, value: { pages: [{ text: 'p0' }] } }, conflicts: [] })
  })

  test('缺 pages 键且双方页无身份时保持整数组 add-add', () => {
    expect(
      mergeManagedFile(
        'content/scenes/s1.json',
        jsonPresent({}),
        jsonPresent({ pages: [{ text: 'ours' }] }),
        jsonPresent({ pages: [{ text: 'theirs' }] }),
      ),
    ).toEqual({
      value: { present: true, value: { pages: [{ text: 'ours' }] } },
      conflicts: [
        {
          file: 'content/scenes/s1.json',
          path: '/pages',
          type: 'add-add',
          base: { present: false },
          ours: { present: true, value: [{ text: 'ours' }] },
          theirs: { present: true, value: [{ text: 'theirs' }] },
        },
      ],
    })
  })
})
